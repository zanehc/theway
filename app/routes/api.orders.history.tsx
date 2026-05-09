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
`;

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

  // 관리자 여부를 service role로 확인 (RLS 무관하게 역할 조회)
  const serviceClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const { data: profile } = await serviceClient
    .from("users")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const isAdmin = profile?.role === "admin" || profile?.role === "staff";

  // 관리자/스태프: 전체 주문 조회 (service role, RLS 우회)
  // 일반 고객: 본인 주문만 (anon key + JWT)
  if (isAdmin) {
    const { data, error } = await serviceClient
      .from("orders")
      .select(ORDER_SELECT)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Admin order history error:", error);
      return json({ error: "주문 내역을 불러오지 못했습니다.", orders: [] }, { status: 500 });
    }

    return json({ orders: data || [], isAdmin: true }, { headers: { "Cache-Control": "no-store" } });
  }

  // 일반 고객: JWT를 Authorization 헤더로 전달 → PostgREST RLS 적용, 본인 주문만
  const userClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

  const { data, error } = await userClient
    .from("orders")
    .select(ORDER_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("API get order history error:", error);
    return json({ error: "주문 내역을 불러오지 못했습니다.", orders: [] }, { status: 500 });
  }

  return json(
    { orders: data || [], isAdmin: false },
    { headers: { "Cache-Control": "no-store" } }
  );
}
