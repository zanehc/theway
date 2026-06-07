import { Link, useLocation, useNavigate, useFetcher } from "@remix-run/react";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "~/lib/supabase";

interface BottomNavigationProps {
  user: any;
}

export default function BottomNavigation({ user }: BottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  const recentFetcher = useFetcher();
  const ordersFetcher = useFetcher();

  useEffect(() => {
    console.log('📱 BottomNavigation - Props 업데이트:', { user: user?.email || 'null' });
  }, [user]);

  const prefetchTabData = useCallback((path: string) => {
    if (!user) return;
    try {
      switch (path) {
        case '/orders/history':
          if (recentFetcher.state === 'idle' && !recentFetcher.data) {
            recentFetcher.load('/orders/history');
          }
          break;
        case '/orders/new':
          if (ordersFetcher.state === 'idle' && !ordersFetcher.data) {
            ordersFetcher.load('/orders/new');
          }
          break;
      }
    } catch (error) {
      console.warn('Tab prefetch failed:', error);
    }
  }, [user, recentFetcher, ordersFetcher]);

  useEffect(() => {
    if (!user) return;
    const currentPath = location.pathname;
    const tabsToPreload = ['/orders/history', '/orders/new'].filter(path => path !== currentPath);
    const timer = setTimeout(() => {
      tabsToPreload.forEach(path => prefetchTabData(path));
    }, 500);
    return () => clearTimeout(timer);
  }, [location.pathname, user, prefetchTabData]);

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const handleNavClick = async (item: any, e: React.MouseEvent) => {
    // 로그인되지 않은 상태에서 최근주문이나 새 주문 탭 클릭 시
    if (!user && (item.path === "/orders/history" || item.path === "/orders/new")) {
      e.preventDefault();
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          prefetchTabData(item.path);
          navigate(item.path);
          return;
        }
      } catch {}
      setShowLoginModal(true);
      return;
    }
    
    // 탭 클릭 시 해당 탭 데이터를 즉시 프리로드
    prefetchTabData(item.path);
  };

  // 마우스 호버 시 데이터 프리로딩
  const handleNavHover = (path: string) => {
    if (user) {
      prefetchTabData(path);
    }
  };

  const navItems = [
    {
      path: "/",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      label: "홈",
      showWhenLoggedIn: true,
      showWhenLoggedOut: true,
    },
    {
      path: "/orders/history",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: "최근주문",
      showWhenLoggedIn: true,
      showWhenLoggedOut: true,
    },
    {
      path: "/orders/new",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      ),
      label: "새 주문",
      showWhenLoggedIn: true,
      showWhenLoggedOut: true,
    },
    {
      path: "/other",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      ),
      label: "기타",
      showWhenLoggedIn: true,
      showWhenLoggedOut: true,
    },
  ];

  const filteredItems = navItems.filter((item) => {
    if (user) {
      return item.showWhenLoggedIn;
    } else {
      return item.showWhenLoggedOut;
    }
  });

  return (
    <>
      {/* 로그인 모달 */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 mx-4 max-w-sm w-full">
            <div className="text-center">
              <h3 className="text-lg font-bold text-ink mb-4">로그인이 필요합니다</h3>
              <p className="text-mute mb-6">
                이 기능을 사용하려면 로그인해주세요.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    navigate("/other");
                  }}
                  className="flex-1 bg-primary text-white py-2 px-4 rounded-2xl font-bold hover:bg-primary-pressed"
                >
                  로그인하기
                </button>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 bg-secondary-bg text-body py-2 px-4 rounded-2xl font-bold hover:bg-secondary-pressed"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="bottom-navigation border-t border-hairline-soft shadow-[0_-4px_18px_rgba(0,0,0,0.04)]">
        <div className="bottom-navigation-inner flex justify-around">
          {filteredItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                prefetch="intent"
                onClick={(e) => handleNavClick(item, e)}
                onMouseEnter={() => handleNavHover(item.path)}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center px-3 transition-colors duration-200 ${
                  active
                    ? "text-primary"
                    : "text-mute hover:text-body"
                }`}
              >
                <div className={`${active ? "text-primary" : "text-mute"}`}>
                  {item.icon}
                </div>
                <span className={`text-xs mt-1 ${active ? "text-primary" : "text-mute"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
} 
