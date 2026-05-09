import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { supabase } from '~/lib/supabase';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const go = (user: any) => {
      const isNew = Date.now() - new Date(user.created_at).getTime() < 120_000;
      navigate(isNew ? '/auth/profile-setup' : '/?success=' + encodeURIComponent('로그인되었습니다.'), { replace: true });
    };

    const fail = (msg = '로그인 처리 실패') => {
      navigate('/?error=' + encodeURIComponent(msg), { replace: true });
    };

    const run = async () => {
      const oauthError = searchParams.get('error');
      if (oauthError) {
        fail(searchParams.get('error_description') || oauthError);
        return;
      }

      const code = searchParams.get('code');
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error || !data.user) { fail(); return; }
        go(data.user);
        return;
      }

      // code 없음 — 이미 세션이 있는지 확인 (hash 기반 흐름)
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) { go(session.user); return; }
      fail();
    };

    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-xs text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
        <p className="text-body text-sm font-medium">로그인 중...</p>
      </div>
    </div>
  );
}
