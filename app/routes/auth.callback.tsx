import { useEffect } from 'react';
import { useSearchParams } from '@remix-run/react';
import { supabase } from '~/lib/supabase';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      window.location.href = '/?error=' + encodeURIComponent(error);
      return;
    }

    const process = async () => {
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {
          // detectSessionInUrl이 이미 처리했을 수 있음
        }
      }
      // 코드 교환 성공/실패 관계없이 홈으로 (full reload로 root.tsx가 세션 감지)
      window.location.href = '/';
    };

    process();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
      <p className="text-wine-700 font-medium">로그인 중...</p>
    </div>
  );
}
