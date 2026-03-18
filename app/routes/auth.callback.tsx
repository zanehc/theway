import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

// OAuth 콜백은 이제 홈(/)에서 직접 처리.
// 이 라우트는 기존 URL 호환성을 위해 홈으로 리다이렉트만 수행.
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return redirect('/?error=' + encodeURIComponent(error));
  }

  // code가 있으면 홈으로 전달 (Supabase detectSessionInUrl이 처리)
  if (code) {
    return redirect('/?code=' + encodeURIComponent(code));
  }

  return redirect('/');
}

export default function AuthCallback() {
  return null;
}
