import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useFetcher, useOutletContext, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getMenus, createOrder } from "~/lib/database";

import type { Menu } from "~/types";
import { supabase } from "~/lib/supabase";
import { MenuListSkeleton } from "~/components/LoadingSkeleton";

// 메뉴 데이터 캐시 (메뉴는 자주 변경되지 않으므로 더 긴 캐시 시간)
const menuCache = { data: null as any, timestamp: 0 };
const MENU_CACHE_DURATION = 300000; // 5분

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

  if (intent === 'createOrder') {
    try {
      const customerName = formData.get('customerName') as string;
      const churchGroup = formData.get('churchGroup') as string;
      const paymentMethod = formData.get('paymentMethod') as 'cash' | 'transfer';
      const notes = formData.get('notes') as string;
      const items = JSON.parse(formData.get('items') as string);
      const userId = formData.get('userId') as string; // 클라이언트에서 전송한 사용자 ID

      if (!customerName || !items || items.length === 0) {
        return json({ error: '고객명과 주문 항목을 입력해주세요.' }, { status: 400 });
      }

      const totalAmount = items.reduce((sum: number, item: any) => sum + item.total_price, 0);

      // 서버 사이드에서도 사용자 확인 (백업)
      let finalUserId: string | undefined = userId || undefined;
      if (!finalUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        finalUserId = user?.id || undefined;
      }

      // userId가 없으면 주문 생성 거부
      if (!finalUserId) {
        return json({ error: '로그인 정보가 확인되지 않아 주문을 생성할 수 없습니다. 다시 로그인 해주세요.' }, { status: 400 });
      }
      
      console.log('🔍 Creating order with user info:', {
        clientUserId: userId,
        finalUserId,
        customerName,
        userExists: !!finalUserId
      });

      const result = await createOrder({
        user_id: finalUserId || undefined,
        customer_name: customerName,
        church_group: churchGroup || undefined,
        payment_method: paymentMethod,
        notes: notes || undefined,
        total_amount: totalAmount,
        items: items,
      });

      console.log('📝 Order created successfully:', result);
      console.log('📝 Order user_id check:', { orderUserId: result.user_id, finalUserId });
      return json({ success: true, orderId: result.id });
    } catch (error) {
      console.error('Create order error:', error);
      return json({ error: '주문 생성에 실패했습니다.' }, { status: 400 });
    }
  }

  return json({ error: '잘못된 요청입니다.' }, { status: 400 });
}

type CartItem = {
  menu: Menu;
  quantity: number;
  total_price: number;
};

