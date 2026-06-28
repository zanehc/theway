import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
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
    return { error: json({ error: "인증 정보가 없습니다.", orders: [] }, { status: 401 }) };
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const anonKey = process.env.SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !anonKey) {
    return { error: json({ error: "Supabase 환경 변수가 설정되지 않았습니다.", orders: [] }, { status: 500 }) };
  }

  const authSupabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authSupabase.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: json({ error: "로그인이 만료되었습니다.", orders: [] }, { status: 401 }) };
  }

  const { data: userData, error: roleError } = await authSupabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();

  if (roleError) {
    console.error("API admin role check failed:", roleError);
    return { error: json({ error: "관리자 권한 확인에 실패했습니다.", orders: [] }, { status: 500 }) };
  }

  if (userData?.role !== "admin" && userData?.role !== "staff") {
    return { error: json({ error: "관리자 권한이 필요합니다.", orders: [] }, { status: 403 }) };
  }

  const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
    ? createServerSupabaseClient()
    : authSupabase;

  return { supabase, user: authData.user };
}

function getOrderNumberLabel(order: { id?: string | null; order_number?: string | null }) {
  const orderNumber = order.order_number || order.id?.slice(-8) || '';
  return orderNumber ? `#${orderNumber}` : '';
}

function getStatusMessage(orderNumber: string, status: string, cancellationReason?: string) {
  switch (status) {
    case "preparing":
      return `주문이 제조 중입니다. (주문번호: ${orderNumber})`;
    case "ready":
      return `주문이 완료되었습니다! 픽업해주세요. (주문번호: ${orderNumber})`;
    case "completed":
      return `주문이 픽업 완료되었습니다. 감사합니다! (주문번호: ${orderNumber})`;
    case "cancelled":
      return cancellationReason
        ? `주문이 취소되었습니다. 사유: ${cancellationReason} (주문번호: ${orderNumber})`
        : `주문이 취소되었습니다. (주문번호: ${orderNumber})`;
    default:
      return `주문 상태가 변경되었습니다: ${status} (주문번호: ${orderNumber})`;
  }
}

async function createNotification(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  notification: { user_id: string; order_id: string; type: string; message: string }
) {
  const { error } = await supabase.from("notifications").insert(notification);
  if (error) {
    console.error("API admin notification insert failed:", error);
  }
}

async function sendWebPush(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  userId: string,
  payload: { title: string; body: string; orderId: string; url: string; tag?: string }
) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (!subs?.length) return;

  const message = JSON.stringify(payload);
  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        message
      ).catch((err) => {
        // 만료된 구독은 DB에서 제거
        if (err.statusCode === 404 || err.statusCode === 410) {
          supabase.from("push_subscriptions").delete()
            .eq("user_id", userId).eq("endpoint", sub.endpoint);
        }
        console.error("Web push send error:", (err as any).statusCode);
      })
    )
  );
}

function normalizeProfileValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getNotificationRecipientIds(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  order: { user_id?: string | null; customer_name?: string | null; church_group?: string | null }
) {
  const recipientIds = new Set<string>();
  if (order.user_id) recipientIds.add(order.user_id);

  const churchGroup = normalizeProfileValue(order.church_group);

  // 같은 목장 소속이면 그 목장 전 목원에게 알림이 가도록 목장만 일치 조회
  if (churchGroup) {
    const { data, error } = await supabase
      .from("users")
      .select("id")
      .eq("church_group", churchGroup);

    if (error) {
      console.error("API notification recipients lookup failed:", error);
    } else {
      data?.forEach((user) => {
        if (typeof user.id === "string") recipientIds.add(user.id);
      });
    }
  }

  return Array.from(recipientIds);
}

