import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createServerSupabaseClient } from "~/lib/supabase";

export async function loader({ request }: LoaderFunctionArgs) {
  // Authorization 헤더로 최소 인증 확인
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ orders: [] }, { status: 401 });

  const supabase = createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) return json({ orders: [] }, { status: 401 });

  // admin 역할 확인
  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();
  if (userData?.role !== "admin") return json({ orders: [] }, { status: 403 });

  // service role로 전체 주문 조회 (RLS 우회)
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        id, menu_id, quantity, unit_price, total_price, notes,
        menu:menus (id, name, price)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  return json({ orders: orders || [] }, { headers: { "Cache-Control": "no-store" } });
}
