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

  // service role 키가 있으면 RLS 우회, 없으면 유저 JWT로 시도
  const client = serviceKey
    ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    : createClient(supabaseUrl, anonKey!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });

  const upsertData: Record<string, any> = {
    id: userId,
    name,
    church_group: churchGroup,
    updated_at: new Date().toISOString(),
  };
  if (body.email) upsertData.email = body.email;
  // service role 없이 INSERT가 발생할 수 있는 경우에만 role 포함
  if (serviceKey) upsertData.role = "customer";

  const { error } = await client
    .from("users")
    .upsert(upsertData, { onConflict: "id", ignoreDuplicates: false });

  if (error) {
    console.error("[profile-save] upsert error:", error);
    return json({ error: `저장에 실패했습니다. (${error.code ?? error.message})` }, { status: 500 });
  }

  return json({ success: true, name, church_group: churchGroup });
}
