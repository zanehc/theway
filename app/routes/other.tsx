import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase";
import { useNavigate } from "@remix-run/react";
import { SignupForm } from "~/components/SignupForm";

export default function OtherPage() {
  const [user, setUser] = useState<any>(null);
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
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // 사용자 정보 가져오기
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, name, email')
          .eq('id', user.id)
          .single();
        
        if (!userError && userData) {
          setUserData(userData);
        }
      }
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      
      if (session?.user) {
        // 사용자 정보 가져오기
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, name, email')
          .eq('id', session.user.id)
          .single();
        
        if (!userError && userData) {
          setUserData(userData);
        }
      } else {
        setUserData(null);
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
        setError(error.message);
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
        redirectTo: 'https://theway2.vercel.app/auth/reset-password',
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
            
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            
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