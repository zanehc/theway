import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';

export default function DebugLogin() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [authUsers, setAuthUsers] = useState<any[]>([]);
  const [dbUsers, setDbUsers] = useState<any[]>([]);

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
      console.log('로그인 시도:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('로그인 에러:', error);
        setMessage(`로그인 실패: ${error.message}`);
      } else {
        console.log('로그인 성공:', data);
        setMessage('로그인 성공!');
        setUser(data.user);
      }
    } catch (err) {
      console.error('로그인 예외:', err);
      setMessage(`오류 발생: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.replace('/');
  };

  const checkAuthUsers = async () => {
    try {
      // Supabase Auth Users 조회 (관리자 권한 필요)
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) {
        setMessage(`Auth Users 조회 실패: ${error.message}`);
      } else {
        setAuthUsers(data.users || []);
        setMessage(`Auth Users 조회 성공: ${data.users?.length || 0}명`);
      }
    } catch (err) {
      setMessage(`Auth Users 조회 오류: ${err}`);
    }
  };

  const checkDbUsers = async () => {
    try {
      // users 테이블 조회
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        setMessage(`DB Users 조회 실패: ${error.message}`);
      } else {
        setDbUsers(data || []);
        setMessage(`DB Users 조회 성공: ${data?.length || 0}명`);
      }
    } catch (err) {
      setMessage(`DB Users 조회 오류: ${err}`);
    }
  };

  const createTestUser = async () => {
    try {
      const testEmail = 'test@example.com';
      const testPassword = 'test123456';

      // 1. Supabase Auth에 사용자 생성
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            name: '테스트 사용자',
            church_group: '테스트 목장',
            role: 'customer',
          },
        },
      });

      if (authError) {
        setMessage(`Auth 사용자 생성 실패: ${authError.message}`);
        return;
      }

      // 2. users 테이블에 사용자 정보 저장
      if (authData.user) {
        const { error: dbError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: testEmail,
          name: '테스트 사용자',
          church_group: '테스트 목장',
          role: 'customer',
          created_at: new Date().toISOString(),
        });

        if (dbError) {
          setMessage(`DB 사용자 생성 실패: ${dbError.message}`);
        } else {
          setMessage('테스트 사용자 생성 완료! 이메일: test@example.com, 비밀번호: test123456');
          setEmail(testEmail);
          setPassword(testPassword);
        }
      }
    } catch (err) {
      setMessage(`테스트 사용자 생성 오류: ${err}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-warm p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-black text-wine-800 mb-8 text-center">로그인 디버그</h1>
        
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('성공') || message.includes('완료')
              ? 'bg-green-100 text-green-700 border border-green-400'
              : 'bg-red-100 text-red-700 border border-red-400'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 로그인 폼 */}
          <div className="bg-white rounded-2xl shadow-large p-8">
            <h2 className="text-2xl font-black text-wine-800 mb-6">로그인 테스트</h2>
            
            {user ? (
              <div className="space-y-4">
                <div className="bg-wine-50 p-4 rounded-lg">
                  <h3 className="font-bold text-wine-800 mb-2">로그인된 사용자</h3>
                  <p className="text-wine-600">이메일: {user.email}</p>
                  <p className="text-wine-600">ID: {user.id}</p>
                  <p className="text-wine-600">메타데이터: {JSON.stringify(user.user_metadata)}</p>
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
                    placeholder="test@example.com"
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
                    placeholder="test123456"
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

            <div className="mt-6 space-y-3">
              <button
                onClick={createTestUser}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm"
              >
                테스트 사용자 생성
              </button>
            </div>
          </div>

          {/* 데이터 확인 */}
          <div className="space-y-6">
            {/* Auth Users */}
            <div className="bg-white rounded-2xl shadow-large p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-wine-800">Supabase Auth Users</h3>
                <button
                  onClick={checkAuthUsers}
                  className="bg-wine-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-wine-700 transition-colors text-sm"
                >
                  조회
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {authUsers.length > 0 ? (
                  <div className="space-y-2">
                    {authUsers.map((authUser, index) => (
                      <div key={authUser.id} className="p-3 bg-ivory-50 rounded-lg text-sm">
                        <div className="font-bold text-wine-800">{index + 1}. {authUser.email}</div>
                        <div className="text-wine-600">ID: {authUser.id}</div>
                        <div className="text-wine-600">확인됨: {authUser.email_confirmed_at ? '예' : '아니오'}</div>
                        <div className="text-wine-600">생성: {new Date(authUser.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-wine-400 text-center py-4">Auth Users 데이터가 없습니다.</p>
                )}
              </div>
            </div>

            {/* DB Users */}
            <div className="bg-white rounded-2xl shadow-large p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-wine-800">Database Users</h3>
                <button
                  onClick={checkDbUsers}
                  className="bg-wine-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-wine-700 transition-colors text-sm"
                >
                  조회
                </button>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {dbUsers.length > 0 ? (
                  <div className="space-y-2">
                    {dbUsers.map((dbUser, index) => (
                      <div key={dbUser.id} className="p-3 bg-ivory-50 rounded-lg text-sm">
                        <div className="font-bold text-wine-800">{index + 1}. {dbUser.email}</div>
                        <div className="text-wine-600">ID: {dbUser.id}</div>
                        <div className="text-wine-600">이름: {dbUser.name}</div>
                        <div className="text-wine-600">역할: {dbUser.role}</div>
                        <div className="text-wine-600">생성: {new Date(dbUser.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-wine-400 text-center py-4">DB Users 데이터가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 환경변수 확인 */}
        <div className="mt-8 bg-white rounded-2xl shadow-large p-6">
          <h3 className="text-xl font-black text-wine-800 mb-4">환경변수 확인</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-3 bg-ivory-50 rounded-lg">
              <div className="font-bold text-wine-800 mb-1">SUPABASE_URL</div>
              <div className="text-sm text-wine-600">
                {typeof window !== 'undefined' ? (window.__ENV?.SUPABASE_URL ? '설정됨' : '설정되지 않음') : '서버사이드'}
              </div>
            </div>
            <div className="p-3 bg-ivory-50 rounded-lg">
              <div className="font-bold text-wine-800 mb-1">SUPABASE_ANON_KEY</div>
              <div className="text-sm text-wine-600">
                {typeof window !== 'undefined' ? (window.__ENV?.SUPABASE_ANON_KEY ? '설정됨' : '설정되지 않음') : '서버사이드'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 