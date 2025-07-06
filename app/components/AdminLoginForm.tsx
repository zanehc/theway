import { useState } from 'react';
import { supabase } from '~/lib/supabase';

export function AdminLoginForm() {
  const [email, setEmail] = useState('admin@naver.com');
  const [password, setPassword] = useState('adminadmin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('Attempting login with:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        setError(error.message);
      } else {
        console.log('Login successful:', data);
        setSuccess('로그인 성공! 페이지를 새로고침합니다...');
        setTimeout(() => {
          window.location.replace('/');
        }, 1000);
      }
    } catch (err) {
      console.error('Login exception:', err);
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
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
          {success}
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
          className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="admin@naver.com"
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
          className="w-full px-4 py-3 border border-ivory-300 rounded-lg text-lg font-medium bg-white text-black focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent transition-all duration-300"
          placeholder="비밀번호를 입력하세요"
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-wine text-black py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 shadow-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '로그인 중...' : '관리자 로그인'}
      </button>

      <div className="text-center text-sm text-wine-500 bg-wine-50 p-3 rounded-lg">
        <p className="font-bold mb-1">기본 관리자 계정</p>
        <p>이메일: admin@naver.com</p>
        <p>비밀번호: adminadmin</p>
      </div>
    </form>
  );
} 