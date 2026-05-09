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

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "서버 설정 오류입니다. (service key 미설정)" }, { status: 500 });
  }

  // service role — RLS 무관하게 모든 row 접근 가능
  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) 현재 UUID로 row 존재 여부 확인
  const { data: existingById } = await db
    .from("users")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingById) {
    // 현재 UUID로 row가 있으면 바로 UPDATE (role 건드리지 않음)
    const { error } = await db
      .from("users")
      .update({ name, church_group: churchGroup, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) {
      console.error("[profile-save] update-by-id error:", error);
      return json({ error: `저장에 실패했습니다. (${error.code})` }, { status: 500 });
    }
    return json({ success: true, name, church_group: churchGroup });
  }

  // 2) 현재 UUID로 row 없음 → 이메일로 기존 row 탐색 (다른 OAuth 제공자로 가입한 동일인)
  if (body.email) {
    const { data: existingByEmail } = await db
      .from("users")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();

    if (existingByEmail) {
      console.log("[profile-save] found existing row by email, updating:", existingByEmail.id);
      const { error } = await db
        .from("users")
        .update({ name, church_group: churchGroup, updated_at: new Date().toISOString() })
        .eq("id", existingByEmail.id);
      if (error) {
        console.error("[profile-save] update-by-email error:", error);
        return json({ error: `저장에 실패했습니다. (${error.code})` }, { status: 500 });
      }
      return json({ success: true, name, church_group: churchGroup });
    }
  }

  // 3) 이름으로도 탐색 — 이메일 없는 경우(카카오 등) 또는 이메일 불일치 시
  const { data: existingByName } = await db
    .from("users")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existingByName) {
    console.log("[profile-save] found existing row by name, updating:", existingByName.id);
    const { error } = await db
      .from("users")
      .update({ church_group: churchGroup, updated_at: new Date().toISOString() })
      .eq("id", existingByName.id);
    if (error) {
      console.error("[profile-save] update-by-name error:", error);
      return json({ error: `저장에 실패했습니다. (${error.code})` }, { status: 500 });
    }
    return json({ success: true, name, church_group: churchGroup });
  }

  // 4) 완전 신규 유저 → INSERT
  const { error: insertError } = await db
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
    return json({ error: `저장에 실패했습니다. (${insertError.code ?? insertError.message})` }, { status: 500 });
  }

  return json({ success: true, name, church_group: churchGroup });
}
