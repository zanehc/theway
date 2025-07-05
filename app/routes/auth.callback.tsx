import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { supabase } from "~/lib/supabase";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return redirect('/?error=' + encodeURIComponent(errorDescription || error));
  }

  if (!code) {
    return redirect('/?error=' + encodeURIComponent('인증 코드가 없습니다.'));
  }

  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      console.error('Session exchange error:', error);
      return redirect('/?error=' + encodeURIComponent(error.message));
    }

    if (data.session) {
      console.log('OAuth login successful:', data.user);
      return redirect('/?success=' + encodeURIComponent('로그인되었습니다.'));
    } else {
      return redirect('/?error=' + encodeURIComponent('세션을 생성할 수 없습니다.'));
    }
  } catch (err) {
    console.error('OAuth callback error:', err);
    return redirect('/?error=' + encodeURIComponent('로그인 처리 중 오류가 발생했습니다.'));
  }
} 