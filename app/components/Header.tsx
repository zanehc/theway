import { Link } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "~/lib/supabase";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { MyPageModal } from "./MyPageModal";
import { HamburgerMenu } from "./HamburgerMenu";
import { NotificationBell } from "./NotificationBell";
import ModalPortal from './ModalPortal';

export default function Header() {
  // user는 세션에서 즉시, userRole은 비동기로
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [loginRequiredMessage, setLoginRequiredMessage] = useState(false);
  const [orderStats, setOrderStats] = useState({ pending: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0, confirmedOrders: 0 });

  useEffect(() => {
    // 최초 user 정보 가져오기
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) getUserRole(user.id);
      else setUserRole(null);
    };
    const getUserRole = async (userId: string) => {
      setRoleLoading(true);
      try {
        const cachedRole = sessionStorage.getItem(`user_role_${userId}`);
        if (cachedRole) {
          setUserRole(cachedRole);
          setRoleLoading(false);
        } else {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();
          const role = userData?.role || null;
          setUserRole(role);
          if (role) sessionStorage.setItem(`user_role_${userId}`, role);
          setRoleLoading(false);
        }
      } catch {
        setUserRole(null);
        setRoleLoading(false);
      }
    };
    getUser();
    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) getUserRole(session.user.id);
        else setUserRole(null);
      }
    );
    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line
  }, []);


  useEffect(() => {
    // 주문 상태별 숫자 실시간 구독 - 최적화된 버전
    let isSubscribed = true;
    let debounceTimer: NodeJS.Timeout;
    
    const updateStats = async () => {
      if (!isSubscribed) return;
      
      try {
        const { data: allOrders } = await supabase.from('orders').select('status, payment_status');
        if (!isSubscribed) return;
        
        const stats = { pending: 0, preparing: 0, ready: 0, completed: 0, cancelled: 0, confirmedOrders: 0 };
        allOrders?.forEach((order: any) => {
          if (!order) return;
          const status = String(order.status) as keyof typeof stats;
          if (status in stats) stats[status] = (stats[status] || 0) + 1;
          if(order.payment_status === 'confirmed') stats.confirmedOrders += 1;
        });
        setOrderStats(stats);
      } catch (error) {
        console.error('Failed to update order stats:', error);
      }
    };
    
    // 초기 통계 로드
    updateStats();
    
    const channel = supabase
      .channel('orders-realtime-header')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        // 디바운싱으로 성능 최적화
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateStats, 500);
      })
      .subscribe();
      
    return () => { 
      isSubscribed = false;
      clearTimeout(debounceTimer);
      channel.unsubscribe(); 
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.replace('/');
    } catch (error) {}
  };

  const handleLoginClick = () => {
    setShowLogin(true);
  };

  const handleLoginSuccess = () => {
    setShowLogin(false);
    setLoginSuccess(true);
    setTimeout(() => setLoginSuccess(false), 2000);
    window.location.reload();
  };



  return (
    <header className="bg-gradient-ivory shadow-soft border-b border-ivory-200/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center py-4 sm:py-6">
          {/* 로고 & 타이틀 - 항상 표시 */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-4 group animate-fade-in">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-wine rounded-xl sm:rounded-2xl flex items-center justify-center shadow-wine transition-all duration-300 group-hover:scale-110 group-hover:shadow-large">
              <svg className="w-4 h-4 sm:w-7 sm:h-7 text-ivory-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-wine-800 tracking-tight leading-tight drop-shadow-sm">
                길을여는교회<br />
                <div className="flex items-center gap-2">
                  <span className="text-wine-600">이음카페</span>
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold shadow-sm">
                    Beta
                  </span>
                </div>
              </h1>
            </div>
          </Link>

          {/* 중앙 공간 */}
          <div className="flex-1"></div>

          {/* 우측 버튼들 - user만 있으면 즉시 렌더, userRole은 관리자 메뉴만 동적으로 */}
          <div className="flex items-center space-x-2 sm:space-x-4 animate-slide-up">
            {user ? (
              <>
                {/* 회원명 표시 */}
                <div className="hidden sm:block text-wine-700 font-bold text-sm sm:text-base">
                  {user.email?.split('@')[0]}님 안녕하세요
                </div>
                {/* 알림 벨 */}
                <NotificationBell 
                  userId={user?.id}
                  userRole={userRole ?? 'customer'}
                />
                {/* 햄버거 메뉴 - userRole이 오기 전엔 일반 사용자 메뉴만, 오면 관리자 메뉴 동적 추가 */}
                <HamburgerMenu 
                  user={user} 
                  userRole={userRole ?? 'customer'} 
                  onLogout={handleLogout}
                  onMyPageClick={() => setShowMyPage(true)}
                />
              </>
            ) : (
              <button
                className="bg-wine-100 hover:bg-wine-200 text-wine-700 px-3 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-all duration-300 shadow-soft hover:shadow-medium transform hover:-translate-y-1 text-xs sm:text-sm"
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
        <ModalPortal>
          {/* 검은 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black/60 z-[50000]"
            onClick={() => setShowLogin(false)}
          />
          {/* 모달 본체 */}
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-2xl w-full max-w-xs sm:max-w-md"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold z-10"
              onClick={() => setShowLogin(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-wine-800 mb-4 text-center">로그인</h2>
            <LoginForm onSwitchToSignup={() => {
              setShowLogin(false);
              setShowSignup(true);
            }} onLoginSuccess={handleLoginSuccess} />
          </div>
        </ModalPortal>
      )}

      {loginSuccess && (
        <div className="fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-[99999] bg-green-100 border border-green-400 text-green-700 px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-large animate-fade-in font-bold text-sm sm:text-lg">
          로그인 되었습니다
        </div>
      )}

      {/* 회원가입 모달 */}
      {showSignup && (
        <ModalPortal>
          {/* 검은 배경 오버레이 */}
          <div
            className="fixed inset-0 bg-black/60 z-[50000]"
            onClick={() => setShowSignup(false)}
          />
          {/* 모달 본체 */}
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl p-6 shadow-2xl w-full max-w-xs sm:max-w-lg"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-xl font-bold z-10"
              onClick={() => setShowSignup(false)}
              aria-label="닫기"
            >
              ×
            </button>
            <h2 className="text-xl font-black text-wine-800 mb-4 text-center">회원가입</h2>
            <SignupForm onSwitchToLogin={() => {
              setShowSignup(false);
              setShowLogin(true);
            }} />
          </div>
        </ModalPortal>
      )}

      {/* 마이페이지 모달 */}
      <MyPageModal 
        isOpen={showMyPage} 
        onClose={() => setShowMyPage(false)} 
      />


      {/* 로그인 필요 메시지 */}
      {loginRequiredMessage && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-wine-600 text-ivory-50 px-6 py-4 rounded-xl shadow-2xl font-bold text-lg flex items-center gap-4 cursor-pointer animate-fade-in"
          onClick={() => setLoginRequiredMessage(false)}
        >
          <span>⚠️</span>
          <span>주문을 하려면 로그인이 필요합니다</span>
        </div>
      )}
    </header>
  );
} 