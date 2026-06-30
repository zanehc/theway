import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { createServerSupabaseClient } from "~/lib/supabase";
import { createCoupon, getAllCoupons } from "~/lib/database";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@theway-cafe.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// 쿠폰 알림 메시지 생성
function buildCouponMessage(discountPercent: number, description: string) {
  const base = `🎟️ ${discountPercent}% 할인 쿠폰이 발급되었어요! 주문 시 사용할 수 있습니다.`;
  return description ? `${base} (${description})` : base;
}

// 쿠폰 발급 대상 회원 id 목록 조회
async function resolveCouponRecipients(
  supabase: SupabaseClient,
  targetType: "user" | "group",
  targetUserId: string,
  targetChurchGroup: string
): Promise<string[]> {
  if (targetType === "user") {
    return targetUserId ? [targetUserId] : [];
  }
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("church_group", targetChurchGroup);
  if (error) {
    console.error("쿠폰 대상 목장 회원 조회 실패:", error);
    return [];
  }
  return Array.from(
    new Set((data || []).map((u: any) => u.id).filter(Boolean) as string[])
  );
}

// notifications.order_id 가 NOT NULL 인 환경을 대비해 null → 최근 주문 id 순으로 시도
async function getFallbackOrderId(supabase: SupabaseClient): Promise<string | null> {
  const { data } = await supabase
    .from("orders")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return typeof data?.id === "string" ? data.id : null;
}

async function insertCouponNotifications(
  supabase: SupabaseClient,
  userIds: string[],
  message: string
) {
  const buildRows = (orderId: string | null) =>
    userIds.map((userId) => ({
      user_id: userId,
      order_id: orderId,
      type: "coupon",
      message,
    }));

  const { error } = await supabase.from("notifications").insert(buildRows(null));
  if (!error) return;

  console.error("쿠폰 알림 저장(null order_id) 실패, fallback 시도:", error);
  const fallbackOrderId = await getFallbackOrderId(supabase);
  if (!fallbackOrderId) throw error;

  const fallbackResult = await supabase.from("notifications").insert(buildRows(fallbackOrderId));
  if (fallbackResult.error) throw fallbackResult.error;
}

async function sendCouponWebPush(
  supabase: SupabaseClient,
  userIds: string[],
  message: string
) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || userIds.length === 0) {
    return;
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (error) {
    console.error("쿠폰 푸시 구독 조회 실패:", error);
    return;
  }
  if (!subs?.length) return;

  const payload = JSON.stringify({
    title: "이음카페 쿠폰 발급",
    body: message,
    tag: "coupon",
    url: "/orders/new",
  });

  await Promise.allSettled(
    subs.map((sub: any) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
        .catch((err: any) => {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", sub.user_id)
              .eq("endpoint", sub.endpoint);
          }
          console.error("쿠폰 푸시 발송 오류:", err?.statusCode);
        })
    )
  );
}

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

      // 발급 대상에게 쿠폰 발급 알림(인앱 + 웹푸시) 발송. 실패해도 발급 자체는 성공 처리.
      let notifiedCount = 0;
      try {
        const recipients = await resolveCouponRecipients(
          admin.supabase,
          targetType,
          targetUserId,
          targetChurchGroup
        );
        if (recipients.length > 0) {
          const message = buildCouponMessage(Math.round(discountPercent), description);
          await insertCouponNotifications(admin.supabase, recipients, message);
          await sendCouponWebPush(admin.supabase, recipients, message);
          notifiedCount = recipients.length;
        }
      } catch (notifyError) {
        console.error("쿠폰 발급 알림 발송 실패:", notifyError);
      }

      return json({ success: true, coupon, notifiedCount });
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
