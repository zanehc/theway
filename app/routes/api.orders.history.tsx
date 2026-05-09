import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

function getUserIdFromJWT(token: string): string | null {
  try {
    const base64Payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64Payload, "base64").toString("utf-8"));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

const ORDER_SELECT = `
  id,
  order_number,
  user_id,
  customer_name,
  church_group,
  total_amount,
  status,
  payment_status,
  payment_method,
  notes,
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
`;

function normalizeProfileValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function sortOrdersByCreatedAtDesc(orders: any[]) {
  return [...orders].sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return bTime - aTime;
  });
}

function mergeOrdersById(orderGroups: any[][], limit: number) {
  const merged = new Map<string, any>();

  for (const orders of orderGroups) {
    for (const order of orders) {
      if (order?.id && !merged.has(order.id)) {
        merged.set(order.id, order);
      }
    }
  }

  return sortOrdersByCreatedAtDesc(Array.from(merged.values())).slice(0, limit);
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const requestedLimit = Number(url.searchParams.get("limit") || 30);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(Math.floor(requestedLimit), 1), 200)
    : 30;
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return json({ error: "인증 정보가 없습니다.", orders: [] }, { status: 401 });
  }

  const userId = getUserIdFromJWT(token);
  if (!userId) {
    return json({ error: "토큰이 유효하지 않습니다.", orders: [] }, { status: 401 });
  }

  console.log("[orders/history] userId:", userId);

  // 관리자 여부를 service role로 확인 (RLS 무관하게 역할 조회)
  const serviceClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: profile, error: profileError } = await serviceClient
    .from("users")
    .select("role, name, church_group")
    .eq("id", userId)
    .maybeSingle();

  console.log("[orders/history] profile:", profile, "profileError:", profileError);

  if (profileError) {
    console.error("[orders/history] service role key 오류 or users 테이블 접근 불가:", profileError);
    return json({ error: "역할 확인에 실패했습니다. SUPABASE_SERVICE_ROLE_KEY를 확인하세요.", orders: [] }, { status: 500 });
  }

  const isAdmin = profile?.role === "admin" || profile?.role === "staff";
  console.log("[orders/history] isAdmin:", isAdmin);

  // 관리자/스태프: 전체 주문 조회 (service role, RLS 우회)
  // 일반 고객: 본인 주문만 (anon key + JWT)
  if (isAdmin) {
    const { data, error } = await serviceClient
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

    console.log("[orders/history] admin query result count:", data?.length, "error:", error);

    if (error) {
      console.error("Admin order history error:", error);
      return json({ error: "주문 내역을 불러오지 못했습니다.", orders: [] }, { status: 500 });
    }

    return json({ orders: data || [], isAdmin: true }, { headers: { "Cache-Control": "no-store" } });
  }

  const { data: ownOrders, error: ownOrdersError } = await serviceClient
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (ownOrdersError) {
    console.error("API get own order history error:", ownOrdersError);
    return json({ error: "주문 내역을 불러오지 못했습니다.", orders: [] }, { status: 500 });
  }

  const customerName = normalizeProfileValue(profile?.name);
  const churchGroup = normalizeProfileValue(profile?.church_group);
  let matchedOrders: any[] = [];

  if (customerName && churchGroup) {
    const { data, error } = await serviceClient
      .from("orders")
      .select(ORDER_SELECT)
      .eq("customer_name", customerName)
      .eq("church_group", churchGroup)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("API get matched order history error:", error);
      return json({ error: "주문 내역을 불러오지 못했습니다.", orders: [] }, { status: 500 });
    }

    matchedOrders = data || [];
  }

  return json(
    {
      orders: mergeOrdersById([ownOrders || [], matchedOrders], limit),
      isAdmin: false,
      matchByProfile: Boolean(customerName && churchGroup),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
