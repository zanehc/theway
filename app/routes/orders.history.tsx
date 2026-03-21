import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useOutletContext, useNavigate, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getOrdersByUserId } from "~/lib/database";
import type { OrderStatus } from "~/types";
import { useNotifications } from "~/contexts/NotificationContext";
import { OrderListSkeleton } from "~/components/LoadingSkeleton";
import OrderStatusProgress from "~/components/orders/OrderStatusProgress";

const ORDERS_PER_PAGE = 10;

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');
  return json({ error, success });
}

export default function OrdersHistoryPage() {
  const { error, success } = useLoaderData<typeof loader>();
  const outletContext = useOutletContext<{ user: any; userRole: string | null }>();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const contextUser = outletContext?.user || null;
  const [user, setUser] = useState<any>(contextUser);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const { toasts, addToast } = useNotifications();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setUser(contextUser);
  }, [contextUser]);

  useEffect(() => {
    if (!mounted) return;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    let isCancelled = false;
    const loadOrders = async () => {
      try {
        const result = await getOrdersByUserId(user.id);
        if (!isCancelled) setOrders(result || []);
      } catch (err) {
        if (!isCancelled) setOrders([]);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadOrders();
    return () => { isCancelled = true; };
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted || toasts.length === 0 || !user) return;
    const refresh = async () => {
      const userOrders = await getOrdersByUserId(user.id);
      setOrders(userOrders || []);
    };
    refresh();
  }, [toasts]); // eslint-disable-line react-hooks/exhaustive-deps

  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/orders/history") {
    return <OrderListSkeleton />;
  }

  const handleQuickOrder = (order: any) => {
    try {
      const orderItems = order.order_items.map((item: any) => ({
        menu_id: item.menu_id,
        quantity: item.quantity,
        unit_price: item.unit_price ?? item.price ?? (item.menu?.price ?? 0),
        menu_name: item.menu_name
      }));
      localStorage.setItem('quickOrderItems', JSON.stringify(orderItems));
      navigate('/orders/new');
    } catch (err) {
      addToast('빠른주문 처리에 실패했습니다.', 'error');
    }
  };

  if (!mounted) return null;

  // 비로그인 처리
  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-ivory-50 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-20">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-wine-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M8 11v6a2 2 0 002 2h4a2 2 0 002-2v-6M8 11h8" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              최근 주문을 확인하려면 로그인이 필요합니다
            </h3>
            <p className="text-gray-600 mb-6">
              홈탭에서 로그인 후 최근 주문 내역을 확인해보세요.
            </p>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-wine-600 hover:bg-wine-700 transition-colors"
            >
              홈으로 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-32 animate-pulse mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50 pb-20">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-large animate-slide-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-large animate-slide-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user && (
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-wine-800">
              {user.email}님의 주문 내역
            </h1>
          </div>
        )}

        <div className="relative bg-ivory-100 border-4 border-wine-600 rounded-3xl p-4 sm:p-6 mb-8">
          <div className="flex flex-col items-center mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-wine-800">주문 내역</h2>
            <span className="mt-1 text-xs sm:text-sm text-wine-500 font-semibold">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>

          {orders.length > 0 ? (
            <>
              {/* 모바일: 카드형 */}
              <div className="block sm:hidden space-y-4">
                {orders
                  .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                  .map((order) => (
                    <div key={order.id} className="bg-ivory-50 rounded-xl border border-wine-200 p-4">
                      <OrderStatusProgress status={order.status} paymentStatus={order.payment_status} />
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-wine-400">#{order.id.slice(-8)}</span>
                      </div>
                      <div className="font-bold text-wine-800 mb-1">{order.customer_name}</div>
                      <div className="text-sm text-wine-600 mb-2">{order.church_group}</div>
                      <div className="text-sm text-wine-700 mb-2">
                        {new Date(order.created_at).toLocaleString('ko-KR')}
                      </div>
                      <div className="space-y-1 mb-3">
                        {order.order_items?.map((item: any) => (
                          <div key={item.id} className="text-sm text-wine-700">
                            {item.menu?.name} x {item.quantity}
                          </div>
                        ))}
                      </div>
                      <div className="font-bold text-wine-800 mb-3">₩{order.total_amount?.toLocaleString()}</div>
                      <button
                        onClick={() => handleQuickOrder(order)}
                        className="mt-2 w-full px-3 py-1 bg-red-100 text-red-800 rounded text-xs font-bold hover:bg-red-200"
                      >
                        빠른 주문
                      </button>
                    </div>
                  ))}
              </div>

              {/* 데스크탑: 테이블 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-center border-separate border-spacing-y-2">
                  <thead>
                    <tr className="bg-ivory-100 text-wine-700 text-sm">
                      <th className="px-2 py-2">주문번호</th>
                      <th className="px-2 py-2">주문인</th>
                      <th className="px-2 py-2">주문시간</th>
                      <th className="px-2 py-2">주문메뉴</th>
                      <th className="px-2 py-2">주문상태</th>
                      <th className="px-2 py-2">빠른주문</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                      .map((order, idx) => (
                        <tr key={order.id} className="bg-ivory-50">
                          <td className="font-bold text-wine-700 align-middle text-xs">
                            #{(currentPage - 1) * ORDERS_PER_PAGE + idx + 1}
                          </td>
                          <td className="align-middle">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-wine-800">{order.customer_name}</span>
                              <span className="text-wine-700 text-xs mt-1">{order.church_group}</span>
                            </div>
                          </td>
                          <td className="align-middle">
                            <div className="flex flex-col items-center">
                              <span className="text-wine-700 text-xs">{new Date(order.created_at).toLocaleDateString('ko-KR')}</span>
                              <span className="text-wine-700 text-xs mt-1">{new Date(order.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          <td className="align-middle">
                            <div className="flex flex-col items-center">
                              <div className="flex flex-col gap-1 items-center">
                                {order.order_items?.map((item: any) => (
                                  <div key={item.id} className="text-xs text-wine-700">
                                    {item.menu?.name} x {item.quantity}
                                  </div>
                                ))}
                              </div>
                              <span className="font-bold text-wine-800 mt-1">₩{order.total_amount?.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="align-middle">
                            <OrderStatusProgress status={order.status} paymentStatus={order.payment_status} />
                          </td>
                          <td className="align-middle">
                            <button
                              onClick={() => handleQuickOrder(order)}
                              className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold hover:bg-red-200"
                            >
                              빠른주문
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* 페이지네이션 */}
              {orders.length > ORDERS_PER_PAGE && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-wine-100 text-wine-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-wine-200 transition-all duration-300"
                  >
                    이전
                  </button>
                  <span className="px-4 py-2 text-wine-700 font-bold">
                    {currentPage} / {Math.ceil(orders.length / ORDERS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(orders.length / ORDERS_PER_PAGE), prev + 1))}
                    disabled={currentPage === Math.ceil(orders.length / ORDERS_PER_PAGE)}
                    className="px-3 py-2 bg-wine-100 text-wine-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-wine-200 transition-all duration-300"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-wine-400">주문 내역이 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
