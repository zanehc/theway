import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "~/lib/supabase";
import { createCoupon, getAllCoupons } from "~/lib/database";

async function requireAdmin(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { error: json({ error: "인증 정보가 없습니다." }, { status: 401 }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !anonKey) {
    return { error: json({ error: "Supabase 환경 변수가 설정되지 않았습니다." }, { status: 500 }) };
  }

  const authSupabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authSupabase.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: json({ error: "로그인이 만료되었습니다." }, { status: 401 }) };
  }

  const { data: userData, error: roleError } = await authSupabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (roleError) {
    return { error: json({ error: "관리자 권한 확인에 실패했습니다." }, { status: 500 }) };
  }
  if (userData?.role !== "admin") {
    return { error: json({ error: "관리자 권한이 필요합니다." }, { status: 403 }) };
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServerSupabaseClient()
    : authSupabase;

  return { supabase, user: authData.user };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const coupons = await getAllCoupons(admin.supabase);

  // 대상 선택용: 회원 목록 + 목장 목록
  const { data: users } = await admin.supabase
    .from("users")
    .select("id, name, email, church_group, role")
    .order("name", { ascending: true });

  const churchGroups = Array.from(
    new Set(
      (users || [])
        .map((u: any) => (typeof u.church_group === "string" ? u.church_group.trim() : ""))
        .filter((g: string) => g.length > 0)
    )
  ).sort();

  return json(
    { coupons, users: users || [], churchGroups },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const payload = await request.json().catch(() => ({}));
  const intent = typeof payload.intent === "string" ? payload.intent : "";

  if (intent === "createCoupon") {
    const discountPercent = Number(payload.discountPercent);
    const targetType = payload.targetType === "group" ? "group" : "user";
    const targetUserId = typeof payload.targetUserId === "string" ? payload.targetUserId : "";
    const targetChurchGroup =
      typeof payload.targetChurchGroup === "string" ? payload.targetChurchGroup.trim() : "";
    const description = typeof payload.description === "string" ? payload.description.trim() : "";

    if (!Number.isFinite(discountPercent) || discountPercent < 5 || discountPercent > 100) {
      return json({ error: "할인율은 5%~100% 사이여야 합니다." }, { status: 400 });
    }
    if (targetType === "user" && !targetUserId) {
      return json({ error: "대상 회원을 선택해주세요." }, { status: 400 });
    }
    if (targetType === "group" && !targetChurchGroup) {
      return json({ error: "대상 목장을 입력해주세요." }, { status: 400 });
    }

    try {
      const coupon = await createCoupon(
        {
          discount_percent: Math.round(discountPercent),
          target_type: targetType,
          target_user_id: targetType === "user" ? targetUserId : null,
          target_church_group: targetType === "group" ? targetChurchGroup : null,
          description: description || null,
          created_by: admin.user.id,
        },
        admin.supabase
      );
      return json({ success: true, coupon });
    } catch (e: any) {
      console.error("쿠폰 발급 실패:", e);
      return json({ error: e?.message || "쿠폰 발급에 실패했습니다." }, { status: 500 });
    }
  }

  if (intent === "deactivateCoupon") {
    const couponId = typeof payload.couponId === "string" ? payload.couponId : "";
    if (!couponId) return json({ error: "쿠폰 ID가 없습니다." }, { status: 400 });

    const { error } = await admin.supabase
      .from("coupons")
      .update({ is_active: false })
      .eq("id", couponId);

    if (error) {
      return json({ error: "쿠폰 비활성화에 실패했습니다." }, { status: 500 });
    }
    return json({ success: true });
  }

  return json({ error: "잘못된 요청입니다." }, { status: 400 });
}
