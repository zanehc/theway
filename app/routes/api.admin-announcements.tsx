import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { createServerSupabaseClient } from "~/lib/supabase";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:admin@theway-cafe.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
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
    console.error("Announcement admin role check failed:", roleError);
    return { error: json({ error: "관리자 권한 확인에 실패했습니다." }, { status: 500 }) };
  }

  if (userData?.role !== "admin" && userData?.role !== "staff") {
    return { error: json({ error: "관리자 권한이 필요합니다." }, { status: 403 }) };
  }

  return { supabase: createServerSupabaseClient(), user: authData.user };
}

async function sendWebPush(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userIds: string[],
  payload: { title: string; body: string; url: string }
) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || userIds.length === 0) {
    return { attempted: 0 };
  }

  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (error) {
    console.error("Announcement push subscription lookup failed:", error);
    return { attempted: 0 };
  }

  if (!subs?.length) return { attempted: 0 };

  const message = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: "announcement",
    url: payload.url,
  });

  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message
      ).catch((err) => {
        if (err.statusCode === 404 || err.statusCode === 410) {
          supabase.from("push_subscriptions").delete()
            .eq("user_id", sub.user_id).eq("endpoint", sub.endpoint);
        }
        console.error("Announcement web push send error:", (err as any).statusCode);
      })
    )
  );

  return { attempted: subs.length };
}

async function getFallbackOrderId(supabase: ReturnType<typeof createServerSupabaseClient>) {
  const { data } = await supabase
    .from("orders")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return typeof data?.id === "string" ? data.id : null;
}

async function insertAnnouncementNotifications(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userIds: string[],
  message: string
) {
  const buildRows = (orderId: string | null) =>
    userIds.map((userId) => ({
      user_id: userId,
      order_id: orderId,
      type: "announcement",
      message,
    }));

  let { error } = await supabase.from("notifications").insert(buildRows(null));
  if (!error) return { usedFallbackOrder: false };

  console.error("Announcement insert with null order_id failed:", error);
  const fallbackOrderId = await getFallbackOrderId(supabase);
  if (!fallbackOrderId) throw error;

  const fallbackResult = await supabase.from("notifications").insert(buildRows(fallbackOrderId));
  if (fallbackResult.error) throw fallbackResult.error;

  return { usedFallbackOrder: true };
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "지원하지 않는 요청입니다." }, { status: 405 });
  }

  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (message.length < 2) {
    return json({ error: "공지 내용을 입력해주세요." }, { status: 400 });
  }

  if (message.length > 500) {
    return json({ error: "공지 내용은 500자 이내로 입력해주세요." }, { status: 400 });
  }

  const { data: users, error: usersError } = await admin.supabase
    .from("users")
    .select("id")
    .not("id", "is", null);

  if (usersError) {
    console.error("Announcement recipients lookup failed:", usersError);
    return json({ error: "회원 목록을 불러오지 못했습니다." }, { status: 500 });
  }

  const userIds = Array.from(new Set((users || []).map((user) => user.id).filter(Boolean)));
  if (userIds.length === 0) {
    return json({ error: "알림을 받을 회원이 없습니다." }, { status: 400 });
  }

  try {
    const notificationResult = await insertAnnouncementNotifications(admin.supabase, userIds, message);
    const pushResult = await sendWebPush(admin.supabase, userIds, {
      title: "길을여는교회 공지",
      body: message,
      url: "/",
    });

    return json({
      success: true,
      recipientCount: userIds.length,
      pushCount: pushResult.attempted,
      usedFallbackOrder: notificationResult.usedFallbackOrder,
    });
  } catch (error) {
    console.error("Announcement send failed:", error);
    return json({ error: "공지 알림 발송에 실패했습니다." }, { status: 500 });
  }
}
