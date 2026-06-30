import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useOutletContext, useNavigation } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { getMenus, createOrder, OrderCreationError, getCouponById, redeemCoupon } from "~/lib/database";

import type { Menu, Coupon } from "~/types";
import { createServerSupabaseClient, supabase } from "~/lib/supabase";
import { MenuListSkeleton } from "~/components/LoadingSkeleton";
import OrderReviewSheet, { type ItemOptions, type ReviewCartItem } from "~/components/OrderReviewSheet";

// 메뉴 데이터 캐시 (메뉴는 자주 변경되지 않으므로 더 긴 캐시 시간)
const menuCache = { data: null as any, timestamp: 0 };
const MENU_CACHE_DURATION = 300000; // 5분

function getSupabaseErrorDetail(error: unknown) {
  if (error && typeof error === 'object') {
    const code = 'code' in error ? (error as { code?: string }).code : null;
    const message = 'message' in error ? (error as { message?: string }).message : null;
    return [code, message].filter(Boolean).join(': ');
  }

  return String(error);
}

async function ensureOrderUserProfile(
  client: ReturnType<typeof createServerSupabaseClient>,
  payload: { userId: string; email: string; name: string; churchGroup: string }
) {
  const { data: existingProfile, error: selectError } = await client
    .from('users')
    .select('id, name, church_group')
    .eq('id', payload.userId)
    .maybeSingle();

  if (selectError) {
    throw new Error(`users_select - ${getSupabaseErrorDetail(selectError)}`);
  }

  if (existingProfile) {
    const needsProfileUpdate =
      existingProfile.name !== payload.name ||
      existingProfile.church_group !== payload.churchGroup;

    if (needsProfileUpdate) {
      const { error: updateError } = await client
        .from('users')
        .update({
          name: payload.name,
          church_group: payload.churchGroup,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.userId);

      if (updateError) {
        throw new Error(`users_update - ${getSupabaseErrorDetail(updateError)}`);
      }
    }

    return;
  }

  // User doesn't exist by ID — insert a new row
  const { error: insertError } = await client
    .from('users')
    .insert({
      id: payload.userId,
      email: payload.email || null,
      name: payload.name,
      church_group: payload.churchGroup,
      role: 'customer',
      updated_at: new Date().toISOString(),
    });

  if (!insertError) return;

  if (insertError.code !== '23505') {
    throw new Error(`users_insert - ${getSupabaseErrorDetail(insertError)}`);
  }

  // 23505: unique constraint — could be email conflict when the same person uses multiple
  // OAuth providers (e.g. Google + Kakao). Verify if our UUID actually has a row now.
  const { data: verifyProfile } = await client
    .from('users')
    .select('id')
    .eq('id', payload.userId)
    .maybeSingle();

  if (verifyProfile) return;

  // Email unique constraint conflict: this UUID has no row yet.
  // Insert with a placeholder email unique to this UUID so the FK constraint is satisfied.
  const { error: retryError } = await client
    .from('users')
    .insert({
      id: payload.userId,
      email: `${payload.userId}@oauth-multi-provider.internal`,
      name: payload.name,
      church_group: payload.churchGroup,
      role: 'customer',
      updated_at: new Date().toISOString(),
    });

  if (retryError && retryError.code !== '23505') {
    throw new Error(`users_insert - ${getSupabaseErrorDetail(retryError)}`);
  }
}

async function getAuthenticatedUser(accessToken: string) {
  const serverSupabase = createServerSupabaseClient();
  const { data, error } = accessToken
    ? await serverSupabase.auth.getUser(accessToken)
    : { data: { user: null }, error: null };

  return { serverSupabase, user: data.user, error };
}

async function getUserProfileForOrder(
  serverSupabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string
) {
  const { data: profile } = await serverSupabase
    .from('users')
    .select('name, church_group')
    .eq('id', userId)
    .maybeSingle();

  return {
    name: typeof profile?.name === 'string' ? profile.name.trim() : '',
    churchGroup: typeof profile?.church_group === 'string' ? profile.church_group.trim() : '',
  };
}

async function getEditableOrder(
  serverSupabase: ReturnType<typeof createServerSupabaseClient>,
  orderId: string,
  userId: string
) {
  const profile = await getUserProfileForOrder(serverSupabase, userId);
  const { data: existingOrder, error } = await serverSupabase
    .from('orders')
    .select('id, user_id, customer_name, church_group, status, order_number')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !existingOrder) {
    return { error: '수정할 주문을 찾지 못했습니다.', status: 404, order: null };
  }

  if (existingOrder.status !== 'pending') {
    return { error: '제조가 시작된 주문은 수정할 수 없습니다.', status: 400, order: null };
  }

  const matchesOwner = existingOrder.user_id === userId;
  const matchesProfile = Boolean(
    profile.name &&
    profile.churchGroup &&
    existingOrder.customer_name === profile.name &&
    existingOrder.church_group === profile.churchGroup
  );

  if (!matchesOwner && !matchesProfile) {
    return { error: '본인 주문만 수정할 수 있습니다.', status: 403, order: null };
  }

  return { error: null, status: 200, order: existingOrder };
}

