import { Link, useLocation, useNavigate, useFetcher } from "@remix-run/react";
import { useEffect, useState, useCallback } from "react";

interface BottomNavigationProps {
  user: any;
}

export default function BottomNavigation({ user }: BottomNavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // 각 탭의 데이터를 미리 로드하기 위한 fetcher들
  const recentFetcher = useFetcher();
  const ordersFetcher = useFetcher();

  // Props 변경 시 로그
  useEffect(() => {
    console.log('📱 BottomNavigation - Props 업데이트:', { user: user?.email || 'null' });
  }, [user]);

  // 데이터 프리로딩 함수 (Safari 호환성 개선)
  const prefetchTabData = useCallback((path: string) => {
    if (!user) return; // 로그인하지 않은 사용자는 스킵
    
    // Safari에서 안전한 프리로딩을 위한 예외 처리
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

  // 현재 탭이 아닌 다른 탭들의 데이터를 미리 로드
  useEffect(() => {
    if (!user) return;
    
    const currentPath = location.pathname;
    const tabsToPreload = ['/orders/history', '/orders/new'].filter(path => path !== currentPath);
    
    // 500ms 지연 후 프리로딩 시작 (현재 페이지 로딩을 방해하지 않기 위해)
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

  const handleNavClick = (item: any, e: React.MouseEvent) => {
    // 로그인되지 않은 상태에서 최근주문이나 새 주문 탭 클릭 시
    if (!user && (item.path === "/orders/history" || item.path === "/orders/new")) {
      e.preventDefault();
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
          <div className="bg-white rounded-lg p-6 mx-4 max-w-sm w-full">
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900 mb-4">로그인이 필요합니다</h3>
              <p className="text-gray-600 mb-6">
                이 기능을 사용하려면 로그인해주세요.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLoginModal(false);
                    navigate("/other");
                  }}
                  className="flex-1 bg-red-800 text-white py-2 px-4 rounded-lg font-bold hover:bg-red-700"
                >
                  로그인하기
                </button>
                <button
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg font-bold hover:bg-gray-400"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="flex justify-around">
          {filteredItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={(e) => handleNavClick(item, e)}
                onMouseEnter={() => handleNavHover(item.path)}
                className={`flex flex-col items-center py-2 px-3 min-w-0 flex-1 transition-colors duration-200 ${
                  active
                    ? "text-red-800"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <div className={`${active ? "text-red-800" : "text-gray-500"}`}>
                  {item.icon}
                </div>
                <span className={`text-xs mt-1 ${active ? "text-red-800" : "text-gray-500"}`}>
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