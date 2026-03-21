import { LoaderFunctionArgs, json } from "@remix-run/node";
import { createClient } from "@supabase/supabase-js";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (!userId) {
    return json({ success: false, error: "userId required" }, { status: 400 });
  }

  try {
    const adminSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1단계: id로 조회
    const { data, error } = await adminSupabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (!error && data) {
      return json({ success: true, data });
    }

    // 2단계: id로 못 찾으면 Auth에서 email 가져와서 email로 조회
    // (admin 계정처럼 users 테이블 id와 Auth UUID가 다른 경우)
    if (error?.code === "PGRST116") {
      const { data: authData } = await adminSupabase.auth.admin.getUserById(userId);
      const email = authData?.user?.email;

      if (email) {
        const { data: byEmail, error: emailError } = await adminSupabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (!emailError && byEmail) {
          return json({ success: true, data: byEmail });
        }
      }
    }

    return json({ success: false, error: "User not found" }, { status: 404 });
  } catch (err: any) {
    console.error("❌ api.get-user exception:", err);
    return json({ success: false, error: err.message }, { status: 500 });
  }
}
