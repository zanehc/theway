import { ActionFunctionArgs, json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { userId, name, church_group, email, role } = await request.json();

    if (!userId) {
      return json({ success: false, error: "userId required" }, { status: 400 });
    }

    const adminSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const profileData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) profileData.name = name;
    if (church_group !== undefined) profileData.church_group = church_group || null;
    if (role !== undefined) profileData.role = role;

    // 1단계: id로 UPDATE 시도
    const { data: updateById, error: updateByIdError } = await adminSupabase
      .from("users")
      .update(profileData)
      .eq("id", userId)
      .select()
      .single();

    if (!updateByIdError) {
      return json({ success: true, data: updateById });
    }

    // id로 찾을 수 없는 경우 (PGRST116: 0 rows)
    if (updateByIdError.code === "PGRST116") {
      // 2단계: email로 UPDATE 시도 (admin 계정처럼 id가 다른 경우)
      if (email) {
        const { data: updateByEmail, error: updateByEmailError } = await adminSupabase
          .from("users")
          .update(profileData)
          .eq("email", email)
          .select()
          .single();

        if (!updateByEmailError) {
          console.log("✅ api.update-profile: updated by email fallback");
          return json({ success: true, data: updateByEmail });
        }
      }

      // 3단계: INSERT (완전히 새 유저)
      const insertData: Record<string, any> = {
        id: userId,
        email: email || "",
        role: role || "customer",
        updated_at: new Date().toISOString(),
      };
      if (name !== undefined) insertData.name = name;
      if (church_group !== undefined) insertData.church_group = church_group || null;

      const { data: inserted, error: insertError } = await adminSupabase
        .from("users")
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error("❌ api.update-profile insert error:", insertError);
        return json({ success: false, error: insertError.message }, { status: 400 });
      }

      return json({ success: true, data: inserted });
    }

    console.error("❌ api.update-profile error:", updateByIdError);
    return json({ success: false, error: updateByIdError.message }, { status: 400 });
  } catch (err: any) {
    console.error("❌ api.update-profile exception:", err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
