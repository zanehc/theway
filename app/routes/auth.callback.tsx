import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from '@remix-run/react';
import { supabase } from '~/lib/supabase';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('인증 처리 중...');
  const isProcessing = useRef(false);

  useEffect(() => {
    console.log('🔄 AuthCallback - useEffect 시작');
    console.log('🔍 AuthCallback - 전체 URL:', window.location.href);
    console.log('🔍 AuthCallback - Search Params:', window.location.search);

    const handleUserProfile = (user: any) => {
      if (isProcessing.current) return;
      isProcessing.current = true;

      // DB 조회 없이 created_at으로 신규 여부 판단 (2분 이내 = 신규 사용자)
      const isNewUser = Date.now() - new Date(user.created_at).getTime() < 120_000;

      if (isNewUser) {
        console.log('🆕 신규 사용자 → 프로필 설정');
        navigate('/auth/profile-setup');
      } else {
        console.log('✅ 기존 사용자 → 홈');
        navigate('/?success=' + encodeURIComponent('로그인되었습니다.'));
      }
    };

    const handleCallback = async () => {
      console.log('🔄 AuthCallback - 콜백 처리 시작');

      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // 오류 처리
      if (error) {
        console.error('❌ OAuth error:', error, errorDescription);
        let errorMessage = errorDescription || error;
        if (error === 'invalid_request' || error.includes('Invalid API key')) {
          errorMessage = 'OAuth 설정 오류';
        } else if (error === 'access_denied') {
          errorMessage = '로그인이 취소되었습니다.';
        }
        navigate('/?error=' + encodeURIComponent(errorMessage));
        return;
      }

      // 인증 이벤트 리스너 설정 (가장 확실한 방법)
      console.log('🎧 인증 리스너 설정');
      const authListener = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 인증 이벤트:', event, session?.user?.email || 'null');

        if (session?.user && !isProcessing.current) {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            console.log('✅ 인증 성공:', session.user.email);
            authListener.data.subscription.unsubscribe();
            handleUserProfile(session.user);
          }
        }
      });

      // code가 있으면 교환 시도
      if (code) {
        console.log('🔄 OAuth 코드 교환 중:', code.substring(0, 10) + '...');
        setStatus('로그인 처리 중...');

        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('❌ 코드 교환 실패:', exchangeError);
            // 리스너가 처리할 수도 있으니 1초 대기 (3초 → 1초 단축)
            setTimeout(() => {
              if (!isProcessing.current) {
                authListener.data.subscription.unsubscribe();
                navigate('/?error=' + encodeURIComponent('로그인 처리 실패'));
              }
            }, 1000);
            return;
          }

          console.log('✅ 코드 교환 성공:', data?.user?.email || 'unknown');
          // 리스너가 자동으로 handleUserProfile 호출함

        } catch (err: any) {
          console.error('❌ 코드 교환 예외:', err);
          setTimeout(() => {
            if (!isProcessing.current) {
              authListener.data.subscription.unsubscribe();
              navigate('/?error=' + encodeURIComponent('로그인 처리 실패'));
            }
          }, 1000);
        }
      } else {
        console.log('⚠️ code 없음, 리스너만 대기');
      }

      // 10초 타임아웃 (15초 → 10초 단축)
      setTimeout(() => {
        if (!isProcessing.current) {
          console.log('⏱️ 인증 타임아웃');
          authListener.data.subscription.unsubscribe();
          navigate('/?error=' + encodeURIComponent('로그인 처리 시간 초과'));
        }
      }, 10000);
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-surface-soft flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-large p-8 w-full max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-body font-medium">{status}</p>
      </div>
    </div>
  );
}
