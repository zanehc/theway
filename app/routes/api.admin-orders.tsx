import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createServerSupabaseClient } from "~/lib/supabase";

async function requireAdmin(request: Request) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return { error: json({ error: "인증 정보가 없습니다.", orders: [] }, { status: 401 }) };
  }

  const supabase = createServerSupabaseClient();
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return { error: json({ error: "로그인이 만료되었습니다.", orders: [] }, { status: 401 }) };
  }

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", authData.user.id)
    .single();
  if (userData?.role !== "admin") {
    return { error: json({ error: "관리자 권한이 필요합니다.", orders: [] }, { status: 403 }) };
  }

  return { supabase, user: authData.user };
}

function getStatusMessage(orderId: string, status: string, cancellationReason?: string) {
  switch (status) {
    case "preparing":
      return `주문이 제조 중입니다. (주문번호: ${orderId.slice(-8)})`;
    case "ready":
      return `주문이 완료되었습니다! 픽업해주세요. (주문번호: ${orderId.slice(-8)})`;
    case "completed":
      return `주문이 픽업 완료되었습니다. 감사합니다! (주문번호: ${orderId.slice(-8)})`;
    case "cancelled":
      return cancellationReason
        ? `주문이 취소되었습니다. 사유: ${cancellationReason} (주문번호: ${orderId.slice(-8)})`
        : `주문이 취소되었습니다. (주문번호: ${orderId.slice(-8)})`;
    default:
      return `주문 상태가 변경되었습니다: ${status} (주문번호: ${orderId.slice(-8)})`;
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

export async function loader({ request }: LoaderFunctionArgs) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  // service role로 전체 주문 조회 (RLS 우회)
  const { data: orders } = await admin.supabase
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

export async function action({ request }: ActionFunctionArgs) {
  const admin = await requireAdmin(request);
  if ("error" in admin) return admin.error;

  const payload = await request.json().catch(() => ({}));
  const orderId = typeof payload.orderId === "string" ? payload.orderId : "";
  const intent = typeof payload.intent === "string" ? payload.intent : "";

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

    if (order.user_id) {
      await createNotification(admin.supabase, {
        user_id: order.user_id,
        order_id: orderId,
        type: status === "cancelled" ? "order_cancelled" : "order_status",
        message: getStatusMessage(orderId, status, cancellationReason),
      });
    }

    return json({ success: true, order }, { headers: { "Cache-Control": "no-store" } });
  }

  if (intent === "updatePayment") {
    const paymentStatus = typeof payload.paymentStatus === "string" ? payload.paymentStatus : "";
    if (!paymentStatus) {
      return json({ error: "변경할 결제 상태가 없습니다." }, { status: 400 });
    }

    const { data: order, error } = await admin.supabase
      .from("orders")
      .update({
        payment_status: paymentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .select()
      .single();

    if (error || !order) {
      console.error("API admin payment update failed:", error);
      return json({ error: "결제 상태 업데이트에 실패했습니다." }, { status: 500 });
    }

    if (order.user_id && paymentStatus === "confirmed") {
      await createNotification(admin.supabase, {
        user_id: order.user_id,
        order_id: orderId,
        type: "payment_confirmed",
        message: `결제가 확인되었습니다. 감사합니다! (주문번호: ${orderId.slice(-8)})`,
      });
    }

    return json({ success: true, order }, { headers: { "Cache-Control": "no-store" } });
  }

  return json({ error: "잘못된 요청입니다." }, { status: 400 });
}