async function notifyOrderRecipients(
  supabase: ReturnType<typeof createServerSupabaseClient>,
  order: { user_id?: string | null; customer_name?: string | null; church_group?: string | null },
  notification: { order_id: string; type: string; message: string },
  pushPayload: { title: string; body: string; orderId: string; url: string; tag?: string }
) {
  const recipientIds = await getNotificationRecipientIds(supabase, order);

  await Promise.all(
    recipientIds.map((userId) =>
      Promise.all([
        createNotification(supabase, {
          user_id: userId,
          order_id: notification.order_id,
          type: notification.type,
          message: notification.message,
        }),
        sendWebPush(supabase, userId, pushPayload),
      ])
    )
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const url = new URL(request.url);
  const range = url.searchParams.get("range") || "all";
  const rawLimit = Number(url.searchParams.get("limit") || 500);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), 1000)
    : 500;

  let query = admin.supabase
    .from("orders")
    .select(`
      *,
      order_items (
        id, menu_id, quantity, unit_price, total_price, notes,
        menu:menus (id, name, price)
      )
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (range === "today") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    query = query
      .gte("created_at", start.toISOString())
      .lt("created_at", end.toISOString());
  }

  const { data: orders, error } = await query;

  if (error) {
    console.error("API admin orders fetch failed:", error);
    return json({ error: "관리자 주문 조회에 실패했습니다.", orders: [] }, { status: 500 });
  }

  return json({ orders: orders || [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function action({ request }: ActionFunctionArgs) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const payload = await request.json().catch(() => ({}));
  const intent = typeof payload.intent === "string" ? payload.intent : "";

  if (intent === "deleteOrders") {
    const orderIds = Array.isArray(payload.orderIds)
      ? payload.orderIds.filter((id: unknown): id is string => typeof id === "string")
      : [];

    if (orderIds.length === 0) {
      return json({ error: "삭제할 주문을 선택해주세요." }, { status: 400 });
    }

    // notifications → order_items → orders 순서로 삭제 (FK 순서 준수)
    await admin.supabase.from("notifications").delete().in("order_id", orderIds);

    const { error: itemsError } = await admin.supabase
      .from("order_items")
      .delete()
      .in("order_id", orderIds);

    if (itemsError) {
      console.error("API admin delete order_items failed:", itemsError);
      return json({ error: "주문 항목 삭제에 실패했습니다." }, { status: 500 });
    }

    const { error: ordersError } = await admin.supabase
      .from("orders")
      .delete()
      .in("id", orderIds);

    if (ordersError) {
      console.error("API admin delete orders failed:", ordersError);
      return json({ error: "주문 삭제에 실패했습니다." }, { status: 500 });
    }

    return json({ success: true, deletedCount: orderIds.length });
  }

  const orderId = typeof payload.orderId === "string" ? payload.orderId : "";

  if (!orderId) {
    return json({ error: "주문 ID가 없습니다." }, { status: 400 });
  }

  if (intent === "updateStatus") {
    const status = typeof payload.status === "string" ? payload.status : "";
    const cancellationReason = typeof payload.cancellationReason === "string"
      ? payload.cancellationReason.trim()
      : "";

    if (!status) {
      return json({ error: "변경할 주문 상태가 없습니다." }, { status: 400 });
    }

    const updatePayload: Record<string, string> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === "cancelled" && cancellationReason) {
      updatePayload.cancellation_reason = cancellationReason;
    }

    let { data: order, error } = await admin.supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", orderId)
      .select()
      .single();

    if (error && updatePayload.cancellation_reason) {
      console.warn("API cancellation reason update failed, retrying status only:", error);
      const retryResult = await admin.supabase
        .from("orders")
        .update({
          status,
          updated_at: updatePayload.updated_at,
        })
        .eq("id", orderId)
        .select()
        .single();
      order = retryResult.data;
      error = retryResult.error;
    }

    if (error || !order) {
      console.error("API admin status update failed:", error);
      return json({ error: "상태 업데이트에 실패했습니다." }, { status: 500 });
    }

    const orderNumber = getOrderNumberLabel(order);
    const message = getStatusMessage(orderNumber, status, cancellationReason);
    await notifyOrderRecipients(
      admin.supabase,
      order,
      {
        order_id: orderId,
        type: status === "cancelled" ? "order_cancelled" : "order_status",
        message,
      },
      {
        title: "이음카페",
        body: message,
        orderId,
        url: "/orders/history",
        tag: `${orderId}:${status === "cancelled" ? "order_cancelled" : "order_status"}`,
      }
    );

    return json({ success: true, order }, { headers: { "Cache-Control": "no-store" } });
  }

  return json({ error: "잘못된 요청입니다." }, { status: 400 });
}
