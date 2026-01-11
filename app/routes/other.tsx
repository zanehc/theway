import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase";
import { useNavigate, useOutletContext } from "@remix-run/react";
import { SignupForm } from "~/components/SignupForm";

export default function OtherPage() {
  // root.tsx에서 관리하는 인증 상태를 사용
  const outletContext = useOutletContext<{ user: any; userRole: string | null }>();
  const contextUser = outletContext?.user || null;

  const [user, setUser] = useState<any>(contextUser);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState<string | null>(null);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // context에서 user가 변경되면 로컬 상태도 업데이트
  useEffect(() => {
    console.log('📱 기타탭 - Context 동기화:', contextUser?.email || 'null');
    setUser(contextUser);
  }, [contextUser]);

  // 마운트 시 세션 재확인 (탭 이동 후 세션 유실 방지)
  useEffect(() => {
    if (!mounted) return;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('📱 기타탭 - 세션 확인:', session?.user?.email || 'null', error?.message || '');

        if (session?.user && !user) {
          console.log('📱 기타탭 - 세션에서 사용자 복구:', session.user.email);
          setUser(session.user);
        }
      } catch (err) {
        console.error('📱 기타탭 - 세션 확인 실패:', err);
      }
    };

    checkSession();
  }, [mounted]);

  // 사용자 정보 및 역할 로드
  useEffect(() => {
    const loadUserData = async () => {
      if (user) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, name, email')
            .eq('id', user.id)
            .single();

          if (!userError && userData) {
            setUserData(userData);
          }
        } catch (err) {
          console.error('사용자 데이터 로드 실패:', err);
        }
      } else {
        setUserData(null);
      }
    };
    loadUserData();
  }, [user]);

  // 로그인/로그아웃 이벤트 리스닝 (로컬 로그인 시 즉시 반영을 위해)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('📱 기타탭 - 인증 상태 변경:', event, session?.user?.email || 'null');
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setUserData(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('📱 기타탭 - 토큰 갱신됨');
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('아이디 또는 비밀번호를 확인해주세요.');
        } else {
          setError(error.message);
        }
      } else {
        // 로그인 성공 시 홈으로 이동
        navigate("/");
      }
    } catch (err) {
      setError("로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // 구글 로그인
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

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
      // 성공 시 자동으로 리다이렉트
    } catch (err) {
      setError('구글 로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 카카오 로그인
  const handleKakaoLogin = async () => {
    setLoading(true);
    setError(null);

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
      // 성공 시 자동으로 리다이렉트
    } catch (err) {
      setError('카카오 로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      setError("로그아웃 중 오류가 발생했습니다.");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setForgotPasswordLoading(true);
      setForgotPasswordError(null);
      setForgotPasswordSuccess(false);

      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setForgotPasswordError(error.message);
      } else {
        setForgotPasswordSuccess(true);
        setForgotPasswordEmail("");
      }
    } catch (err) {
      setForgotPasswordError("비밀번호 재설정 이메일 전송 중 오류가 발생했습니다.");
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  if (user) {
    return (
      <div className="min-h-screen bg-ivory-50 pb-20">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-wine-800 mb-6 text-center">기타</h1>

            <div className="space-y-4">
              <div className="text-center">
                <p className="text-gray-600 mb-2">현재 로그인된 사용자</p>
                <p className="font-semibold text-wine-800">{user.email}</p>
              </div>

              <button
                onClick={() => navigate("/mypage")}
                className="w-full bg-wine-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-wine-700 transition-colors"
              >
                마이페이지
              </button>
              {userData?.role === 'admin' && (
                <>
                  <button
                    onClick={() => navigate("/menus")}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-green-700 transition-colors"
                  >
                    메뉴 수정
                  </button>
                  <button
                    onClick={() => navigate("/admin/news")}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  >
                    교회소식 관리
                  </button>
                </>
              )}
              <button
                onClick={handleLogout}
                className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg font-bold hover:bg-gray-600 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showSignup) {
    return (
      <div className="min-h-screen bg-ivory-50 pb-20">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-wine-800 mb-6 text-center">회원가입</h1>
            <SignupForm onSwitchToLogin={() => setShowSignup(false)} />
          </div>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-ivory-50 pb-20">
        <div className="max-w-md mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-2xl font-bold text-wine-800 mb-6 text-center">비밀번호 찾기</h1>

            {forgotPasswordSuccess ? (
              <div className="text-center">
                <div className="text-green-600 mb-4">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-semibold">이메일이 전송되었습니다!</p>
                </div>
                <p className="text-gray-600 mb-4">
                  입력하신 이메일 주소로 비밀번호 재설정 링크를 보냈습니다.
                  이메일을 확인하여 비밀번호를 재설정해주세요.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordSuccess(false);
                  }}
                  className="w-full bg-wine-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-wine-700 transition-colors"
                >
                  로그인으로 돌아가기
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label htmlFor="forgotPasswordEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    이메일 주소
                  </label>
                  <input
                    type="email"
                    id="forgotPasswordEmail"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                    placeholder="가입한 이메일 주소를 입력하세요"
                  />
                </div>

                {forgotPasswordError && (
                  <div className="text-red-600 text-sm">{forgotPasswordError}</div>
                )}

                <button
                  type="submit"
                  disabled={forgotPasswordLoading}
                  className="w-full bg-wine-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-wine-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {forgotPasswordLoading ? "전송 중..." : "비밀번호 재설정 이메일 보내기"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full text-wine-600 hover:text-wine-700 text-sm font-medium"
                >
                  ← 로그인으로 돌아가기
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50 pb-20">
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-wine-800 mb-6 text-center">로그인</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* 소셜 로그인 버튼 */}
          <div className="space-y-3 mb-6">
            {/* 구글 로그인 버튼 */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border-2 border-wine-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-ivory-50 hover:border-wine-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
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
              className="w-full flex items-center justify-center gap-3 bg-[#FEE500] border-2 border-[#FEE500] text-[#000000] py-3 px-4 rounded-lg font-medium hover:bg-[#FDD835] hover:border-[#FDD835] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 3c-4.97 0-9 2.69-9 6 0 2.34 1.95 4.38 4.78 5.51l-.88 4.49 4.51-2.84c.61.08 1.24.13 1.89.13 4.97 0 9-2.69 9-6s-4.03-6-9.3-6z"
                  fill="#000000"
                />
              </svg>
              <span className="font-semibold">{loading ? '연결 중...' : '카카오로 로그인'}</span>
            </button>
          </div>

          {/* 구분선 */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-wine-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-wine-600">또는</span>
            </div>
          </div>

          {/* 이메일/비밀번호 로그인 */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                이메일
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                placeholder="이메일을 입력하세요"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine-500 focus:border-transparent"
                placeholder="비밀번호를 입력하세요"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-wine-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-wine-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => setShowForgotPassword(true)}
              className="w-full text-wine-600 hover:text-wine-700 text-sm font-medium"
            >
              비밀번호를 잊으셨나요?
            </button>

            <div className="text-center">
              <span className="text-gray-500 text-sm">계정이 없으신가요? </span>
              <button
                onClick={() => setShowSignup(true)}
                className="text-wine-600 hover:text-wine-700 text-sm font-medium"
              >
                회원가입
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 