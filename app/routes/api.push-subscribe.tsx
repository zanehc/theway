import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createServerSupabaseClient } from "~/lib/supabase";

function getUserIdFromJWT(token: string): string | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString()
    );
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

// POST: 구독 저장  DELETE: 구독 제거
export async function action({ request }: ActionFunctionArgs) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "인증 정보가 없습니다." }, { status: 401 });

  const userId = getUserIdFromJWT(token);
  if (!userId) return json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });

  const supabase = createServerSupabaseClient();

  if (request.method === "DELETE") {
    const { endpoint } = await request.json().catch(() => ({}));
    if (!endpoint) return json({ error: "endpoint가 없습니다." }, { status: 400 });

    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("Push unsubscribe error:", error);
      return json({ error: "구독 해제에 실패했습니다." }, { status: 500 });
    }
    return json({ success: true });
  }

  // POST
  const body = await request.json().catch(() => null);
  const { endpoint, keys } = body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: "user_id,endpoint" }
    );

  if (error) {
    console.error("Push subscribe error:", error);
    return json({ error: "구독 저장에 실패했습니다." }, { status: 500 });
  }

  return json({ success: true });
}
