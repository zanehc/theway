import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useOutletContext, useNavigate, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase";
import { useNotifications } from "~/contexts/NotificationContext";
import { OrderListSkeleton } from "~/components/LoadingSkeleton";
import OrderStatusProgress from "~/components/orders/OrderStatusProgress";
import OrderCancellationModal from "~/components/OrderCancellationModal";
import type { OrderStatus } from "~/types";

const ORDERS_PER_PAGE = 10;

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');
  return json({ error, success });
}

export default function OrdersHistoryPage() {
  const { error, success } = useLoaderData<typeof loader>();
  const outletContext = useOutletContext<{ user: any; userRole: string | null; userProfile?: { name: string; church_group: string } | null; authChecked?: boolean }>();
  const navigation = useNavigation();
  const navigate = useNavigate();

  const contextUser = outletContext?.user || null;
  const userRole = outletContext?.userRole || null;
  const isAdmin = userRole === 'admin' || userRole === 'staff';
  const authChecked = outletContext?.authChecked ?? true;
  const displayName = outletContext?.userProfile?.name?.trim()
    || contextUser?.user_metadata?.name
    || contextUser?.email?.split('@')[0]
    || '';

  const [user, setUser] = useState<any>(contextUser);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [cancellationModal, setCancellationModal] = useState<{ isOpen: boolean; order: any | null }>({ isOpen: false, order: null });
  const { toasts, addToast } = useNotifications();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setUser(contextUser); }, [contextUser]);

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const fetchOrders = async () => {
    const token = await getAccessToken();
    if (!token) return [];
    const limit = isAdmin ? 200 : 50;
    const res = await fetch(`/api/orders/history?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `주문 내역 조회 실패 (${res.status})`);
    }
    const body = await res.json();
    return body.orders || [];
  };

  const requestAdminOrderUpdate = async (payload: Record<string, unknown>) => {
    const token = await getAccessToken();
    if (!token) throw new Error('로그인 세션을 확인하지 못했습니다.');
    const res = await fetch('/api/admin-orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '주문 업데이트에 실패했습니다.');
    return data.order;
  };

  const refreshOrders = async () => {
    try {
      const result = await fetchOrders();
      setOrders(result);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : '주문 내역을 불러오지 못했습니다.');
    }
  };

  const handleStatusChange = async (order: any, newStatus: OrderStatus) => {
    try {
      await requestAdminOrderUpdate({ intent: 'updateStatus', orderId: order.id, status: newStatus });
      addToast('주문 상태가 업데이트되었습니다.', 'success');
      await refreshOrders();
    } catch {
      addToast('상태 변경에 실패했습니다.', 'error');
    }
  };

  const handlePaymentConfirm = async (order: any) => {
    try {
      await requestAdminOrderUpdate({ intent: 'updatePayment', orderId: order.id, paymentStatus: 'confirmed' });
      addToast('결제가 확인되었습니다.', 'success');
      await refreshOrders();
    } catch {
      addToast('결제 확인에 실패했습니다.', 'error');
    }
  };

  const handleCancelConfirm = async (reason: string) => {
    if (!cancellationModal.order) return;
    try {
      await requestAdminOrderUpdate({ intent: 'updateStatus', orderId: cancellationModal.order.id, status: 'cancelled', cancellationReason: reason });
      addToast(`주문이 취소되었습니다. (사유: ${reason})`, 'warning');
      await refreshOrders();
    } catch {
      addToast('주문 취소에 실패했습니다.', 'error');
    }
  };

  useEffect(() => {
    if (!mounted || !authChecked) return;
    if (!user) { setOrders([]); setLoading(false); return; }

    let cancelled = false;
    const loadOrders = async () => {
      setLoading(true);
      try {
        const result = await fetchOrders();
        if (!cancelled) { setOrders(result); setLoadError(''); }
      } catch (err) {
        if (!cancelled) {
          setOrders([]);
          setLoadError(err instanceof Error ? err.message : '주문 내역을 불러오지 못했습니다.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadOrders();
    return () => { cancelled = true; };
  }, [mounted, authChecked, user, userRole]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted || toasts.length === 0 || !user) return;
    fetchOrders().then(result => setOrders(result)).catch(() => {});
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
    } catch {
      addToast('빠른주문 처리에 실패했습니다.', 'error');
    }
  };

  const AdminActions = ({ order }: { order: any }) => {
    const isDone = (order.status === 'completed' || order.status === 'cancelled') && order.payment_status === 'confirmed';
    if (isDone) return <span className="text-xs text-ash font-medium">처리완료</span>;
    return (
      <div className="flex flex-wrap gap-1 justify-center">
        {order.status === 'pending' && (
          <button onClick={() => handleStatusChange(order, 'preparing')}
            className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold hover:bg-blue-200">
            제조시작
          </button>
        )}
        {order.status === 'preparing' && (
          <button onClick={() => handleStatusChange(order, 'ready')}
            className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold hover:bg-green-200">
            제조완료
          </button>
        )}
        {order.status === 'ready' && (
          <button onClick={() => handleStatusChange(order, 'completed')}
            className="px-2 py-1 bg-surface-card text-ink rounded text-xs font-bold hover:bg-secondary-bg">
            픽업완료
          </button>
        )}
        {order.payment_status !== 'confirmed' && (
          <button onClick={() => handlePaymentConfirm(order)}
            className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-bold hover:bg-purple-200">
            결제확인
          </button>
        )}
        {order.status !== 'cancelled' && (
          <button onClick={() => setCancellationModal({ isOpen: true, order })}
            className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold hover:bg-red-200">
            취소
          </button>
        )}
      </div>
    );
  };

  if (!mounted) return <OrderListSkeleton />;

  if (!loading && !user) {
    return (
      <div className="min-h-screen bg-canvas pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center py-20">
            <div className="mb-6">
              <svg className="mx-auto h-16 w-16 text-stone" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M8 11v6a2 2 0 002 2h4a2 2 0 002-2v-6M8 11h8" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-ink mb-2">최근 주문을 확인하려면 로그인이 필요합니다</h3>
            <p className="text-mute mb-6">홈탭에서 로그인 후 최근 주문 내역을 확인해보세요.</p>
            <button onClick={() => navigate('/')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-2xl text-white bg-primary hover:bg-primary-pressed transition-colors">
              홈으로 가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-canvas pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <div className="h-8 bg-secondary-bg rounded w-32 animate-pulse mb-2"></div>
            <div className="h-4 bg-secondary-bg rounded w-48 animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 sm:p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="h-5 bg-secondary-bg rounded w-32 animate-pulse"></div>
                    <div className="h-4 bg-secondary-bg rounded w-24 animate-pulse"></div>
                  </div>
                  <div className="h-6 bg-secondary-bg rounded w-16 animate-pulse"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-4 bg-secondary-bg rounded w-full animate-pulse"></div>
                  <div className="h-4 bg-secondary-bg rounded w-3/4 animate-pulse"></div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-secondary-bg rounded w-20 animate-pulse"></div>
                  <div className="h-8 bg-secondary-bg rounded w-16 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas pb-20">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl shadow-large animate-slide-in">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-2xl shadow-large animate-slide-in">
          {success}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {user && (
          <div className="mb-4">
            <h1 className="text-base sm:text-lg font-bold text-ink truncate">
              {isAdmin ? '전체 주문 내역' : `${displayName}님의 주문 내역`}
            </h1>
          </div>
        )}

        <div className="relative bg-surface-soft border-4 border-primary rounded-[32px] p-4 sm:p-6 mb-8">
          <div className="flex flex-col items-center mb-4">
            <h2 className="text-xl sm:text-2xl font-black text-ink">주문 내역</h2>
            <span className="mt-1 text-xs text-mute font-semibold">
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
          </div>

          {loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center">
              <div className="text-sm font-bold text-red-700">{loadError}</div>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  await refreshOrders();
                  setLoading(false);
                }}
                className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
              >
                다시 불러오기
              </button>
            </div>
          ) : orders.length > 0 ? (
            <>
              {/* 모바일: 카드형 */}
              <div className="block sm:hidden space-y-3">
                {orders
                  .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                  .map((order) => (
                    <div key={order.id} className="bg-canvas rounded-2xl border border-hairline p-3">
                      {/* 헤더: 번호 + 주문인 + 시간 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-ash">#{order.id.slice(-6)}</span>
                          <span className="text-sm font-bold text-ink">{order.customer_name}</span>
                          {order.church_group && <span className="text-xs text-mute">{order.church_group}</span>}
                        </div>
                        <span className="text-xs text-mute shrink-0">
                          {new Date(order.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                          {' '}
                          {new Date(order.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {/* 1행: 주문메뉴 */}
                      <div className="bg-surface-soft rounded-xl px-3 py-2 mb-2">
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {order.order_items?.map((item: any) => (
                            <span key={item.id} className="text-xs text-body">
                              {item.menu?.name} × {item.quantity}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs font-bold text-ink mt-1 block">₩{order.total_amount?.toLocaleString()}</span>
                      </div>
                      {/* 2행: 주문상태 + 액션 */}
                      <div className="flex items-center justify-between gap-2">
                        <OrderStatusProgress status={order.status} paymentStatus={order.payment_status} />
                        {isAdmin ? (
                          <AdminActions order={order} />
                        ) : (
                          <button
                            onClick={() => handleQuickOrder(order)}
                            className="px-3 py-1 bg-red-100 text-red-800 rounded-xl text-xs font-bold hover:bg-red-200 shrink-0"
                          >
                            빠른주문
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* 데스크탑: 2행 테이블 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-1">
                  <thead>
                    <tr className="bg-surface-soft text-body text-xs">
                      <th className="px-3 py-2 text-center rounded-l-xl">번호</th>
                      <th className="px-3 py-2 text-center">주문인</th>
                      <th className="px-3 py-2 text-center">주문시간</th>
                      <th className="px-3 py-2 text-center">주문메뉴 / 주문상태</th>
                      <th className="px-3 py-2 text-center rounded-r-xl">{isAdmin ? '액션' : '빠른주문'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                      .map((order, idx) => (
                        <tr key={order.id} className="bg-canvas">
                          {/* 번호 */}
                          <td className="px-3 py-3 text-center align-middle rounded-l-xl">
                            <span className="font-bold text-body text-xs">
                              #{(currentPage - 1) * ORDERS_PER_PAGE + idx + 1}
                            </span>
                          </td>
                          {/* 주문인 */}
                          <td className="px-3 py-3 text-center align-middle">
                            <div className="font-bold text-ink text-sm">{order.customer_name}</div>
                            <div className="text-body text-xs mt-0.5">{order.church_group}</div>
                          </td>
                          {/* 시간 */}
                          <td className="px-3 py-3 text-center align-middle">
                            <div className="text-body text-xs">{new Date(order.created_at).toLocaleDateString('ko-KR')}</div>
                            <div className="text-body text-xs mt-0.5">{new Date(order.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          {/* 주문메뉴 (1행) / 주문상태 (2행) */}
                          <td className="px-3 py-2 align-middle">
                            {/* 1행: 메뉴 */}
                            <div className="flex flex-wrap gap-x-3 gap-y-0.5 justify-center mb-1.5">
                              {order.order_items?.map((item: any) => (
                                <span key={item.id} className="text-xs text-body">
                                  {item.menu?.name} × {item.quantity}
                                </span>
                              ))}
                              <span className="text-xs font-bold text-ink">₩{order.total_amount?.toLocaleString()}</span>
                            </div>
                            {/* 구분선 */}
                            <div className="border-t border-hairline mb-1.5" />
                            {/* 2행: 상태 */}
                            <div className="flex justify-center">
                              <OrderStatusProgress status={order.status} paymentStatus={order.payment_status} />
                            </div>
                          </td>
                          {/* 액션 */}
                          <td className="px-3 py-3 text-center align-middle rounded-r-xl">
                            {isAdmin ? (
                              <AdminActions order={order} />
                            ) : (
                              <button
                                onClick={() => handleQuickOrder(order)}
                                className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold hover:bg-red-200"
                              >
                                빠른주문
                              </button>
                            )}
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
                    className="px-3 py-2 bg-surface-card text-body rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary-bg transition-all duration-300"
                  >
                    이전
                  </button>
                  <span className="px-4 py-2 text-body font-bold">
                    {currentPage} / {Math.ceil(orders.length / ORDERS_PER_PAGE)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(orders.length / ORDERS_PER_PAGE), prev + 1))}
                    disabled={currentPage === Math.ceil(orders.length / ORDERS_PER_PAGE)}
                    className="px-3 py-2 bg-surface-card text-body rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary-bg transition-all duration-300"
                  >
                    다음
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-ash">주문 내역이 없습니다.</p>
            </div>
          )}
        </div>
      </div>

      {cancellationModal.order && (
        <OrderCancellationModal
          isOpen={cancellationModal.isOpen}
          onClose={() => setCancellationModal({ isOpen: false, order: null })}
          onConfirm={handleCancelConfirm}
          orderInfo={{
            customerName: cancellationModal.order.customer_name,
            orderItems: cancellationModal.order.order_items
              ?.map((item: any) => `${item.menu?.name} x ${item.quantity}`)
              .join(', ') || ''
          }}
        />
      )}
    </div>
  );
}
