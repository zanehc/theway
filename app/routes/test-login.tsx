import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';

export default function TestLogin() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('adminadmin');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 현재 사용자 상태 확인
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };

    getUser();

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(`로그인 실패: ${error.message}`);
      } else {
        setMessage('로그인 성공!');
      }
    } catch (err) {
      setMessage(`오류 발생: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMessage('로그아웃 완료');
  };

  return (
    <div className="min-h-screen bg-gradient-warm p-8">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-large p-8">
        <h1 className="text-3xl font-black text-wine-800 mb-8 text-center">로그인 테스트</h1>
        
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('성공') 
              ? 'bg-green-100 text-green-700 border border-green-400'
              : 'bg-red-100 text-red-700 border border-red-400'
          }`}>
            {message}
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="bg-wine-50 p-4 rounded-lg">
              <h2 className="font-bold text-wine-800 mb-2">로그인된 사용자</h2>
              <p className="text-wine-600">이메일: {user.email}</p>
              <p className="text-wine-600">ID: {user.id}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full bg-red-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-red-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-wine-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-ivory-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine-500"
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
                className="w-full px-4 py-3 border border-ivory-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine-500"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-wine text-ivory-50 py-3 px-4 rounded-lg font-bold hover:shadow-wine transition-all duration-300 disabled:opacity-50"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        )}

        <div className="mt-8 p-4 bg-ivory-50 rounded-lg">
          <h3 className="font-bold text-wine-800 mb-2">환경변수 확인</h3>
          <p className="text-sm text-wine-600">
            SUPABASE_URL: {typeof window !== 'undefined' ? (window.__ENV?.SUPABASE_URL ? '설정됨' : '설정되지 않음') : '서버사이드'}
          </p>
          <p className="text-sm text-wine-600">
            SUPABASE_ANON_KEY: {typeof window !== 'undefined' ? (window.__ENV?.SUPABASE_ANON_KEY ? '설정됨' : '설정되지 않음') : '서버사이드'}
          </p>
        </div>
      </div>
    </div>
  );
} 