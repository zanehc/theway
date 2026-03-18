import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { supabase } from '~/lib/supabase';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('인증 처리 중...');
  const isDone = useRef(false);

  useEffect(() => {
    const goHome = (msg?: string) => {
      if (isDone.current) return;
      isDone.current = true;
      if (msg) {
        navigate('/?success=' + encodeURIComponent(msg));
      } else {
        navigate('/');
      }
    };

    const goError = (msg: string) => {
      if (isDone.current) return;
      isDone.current = true;
      navigate('/?error=' + encodeURIComponent(msg));
    };

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        const msg = error === 'access_denied'
          ? '로그인이 취소되었습니다.'
          : errorDescription || error;
        goError(msg);
        return;
      }

      setStatus('로그인 처리 중...');

      // 1) code가 있으면 교환 시도
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {
          // 교환 실패해도 세션이 이미 있을 수 있음 → 아래에서 확인
        }
      }

      // 2) 세션 확인 - 코드 교환 성공/실패 관계없이 세션 있으면 로그인 완료
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          goHome('로그인되었습니다.');
          return;
        }
      } catch {}

      // 3) 세션이 아직 없으면 auth 이벤트 대기
      const authListener = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          authListener.data.subscription.unsubscribe();
          goHome('로그인되었습니다.');
        }
      });

      // 4) 5초 안전장치
      setTimeout(() => {
        authListener.data.subscription.unsubscribe();
        // 마지막으로 세션 한 번 더 확인
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            goHome('로그인되었습니다.');
          } else {
            goError('로그인 처리 시간 초과');
          }
        }).catch(() => goError('로그인 처리 실패'));
      }, 5000);
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-large p-8 w-full max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600 mx-auto mb-4"></div>
        <p className="text-wine-700 font-medium">{status}</p>
      </div>
    </div>
  );
}
