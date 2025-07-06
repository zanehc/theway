import { supabase } from './supabase';

export async function requireAuth(request: Request) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // 로그인이 필요한 페이지에 접근하려 할 때 첫 페이지로 리디렉션
    const url = new URL(request.url);
    return new Response(null, {
      status: 302,
      headers: {
        Location: `/?error=${encodeURIComponent('로그인이 필요한 페이지입니다.')}`
      }
    });
  }
  
  return null;
}

export async function getUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}