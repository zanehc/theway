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

    // signInWithPassword가 hang되는 경우 대비 - auth 상태 변화 감지로 성공 처리
    let loginHandled = false;
    const authListener = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && !loginHandled) {
        loginHandled = true;
        authListener.data.subscription.unsubscribe();
        setLoading(false);
        if (onLoginSuccess) onLoginSuccess();
      }
    });

    // 5초 타임아웃 - promise가 안 끝나도 auth 상태가 변경되었으면 성공 처리
    const timeout = setTimeout(async () => {
      if (!loginHandled) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          loginHandled = true;
          authListener.data.subscription.unsubscribe();
          setLoading(false);
          if (onLoginSuccess) onLoginSuccess();
        } else {
          setLoading(false);
          setError('로그인 응답 시간이 초과되었습니다. 다시 시도해주세요.');
        }
      }
    }, 5000);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      clearTimeout(timeout);

      if (loginHandled) return; // 이미 auth listener에서 처리됨
      loginHandled = true;
      authListener.data.subscription.unsubscribe();

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('아이디 또는 비밀번호를 확인해주세요.');
        } else {
          setError(error.message);
        }
        setLoading(false);
      } else {
        setLoading(false);
        if (onLoginSuccess) onLoginSuccess();
      }
    } catch (err) {
      clearTimeout(timeout);
      if (!loginHandled) {
        authListener.data.subscription.unsubscribe();
        setError('로그인 중 오류가 발생했습니다.');
        setLoading(false);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
          {error}
        </div>
      )}

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