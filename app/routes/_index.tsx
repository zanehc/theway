import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useOutletContext, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getMenus } from "~/lib/database";
import { supabase } from "~/lib/supabase";
import { useNotifications } from "~/contexts/NotificationContext";
import { logout } from '~/lib/auth-utils';
import { LoginForm } from "~/components/LoginForm";
import { SignupForm } from "~/components/SignupForm";
import ModalPortal from "~/components/ModalPortal";
import { HomeSkeleton } from "~/components/LoadingSkeleton";
import type { Menu } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');

  const menus = await getMenus();

  return json({
    error,
    success,
    menus
  });
}

export default function Index() {
  const { error, success, menus } = useLoaderData<typeof loader>();
  const outletContext = useOutletContext<{ user: any; userRole: string | null; authReady: boolean }>();
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(outletContext?.user || null);
  const [mounted, setMounted] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { initializeTTS } = useNotifications();

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // outletContext에서 user가 바뀌면 즉시 반영
  useEffect(() => {
    if (outletContext?.user) {
      setUser(outletContext.user);
    }
  }, [outletContext?.user]);

  // Safari 호환성을 위한 안전한 네비게이션 상태 체크 (hooks 이후에 위치)
  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/") {
    return <HomeSkeleton />;
  }

  if (!mounted) {
    return null;
  }

  // 카테고리별 메뉴 그룹핑
  const menusByCategory = (menus as Menu[]).reduce((acc: Record<string, Menu[]>, menu: Menu) => {
    if (!acc[menu.category]) acc[menu.category] = [];
    acc[menu.category].push(menu);
    return acc;
  }, {});

  const categoryLabels: Record<string, string> = {
    coffee: '커피',
    beverage: '음료',
    tea: '티',
    ade: '에이드',
    smoothie: '스무디',
    dessert: '디저트',
    bread: '빵',
    etc: '기타',
  };

  return (
    <div className="min-h-screen bg-ivory-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 브랜드 및 사용자 정보 헤더 */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-wine rounded-xl flex items-center justify-center shadow-wine">
                <svg className="w-6 h-6 text-ivory-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-black text-wine-800 leading-tight">
                  길을여는교회 이음카페
                </h1>
                <div className="flex items-center gap-2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold">
                    Beta
                  </span>
                </div>
              </div>
            </div>

            {/* 사용자 정보 및 로그인 버튼 */}
            <div className="flex items-center space-x-3">
              {user ? (
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="text-wine-700 font-bold text-sm">
                      {user.email?.split('@')[0]}님
                    </div>
                    <div className="text-wine-600 text-xs">
                      안녕하세요
                    </div>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg font-medium transition-all text-xs"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    initializeTTS();
                    setShowLogin(true);
                  }}
                  className="bg-wine-100 hover:bg-wine-200 text-wine-700 px-4 py-2 rounded-lg font-bold transition-all text-sm"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 주문하기 버튼 */}
        <div className="mb-6">
          <Link
            to="/orders/new"
            className="block w-full bg-gradient-wine text-white text-center py-3.5 rounded-2xl font-bold text-lg shadow-wine hover:opacity-90 transition-opacity"
          >
            주문하기
          </Link>
        </div>

        {/* 카페 메뉴 */}
        <div className="space-y-6">
          {Object.entries(menusByCategory).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-lg font-black text-wine-800 mb-3 px-1">
                {categoryLabels[category] || category}
              </h2>
              <div className="bg-white rounded-2xl shadow-md overflow-hidden divide-y divide-gray-100">
                {(items as Menu[]).map((menu: Menu) => (
                  <div key={menu.id} className="flex items-center px-4 py-3.5">
                    {menu.image_url && (
                      <img
                        src={menu.image_url}
                        alt={menu.name}
                        className="w-14 h-14 rounded-xl object-cover mr-3.5 flex-shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-sm truncate">{menu.name}</h3>
                      {menu.description && (
                        <p className="text-gray-500 text-xs mt-0.5 truncate">{menu.description}</p>
                      )}
                    </div>
                    <span className="text-wine-700 font-bold text-sm ml-3 flex-shrink-0">
                      {menu.price.toLocaleString()}원
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {Object.keys(menusByCategory).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              등록된 메뉴가 없습니다.
            </div>
          )}
        </div>

      </div>

      {/* 로그인 모달 */}
      {showLogin && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/60 z-[50000]"
            onClick={() => setShowLogin(false)}
          />
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
            <LoginForm
              onSwitchToSignup={() => {
                setShowLogin(false);
                setShowSignup(true);
              }}
              onLoginSuccess={async () => {
                setShowLogin(false);
                setLoginSuccess(true);
                // reload 대신 세션에서 user 직접 반영
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (session?.user) {
                    setUser(session.user);
                  }
                } catch {}
                setTimeout(() => setLoginSuccess(false), 1500);
              }}
            />
          </div>
        </ModalPortal>
      )}

      {/* 회원가입 모달 */}
      {showSignup && (
        <ModalPortal>
          <div
            className="fixed inset-0 bg-black/60 z-[50000]"
            onClick={() => setShowSignup(false)}
          />
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
            <SignupForm
              onSwitchToLogin={() => {
                setShowSignup(false);
                setShowLogin(true);
              }}
            />
          </div>
        </ModalPortal>
      )}

      {/* 로그인 성공 메시지 */}
      {loginSuccess && (
        <div className="fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-[99999] bg-green-100 border border-green-400 text-green-700 px-4 sm:px-6 py-3 sm:py-4 rounded-lg shadow-2xl animate-fade-in font-bold text-sm sm:text-lg">
          로그인 되었습니다
        </div>
      )}
    </div>
  );
}
