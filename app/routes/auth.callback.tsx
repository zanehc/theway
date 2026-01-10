import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { createServerClient } from "@supabase/ssr";

// 쿠키 파싱 헬퍼
function parseCookies(cookieHeader: string | null): { name: string; value: string }[] {
  if (!cookieHeader) return [];
  return cookieHeader.split(';').map(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    return { name, value: rest.join('=') };
  });
}

// 쿠키 직렬화 헬퍼
function serializeCookie(name: string, value: string, options?: Record<string, any>): string {
  let cookie = `${name}=${value}`;
  if (options) {
    if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`;
    if (options.domain) cookie += `; Domain=${options.domain}`;
    if (options.path) cookie += `; Path=${options.path}`;
    if (options.httpOnly) cookie += '; HttpOnly';
    if (options.secure) cookie += '; Secure';
    if (options.sameSite) cookie += `; SameSite=${options.sameSite}`;
  }
  return cookie;
}

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

  const headers = new Headers();

  // SSR을 위한 Supabase 클라이언트 생성
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return parseCookies(request.headers.get('Cookie'));
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, any> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            headers.append('Set-Cookie', serializeCookie(name, value, options));
          });
        },
      },
    }
  );

  try {
    const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

    if (sessionError) {
      console.error('Session exchange error:', sessionError);
      return redirect('/?error=' + encodeURIComponent(sessionError.message));
    }

    if (!data.session || !data.user) {
      return redirect('/?error=' + encodeURIComponent('세션을 생성할 수 없습니다.'));
    }

    console.log('OAuth login successful:', data.user.email);

    // users 테이블에서 사용자 프로필 확인 (ID로 먼저 검색)
    let { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, name, church_group')
      .eq('id', data.user.id)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('User lookup error:', userError);
    }

    // ID로 못 찾으면 이메일로 검색 (이전 프로젝트에서 생성된 사용자 처리)
    if (!existingUser && data.user.email) {
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select('id, name, church_group')
        .eq('email', data.user.email)
        .single();

      if (userByEmail) {
        console.log('Found user by email, updating ID:', data.user.email);

        // 기존 사용자의 ID를 새 OAuth ID로 업데이트
        const { error: updateError } = await supabase
          .from('users')
          .update({ id: data.user.id, updated_at: new Date().toISOString() })
          .eq('email', data.user.email);

        if (updateError) {
          console.error('Failed to update user ID:', updateError);
        } else {
          existingUser = { ...userByEmail, id: data.user.id };
        }
      }
    }

    if (!existingUser) {
      // 새 사용자는 프로필 설정 페이지로 이동 (이름, 목장 직접 입력)
      console.log('New user, redirecting to profile setup:', data.user.email);
      return redirect('/auth/profile-setup', { headers });
    }

    // 기존 사용자는 홈으로
    console.log('Existing user logged in:', existingUser.name);
    return redirect('/?success=' + encodeURIComponent('로그인되었습니다.'), { headers });

  } catch (err) {
    console.error('OAuth callback error:', err);
    return redirect('/?error=' + encodeURIComponent('로그인 처리 중 오류가 발생했습니다.'));
  }
} 