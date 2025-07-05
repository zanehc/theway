import { useState } from 'react';
import { supabase } from '~/lib/supabase';

export function AdminLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else {
        // 로그인 성공 시 페이지 새로고침
        window.location.reload();
      }
    } catch (err) {
      setError('로그인 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">
          이메일
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="admin@example.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-wine-700 mb-2">
          비밀번호
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-ivory-50/50 focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="비밀번호를 입력하세요"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-wine text-ivory-50 py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 shadow-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '로그인 중...' : '관리자 로그인'}
      </button>

      <div className="text-center text-sm text-wine-500">
        <p>관리자 계정: admin@example.com</p>
        <p>비밀번호: adminadmin</p>
      </div>
    </form>
  );
} 