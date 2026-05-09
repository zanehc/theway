import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

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

  // JWT를 Authorization 헤더에 직접 전달 → PostgREST가 로컬에서 검증 후 RLS 적용
  // auth.getUser() 네트워크 호출 없이 빠르게 처리
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );

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
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("API get order history error:", error);
    return json({ error: "주문 내역을 불러오지 못했습니다.", orders: [] }, { status: 500 });
  }

  return json(
    { orders: data || [] },
    { headers: { "Cache-Control": "no-store" } }
  );
}
