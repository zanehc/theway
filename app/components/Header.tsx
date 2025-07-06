import { Link } from "@remix-run/react";
import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { MyPageModal } from "./MyPageModal";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginSuccess, setLoginSuccess] = useState(false);

  useEffect(() => {
    // 현재 사용자 상태 확인
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Current user:', user);
        setUser(user);
        if (user) {
          // users 테이블에서 role 조회
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          setUserRole(userData?.role || null);
        } else {
          setUserRole(null);
        }
      } catch (error) {
        console.error('Error getting user:', error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    getUser();

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user);
        setUser(session?.user ?? null);
        if (session?.user) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .single();
          setUserRole(userData?.role || null);
        } else {
          setUserRole(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleLoginClick = () => {
    console.log('Login button clicked, setting showLogin to true');
    setShowLogin(true);
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    setLoginSuccess(true);
    setTimeout(() => setLoginSuccess(false), 2000);
    window.location.reload();
  };

  const isLoggedIn = !!user;

  if (loading) {
    return (
      <header className="bg-gradient-ivory shadow-soft border-b border-ivory-200/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center py-6">
            <div className="animate-pulse bg-wine-200 h-8 w-64 rounded"></div>
            <div className="animate-pulse bg-wine-200 h-8 w-32 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-gradient-ivory shadow-soft border-b border-ivory-200/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center py-6">
          {/* 로고 & 타이틀 */}
          <Link to="/" className="flex items-center space-x-4 group animate-fade-in">
            <div className="w-12 h-12 bg-gradient-wine rounded-2xl flex items-center justify-center shadow-wine transition-all duration-300 group-hover:scale-110 group-hover:shadow-large">
              <svg className="w-7 h-7 text-ivory-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-black text-wine-800 tracking-tight leading-tight drop-shadow-sm">
                길을여는교회<br />
                <span className="text-wine-600">이음카페</span>
              </h1>
            </div>
          </Link>

          {/* 네비게이션 */}
          <nav className="hidden md:flex items-center space-x-8 animate-slide-up">
            {isLoggedIn && (
              <>
                <Link 
                  to="/orders" 
                  className="text-wine-700 hover:text-wine-900 font-medium transition-colors duration-300"
                >
                  주문 현황
                </Link>
                {userRole === 'admin' && (
                  <>
                    <Link 
                      to="/menus" 
                      className="text-wine-700 hover:text-wine-900 font-medium transition-colors duration-300"
                    >
                      메뉴 관리
                    </Link>
                    <Link 
                      to="/reports" 
                      className="text-wine-700 hover:text-wine-900 font-medium transition-colors duration-300"
                    >
                      매출 보고
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* 우측 버튼들 */}
          <div className="flex items-center space-x-4 animate-slide-up">
            {/* 시스템 정상 표시 삭제됨 */}
            {isLoggedIn && (
              <Link 
                to="/orders/new" 
                className="px-6 py-3 rounded-xl text-ivory-50 font-bold bg-gradient-wine hover:shadow-wine transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1 text-sm"
              >
                새 주문
              </Link>
            )}
            {isLoggedIn ? (
              <div className="flex items-center space-x-3">
                <button
                  className="bg-wine-100 hover:bg-wine-200 text-wine-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 shadow-soft hover:shadow-medium text-sm"
                  onClick={() => setShowMyPage(true)}
                >
                  마이페이지
                </button>
                <button
                  className="bg-wine-100 hover:bg-wine-200 text-wine-700 px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-soft hover:shadow-medium transform hover:-translate-y-1 text-sm"
                  onClick={handleLogout}
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                className="bg-wine-100 hover:bg-wine-200 text-wine-700 px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-soft hover:shadow-medium transform hover:-translate-y-1 text-sm"
                onClick={handleLoginClick}
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 로그인 모달 */}
      {showLogin && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setShowLogin(false)}>
          <div className="bg-white rounded-2xl p-8 shadow-large min-w-[400px] animate-scale-in relative" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setShowLogin(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-2xl font-black text-wine-800 mb-6 text-center">로그인</h2>
            
            <LoginForm onSwitchToSignup={() => {
              setShowLogin(false);
              setShowSignup(true);
            }} onLoginSuccess={handleLoginSuccess} />
          </div>
        </div>
      )}

      {loginSuccess && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg shadow-large animate-fade-in font-bold text-lg">
          로그인 되었습니다
        </div>
      )}

      {/* 회원가입 모달 */}
      {showSignup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40" onClick={() => setShowSignup(false)}>
          <div className="bg-white rounded-2xl p-8 shadow-large min-w-[500px] max-h-[90vh] overflow-y-auto animate-scale-in relative" onClick={(e) => e.stopPropagation()}>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setShowSignup(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-2xl font-black text-wine-800 mb-6 text-center">회원가입</h2>
            
            <SignupForm onSwitchToLogin={() => {
              setShowSignup(false);
              setShowLogin(true);
            }} />
          </div>
        </div>
      )}

      {/* 마이페이지 모달 */}
      <MyPageModal 
        isOpen={showMyPage} 
        onClose={() => setShowMyPage(false)} 
      />
    </header>
  );
} 