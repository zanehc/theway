import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Link, useOutletContext, useNavigation, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getMenus, getOrdersByUserId } from "~/lib/database";
import { useNotifications } from "~/contexts/NotificationContext";
import { LoginForm } from "~/components/LoginForm";
import { SignupForm } from "~/components/SignupForm";
import ModalPortal from "~/components/ModalPortal";
import { HomeSkeleton } from "~/components/LoadingSkeleton";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');

  let menus: any[] = [];
  try {
    menus = await getMenus();
  } catch (e) {
    console.error('메뉴 로딩 실패:', e);
  }

  return json({ error, success, menus });
}

// 카테고리 설정
const CATEGORIES = [
  { id: 'ice coffee', label: 'Ice 커피', emoji: '🧊', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'hot coffee', label: 'Hot 커피', emoji: '☕', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'tea', label: '차', emoji: '🍵', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { id: 'beverage', label: '음료', emoji: '🥤', color: 'bg-green-100 text-green-700 border-green-200' },
];

export default function Index() {
  const { error, success, menus } = useLoaderData<typeof loader>();
  const outletContext = useOutletContext<{ user: any; userRole: string | null }>();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  const user = outletContext?.user || null;
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { showNotification, initializeTTS } = useNotifications();

  useEffect(() => { setMounted(true); }, []);

  // 에러 및 성공 메시지 처리
  useEffect(() => {
    if (error) {
      let errorMessage = error;
      if (error.includes('Invalid API key')) {
        errorMessage = 'OAuth 설정이 완료되지 않았습니다.';
      } else if (error.includes('invalid_grant')) {
        errorMessage = '로그인 요청이 만료되었습니다. 다시 시도해주세요.';
      } else if (error.includes('access_denied')) {
        errorMessage = '로그인이 취소되었습니다.';
      }
      showNotification(errorMessage, 'error');
      const u = new URL(window.location.href);
      u.searchParams.delete('error');
      window.history.replaceState({}, '', u.toString());
    }
    if (success) {
      showNotification(success, 'success');
      const u = new URL(window.location.href);
      u.searchParams.delete('success');
      window.history.replaceState({}, '', u.toString());
    }
  }, [error, success]); // eslint-disable-line react-hooks/exhaustive-deps

  // 사용자 이름 + 최근 주문 로딩
  useEffect(() => {
    if (!mounted || !user) return;

    // 사용자 이름 조회
    fetch(`/api/get-user?userId=${user.id}`)
      .then(r => r.json())
      .then(result => {
        if (result.success && result.data?.name) {
          setUserName(result.data.name);
        }
      })
      .catch(() => {});

    // 최근 주문 3개 로딩
    setUserDataLoading(true);
    getOrdersByUserId(user.id, 5)
      .then(orders => setRecentOrders(orders || []))
      .catch(() => {})
      .finally(() => setUserDataLoading(false));
  }, [mounted, user]);

  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/") {
    return <HomeSkeleton />;
  }

  if (!mounted) return null;

  // 진행중인 주문 (pending, preparing, ready)
  const activeOrder = recentOrders.find(o =>
    ['pending', 'preparing', 'ready'].includes(o.status)
  );

  // 완료된 주문 (재주문용)
  const completedOrders = recentOrders
    .filter(o => o.status === 'completed')
    .slice(0, 2);

  // 인기 메뉴 (첫 6개)
  const popularMenus = menus.slice(0, 6);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ready': return { label: '제조완료', bg: 'bg-blue-50 border-blue-300', text: 'text-blue-800', badge: 'bg-blue-500 text-white', pulse: true };
      case 'preparing': return { label: '제조중', bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-800', badge: 'bg-yellow-500 text-white', pulse: false };
      default: return { label: '대기중', bg: 'bg-gray-50 border-gray-300', text: 'text-gray-700', badge: 'bg-gray-500 text-white', pulse: false };
    }
  };

  const handleQuickOrder = (order: any) => {
    try {
      const orderItems = order.order_items.map((item: any) => ({
        menu_id: item.menu_id,
        quantity: item.quantity,
        unit_price: item.unit_price ?? item.price ?? (item.menu?.price ?? 0),
        menu_name: item.menu_name || item.menu?.name,
      }));
      localStorage.setItem('quickOrderItems', JSON.stringify(orderItems));
      navigate('/orders/new');
    } catch {
      // 실패 시 조용히 처리
    }
  };

  const handleAddToCart = (menu: any) => {
    const items = [{ menu_id: menu.id, quantity: 1, unit_price: menu.price, menu_name: menu.name }];
    localStorage.setItem('quickOrderItems', JSON.stringify(items));
    navigate('/orders/new');
  };

  const displayName = userName || user?.user_metadata?.name || user?.email?.split('@')[0];

  return (
    <div className="min-h-screen bg-ivory-100 pb-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">

        {/* ===== 1. 간결한 헤더 ===== */}
        <div className="mb-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 bg-wine-600 rounded-xl flex items-center justify-center border-2 border-wine-700">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-lg font-black text-wine-800 leading-tight">이음카페</h1>
            </div>

            <div className="flex items-center">
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-wine-700 font-semibold text-sm">{displayName}님</span>
                  <button
                    onClick={() => {
                      try {
                        const keysToRemove = Object.keys(localStorage).filter(key =>
                          key.includes('supabase') || key.includes('theway-cafe-auth') || key.includes('sb-')
                        );
                        keysToRemove.forEach(key => localStorage.removeItem(key));
                        localStorage.removeItem('theway-cafe-auth-token');
                      } catch (e) {}
                      try { sessionStorage.clear(); } catch (e) {}
                      window.location.replace('/');
                    }}
                    className="text-wine-500 hover:text-wine-700 text-xs font-medium"
                  >
                    로그아웃
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { initializeTTS(); setShowLogin(true); }}
                  className="bg-wine-600 hover:bg-wine-700 text-white px-3 py-1.5 rounded-lg font-bold transition-all text-sm"
                >
                  로그인
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ===== 2. 진행중인 주문 배너 ===== */}
        {user && activeOrder && (() => {
          const config = getStatusConfig(activeOrder.status);
          const itemSummary = activeOrder.order_items
            .map((item: any) => `${item.menu?.name || '메뉴'} x${item.quantity}`)
            .join(', ');
          const minutesAgo = Math.floor((Date.now() - new Date(activeOrder.created_at).getTime()) / 60000);

          return (
            <Link to="/orders/history" className="block mb-3">
              <div className={`border-2 rounded-xl p-3 ${config.bg} ${config.pulse ? 'animate-pulse' : ''}`}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${config.badge}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-gray-500">{minutesAgo}분 전</span>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className={`text-sm font-medium ${config.text} truncate`}>{itemSummary}</p>
                {activeOrder.status === 'ready' && (
                  <p className="text-blue-600 font-bold text-xs mt-1">픽업해주세요!</p>
                )}
              </div>
            </Link>
          );
        })()}

        {/* ===== 3. 주문하기 버튼 ===== */}
        <div className="mb-4">
          {user ? (
            <Link
              to="/orders/new"
              className="block w-full bg-wine-600 hover:bg-wine-700 text-white text-center py-4 rounded-xl font-bold text-lg border-2 border-wine-700 transition-all active:scale-[0.98]"
            >
              <span className="inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                주문하기
              </span>
            </Link>
          ) : (
            <button
              onClick={() => { initializeTTS(); setShowLogin(true); }}
              className="block w-full bg-wine-600 hover:bg-wine-700 text-white text-center py-4 rounded-xl font-bold text-lg border-2 border-wine-700 transition-all active:scale-[0.98]"
            >
              <span className="inline-flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                로그인하고 주문하기
              </span>
            </button>
          )}
        </div>

        {/* ===== 4. 카테고리 바로가기 ===== */}
        <div className="mb-4">
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map(cat => (
              <Link
                key={cat.id}
                to={`/orders/new?category=${encodeURIComponent(cat.id)}`}
                className={`flex flex-col items-center py-3 rounded-xl border-2 ${cat.color} hover:opacity-80 transition-all active:scale-95`}
              >
                <span className="text-2xl mb-1">{cat.emoji}</span>
                <span className="text-xs font-bold">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* ===== 5. 다시 주문하기 (로그인 시) ===== */}
        {user && completedOrders.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-bold text-wine-800">다시 주문하기</h2>
              <Link to="/orders/history" className="text-wine-600 text-xs font-medium">전체보기 →</Link>
            </div>
            <div className="space-y-2">
              {completedOrders.map((order: any) => (
                <div key={order.id} className="bg-white border-2 border-wine-100 rounded-xl p-3 flex justify-between items-center">
                  <div className="flex-1 min-w-0 mr-3">
                    <p className="text-sm font-medium text-wine-800 truncate">
                      {order.order_items.map((item: any) => item.menu?.name || '메뉴').join(', ')}
                    </p>
                    <p className="text-xs text-wine-500 mt-0.5">
                      {order.total_amount.toLocaleString()}원 · {new Date(order.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleQuickOrder(order)}
                    className="flex-shrink-0 bg-wine-600 hover:bg-wine-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  >
                    다시 주문
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 5-1. 비로그인 시 로그인 유도 카드 ===== */}
        {!user && (
          <div className="mb-4">
            <div className="bg-white border-2 border-wine-100 rounded-xl p-4 text-center">
              <p className="text-sm text-wine-700 mb-2">로그인하면 주문내역 확인과 빠른 재주문이 가능합니다</p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => setShowLogin(true)}
                  className="bg-wine-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  로그인
                </button>
                <button
                  onClick={() => setShowSignup(true)}
                  className="border-2 border-wine-600 text-wine-600 px-4 py-2 rounded-lg text-sm font-bold"
                >
                  회원가입
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== 6. 인기 메뉴 ===== */}
        {popularMenus.length > 0 && (
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-bold text-wine-800">인기 메뉴</h2>
              <Link to="/orders/new" className="text-wine-600 text-xs font-medium">전체보기 →</Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-3 px-3 scrollbar-hide">
              {popularMenus.map((menu: any) => (
                <div key={menu.id} className="flex-shrink-0 w-36 bg-white border-2 border-wine-100 rounded-xl overflow-hidden">
                  <div className="w-full h-24 bg-ivory-200 overflow-hidden">
                    {menu.image_url ? (
                      <img
                        src={menu.image_url}
                        alt={menu.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-wine-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-sm font-semibold text-wine-800 truncate">{menu.name}</p>
                    <p className="text-xs text-wine-600 mt-0.5">{menu.price.toLocaleString()}원</p>
                    <button
                      onClick={() => {
                        if (!user) { setShowLogin(true); return; }
                        handleAddToCart(menu);
                      }}
                      className="mt-2 w-full bg-ivory-100 hover:bg-wine-50 text-wine-700 border border-wine-200 py-1 rounded-lg text-xs font-bold transition-all"
                    >
                      담기
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== 주문 로딩 중 ===== */}
        {user && userDataLoading && (
          <div className="space-y-3 py-4">
            <div className="h-12 bg-ivory-200 rounded-xl animate-pulse"></div>
            <div className="h-16 bg-ivory-200 rounded-xl animate-pulse"></div>
          </div>
        )}

      </div>

      {/* 로그인 모달 */}
      {showLogin && (
        <ModalPortal>
          <div className="fixed inset-0 bg-wine-900/40 z-[50000]" onClick={() => setShowLogin(false)} />
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-wine-200 rounded-xl p-6 w-full max-w-xs sm:max-w-md"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button className="absolute top-3 right-3 text-wine-400 hover:text-wine-700 text-xl font-bold z-10" onClick={() => setShowLogin(false)} aria-label="닫기">×</button>
            <h2 className="text-xl font-black text-wine-800 mb-4 text-center">로그인</h2>
            <LoginForm
              onSwitchToSignup={() => { setShowLogin(false); setShowSignup(true); }}
              onLoginSuccess={() => {
                setShowLogin(false);
                setLoginSuccess(true);
                setTimeout(() => { setLoginSuccess(false); window.location.href = '/'; }, 1000);
              }}
            />
          </div>
        </ModalPortal>
      )}

      {/* 회원가입 모달 */}
      {showSignup && (
        <ModalPortal>
          <div className="fixed inset-0 bg-wine-900/40 z-[50000]" onClick={() => setShowSignup(false)} />
          <div
            className="fixed left-1/2 top-1/2 z-[50001] -translate-x-1/2 -translate-y-1/2 bg-white border-2 border-wine-200 rounded-xl p-6 w-full max-w-xs sm:max-w-lg"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: '90vh', overflowY: 'auto' }}
          >
            <button className="absolute top-3 right-3 text-wine-400 hover:text-wine-700 text-xl font-bold z-10" onClick={() => setShowSignup(false)} aria-label="닫기">×</button>
            <h2 className="text-xl font-black text-wine-800 mb-4 text-center">회원가입</h2>
            <SignupForm onSwitchToLogin={() => { setShowSignup(false); setShowLogin(true); }} />
          </div>
        </ModalPortal>
      )}

      {/* 로그인 성공 메시지 */}
      {loginSuccess && (
        <div className="fixed top-4 sm:top-8 left-1/2 -translate-x-1/2 z-[99999] bg-ivory-100 border-2 border-wine-300 text-wine-700 px-4 sm:px-6 py-3 sm:py-4 rounded-lg animate-fade-in font-bold text-sm sm:text-lg">
          로그인 되었습니다
        </div>
      )}
    </div>
  );
}
