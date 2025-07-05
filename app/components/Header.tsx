import { Link } from "@remix-run/react";
import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase";
import { SocialLoginButtons } from "./SocialLoginButtons";
import { AdminLoginForm } from "./AdminLoginForm";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 사용자 상태 확인
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
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
              <h1 className="text-2xl font-black text-wine-800 tracking-tight leading-tight drop-shadow-sm">길을여는교회 이음카페</h1>
              <p className="text-sm text-wine-500 font-medium">주문 관리 시스템</p>
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
          </nav>

          {/* 우측 버튼들 */}
          <div className="flex items-center space-x-4 animate-slide-up">
            <div className="hidden lg:flex items-center space-x-3 text-sm text-wine-500 font-medium">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse-soft shadow-sm"></div>
              <span>시스템 정상</span>
            </div>
            <Link 
              to="/orders/new" 
              className="px-6 py-3 rounded-xl text-ivory-50 font-bold bg-gradient-wine hover:shadow-wine transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1 text-sm"
            >
              새 주문
            </Link>
            {isLoggedIn ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm font-medium text-wine-700">
                  {user.email}
                </span>
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
                onClick={() => setShowLogin(true)}
              >
                로그인
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* 로그인 모달 */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-8 shadow-large min-w-[400px] animate-scale-in relative">
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setShowLogin(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-2xl font-black text-wine-800 mb-6 text-center">로그인</h2>
            
            {/* 탭 버튼 */}
            <div className="flex mb-6 border-b border-gray-200">
              <button
                className={`flex-1 py-3 text-center font-bold transition-colors ${
                  !showAdminLogin 
                    ? 'text-wine-700 border-b-2 border-wine-700' 
                    : 'text-gray-500 hover:text-wine-700'
                }`}
                onClick={() => setShowAdminLogin(false)}
              >
                소셜 로그인
              </button>
              <button
                className={`flex-1 py-3 text-center font-bold transition-colors ${
                  showAdminLogin 
                    ? 'text-wine-700 border-b-2 border-wine-700' 
                    : 'text-gray-500 hover:text-wine-700'
                }`}
                onClick={() => setShowAdminLogin(true)}
              >
                관리자 로그인
              </button>
            </div>

            {showAdminLogin ? (
              <AdminLoginForm />
            ) : (
              <SocialLoginButtons />
            )}
          </div>
        </div>
      )}
    </header>
  );
} 