export default function NewOrder() {
  const { menus: loadedMenus } = useLoaderData<typeof loader>();
  const menus = loadedMenus as unknown as Menu[];
  const outletContext = useOutletContext<{ user: any; userRole: string | null }>();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [churchGroup, setChurchGroup] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('transfer');
  const [notes, setNotes] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ice coffee');

  // 주문 제출 상태 확인
  const isSubmitting = fetcher.state === 'submitting';
  const actionData = fetcher.data as { error?: string; success?: boolean; orderId?: string } | undefined;

  useEffect(() => {
    async function fetchUserInfo() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('name, church_group')
          .eq('id', user.id)
          .single();
        if (userData) {
          setCustomerName(typeof userData.name === 'string' ? userData.name : '');
          setChurchGroup(typeof userData.church_group === 'string' ? userData.church_group : '');
        }
      }
    }
    fetchUserInfo();

    // 재주문 정보가 있으면 자동 채우기
    const reorderRaw = localStorage.getItem('reorder');
    if (reorderRaw) {
      try {
        const reorder = JSON.parse(reorderRaw);
        setCustomerName(reorder.customerName || '');
        setChurchGroup(reorder.churchGroup || '');
        setPaymentMethod(reorder.paymentMethod || 'transfer');
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
  }, [menus]);

  // 주문 생성 결과 처리
  useEffect(() => {
    if (actionData?.error) {
      alert(actionData.error);
    } else if (actionData?.success) {
      console.log('✅ Order created successfully, redirecting to home...');
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
    { id: 'beverage', name: '음료', shortName: 'Ade' }
  ];

  // 선택된 카테고리에 따른 메뉴 필터링
  const filteredMenus = menus.filter(menu => menu.category === selectedCategory);
  const selectedCategoryInfo = categories.find(category => category.id === selectedCategory) || categories[0];
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const getCartItem = (menuId: string) => cart.find(item => item.menu.id === menuId);
  const getMenuCategoryLabel = (categoryId: string) =>
    categories.find(category => category.id === categoryId)?.shortName || categoryId;

  const addToCart = (menu: Menu) => {
    setCart(prev => {
      const existingItem = prev.find(item => item.menu.id === menu.id);
      if (existingItem) {
        return prev.map(item =>
          item.menu.id === menu.id
            ? { ...item, quantity: item.quantity + 1, total_price: (item.quantity + 1) * menu.price }
            : item
        );
      }
      return [...prev, { menu, quantity: 1, total_price: menu.price }];
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
              ? { ...item, quantity, total_price: quantity * item.menu.price }
              : item
          );
        } else {
          // 아이템이 없으면 새로 추가
          const menu = menus.find(m => m.id === menuId);
          if (menu) {
            return [...prev, { menu, quantity, total_price: quantity * menu.price }];
          }
        }
        return prev;
      });
    }
  };

  const removeFromCart = (menuId: string) => {
    setCart(prev => prev.filter(item => item.menu.id !== menuId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.total_price, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerName.trim()) {
      alert('고객명을 입력해주세요.');
      return;
    }

    if (cart.length === 0) {
      alert('주문 항목을 추가해주세요.');
      return;
    }

    // 클라이언트에서 사용자 ID 가져오기
    const getCurrentUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    };

    getCurrentUserId().then(userId => {
      if (!userId) {
        alert('로그인 정보가 확인되지 않아 주문을 생성할 수 없습니다. 다시 로그인 해주세요.');
        return;
      }
      const formData = new FormData();
      formData.append('intent', 'createOrder');
      formData.append('customerName', customerName);
      formData.append('churchGroup', churchGroup);
      formData.append('paymentMethod', paymentMethod);
      formData.append('notes', notes);
      formData.append('userId', userId || ''); // 사용자 ID 추가
      formData.append('items', JSON.stringify(cart.map(item => ({
        menu_id: item.menu.id,
        quantity: item.quantity,
        unit_price: item.menu.price,
        total_price: item.total_price,
      }))));

      fetcher.submit(formData, { method: 'post' });
    });
  };

  // Safari 호환성을 위한 안전한 네비게이션 상태 체크
  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/orders/new") {
    return <MenuListSkeleton />;
  }

  return (
    <div className="min-h-screen bg-surface-soft pb-20">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-12 lg:px-12">
        <div className="mb-6 animate-fade-in sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-black tracking-tight text-ink sm:mb-3 sm:text-5xl">새 주문</h1>
              <p className="text-sm font-medium text-mute sm:text-lg">메뉴 사진을 누르면 바로 장바구니에 담깁니다</p>
            </div>
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-hairline-soft bg-canvas px-4 py-2 text-sm font-bold text-body">
              <span className="h-2 w-2 rounded-full bg-primary" />
              {cartCount}개 선택 · ₩{totalAmount.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="animate-slide-up rounded-[32px] border border-hairline-soft bg-canvas p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-ink sm:text-3xl">메뉴 선택</h2>
                <p className="mt-1 text-sm font-medium text-mute">{selectedCategoryInfo.name} 메뉴 {filteredMenus.length}개</p>
              </div>
              <div className="rounded-full bg-surface-card px-3 py-2 text-xs font-bold text-mute">
                사진 · 메뉴명 · 가격 순서로 확인
              </div>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-4">
              {categories.map((category) => {
                const categoryCount = menus.filter(menu => menu.category === category.id).length;

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                      selectedCategory === category.id
                        ? 'border-ink bg-ink text-white'
                        : 'border-hairline-soft bg-surface-card text-body hover:border-ash'
                    }`}
                  >
                    <span className="block text-sm font-black">{category.name}</span>
                    <span className={`mt-1 block text-xs font-bold ${
                      selectedCategory === category.id ? 'text-white/75' : 'text-mute'
                    }`}>
                      {categoryCount}개 메뉴
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {filteredMenus.length === 0 ? (
                <div className="col-span-full rounded-2xl bg-surface-card px-4 py-12 text-center">
                  <p className="text-base font-bold text-ash">선택한 카테고리에 메뉴가 없습니다.</p>
                </div>
              ) : (
                filteredMenus.map((menu) => {
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
                      className={`group overflow-hidden rounded-2xl border bg-canvas transition-colors focus:outline-none focus:ring-2 focus:ring-focus-outer ${
                        cartItem ? 'border-primary' : 'border-hairline-soft hover:border-ash'
                      }`}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden bg-surface-card">
                        {menu.image_url ? (
                          <img
                            src={menu.image_url}
                            alt={menu.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            key={`order-image-${menu.id}-${menu.image_url}`}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-bold text-stone">
                            이미지 준비중
                          </div>
                        )}
                        <span className="absolute left-2 top-2 rounded-full bg-canvas/95 px-2.5 py-1 text-[11px] font-black text-ink">
                          {getMenuCategoryLabel(menu.category)}
                        </span>
                        {cartItem && (
                          <span className="absolute right-2 top-2 flex h-8 min-w-8 items-center justify-center rounded-full bg-primary px-2 text-xs font-black text-white">
                            x{cartItem.quantity}
                          </span>
                        )}
                      </div>

                      <div className="p-3">
                        <h3 className="min-h-[40px] text-sm font-black leading-tight text-ink">{menu.name}</h3>
                        {menu.description && (
                          <p className="mt-1 h-9 overflow-hidden text-xs leading-[1.45] text-mute">{menu.description}</p>
                        )}
                        <div className="mt-3 flex min-h-[36px] items-center justify-between gap-2">
                          <span className="text-sm font-black text-ink">₩{menu.price.toLocaleString()}</span>
                          {cartItem ? (
                            <div
                              className="flex items-center gap-1 rounded-full bg-surface-card p-1"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() => updateQuantity(menu.id, cartItem.quantity - 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-canvas text-sm font-black text-body transition-colors hover:bg-secondary-bg"
                                aria-label={`${menu.name} 수량 줄이기`}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={cartItem.quantity}
                                onChange={(event) => {
                                  const value = parseInt(event.target.value) || 0;
                                  const clampedValue = Math.min(Math.max(value, 0), 99);
                                  updateQuantity(menu.id, clampedValue);
                                }}
                                className="h-7 w-8 rounded-full border-0 bg-transparent text-center text-xs font-black text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer"
                                style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
                                aria-label={`${menu.name} 수량`}
                              />
                              <button
                                type="button"
                                onClick={() => updateQuantity(menu.id, cartItem.quantity + 1)}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-canvas text-sm font-black text-body transition-colors hover:bg-secondary-bg"
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
                              className="rounded-full bg-surface-card px-3 py-2 text-xs font-black text-ink transition-colors hover:bg-secondary-bg"
                            >
                              담기
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="animate-slide-up rounded-[32px] border border-hairline-soft bg-canvas p-4 sm:p-6" style={{ animationDelay: '0.1s' }}>
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black text-ink">주문 정보</h2>
                  <p className="mt-1 text-sm font-medium text-mute">확인 후 주문 완료를 눌러주세요</p>
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

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-body">고객명 *</label>
                    <input
                      type="text"
                      value={customerName}
                      readOnly
                      className="h-11 w-full rounded-2xl border border-hairline bg-surface-soft px-4 text-sm font-bold text-ink opacity-80"
                      placeholder="고객명"
                      required
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
                  <label className="mb-2 block text-sm font-black text-body">결제 방법</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={`h-11 rounded-2xl border text-sm font-black transition-colors ${
                        paymentMethod === 'transfer'
                          ? 'border-ink bg-ink text-white'
                          : 'border-hairline-soft bg-surface-card text-body hover:border-ash'
                      }`}
                    >
                      계좌이체
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={`h-11 rounded-2xl border text-sm font-black transition-colors ${
                        paymentMethod === 'cash'
                          ? 'border-ink bg-ink text-white'
                          : 'border-hairline-soft bg-surface-card text-body hover:border-ash'
                      }`}
                    >
                      현금
                    </button>
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
                  {cart.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-hairline bg-surface-soft px-4 py-8 text-center">
                      <p className="text-sm font-bold text-ash">왼쪽 메뉴 사진을 눌러 담아주세요</p>
                    </div>
                  ) : (
                    <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
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
                  )}
                </div>

                <button
                  type="submit"
                  disabled={cart.length === 0 || !customerName.trim() || isSubmitting}
                  className="h-14 w-full rounded-2xl bg-primary px-6 text-base font-black text-white transition-colors hover:bg-primary-pressed disabled:cursor-not-allowed disabled:bg-surface-card disabled:text-ash"
                >
                  {isSubmitting ? '주문 처리 중...' : `₩${totalAmount.toLocaleString()} 주문 완료`}
                </button>
              </fetcher.Form>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
} 
