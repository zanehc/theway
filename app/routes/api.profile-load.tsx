import type { LoaderFunctionArgs } from "@remix-run/node";
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

function getMetadataNameFromJWT(token: string): string {
  try {
    const base64Payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(Buffer.from(base64Payload, "base64").toString("utf-8"));
    const metadata = payload.user_metadata || {};
    const name = metadata.full_name || metadata.name || metadata.nickname;
    return typeof name === "string" ? name.trim() : "";
  } catch {
    return "";
  }
}

function isCompleteProfile(profile: any) {
  return Boolean(
    typeof profile?.name === "string" &&
    profile.name.trim() &&
    typeof profile?.church_group === "string" &&
    profile.church_group.trim()
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return json({ error: "인증 정보가 없습니다.", user: null }, { status: 401 });
  }

  const userId = getUserIdFromJWT(token);
  if (!userId) {
    return json({ error: "토큰이 유효하지 않습니다.", user: null }, { status: 401 });
  }

  const url = new URL(request.url);
  const email = url.searchParams.get("email") || "";
  const metadataName = getMetadataNameFromJWT(token);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "서버 설정 오류입니다.", user: null }, { status: 500 });
  }

  const db = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1) 현재 UUID로 row 탐색
  const { data: byId } = await db
    .from("users")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (isCompleteProfile(byId) || byId?.role === "admin" || byId?.role === "staff") {
    return json({ user: byId }, { headers: { "Cache-Control": "no-store" } });
  }

  // 2) 이메일로 row 탐색 (다른 OAuth 제공자로 가입한 동일인)
  if (email) {
    const { data: byEmail } = await db
      .from("users")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    if (isCompleteProfile(byEmail)) {
      return json({ user: byEmail }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  // 3) 이름으로 row 탐색 (카카오 등 이메일이 없거나 제공자별 email이 다른 경우)
  if (metadataName) {
    const { data: byName } = await db
      .from("users")
      .select("*")
      .eq("name", metadataName)
      .limit(2);

    const completeMatches = (byName || []).filter(isCompleteProfile);
    if (completeMatches.length === 1) {
      return json({ user: completeMatches[0] }, { headers: { "Cache-Control": "no-store" } });
    }
  }

  return json({ user: byId || null }, { headers: { "Cache-Control": "no-store" } });
}
