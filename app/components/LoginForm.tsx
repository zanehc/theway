import { useState } from 'react';
import { supabase } from '~/lib/supabase';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onLoginSuccess?: () => void;
}

export function LoginForm({ onSwitchToSignup, onLoginSuccess }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('아이디 또는 비밀번호를 확인해주세요.');
        } else {
          setError(error.message);
        }
      } else {
        // 로그인 성공 시
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(`구글 로그인 실패: ${error.message}`);
        setLoading(false);
      }
      // 성공 시 자동으로 리다이렉트되므로 여기서는 아무것도 안 함
    } catch (err) {
      setError('구글 로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setError(`카카오 로그인 실패: ${error.message}`);
        setLoading(false);
      }
      // 성공 시 자동으로 리다이렉트되므로 여기서는 아무것도 안 함
    } catch (err) {
      setError('카카오 로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
          {error}
        </div>
      )}

      {/* 소셜 로그인 버튼 (위쪽) */}
      <div className="space-y-3">
        {/* 구글 로그인 버튼 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-white border-2 border-wine-200 text-gray-700 py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium hover:bg-ivory-50 hover:border-wine-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          <span>{loading ? '연결 중...' : '구글로 로그인'}</span>
        </button>

        {/* 카카오 로그인 버튼 */}
        <button
          type="button"
          onClick={handleKakaoLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 sm:gap-3 bg-[#FEE500] border-2 border-[#FEE500] text-[#000000] py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg font-medium hover:bg-[#FDD835] hover:border-[#FDD835] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3c-4.97 0-9 2.69-9 6 0 2.34 1.95 4.38 4.78 5.51l-.88 4.49 4.51-2.84c.61.08 1.24.13 1.89.13 4.97 0 9-2.69 9-6s-4.03-6-9.3-6z"
              fill="#000000"
            />
          </svg>
          <span className="font-semibold">{loading ? '연결 중...' : '카카오로 로그인'}</span>
        </button>
      </div>

      {/* 구분선 */}
      <div className="relative my-4 sm:my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-wine-200"></div>
        </div>
        <div className="relative flex justify-center text-xs sm:text-sm">
          <span className="px-2 bg-white text-wine-600">또는</span>
        </div>
      </div>

      {/* 이메일/비밀번호 로그인 (아래쪽) */}
      <div>
        <label className="block text-xs sm:text-sm font-bold text-wine-700 mb-1 sm:mb-2">
          이메일
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-wine-200 rounded-lg text-sm sm:text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="이메일을 입력하세요"
          required
        />
      </div>

      <div>
        <label className="block text-xs sm:text-sm font-bold text-wine-700 mb-1 sm:mb-2">
          비밀번호
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-wine-200 rounded-lg text-sm sm:text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="비밀번호를 입력하세요"
          required
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-wine-600 hover:bg-wine-700 text-white border-2 border-wine-700 py-2 sm:py-3 px-3 sm:px-4 rounded-lg font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
        
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="px-4 sm:px-6 py-2 sm:py-3 border-2 border-wine-300 text-wine-600 bg-white rounded-lg font-medium hover:bg-ivory-50 transition-colors text-sm sm:text-base"
        >
          회원가입
        </button>
      </div>
    </form>
  );
} 