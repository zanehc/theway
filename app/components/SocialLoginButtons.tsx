import { supabase } from '~/lib/supabase';

export function SocialLoginButtons() {
  const handleLogin = (provider: 'google' | 'kakao' | 'naver') => {
    supabase.auth.signInWithOAuth({ provider: provider as any });
  };

  return (
    <div className="flex flex-col gap-4 mt-6">
      <button
        className="bg-white border border-gray-300 rounded-xl py-3 font-bold text-gray-800 hover:bg-gray-100"
        onClick={() => handleLogin('google')}
      >
        구글로 로그인
      </button>
      <button
        className="bg-yellow-400 border border-yellow-500 rounded-xl py-3 font-bold text-gray-900 hover:bg-yellow-300"
        onClick={() => handleLogin('kakao')}
      >
        카카오톡으로 로그인
      </button>
      <button
        className="bg-green-500 border border-green-600 rounded-xl py-3 font-bold text-white hover:bg-green-400"
        onClick={() => handleLogin('naver')}
      >
        네이버로 로그인
      </button>
    </div>
  );
} 