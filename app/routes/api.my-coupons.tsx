import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";
import { getCouponsForUser } from "~/lib/database";

// 주문 화면용: 로그인한 사용자가 쓸 수 있는 활성 쿠폰 목록을 반환.
// service role + 명시적 필터(getCouponsForUser)로 조회하여 RLS 서브쿼리 의존성을 제거한다.
export async function loader({ request }: LoaderFunctionArgs) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return json({ coupons: [], error: "인증 정보가 없습니다." }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) {
    return json({ coupons: [], error: "Supabase 환경 변수가 설정되지 않았습니다." }, { status: 500 });
  }

  const authSupabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authSupabase.auth.getUser(token);
  if (authError || !authData.user) {
    return json({ coupons: [], error: "로그인이 만료되었습니다." }, { status: 401 });
  }

  // 본인 목장 정보 조회 (목장 쿠폰 매칭용)
  const { data: userRow } = await authSupabase
    .from("users")
    .select("church_group")
    .eq("id", authData.user.id)
    .maybeSingle();

  const churchGroup =
    typeof userRow?.church_group === "string" ? userRow.church_group : null;

  // 클라이언트 인자를 넘기지 않으면 service role(getWriteClient)로 조회 → RLS 우회, 명시적 필터만 적용
  const coupons = await getCouponsForUser(authData.user.id, churchGroup);

  return json({ coupons }, { headers: { "Cache-Control": "no-store" } });
}
