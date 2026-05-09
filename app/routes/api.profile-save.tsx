import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

function getUserIdFromJWT(token: string): string | null {
  try {
    const base64Payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64Payload, "base64").toString("utf-8"));
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return json({ error: "인증 정보가 없습니다." }, { status: 401 });
  }

  const userId = getUserIdFromJWT(token);
  if (!userId) {
    return json({ error: "토큰이 유효하지 않습니다." }, { status: 401 });
  }

  let body: { name?: string; church_group?: string; email?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const name = body.name?.trim();
  const churchGroup = body.church_group?.trim();

  if (!name || !churchGroup) {
    return json({ error: "이름과 소속 목장을 모두 입력해주세요." }, { status: 400 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || (!serviceKey && !anonKey)) {
    return json({ error: "서버 설정 오류입니다." }, { status: 500 });
  }

  const client = serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : createClient(supabaseUrl, anonKey!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });

  // role은 절대 건드리지 않음 — UPDATE로 name/church_group만 변경
  const { data: updated, error: updateError } = await client
    .from("users")
    .update({
      name,
      church_group: churchGroup,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id");

  if (updateError) {
    console.error("[profile-save] update error:", updateError);
    return json({ error: `저장에 실패했습니다. (${updateError.code ?? updateError.message})` }, { status: 500 });
  }

  // 업데이트된 row가 없으면 신규 유저 → INSERT (role은 customer로만)
  if (!updated || updated.length === 0) {
    const { error: insertError } = await client
      .from("users")
      .insert({
        id: userId,
        email: body.email || "",
        name,
        church_group: churchGroup,
        role: "customer",
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error("[profile-save] insert error:", insertError.code, insertError.message, insertError.details);

      // 23505 = unique_violation — same person signing in via a second OAuth provider
      if (insertError.code === "23505") {
        // service role client always bypasses RLS (needed to update a row owned by a different UUID)
        const fallbackClient = serviceKey
          ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
          : client;

        const errorStr = `${insertError.message ?? ""} ${insertError.details ?? ""}`.toLowerCase();
        const isEmailConflict = errorStr.includes("email");
        const isNameConflict = errorStr.includes("name");

        // Try email-based update first
        if ((isEmailConflict || !isNameConflict) && body.email) {
          const { error: emailErr } = await fallbackClient
            .from("users")
            .update({ name, church_group: churchGroup, updated_at: new Date().toISOString() })
            .eq("email", body.email);
          if (!emailErr) return json({ success: true, name, church_group: churchGroup });
          console.error("[profile-save] update-by-email failed:", emailErr);
        }

        // Try name-based update (same person, different OAuth provider — no email available)
        if (isNameConflict || !body.email) {
          const { error: nameErr } = await fallbackClient
            .from("users")
            .update({ church_group: churchGroup, updated_at: new Date().toISOString() })
            .eq("name", name);
          if (!nameErr) return json({ success: true, name, church_group: churchGroup });
          console.error("[profile-save] update-by-name failed:", nameErr);
        }
      }

      return json({ error: `저장에 실패했습니다. (${insertError.code ?? insertError.message})` }, { status: 500 });
    }
  }

  return json({ success: true, name, church_group: churchGroup });
}
