import { supabase } from '~/lib/supabase';

interface KakaoLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function KakaoLoginButton({ onSuccess, onError }: KakaoLoginButtonProps) {
  const handleKakaoLogin = async () => {
    console.log('Kakao login button clicked');
    console.log('Current origin:', window.location.origin);
    
    try {
      console.log('Attempting Kakao OAuth...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account'
          }
        }
      });

      console.log('OAuth response:', { data, error });

      if (error) {
        console.error('Kakao login error:', error);
        onError?.(error.message);
      } else {
        console.log('Kakao login initiated successfully:', data);
        // OAuth는 리다이렉트를 수행하므로 onSuccess는 호출되지 않을 수 있음
        if (data.url) {
          console.log('Redirecting to:', data.url);
          window.location.href = data.url;
        } else {
          onSuccess?.();
        }
      }
    } catch (err) {
      console.error('Kakao login error:', err);
      onError?.('카카오 로그인 중 오류가 발생했습니다.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleKakaoLogin}
      className="w-full bg-[#FEE500] hover:bg-[#FDD800] text-[#3C1E1E] py-3 px-4 rounded-lg font-bold transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1 flex items-center justify-center space-x-3"
    >
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 3C6.48 3 2 6.48 2 12c0 5.52 4.48 10 10 10s10-4.48 10-10c0-5.52-4.48-10-10-10zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
      <span>카카오톡으로 로그인</span>
    </button>
  );
} 