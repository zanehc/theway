import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createServerSupabaseClient } from "~/lib/supabase";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return json({ error: "인증 정보가 없습니다." }, { status: 401 });
  }

  const serviceClient = createServerSupabaseClient();

  const { data: authData, error: authError } = await serviceClient.auth.getUser(token);
  if (authError || !authData.user) {
    return json({ error: "로그인이 만료되었습니다." }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId) {
    return json({ error: "주문 ID가 없습니다." }, { status: 400 });
  }

  const { data: order, error: fetchError } = await serviceClient
    .from("orders")
    .select("id, status, user_id, customer_name, church_group, order_number")
    .eq("id", orderId)
    .single();

  if (fetchError || !order) {
    return json({ error: "주문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (order.user_id !== authData.user.id) {
    return json({ error: "본인 주문만 취소할 수 있습니다." }, { status: 403 });
  }

  if (order.status !== "pending") {
    return json({ error: "접수 대기 중인 주문만 취소할 수 있습니다." }, { status: 400 });
  }

  const { error: updateError } = await serviceClient
    .from("orders")
    .update({
      status: "cancelled",
      cancellation_reason: "고객 취소",
      updated_at: new Date().toISOString(),
    })
    .eq("id", orderId);

  if (updateError) {
    console.error("Customer cancel order failed:", updateError);
    return json({ error: "주문 취소에 실패했습니다." }, { status: 500 });
  }

  // 관리자/스태프에게 알림 전송
  try {
    const orderNumber = order.order_number || orderId.slice(-8);
    const message = `${order.customer_name}${order.church_group ? ` · ${order.church_group}` : ''}님이 주문을 취소했습니다. (주문번호: #${orderNumber})`;

    const { data: staffUsers } = await serviceClient
      .from("users")
      .select("id")
      .in("role", ["admin", "staff"]);

    if (staffUsers && staffUsers.length > 0) {
      await serviceClient.from("notifications").insert(
        staffUsers.map((u: { id: string }) => ({
          user_id: u.id,
          order_id: orderId,
          type: "order_cancelled",
          message,
        }))
      );
    }
  } catch (notifError) {
    console.error("Customer cancel notification failed:", notifError);
  }

  return json({ success: true });
}
