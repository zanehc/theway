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

    const handleUserProfile = async (user: any) => {
      if (isProcessing.current) {
        console.log('⚠️ 이미 처리 중, 중복 실행 방지');
        return;
      }
      isProcessing.current = true;

      try {
        setStatus('프로필 확인 중...');
        console.log('👤 프로필 확인 시작:', user.email, user.id);

        // 프로필 확인에 3초 타임아웃 적용 (기존 15초 → 3초)
        const profileCheckPromise = (async () => {
          const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id, name, church_group')
            .eq('id', user.id)
            .single();

          console.log('📊 ID 조회 완료:', { found: !!existingUser, error: userError?.code });
          return { existingUser, userError };
        })();

        const timeoutPromise = new Promise<{ existingUser: null; userError: { code: string } }>((resolve) =>
          setTimeout(() => {
            console.warn('⏱️ Supabase 조회 타임아웃, 홈으로 이동');
            resolve({ existingUser: null, userError: { code: 'TIMEOUT' } });
          }, 3000)
        );

        const result = await Promise.race([profileCheckPromise, timeoutPromise]);
        let { existingUser, userError } = result;

        // 타임아웃이거나 조회 오류면 홈으로 (기존 사용자로 간주)
        if ((userError as any)?.code === 'TIMEOUT') {
          console.log('⏱️ 타임아웃 - 홈으로 이동');
          navigate('/?success=' + encodeURIComponent('로그인되었습니다.'));
          return;
        }

        if (userError && (userError as any).code !== 'PGRST116') {
          console.error('❌ 사용자 조회 오류:', userError);
        }

        if (!existingUser) {
          console.log('🆕 새 사용자, 프로필 설정 페이지로 이동:', user.email);
          setStatus('프로필 설정 페이지로 이동 중...');
          navigate('/auth/profile-setup');
          return;
        }

        console.log('✅ 기존 사용자 로그인 완료:', existingUser.name);
        setStatus('로그인 완료!');
        navigate('/?success=' + encodeURIComponent('로그인되었습니다.'));

      } catch (err: any) {
        console.error('❌ 프로필 확인 오류:', err);
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
            await handleUserProfile(session.user);
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
    <div className="min-h-screen bg-gradient-warm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-large p-8 w-full max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600 mx-auto mb-4"></div>
        <p className="text-wine-700 font-medium">{status}</p>
      </div>
    </div>
  );
}