async function notifyAdminsOfEditing(
  serverSupabase: ReturnType<typeof createServerSupabaseClient>,
  order: any,
  state: 'start' | 'end'
) {
  const { data: admins } = await serverSupabase
    .from('users')
    .select('id')
    .in('role', ['admin', 'staff']);

  if (!admins?.length) return;

  const type = state === 'start' ? 'order_editing_start' : 'order_editing_end';
  const orderNumber = order.order_number ? `#${order.order_number}` : `#${order.id?.slice(-8) || ''}`;
  const message = state === 'start'
    ? `${order.customer_name}님이 주문 ${orderNumber}을 수정 중입니다.`
    : `${order.customer_name}님의 주문 ${orderNumber} 수정이 종료되었습니다.`;

  await serverSupabase.from('notifications').insert(
    admins.map((admin) => ({
      user_id: admin.id,
      order_id: order.id,
      type,
      message,
    }))
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    // 캐시된 메뉴 데이터가 유효한지 확인
    if (menuCache.data && Date.now() - menuCache.timestamp < MENU_CACHE_DURATION) {
      return json({ menus: menuCache.data, cached: true });
    }

    const menus = await getMenus();
    
    // 캐시 업데이트
    menuCache.data = menus;
    menuCache.timestamp = Date.now();
    
    return json({ menus, cached: false });
  } catch (error) {
    console.error('New order loader error:', error);
    return json({ menus: menuCache.data || [], cached: false });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'startOrderEdit' || intent === 'endOrderEdit') {
    const orderId = formData.get('orderId') as string;
    const accessToken = formData.get('accessToken') as string;
    if (!orderId) {
      return json({ error: '주문 ID가 없습니다.' }, { status: 400 });
    }

    const { serverSupabase, user, error } = await getAuthenticatedUser(accessToken);
    if (error || !user?.id) {
      return json({ error: '로그인 정보가 확인되지 않습니다.' }, { status: 401 });
    }

    const editable = await getEditableOrder(serverSupabase, orderId, user.id);
    if (!editable.order) {
      return json({ error: editable.error }, { status: editable.status });
    }

    await notifyAdminsOfEditing(
      serverSupabase,
      editable.order,
      intent === 'startOrderEdit' ? 'start' : 'end'
    );

    return json({ success: true });
  }

  if (intent === 'createOrder') {
    try {
      const submittedCustomerName = formData.get('customerName') as string;
      const submittedChurchGroup = formData.get('churchGroup') as string;
      const paymentMethod = formData.get('paymentMethod') as 'cash' | 'transfer';
      const notes = formData.get('notes') as string;
      const items = JSON.parse(formData.get('items') as string);
      const accessToken = formData.get('accessToken') as string;
      const couponId = (formData.get('couponId') as string)?.trim() || '';

      if (!items || items.length === 0) {
        return json({ error: '고객명과 주문 항목을 입력해주세요.' }, { status: 400 });
      }

      const subtotal = items.reduce((sum: number, item: any) => sum + item.total_price, 0);

      const serverSupabase = createServerSupabaseClient();
      const { data: authData, error: authError } = accessToken
        ? await serverSupabase.auth.getUser(accessToken)
        : { data: { user: null }, error: null };
      const finalUserId = authData.user?.id;

      if (authError || !finalUserId) {
        return json({ error: '로그인 정보가 확인되지 않아 주문을 생성할 수 없습니다. 다시 로그인 해주세요.' }, { status: 400 });
      }

      const writeClient = createServerSupabaseClient(accessToken);
      const { data: profile } = await writeClient
        .from('users')
        .select('name, church_group')
        .eq('id', finalUserId)
        .maybeSingle();

      const customerName = typeof profile?.name === 'string' && profile.name.trim()
        ? profile.name.trim()
        : submittedCustomerName?.trim();
      const churchGroup = typeof profile?.church_group === 'string' && profile.church_group.trim()
        ? profile.church_group.trim()
        : submittedChurchGroup?.trim();

      if (!customerName || !churchGroup) {
        return json({ error: '이름과 소속 목장을 먼저 입력해주세요.' }, { status: 400 });
      }

      // 쿠폰 검증 및 할인 적용
      let discountAmount = 0;
      let appliedCouponId: string | undefined;
      if (couponId) {
        const coupon = await getCouponById(couponId, serverSupabase);
        const matchesUser = coupon?.target_type === 'user' && coupon.target_user_id === finalUserId;
        const matchesGroup =
          coupon?.target_type === 'group' && coupon.target_church_group === churchGroup;

        if (!coupon || !coupon.is_active || (!matchesUser && !matchesGroup)) {
          return json({ error: '사용할 수 없는 쿠폰입니다. 다시 확인해주세요.' }, { status: 400 });
        }

        discountAmount = Math.min(
          subtotal,
          Math.round((subtotal * coupon.discount_percent) / 100)
        );
        appliedCouponId = coupon.id;
      }

      const finalAmount = subtotal - discountAmount;

      console.log('🔍 Creating order with user info:', {
        finalUserId,
        customerName,
        userExists: !!finalUserId,
        couponApplied: Boolean(appliedCouponId),
        discountAmount,
      });

      // Use service role client for profile ensure so RLS doesn't block
      // multi-OAuth users (e.g. same person using both Google and Kakao).
      await ensureOrderUserProfile(serverSupabase, {
        userId: finalUserId,
        email: authData.user?.email || '',
        name: customerName,
        churchGroup,
      });

      const result = await createOrder(
        {
          user_id: finalUserId || undefined,
          customer_name: customerName,
          church_group: churchGroup || undefined,
          payment_method: paymentMethod,
          notes: notes || undefined,
          total_amount: finalAmount,
          coupon_id: appliedCouponId,
          discount_amount: discountAmount,
          items: items,
        },
        writeClient
      );

      // 1회용 쿠폰 소진 (주문 생성 후)
      if (appliedCouponId) {
        const redeemed = await redeemCoupon(appliedCouponId, finalUserId, result.id, serverSupabase);
        if (!redeemed) {
          console.warn('⚠️ Coupon already used at redemption time:', appliedCouponId);
        }
      }

      console.log('📝 Order created successfully:', result);
      console.log('📝 Order user_id check:', { orderUserId: result.user_id, finalUserId });
      return json({ success: true, orderId: result.id });
    } catch (error) {
      console.error('Create order error:', error);
      if (error instanceof OrderCreationError) {
        return json({
          error: `주문 생성에 실패했습니다. (${error.message})`,
          step: error.step,
        }, { status: 400 });
      }
      if (error instanceof Error) {
        return json({ error: `주문 생성에 실패했습니다. (${error.message})` }, { status: 400 });
      }
      return json({ error: '주문 생성에 실패했습니다.' }, { status: 400 });
    }
  }

  if (intent === 'updateOrder') {
    try {
      const orderId = formData.get('orderId') as string;
      const submittedCustomerName = formData.get('customerName') as string;
      const submittedChurchGroup = formData.get('churchGroup') as string;
      const notes = formData.get('notes') as string;
      const items = JSON.parse(formData.get('items') as string);
      const accessToken = formData.get('accessToken') as string;

      if (!orderId) {
        return json({ error: '수정할 주문을 찾지 못했습니다.' }, { status: 400 });
      }

      if (!items || items.length === 0) {
        return json({ error: '주문 항목을 입력해주세요.' }, { status: 400 });
      }

      const serverSupabase = createServerSupabaseClient();
      const { data: authData, error: authError } = accessToken
        ? await serverSupabase.auth.getUser(accessToken)
        : { data: { user: null }, error: null };
      const finalUserId = authData.user?.id;

      if (authError || !finalUserId) {
        return json({ error: '로그인 정보가 확인되지 않아 주문을 수정할 수 없습니다.' }, { status: 400 });
      }

      const { data: profile } = await serverSupabase
        .from('users')
        .select('name, church_group')
        .eq('id', finalUserId)
        .maybeSingle();

      const customerName = typeof profile?.name === 'string' && profile.name.trim()
        ? profile.name.trim()
        : submittedCustomerName?.trim();
      const churchGroup = typeof profile?.church_group === 'string' && profile.church_group.trim()
        ? profile.church_group.trim()
        : submittedChurchGroup?.trim();

      const { data: existingOrder, error: orderError } = await serverSupabase
        .from('orders')
        .select('id, user_id, customer_name, church_group, status, order_number')
        .eq('id', orderId)
        .maybeSingle();

      if (orderError || !existingOrder) {
        return json({ error: '수정할 주문을 찾지 못했습니다.' }, { status: 404 });
      }

      if (existingOrder.status !== 'pending') {
        return json({ error: '제조가 시작된 주문은 수정할 수 없습니다.' }, { status: 400 });
      }

      const matchesOwner = existingOrder.user_id === finalUserId;
      const matchesProfile = Boolean(
        customerName &&
        churchGroup &&
        existingOrder.customer_name === customerName &&
        existingOrder.church_group === churchGroup
      );

      if (!matchesOwner && !matchesProfile) {
        return json({ error: '본인 주문만 수정할 수 있습니다.' }, { status: 403 });
      }

      const totalAmount = items.reduce((sum: number, item: any) => sum + Number(item.total_price || 0), 0);
      const orderItems = items.map((item: any) => ({
        order_id: orderId,
        menu_id: item.menu_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        notes: item.notes || null,
      }));

      const { error: deleteItemsError } = await serverSupabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (deleteItemsError) {
        console.error('Update order delete items error:', deleteItemsError);
        return json({ error: '기존 주문 항목을 수정하지 못했습니다.' }, { status: 500 });
      }

      const { error: insertItemsError } = await serverSupabase
        .from('order_items')
        .insert(orderItems);

      if (insertItemsError) {
        console.error('Update order insert items error:', insertItemsError);
        return json({ error: '새 주문 항목을 저장하지 못했습니다.' }, { status: 500 });
      }

      const { data: updatedOrder, error: updateOrderError } = await serverSupabase
        .from('orders')
        .update({
          total_amount: totalAmount,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
        .select('id')
        .single();

      if (updateOrderError || !updatedOrder) {
        console.error('Update order error:', updateOrderError);
        return json({ error: '주문 수정에 실패했습니다.' }, { status: 500 });
      }

      return json({ success: true, orderId, updated: true });
    } catch (error) {
      console.error('Update order action error:', error);
      return json({ error: '주문 수정에 실패했습니다.' }, { status: 400 });
    }
  }

  return json({ error: '잘못된 요청입니다.' }, { status: 400 });
}

type CartItem = ReviewCartItem;

function buildItemNotes(opts?: ItemOptions, category?: string): string | undefined {
  const parts: string[] = [];
  // 차: 핫/아이스 구분을 항상 기록 (선택이 없으면 기본 핫)
  if (category === 'tea') {
    parts.push(opts?.temperature === 'ice' ? '아이스' : '핫');
  }
  if (!opts) return parts.length ? parts.join(', ') : undefined;
  if (opts.strength === 'light') parts.push('연하게');
  if (opts.water === 'more') parts.push('물 많게');
  if (opts.water === 'less') parts.push('물 적게');
  if (opts.ice === 'more') parts.push('얼음 많게');
  if (opts.ice === 'less') parts.push('얼음 적게');
  return parts.length ? parts.join(', ') : undefined;
}

function normalizeItemOptions(options: ItemOptions[] | undefined, quantity: number) {
  return Array.from({ length: quantity }, (_, index) => options?.[index] || {});
}

function parseItemNotes(notes?: string | null): ItemOptions {
  const options: ItemOptions = {};
  if (!notes) return options;
  const parts = notes.split(',').map(part => part.trim());
  if (parts.includes('연하게')) options.strength = 'light';
  if (parts.includes('물 많게')) options.water = 'more';
  if (parts.includes('물 적게')) options.water = 'less';
  if (parts.includes('얼음 많게')) options.ice = 'more';
  if (parts.includes('얼음 적게')) options.ice = 'less';
  if (parts.includes('아이스')) options.temperature = 'ice';
  else if (parts.includes('핫')) options.temperature = 'hot';
  return options;
}

function groupOrderItemsForCart(items: any[], menus: Menu[]): CartItem[] {
  const grouped = new Map<string, CartItem>();

  for (const item of items || []) {
    const menu = menus.find((m: any) => m.id === item.menu_id);
    if (!menu) continue;

    const existing = grouped.get(menu.id);
    const itemQuantity = Number(item.quantity || 1);
    const itemOptions = Array.from({ length: itemQuantity }, () => parseItemNotes(item.notes));

    if (existing) {
      const nextQuantity = existing.quantity + itemQuantity;
      grouped.set(menu.id, {
        ...existing,
        quantity: nextQuantity,
        total_price: nextQuantity * menu.price,
        options: [...normalizeItemOptions(existing.options, existing.quantity), ...itemOptions],
      });
    } else {
      grouped.set(menu.id, {
        menu,
        quantity: itemQuantity,
        total_price: itemQuantity * menu.price,
        options: itemOptions,
      });
    }
  }

  return Array.from(grouped.values());
}

export default function NewOrder() {
  const { menus: loadedMenus } = useLoaderData<typeof loader>();
  const menus = loadedMenus as unknown as Menu[];
  const outletContext = useOutletContext<{ user: any; userRole: string | null; userProfile?: { name: string; church_group: string } | null }>();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [churchGroup, setChurchGroup] = useState('');
  const [notes, setNotes] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [editingOrder, setEditingOrder] = useState<{ id: string; orderNumber?: string } | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCouponId, setSelectedCouponId] = useState('');
  const editBroadcastRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const accessTokenRef = useRef<string | null>(null);

  // 주문 제출 상태 확인
  const isSubmitting = fetcher.state === 'submitting';
  const actionData = fetcher.data as { error?: string; success?: boolean; orderId?: string; updated?: boolean } | undefined;

  const broadcastEditState = (state: 'start' | 'end') => {
    if (!editingOrder?.id) return;
    editBroadcastRef.current?.send({
      type: 'broadcast',
      event: 'order-editing',
      payload: {
        orderId: editingOrder.id,
        state,
        at: Date.now(),
      },
    });
  };

  const sendEditStateToServer = async (state: 'start' | 'end', options?: { keepalive?: boolean }) => {
    if (!editingOrder?.id) return;

    let accessToken = accessTokenRef.current;
    if (!accessToken) {
      const { data: { session } } = await supabase.auth.getSession();
      accessToken = session?.access_token || null;
      accessTokenRef.current = accessToken;
    }
    if (!accessToken) return;

    const formData = new FormData();
    formData.append('intent', state === 'start' ? 'startOrderEdit' : 'endOrderEdit');
    formData.append('orderId', editingOrder.id);
    formData.append('accessToken', accessToken);

    await fetch('/orders/new', {
      method: 'POST',
      body: formData,
      keepalive: options?.keepalive,
    }).catch(() => {});
  };

  // context에서 프로필 가져오기
  useEffect(() => {
    const profile = outletContext?.userProfile;
    if (profile) {
      setCustomerName(profile.name || '');
      setChurchGroup(profile.church_group || '');
    }
  }, [outletContext?.userProfile]);

  // 사용 가능한 쿠폰 조회 (서버 service role + 명시적 필터로 본인/본인 목장 활성 쿠폰 반환)
  useEffect(() => {
    if (!outletContext?.user || editingOrder) {
      setCoupons([]);
      return;
    }
    let cancelled = false;
    (async () => {
      let accessToken = accessTokenRef.current;
      if (!accessToken) {
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || null;
        accessTokenRef.current = accessToken;
      }
      if (!accessToken) return;
      try {
        const res = await fetch('/api/my-coupons', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          console.warn('쿠폰 조회 실패:', data?.error);
          setCoupons([]);
          return;
        }
        setCoupons((data.coupons || []) as Coupon[]);
      } catch (e) {
        if (!cancelled) setCoupons([]);
      }
    })();
    return () => { cancelled = true; };
  }, [outletContext?.user, editingOrder]);

  useEffect(() => {
    // 재주문 정보가 있으면 자동 채우기
    const reorderRaw = localStorage.getItem('reorder');
    if (reorderRaw) {
      try {
        const reorder = JSON.parse(reorderRaw);
        setCustomerName(reorder.customerName || '');
        setChurchGroup(reorder.churchGroup || '');
        setNotes(reorder.notes || '');
        // 메뉴 id로 메뉴 객체 매칭
        if (Array.isArray(reorder.items)) {
          const cartItems = reorder.items.map((item: any) => {
            const menu = menus.find((m: any) => m.id === item.menu_id);
            if (!menu) return null;
            return {
              menu,
              quantity: item.quantity,
              total_price: item.total_price,
            };
          }).filter(Boolean);
          setCart(cartItems);
        }
      } catch (e) { /* 무시 */ }
      localStorage.removeItem('reorder');
    }

    // 빠른주문 정보가 있으면 자동 채우기
    const quickOrderRaw = localStorage.getItem('quickOrderItems');
    if (quickOrderRaw) {
      try {
        const quickOrderItems = JSON.parse(quickOrderRaw);
        if (Array.isArray(quickOrderItems)) {
          const cartItems = quickOrderItems.map((item: any) => {
            const menu = menus.find((m: any) => m.id === item.menu_id);
            if (!menu) return null;
            const unitPrice = item.unit_price ?? item.price ?? menu.price;
            return {
              menu,
              quantity: item.quantity,
              total_price: item.quantity * unitPrice,
            };
          }).filter((item): item is CartItem => item !== null);
          setCart(cartItems);
        }
      } catch (e) { /* 무시 */ }
      localStorage.removeItem('quickOrderItems');
    }

    const editOrderRaw = localStorage.getItem('editOrder');
    if (editOrderRaw) {
      try {
        const editOrder = JSON.parse(editOrderRaw);
        setEditingOrder({ id: editOrder.id, orderNumber: editOrder.orderNumber });
        setCustomerName(editOrder.customerName || '');
        setChurchGroup(editOrder.churchGroup || '');
        setNotes(editOrder.notes || '');
        if (Array.isArray(editOrder.items)) {
          setCart(groupOrderItemsForCart(editOrder.items, menus));
        }
      } catch (e) { /* 무시 */ }
      localStorage.removeItem('editOrder');
    }
  }, [menus]);

  useEffect(() => {
    if (!editingOrder?.id) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      accessTokenRef.current = session?.access_token || null;
    }).catch(() => {});

    const channel = supabase.channel('order-editing', {
      config: { presence: { key: editingOrder.id } },
    });
    editBroadcastRef.current = channel;

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        channel.track({
          orderId: editingOrder.id,
          state: 'editing',
          at: Date.now(),
        });
        broadcastEditState('start');
        sendEditStateToServer('start');
      }
    });

    const endEditing = () => {
      channel.send({
        type: 'broadcast',
        event: 'order-editing',
        payload: {
          orderId: editingOrder.id,
          state: 'end',
          at: Date.now(),
        },
      });
      sendEditStateToServer('end', { keepalive: true });
    };

    window.addEventListener('beforeunload', endEditing);

    return () => {
      window.removeEventListener('beforeunload', endEditing);
      endEditing();
      channel.untrack();
      supabase.removeChannel(channel);
      editBroadcastRef.current = null;
    };
  }, [editingOrder?.id]);

  // 주문 생성 결과 처리
  useEffect(() => {
    if (actionData?.error) {
      alert(actionData.error);
    } else if (actionData?.success) {
      console.log('✅ Order created successfully, redirecting to home...');
      if (actionData.updated) {
        broadcastEditState('end');
        sendEditStateToServer('end', { keepalive: true });
        alert('주문이 수정되었습니다!');
        window.location.href = '/orders/history';
        return;
      }
      alert('주문이 성공적으로 생성되었습니다!');
      // 주문 완료 후 홈탭으로 이동
      window.location.href = '/';
    }
  }, [actionData]);

  // 카테고리 목록
  const categories = [
    { id: 'ice coffee', name: 'Ice 커피', shortName: 'Ice' },
    { id: 'hot coffee', name: 'Hot 커피', shortName: 'Hot' },
    { id: 'tea', name: '차', shortName: 'Tea' },
    { id: 'beverage', name: 'ADE / 음료', shortName: '음료' }
  ];

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const getCartItem = (menuId: string) => cart.find(item => item.menu.id === menuId);
  const getMenuCategoryLabel = (categoryId: string) =>
    categories.find(category => category.id === categoryId)?.shortName || categoryId;
  const categoriesWithMenus = categories
    .map(category => ({ ...category, items: menus.filter(menu => menu.category === category.id) }))
    .filter(category => category.items.length > 0);

  const addToCart = (menu: Menu) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.menu.id === menu.id);
      if (existingItem) {
        return prev.map(item =>
          item.menu.id === menu.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * menu.price,
                options: normalizeItemOptions(item.options, item.quantity + 1),
              }
            : item
        );
      }
      return [...prev, { menu, quantity: 1, total_price: menu.price, options: [{}] }];
    });
  };

  const updateQuantity = (menuId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.menu.id !== menuId));
    } else {
      setCart(prev => {
        const existingItem = prev.find(item => item.menu.id === menuId);
        if (existingItem) {
          return prev.map(item =>
            item.menu.id === menuId
              ? {
                  ...item,
                  quantity,
                  total_price: quantity * item.menu.price,
                  options: normalizeItemOptions(item.options, quantity),
                }
              : item
          );
        } else {
          // 아이템이 없으면 새로 추가
          const menu = menus.find(m => m.id === menuId);
          if (menu) {
            return [...prev, { menu, quantity, total_price: quantity * menu.price, options: normalizeItemOptions(undefined, quantity) }];
          }
        }
        return prev;
      });
    }
  };

  const removeFromCart = (menuId: string) => {
    setCart(prev => prev.filter(item => item.menu.id !== menuId));
  };

  const updateItemOptions = (menuId: string, index: number, options: ItemOptions) => {
    setCart(prev => prev.map(item =>
      item.menu.id !== menuId
        ? item
        : {
            ...item,
            options: normalizeItemOptions(item.options, item.quantity).map((currentOptions, currentIndex) =>
              currentIndex === index ? options : currentOptions
            ),
          }
    ));
  };

  const openReview = () => {
    if (cart.length === 0) {
      alert('주문 항목을 추가해주세요.');
      return;
    }
    if (!customerName.trim()) {
      alert('고객명을 입력해주세요.');
      return;
    }
    if (!churchGroup.trim()) {
      alert('소속 목장을 입력해주세요.');
      return;
    }
    setShowReview(true);
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.total_price, 0);

  const submitOrder = async () => {
    if (!customerName.trim()) {
      alert('고객명을 입력해주세요.');
      return;
    }

    if (!churchGroup.trim()) {
      alert('소속 목장을 입력해주세요.');
      return;
    }

    if (cart.length === 0) {
      alert('주문 항목을 추가해주세요.');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token || null;

    if (!accessToken) {
      alert('로그인 정보가 확인되지 않아 주문을 생성할 수 없습니다. 다시 로그인 해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('intent', editingOrder ? 'updateOrder' : 'createOrder');
    if (editingOrder) {
      formData.append('orderId', editingOrder.id);
    }
    formData.append('customerName', customerName);
    formData.append('churchGroup', churchGroup);
    formData.append('paymentMethod', 'transfer');
    formData.append('notes', notes);
    formData.append('accessToken', accessToken);
    if (!editingOrder && selectedCouponId) {
      formData.append('couponId', selectedCouponId);
    }
    const orderItems = cart.flatMap(item =>
      normalizeItemOptions(item.options, item.quantity).map((options) => ({
        menu_id: item.menu.id,
        quantity: 1,
        unit_price: item.menu.price,
        total_price: item.menu.price,
        notes: buildItemNotes(options, item.menu.category),
      }))
    );

    formData.append('items', JSON.stringify(orderItems));

    fetcher.submit(formData, { method: 'post' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openReview();
  };

  // Safari 호환성을 위한 안전한 네비게이션 상태 체크
  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/orders/new") {
    return <MenuListSkeleton />;
  }

  // 장바구니 아이템 렌더러 (모바일 스크롤 영역 + 데스크톱 사이드바에서 공유)
  const CartItemList = ({ maxHeight }: { maxHeight?: string }) => (
    cart.length === 0 ? (
      <div className="rounded-2xl border border-dashed border-hairline bg-surface-soft px-4 py-8 text-center">
        <p className="text-sm font-bold text-ash">메뉴 사진을 눌러 담아주세요</p>
      </div>
    ) : (
      <div className={`space-y-2 overflow-y-auto pr-1 ${maxHeight ?? ''}`}>
        {cart.map((item) => (
          <div key={item.menu.id} className="rounded-2xl bg-surface-soft p-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-black leading-tight text-ink">{item.menu.name}</h4>
                <p className="mt-1 text-xs font-bold text-mute">₩{item.menu.price.toLocaleString()} · {item.quantity}개</p>
              </div>
              <button
                type="button"
                onClick={() => removeFromCart(item.menu.id)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canvas text-base font-black text-mute transition-colors hover:bg-secondary-bg hover:text-ink"
                aria-label={`${item.menu.name} 삭제`}
              >
                ×
              </button>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-full bg-canvas p-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.menu.id, item.quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-card text-sm font-black text-body transition-colors hover:bg-secondary-bg"
                  aria-label={`${item.menu.name} 장바구니 수량 줄이기`}
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  max="99"
                  value={item.quantity}
                  onChange={(event) => {
                    const value = parseInt(event.target.value) || 0;
                    const clampedValue = Math.min(Math.max(value, 0), 99);
                    updateQuantity(item.menu.id, clampedValue);
                  }}
                  className="h-7 w-9 rounded-full border-0 bg-transparent text-center text-xs font-black text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer"
                />
                <button
                  type="button"
                  onClick={() => updateQuantity(item.menu.id, item.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-card text-sm font-black text-body transition-colors hover:bg-secondary-bg"
                  aria-label={`${item.menu.name} 장바구니 수량 늘리기`}
                >
                  +
                </button>
              </div>
              <span className="text-sm font-black text-ink">₩{item.total_price.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>
    )
  );

  return (
    // 모바일: pb는 고정 하단 패널(~172px) + 하단 내비(~80px) = 252px 확보
    <div className="min-h-screen bg-surface-soft pb-[calc(252px+env(safe-area-inset-bottom,0px))] lg:pb-20">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-12 lg:px-12">
        <div className="mb-6 animate-fade-in sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-black tracking-tight text-ink sm:mb-3 sm:text-5xl">
                {editingOrder ? '주문 수정' : '새 주문'}
              </h1>
              <p className="text-sm font-medium text-mute sm:text-lg">
                {editingOrder ? '제조 시작 전 주문만 메뉴를 다시 조정할 수 있습니다' : '메뉴 사진을 누르면 바로 장바구니에 담깁니다'}
              </p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-hairline-soft bg-canvas px-4 py-2 text-sm font-bold text-body">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {cartCount}개 선택 · ₩{totalAmount.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* ── 메뉴 선택 섹션 ── */}
          <section className="animate-slide-up rounded-[32px] border border-hairline-soft bg-canvas p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-ink sm:text-3xl">메뉴 선택</h2>
                <p className="mt-1 text-sm font-medium text-mute">전체 메뉴를 카테고리별로 한 번에 확인하세요</p>
              </div>
              <div className="rounded-full bg-surface-card px-3 py-2 text-xs font-bold text-mute">
                메뉴명 · 가격 · 담기
              </div>
            </div>

            <div className="mb-5 flex gap-2 overflow-x-auto pb-1 sm:mb-6">
              {categories.map((category) => {
                const categoryCount = menus.filter(menu => menu.category === category.id).length;
                return (
                  <a
                    key={category.id}
                    href={`#menu-section-${category.id.replace(/\s+/g, '-')}`}
                    className="shrink-0 rounded-2xl border border-hairline-soft bg-surface-card px-4 py-3 text-left text-body transition-colors hover:border-ash"
                  >
                    <span className="block text-sm font-black">{category.name}</span>
                    <span className="mt-1 block text-xs font-bold text-mute">
                      {categoryCount}개 메뉴
                    </span>
                  </a>
                );
              })}
            </div>

            <div className="space-y-6">
              {categoriesWithMenus.map((category, categoryIndex) => (
                <section
                  key={category.id}
                  id={`menu-section-${category.id.replace(/\s+/g, '-')}`}
                  className="scroll-mt-4"
                >
                  <div className="mb-3 flex items-center justify-between border-b border-hairline-soft pb-2">
                    <h3 className="text-lg font-black text-ink">{category.name}</h3>
                    <span className="rounded-full bg-surface-card px-3 py-1 text-xs font-bold text-mute">
                      {category.items.length}개
                    </span>
                  </div>
                  <div className={`overflow-hidden rounded-2xl border border-hairline-soft ${categoryIndex % 2 === 1 ? 'bg-surface-soft' : 'bg-canvas'}`}>
                    {category.items.map((menu, index) => {
                      const cartItem = getCartItem(menu.id);
                      return (
                        <article
                          key={menu.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => addToCart(menu)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              addToCart(menu);
                            }
                          }}
                          className={`flex items-center gap-3 p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-focus-outer sm:p-4 ${
                            index > 0 ? 'border-t border-hairline-soft' : ''
                          } ${cartItem ? 'bg-primary/5' : 'hover:bg-surface-card'}`}
                        >
                          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-card sm:h-16 sm:w-16">
                            {menu.image_url ? (
                              <img
                                src={menu.image_url}
                                alt={menu.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                key={`order-image-${menu.id}-${menu.image_url}`}
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-stone">
                                준비중
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="rounded-full bg-surface-card px-2 py-0.5 text-[10px] font-black text-mute">
                                {getMenuCategoryLabel(menu.category)}
                              </span>
                            </div>
                            <h4 className="line-clamp-2 text-sm font-black leading-tight text-ink sm:text-base">{menu.name}</h4>
                            <p className="mt-1 text-sm font-black text-ink">₩{menu.price.toLocaleString()}</p>
                          </div>
                          {cartItem ? (
                            <div
                              className="flex shrink-0 items-center gap-1 rounded-full bg-surface-card p-1"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => updateQuantity(menu.id, cartItem.quantity - 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-sm font-black text-body transition-colors hover:bg-secondary-bg"
                                aria-label={`${menu.name} 수량 줄이기`}
                              >
                                -
                              </button>
                              <span className="w-7 text-center text-sm font-black text-ink">{cartItem.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(menu.id, cartItem.quantity + 1)}
                                className="flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-sm font-black text-body transition-colors hover:bg-secondary-bg"
                                aria-label={`${menu.name} 수량 늘리기`}
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                addToCart(menu);
                              }}
                              className="h-10 shrink-0 rounded-2xl bg-surface-card px-4 text-sm font-black text-ink transition-colors hover:bg-secondary-bg"
                            >
                              담기
                            </button>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </section>

          {/* ── 주문 정보 사이드바 (데스크톱 전용) ── */}
          <aside className="hidden lg:block lg:sticky lg:top-8 lg:self-start">
            <div className="animate-slide-up rounded-[32px] border border-hairline-soft bg-canvas p-6" style={{ animationDelay: '0.1s' }}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-ink">주문 정보</h2>
                  <p className="mt-1 text-sm font-medium text-mute">주문보기에서 옵션까지 확인하세요</p>
                </div>
                <div className="rounded-full bg-surface-card px-3 py-2 text-sm font-black text-ink">{cartCount}개</div>
              </div>

              <fetcher.Form method="post" onSubmit={handleSubmit} className="space-y-5">
                <div className="rounded-2xl bg-surface-card p-4">
                  <div className="flex items-center justify-between text-sm font-bold text-mute">
                    <span>선택 메뉴</span>
                    <span>{cart.length}종</span>
                  </div>
                  <div className="mt-2 flex items-end justify-between">
                    <span className="text-sm font-bold text-body">총 결제금액</span>
                    <span className="text-2xl font-black text-ink">₩{totalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-body">고객명 *</label>
                    <input
                      type="text"
                      value={customerName}
                      readOnly
                      className="h-11 w-full rounded-2xl border border-hairline bg-surface-soft px-4 text-sm font-bold text-ink opacity-80"
                      placeholder="고객명"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-body">목장명</label>
                    <input
                      type="text"
                      value={churchGroup}
                      readOnly
                      className="h-11 w-full rounded-2xl border border-hairline bg-surface-soft px-4 text-sm font-bold text-ink opacity-80"
                      placeholder="목장명"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-black text-body">요청사항</label>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-2xl border border-hairline bg-surface-soft px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer"
                    placeholder="샷 추가, 얼음 적게 등 요청사항"
                  />
                </div>

                <div>
                  <h3 className="mb-3 text-lg font-black text-ink">장바구니</h3>
                  <CartItemList maxHeight="max-h-[340px]" />
                </div>

                <button
                  type="button"
                  onClick={openReview}
                  disabled={cart.length === 0 || !customerName.trim() || !churchGroup.trim() || isSubmitting}
                  className="h-14 w-full rounded-2xl bg-primary px-6 text-base font-black text-white transition-colors hover:bg-primary-pressed disabled:cursor-not-allowed disabled:bg-surface-card disabled:text-ash"
                >
                  {isSubmitting ? (editingOrder ? '수정 중...' : '주문 처리 중...') : `₩${totalAmount.toLocaleString()} ${editingOrder ? '수정 확인' : '주문보기'}`}
                </button>
              </fetcher.Form>
            </div>
          </aside>
        </div>

        {/* ── 모바일 전용: 장바구니 + 요청사항 (스크롤 영역) ── */}
        <section className="mt-4 animate-slide-up rounded-[32px] border border-hairline-soft bg-canvas p-4 lg:hidden">
          <h2 className="mb-4 text-xl font-black text-ink">장바구니 & 요청사항</h2>
          <CartItemList />
          <div className="mt-4">
            <label className="mb-1.5 block text-sm font-black text-body">요청사항</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-2xl border border-hairline bg-surface-soft px-4 py-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer"
              placeholder="샷 추가, 얼음 적게 등 요청사항"
            />
          </div>
        </section>
      </main>

      {/* ── 모바일 전용: 고정 하단 주문 패널 ── */}
      <div className={`mobile-order-panel fixed left-0 right-0 px-4 lg:hidden ${showReview ? 'hidden' : ''}`}>
        <div className="rounded-[24px] border border-hairline-soft bg-canvas p-4 shadow-[0_-4px_24px_rgba(0,0,0,0.10)]">
          {/* 고객 정보 칩 */}
          {(customerName || churchGroup) && (
            <div className="mb-3 flex items-center gap-2 overflow-hidden">
              {customerName && (
                <span className="shrink-0 rounded-full bg-surface-card px-3 py-1 text-xs font-bold text-body">
                  {customerName}
                </span>
              )}
              {churchGroup && (
                <span className="truncate rounded-full bg-surface-card px-3 py-1 text-xs font-bold text-body">
                  {churchGroup}
                </span>
              )}
            </div>
          )}

          {/* 총금액 + 주문보기 */}
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="text-xs font-bold text-mute">{cartCount}개 선택</p>
              <p className="text-xl font-black text-ink">₩{totalAmount.toLocaleString()}</p>
            </div>
            <button
              type="button"
              onClick={openReview}
              disabled={cart.length === 0 || !customerName.trim() || !churchGroup.trim() || isSubmitting}
              className="h-12 flex-1 rounded-2xl bg-primary text-sm font-black text-white transition-colors active:bg-primary-pressed disabled:cursor-not-allowed disabled:bg-surface-card disabled:text-ash"
            >
              {isSubmitting ? (editingOrder ? '수정 중...' : '처리 중...') : (editingOrder ? '수정 확인' : '주문보기')}
            </button>
          </div>
        </div>
      </div>
      <OrderReviewSheet
        cart={cart}
        isOpen={showReview}
        isSubmitting={isSubmitting}
        notes={notes}
        customerName={customerName}
        churchGroup={churchGroup}
        onClose={() => setShowReview(false)}
        onUpdateQuantity={updateQuantity}
        onUpdateOptions={updateItemOptions}
        onNotesChange={setNotes}
        onSubmit={submitOrder}
        submitLabel={`₩${totalAmount.toLocaleString()} ${editingOrder ? '수정 저장' : '주문하기'}`}
        submittingLabel={editingOrder ? '수정 중...' : '주문 처리 중...'}
        coupons={editingOrder ? [] : coupons}
        selectedCouponId={selectedCouponId}
        onSelectCoupon={editingOrder ? undefined : setSelectedCouponId}
      />
    </div>
  );
} 
