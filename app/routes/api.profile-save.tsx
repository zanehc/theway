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

function isCompleteProfile(profile: any) {
  return Boolean(
    typeof profile?.name === "string" &&
    profile.name.trim() &&
    typeof profile?.church_group === "string" &&
    profile.church_group.trim()
  );
}

function pickBestProfile(rows: any[] | null | undefined, userId: string) {
  const profiles = rows || [];
  return (
    profiles.find((profile) => profile.id === userId) ||
    profiles.find(isCompleteProfile) ||
    profiles[0] ||
    null
  );
}

async function insertCurrentProfile(
  db: ReturnType<typeof createClient>,
  payload: { userId: string; email: string; name: string; churchGroup: string }
) {
  const { error } = await db
    .from("users")
    .insert({
      id: payload.userId,
      email: payload.email,
      name: payload.name,
      church_group: payload.churchGroup,
      role: "customer",
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.warn("[profile-save] insert current profile skipped:", error.code, error.message);
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
    const { data: existingByEmail, error: emailLookupError } = await db
      .from("users")
      .select("id, name, church_group")
      .eq("email", body.email)
      .limit(10);

    if (emailLookupError) {
      console.error("[profile-save] lookup-by-email error:", emailLookupError);
      return json({ error: `저장에 실패했습니다. (${emailLookupError.code})` }, { status: 500 });
    }

    const emailProfile = pickBestProfile(existingByEmail, userId);
    if (emailProfile) {
      console.log("[profile-save] found existing row by email, updating:", emailProfile.id);
      const { error } = await db
        .from("users")
        .update({ name, church_group: churchGroup, updated_at: new Date().toISOString() })
        .eq("id", emailProfile.id);
      if (error) {
        console.error("[profile-save] update-by-email error:", error);
        return json({ error: `저장에 실패했습니다. (${error.code})` }, { status: 500 });
      }
      if (emailProfile.id !== userId) {
        await insertCurrentProfile(db, {
          userId,
          email: body.email || "",
          name,
          churchGroup,
        });
      }
      return json({ success: true, name, church_group: churchGroup });
    }
  }

  // 3) 이름으로도 탐색 — 이메일 없는 경우(카카오 등) 또는 이메일 불일치 시
  const { data: existingByName, error: nameLookupError } = await db
    .from("users")
    .select("id, name, church_group")
    .eq("name", name)
    .limit(10);

  if (nameLookupError) {
    console.error("[profile-save] lookup-by-name error:", nameLookupError);
    return json({ error: `저장에 실패했습니다. (${nameLookupError.code})` }, { status: 500 });
  }

  const nameProfile = pickBestProfile(existingByName, userId);
  if (nameProfile) {
    console.log("[profile-save] found existing row by name, updating and linking current auth id:", nameProfile.id);
    const { error } = await db
      .from("users")
      .update({ church_group: churchGroup, updated_at: new Date().toISOString() })
      .eq("id", nameProfile.id);
    if (error) {
      console.error("[profile-save] update-by-name error:", error);
      return json({ error: `저장에 실패했습니다. (${error.code})` }, { status: 500 });
    }

    if (nameProfile.id !== userId) {
      await insertCurrentProfile(db, {
        userId,
        email: body.email || "",
        name,
        churchGroup,
      });
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
