import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [churchGroup, setChurchGroup] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 캡챠 생성
  const generateCaptcha = () => {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const answer = num1 + num2;
    setCaptcha(`${num1} + ${num2} = ?`);
    setCaptchaAnswer(answer.toString());
  };

  // 컴포넌트 마운트 시 캡챠 생성
  useEffect(() => {
    generateCaptcha();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 입력 검증
    if (!email.trim() || !name.trim() || !password || !confirmPassword) {
      setError('모든 필수 항목을 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 최소 6자 이상이어야 합니다.');
      return;
    }

    if (captcha !== captchaAnswer) {
      setError('캡챠 답변이 올바르지 않습니다.');
      generateCaptcha();
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 회원가입
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            name: name.trim(),
            church_group: churchGroup.trim() || null,
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.user) {
        // users 테이블에 사용자 정보 저장
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: email.trim(),
            name: name.trim(),
            role: 'customer',
            church_group: churchGroup.trim() || null,
          });

        if (userError) {
          setError('사용자 정보 저장에 실패했습니다.');
          return;
        }

        // 성공 메시지 표시
        setError('');
        alert('회원가입이 완료되었습니다! 이메일을 확인하여 계정을 활성화해주세요.');
        onSwitchToLogin();
      }
    } catch (err) {
      setError('회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">
          이메일 *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="이메일을 입력하세요"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">
          이름 *
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="이름을 입력하세요"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">
          비밀번호 *
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="비밀번호를 입력하세요 (최소 6자)"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">
          비밀번호 확인 *
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="비밀번호를 다시 입력하세요"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">
          목장명 (선택사항)
        </label>
        <input
          type="text"
          value={churchGroup}
          onChange={(e) => setChurchGroup(e.target.value)}
          className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="목장명을 입력하세요"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">
          매크로 방지 *
        </label>
        <div className="flex items-center space-x-3">
          <div className="flex-1 px-4 py-3 border border-ivory-300 rounded-lg bg-gray-50 text-center font-mono text-lg">
            {captcha}
          </div>
          <button
            type="button"
            onClick={generateCaptcha}
            className="px-3 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
          >
            🔄
          </button>
        </div>
        <input
          type="text"
          value={captcha}
          onChange={(e) => setCaptcha(e.target.value)}
          className="w-full mt-2 px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="답을 입력하세요"
          required
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-wine text-black py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 shadow-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '가입 중...' : '회원가입'}
        </button>
        
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="px-6 py-3 border border-wine-300 text-wine-600 rounded-lg font-medium hover:bg-wine-50 transition-colors"
        >
          로그인
        </button>
      </div>
    </form>
  );
} 