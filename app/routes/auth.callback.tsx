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

      if (!code) {
        // code 없으면 세션 확인 후 홈으로
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          goHome('로그인되었습니다.');
        } else {
          goError('로그인 정보가 없습니다.');
        }
        return;
      }

      setStatus('로그인 처리 중...');

      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('코드 교환 실패:', exchangeError);
          goError('로그인 처리 실패');
          return;
        }

        // 코드 교환 성공 → 바로 홈으로 이동
        // 프로필 없는 신규 사용자는 홈에서 처리
        goHome('로그인되었습니다.');

      } catch (err) {
        console.error('코드 교환 예외:', err);
        goError('로그인 처리 실패');
      }
    };

    handleCallback();

    // 안전장치: 5초 후에도 안 끝나면 홈으로
    const timeout = setTimeout(() => goHome('로그인되었습니다.'), 5000);
    return () => clearTimeout(timeout);
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
