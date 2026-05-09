import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createServerSupabaseClient } from "~/lib/supabase";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || 30);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 50)
    : 30;
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return json({ error: "인증 정보가 없습니다.", orders: [] }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authData.user) {
    return json({ error: "로그인이 만료되었습니다.", orders: [] }, { status: 401 });
  }

  const effectiveUserId = authData.user.id;

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      user_id,
      customer_name,
      church_group,
      total_amount,
      status,
      payment_status,
      payment_method,
      created_at,
      order_items (
        id,
        menu_id,
        quantity,
        unit_price,
        total_price,
        notes,
        menu:menus (id, name, price)
      )
    `)
    .eq("user_id", effectiveUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!error) {
    return json(
      { orders: data || [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  console.error("API get order history join error, falling back:", error);

  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", effectiveUserId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (ordersError) {
    console.error("API get order history fallback error:", ordersError);
    return json({ error: "주문 내역을 불러오지 못했습니다.", orders: [] }, { status: 500 });
  }

  const orderIds = (orders || []).map((order) => order.id);
  if (orderIds.length === 0) {
    return json({ orders: [] }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", orderIds);

  if (itemsError) {
    console.error("API get order items fallback error:", itemsError);
  }

  const menuIds = [...new Set((items || []).map((item) => item.menu_id).filter(Boolean))];
  const { data: menus, error: menusError } = menuIds.length > 0
    ? await supabase.from("menus").select("id, name, price").in("id", menuIds)
    : { data: [], error: null };

  if (menusError) {
    console.error("API get menus fallback error:", menusError);
  }

  const menuById = new Map((menus || []).map((menu) => [menu.id, menu]));
  const itemsByOrderId = new Map<string, any[]>();

  for (const item of items || []) {
    const orderItems = itemsByOrderId.get(item.order_id) || [];
    orderItems.push({ ...item, menu: menuById.get(item.menu_id) || null });
    itemsByOrderId.set(item.order_id, orderItems);
  }

  const mergedOrders = (orders || []).map((order) => ({
    ...order,
    order_items: itemsByOrderId.get(order.id) || [],
  }));

  return json(
    { orders: mergedOrders },
    { headers: { "Cache-Control": "no-store" } }
  );
}
