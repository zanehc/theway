import { Link } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { supabase } from "~/lib/supabase";
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";
import { MyPageModal } from "./MyPageModal";
import { HamburgerMenu } from "./HamburgerMenu";
import ModalPortal from './ModalPortal';
import NotificationBell from './NotificationBell';

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showMyPage, setShowMyPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [userNotification, setUserNotification] = useState<{message: string} | null>(null);
  const notifTimeout = useRef<NodeJS.Timeout | null>(null);

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

    // 알림 실시간 구독 (로그인한 사용자)
    let notifChannel: any = null;
    if (typeof window !== 'undefined') {
      console.log('🔔 Setting up notification channel for user:', user?.id);
      notifChannel = supabase
        .channel('user-notifications')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        }, payload => {
          const notif = payload.new;
          console.log('📨 Notification received:', notif);
          if (user && notif.user_id === user.id) {
            console.log('✅ Notification matches current user, showing alert');
            setUserNotification({ message: notif.message });
            // 사운드: 알림 메시지 음성
            if ('speechSynthesis' in window) {
              const utter = new window.SpeechSynthesisUtterance(notif.message);
              utter.lang = 'ko-KR';
              window.speechSynthesis.speak(utter);
            }
            if (notifTimeout.current) clearTimeout(notifTimeout.current);
            notifTimeout.current = setTimeout(() => setUserNotification(null), 7000);
          } else {
            console.log('❌ Notification does not match current user:', { 
              notificationUserId: notif.user_id, 
              currentUserId: user?.id 
            });
          }
        })
        .subscribe((status) => {
          console.log('🔔 Notification channel status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Notification channel subscribed successfully');
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Notification channel subscription failed');
          }
        });
    }
    return () => {
      subscription.unsubscribe();
      if (notifChannel) notifChannel.unsubscribe();
      if (notifTimeout.current) clearTimeout(notifTimeout.current);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.replace('/');
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
        <div className="max-w-7xl mx-auto px-3 sm:px-8 lg:px-12">
          <div className="flex justify-between items-center py-4 sm:py-6">
            <div className="animate-pulse bg-wine-200 h-8 w-64 rounded"></div>
            <div className="animate-pulse bg-wine-200 h-8 w-32 rounded"></div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="bg-gradient-ivory shadow-soft border-b border-ivory-200/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-8 lg:px-12">
        <div className="flex justify-between items-center py-4 sm:py-6">
          {/* 로고 & 타이틀 */}
          <Link to="/" className="flex items-center space-x-2 sm:space-x-4 group animate-fade-in">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-wine rounded-xl sm:rounded-2xl flex items-center justify-center shadow-wine transition-all duration-300 group-hover:scale-110 group-hover:shadow-large">
              <svg className="w-4 h-4 sm:w-7 sm:h-7 text-ivory-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-wine-800 tracking-tight leading-tight drop-shadow-sm">
                길을여는교회<br />
                <span className="text-wine-600">이음카페</span>
              </h1>
            </div>
          </Link>

          {/* 우측 버튼들 */}
          <div className="flex items-center space-x-2 sm:space-x-4 animate-slide-up">
            {/* 고객일 때만 알림 벨 표시 */}
            {isLoggedIn && userRole === 'customer' && (
              <NotificationBell userId={user.id} />
            )}
            
            {/* 회원명 표시 */}
            {isLoggedIn && (
              <div className="hidden sm:block text-wine-700 font-bold text-sm sm:text-base">
                {user.email?.split('@')[0]}님 안녕하세요
              </div>
            )}
            
            {/* 햄버거 메뉴 또는 로그인 버튼 */}
            {isLoggedIn ? (
              <HamburgerMenu 
                user={user} 
                userRole={userRole} 
                onLogout={handleLogout}
              />
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

      {/* 사용자 알림 배너 */}
      {userNotification && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-green-600 text-ivory-50 px-6 py-4 rounded-xl shadow-2xl font-bold text-lg flex items-center gap-4 cursor-pointer animate-fade-in"
          onClick={() => setUserNotification(null)}
        >
          <span>🔔</span>
          <span>{userNotification.message}</span>
        </div>
      )}
    </header>
  );
} 