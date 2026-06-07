import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useOutletContext, useNavigate, useNavigation, useSearchParams } from "@remix-run/react";
import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase";
import { useNotifications } from "~/contexts/NotificationContext";
import { OrderListSkeleton } from "~/components/LoadingSkeleton";
import OrderStatusProgress from "~/components/orders/OrderStatusProgress";
import OrderCancellationModal from "~/components/OrderCancellationModal";
import OrderDashboard from "~/components/dashboard/OrderDashboard";
import type { OrderStatus } from "~/types";

const ORDERS_PER_PAGE = 10;
type DashboardPeriod = "today" | "week" | "month" | "all";

function getOrderNumber(order: any) {
  return order.order_number || order.id?.slice(-6) || '';
}

function getOrderNotes(order: any) {
  return typeof order.notes === 'string' ? order.notes.trim() : '';
}

function OrderItemBadges({ items }: { items?: any[] }) {
  if (!items || items.length === 0) {
    return <span className="text-sm font-bold text-mute">메뉴 없음</span>;
  }

  return (
    <div className="flex flex-wrap justify-start gap-2 sm:justify-center">
      {items.map((item: any, index: number) => (
        <span
          key={item.id || `${item.menu?.name || 'menu'}-${index}`}
          className="inline-flex max-w-full flex-col rounded-2xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-black leading-tight text-ink shadow-sm sm:text-[15px]"
        >
          <span className="inline-flex max-w-full items-center gap-1.5">
            <span className="truncate">{item.menu?.name || '메뉴명 없음'}</span>
            <span className="shrink-0 text-primary">× {item.quantity}</span>
          </span>
          {item.notes && (
            <span className="mt-0.5 max-w-full truncate text-[11px] font-bold text-mute">
              {item.notes}
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

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
  const [searchParams, setSearchParams] = useSearchParams();

  const contextUser = outletContext?.user || null;
  const userRole = outletContext?.userRole || null;
  const isAdmin = userRole === 'admin' || userRole === 'staff';
  const authChecked = outletContext?.authChecked ?? true;
  const displayName = outletContext?.userProfile?.name?.trim()
    || contextUser?.user_metadata?.name
    || contextUser?.email?.split('@')[0]
    || '';
  const profileName = outletContext?.userProfile?.name?.trim() || '';
  const profileChurchGroup = outletContext?.userProfile?.church_group?.trim() || '';

  const [user, setUser] = useState<any>(contextUser);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [cancellationModal, setCancellationModal] = useState<{ isOpen: boolean; order: any | null }>({ isOpen: false, order: null });
  const [cancelConfirmId, setCancelConfirmId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [editingOrderIds, setEditingOrderIds] = useState<Set<string>>(new Set());
  const { toasts, addToast } = useNotifications();
  const requestedTab = searchParams.get('tab');
  const activeTab = isAdmin && requestedTab === 'dashboard' ? 'dashboard' : 'list';
  const requestedPeriod = searchParams.get('period');
  const dashboardPeriod: DashboardPeriod = requestedPeriod === 'week' || requestedPeriod === 'month' || requestedPeriod === 'all'
    ? requestedPeriod
    : 'today';

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

  const setActiveTab = (tab: 'list' | 'dashboard') => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'dashboard' && isAdmin) {
      next.set('tab', 'dashboard');
      if (!next.get('period')) next.set('period', dashboardPeriod);
    } else {
      next.delete('tab');
    }
    setSearchParams(next, { replace: true });
  };

  const setDashboardPeriod = (period: DashboardPeriod) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'dashboard');
    next.set('period', period);
    setSearchParams(next, { replace: true });
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

  const handleCustomerCancel = async (orderId: string) => {
    setCancellingId(orderId);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error('로그인 세션을 확인하지 못했습니다.');
      const res = await fetch('/api/cancel-order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '취소에 실패했습니다.');
      addToast('주문이 취소되었습니다.', 'warning');
      await refreshOrders();
    } catch (err) {
      addToast(err instanceof Error ? err.message : '취소에 실패했습니다.', 'error');
    } finally {
      setCancelConfirmId(null);
      setCancellingId(null);
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

  useEffect(() => {
    if (!mounted || !user) return;

    const handleOrderNotification = () => {
      fetchOrders().then(result => setOrders(result)).catch(() => {});
    };

    window.addEventListener('theway:order-notification', handleOrderNotification);
    return () => {
      window.removeEventListener('theway:order-notification', handleOrderNotification);
    };
  }, [mounted, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // 주문 테이블 실시간 구독 - 관리자 액션 시 고객 화면 즉각 반영
  useEffect(() => {
    if (!mounted || !user) return;

    const channel = supabase
      .channel(`orders-history-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          const row = (payload.new || payload.old) as any;
          // 관리자/스태프는 모든 변경 반영. 일반 고객은 본인 주문 또는 이름+목장이 같은 주문 반영
          const matchesProfile = Boolean(
            profileName &&
            profileChurchGroup &&
            row?.customer_name?.trim?.() === profileName &&
            row?.church_group?.trim?.() === profileChurchGroup
          );
          if (!isAdmin && row?.user_id !== user.id && !matchesProfile) return;
          fetchOrders().then(setOrders).catch(() => {});
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mounted, user, isAdmin, profileName, profileChurchGroup]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!mounted || !isAdmin) return;

    const syncPresenceState = (channel: ReturnType<typeof supabase.channel>) => {
      const state = channel.presenceState();
      const nextIds = new Set<string>();

      Object.values(state).forEach((metas) => {
        (metas as any[]).forEach((meta) => {
          const orderId = typeof meta?.orderId === 'string' ? meta.orderId : '';
          if (orderId) nextIds.add(orderId);
        });
      });

      setEditingOrderIds(nextIds);
    };

    const channel = supabase
      .channel('order-editing')
      .on('presence', { event: 'sync' }, () => {
        syncPresenceState(channel);
      })
      .on('broadcast', { event: 'order-editing' }, ({ payload }) => {
        const orderId = typeof payload?.orderId === 'string' ? payload.orderId : '';
        const state = payload?.state;
        if (!orderId) return;

        setEditingOrderIds(prev => {
          const next = new Set(prev);
          if (state === 'start') {
            next.add(orderId);
          } else if (state === 'end') {
            next.delete(orderId);
          }
          return next;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [mounted, isAdmin]);

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

  const handleEditOrder = (order: any) => {
    if (order.status !== 'pending') {
      addToast('제조가 시작된 주문은 수정할 수 없습니다.', 'warning');
      return;
    }

    localStorage.setItem('editOrder', JSON.stringify({
      id: order.id,
      orderNumber: getOrderNumber(order),
      customerName: order.customer_name,
      churchGroup: order.church_group,
      notes: getOrderNotes(order),
      items: order.order_items || [],
    }));
    navigate('/orders/new');
  };

  const AdminActions = ({ order }: { order: any }) => {
    const isEditing = Boolean(order.is_editing) || editingOrderIds.has(order.id);
    const isDone = order.status === 'completed' || order.status === 'cancelled';
    if (isDone) {
      return (
        <div className="grid grid-cols-5 gap-1.5">
          <span className="col-span-5 rounded-xl bg-surface-card px-3 py-2 text-center text-xs font-bold text-ash">
            처리완료
          </span>
        </div>
      );
    }

    const actionButtonClass = "min-h-10 rounded-xl px-2 py-2 text-xs font-black transition-colors sm:text-[13px]";

    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-1.5">
        {order.status !== 'cancelled' && (
          <button
            onClick={() => setCancellationModal({ isOpen: true, order })}
            className={`${actionButtonClass} bg-red-100 text-red-800 hover:bg-red-200 sm:col-start-1`}
          >
            취소
          </button>
        )}
        {order.status === 'pending' && isEditing ? (
          <button
            type="button"
            disabled
            className={`${actionButtonClass} cursor-not-allowed bg-yellow-100 text-yellow-800 sm:col-start-2`}
          >
            수정중
          </button>
        ) : order.status === 'pending' && (
          <button
            onClick={() => handleStatusChange(order, 'preparing')}
            className={`${actionButtonClass} bg-blue-100 text-blue-800 hover:bg-blue-200 sm:col-start-2`}
          >
            제조시작
          </button>
        )}
        {order.status === 'preparing' && (
          <button
            onClick={() => handleStatusChange(order, 'ready')}
            className={`${actionButtonClass} bg-green-100 text-green-800 hover:bg-green-200 sm:col-start-3`}
          >
            제조완료
          </button>
        )}
        {order.status === 'ready' && (
          <button
            onClick={() => handleStatusChange(order, 'completed')}
            className={`${actionButtonClass} bg-surface-card text-ink hover:bg-secondary-bg sm:col-start-4`}
          >
            픽업완료
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
            {isAdmin && (
              <div className="mt-3 inline-flex rounded-2xl border border-hairline bg-surface-soft p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                    activeTab === 'list'
                      ? 'bg-primary text-white'
                      : 'text-body hover:bg-surface-card'
                  }`}
                >
                  주문 내역
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                    activeTab === 'dashboard'
                      ? 'bg-primary text-white'
                      : 'text-body hover:bg-surface-card'
                  }`}
                >
                  대시보드
                </button>
              </div>
            )}
          </div>
        )}

        <div className="relative bg-surface-soft border-4 border-primary rounded-[32px] p-4 sm:p-6 mb-8">
          <div className="flex flex-col items-center mb-4">
            <h2 className="text-xl sm:text-2xl font-black text-ink">
              {activeTab === 'dashboard' ? '주문 대시보드' : '주문 내역'}
            </h2>
            <span className="mt-1 text-xs text-mute font-semibold">
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </span>
          </div>

          {activeTab === 'dashboard' ? (
            <OrderDashboard initialPeriod={dashboardPeriod} onPeriodChange={setDashboardPeriod} />
          ) : loadError ? (
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
                  .map((order, idx) => (
                    <div key={order.id} className={`rounded-2xl border p-3 ${order.status === 'cancelled' ? 'bg-red-50 border-red-200 opacity-80' : idx % 2 === 1 ? 'bg-surface-card border-hairline' : 'bg-canvas border-hairline'}`}>
                      {/* 헤더: 번호 + 주문인 + 시간 */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-ash">#{getOrderNumber(order)}</span>
                          <span className="text-sm font-bold text-ink">{order.customer_name}</span>
                          {order.church_group && <span className="text-xs text-mute">{order.church_group}</span>}
                          {order.status === 'cancelled' && (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700">취소됨</span>
                          )}
                        </div>
                        <span className="text-xs text-mute shrink-0">
                          {new Date(order.created_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                          {' '}
                          {new Date(order.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {/* 1행: 주문메뉴 */}
                      <div className="bg-surface-soft rounded-xl px-3 py-2 mb-2">
                        <OrderItemBadges items={order.order_items} />
                        {getOrderNotes(order) && (
                          <div className="mt-2 rounded-lg border border-hairline bg-canvas px-2 py-1.5">
                            <span className="text-[11px] font-bold text-body">요청사항: </span>
                            <span className="text-[11px] text-body">{getOrderNotes(order)}</span>
                          </div>
                        )}
                        <span className="mt-2 block text-sm font-black text-ink">₩{order.total_amount?.toLocaleString()}</span>
                      </div>
                      {/* 2행: 주문상태 + 액션 */}
                      <div className="space-y-2">
                        <div className="flex justify-center">
                          <OrderStatusProgress status={order.status} />
                        </div>
                        {isAdmin ? (
                          <div className="rounded-xl border border-hairline bg-surface-soft px-2 py-2">
                            <AdminActions order={order} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            {order.status === 'pending' && (
                              cancelConfirmId === order.id ? (
                                <div className="col-span-2 rounded-xl border border-red-200 bg-red-50 p-2">
                                  <span className="mb-1 block text-center text-[11px] font-bold text-red-700">취소할까요?</span>
                                  <div className="grid grid-cols-2 gap-1">
                                  <button
                                    onClick={() => handleCustomerCancel(order.id)}
                                    disabled={cancellingId === order.id}
                                      className="rounded-lg bg-red-600 px-2 py-1 text-[11px] font-black text-white hover:bg-red-700 disabled:opacity-60"
                                  >
                                    {cancellingId === order.id ? '처리중' : '확인'}
                                  </button>
                                  <button
                                    onClick={() => setCancelConfirmId(null)}
                                      className="rounded-lg bg-surface-card px-2 py-1 text-[11px] font-bold text-body hover:bg-secondary-bg"
                                  >
                                      취소
                                  </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setCancelConfirmId(order.id)}
                                  className="rounded-xl bg-surface-card px-3 py-2 text-xs font-bold text-mute hover:bg-secondary-bg"
                                >
                                  취소
                                </button>
                              )
                            )}
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleEditOrder(order)}
                                className="rounded-xl bg-blue-100 px-3 py-2 text-xs font-black text-blue-800 hover:bg-blue-200"
                              >
                                수정
                              </button>
                            )}
                            <button
                              onClick={() => handleQuickOrder(order)}
                              className="col-span-2 rounded-xl bg-red-100 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-200"
                            >
                              빠른주문
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>

              {/* 데스크탑: 2행 테이블 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full table-fixed border-separate border-spacing-y-1">
                  <colgroup>
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className="w-[15%]" />
                    <col className={isAdmin ? 'w-[55%]' : 'w-[40%]'} />
                    {!isAdmin && <col className="w-[15%]" />}
                  </colgroup>
                  <thead>
                    <tr className="bg-surface-soft text-body text-xs">
                      <th className="px-3 py-2 text-center rounded-l-xl">번호</th>
                      <th className="px-3 py-2 text-center">주문인</th>
                      <th className="px-3 py-2 text-center">주문시간</th>
                      <th className={`px-3 py-2 text-center ${isAdmin ? 'rounded-r-xl' : ''}`}>주문메뉴 / 주문상태</th>
                      {!isAdmin && (
                        <th className="px-3 py-2 text-center rounded-r-xl">빠른주문</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                      .map((order, idx) => {
                        const rowBg = order.status === 'cancelled'
                          ? 'bg-red-50'
                          : idx % 2 === 1
                            ? 'bg-surface-card'
                            : 'bg-canvas';
                        return (
                        <tr key={order.id} className={order.status === 'cancelled' ? 'opacity-70' : ''}>
                          {/* 번호 */}
                          <td className={`px-3 py-3 text-center align-middle rounded-l-xl ${rowBg}`}>
                            <span className="font-bold text-body text-xs">
                              #{getOrderNumber(order)}
                            </span>
                          </td>
                          {/* 주문인 */}
                          <td className={`px-3 py-3 text-center align-middle ${rowBg}`}>
                            <div className="font-bold text-ink text-sm">{order.customer_name}</div>
                            <div className="text-body text-xs mt-0.5">{order.church_group}</div>
                            {order.status === 'cancelled' && (
                              <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-black text-red-700 mt-1">취소됨</span>
                            )}
                          </td>
                          {/* 시간 */}
                          <td className={`px-3 py-3 text-center align-middle ${rowBg}`}>
                            <div className="text-body text-xs">{new Date(order.created_at).toLocaleDateString('ko-KR')}</div>
                            <div className="text-body text-xs mt-0.5">{new Date(order.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                          </td>
                          {/* 주문메뉴 (1행) / 주문상태 (2행) */}
                          <td className={`px-3 py-2 align-middle ${isAdmin ? 'rounded-r-xl' : ''} ${rowBg}`}>
                            {/* 1행: 메뉴 */}
                            <div className="mb-2">
                              <OrderItemBadges items={order.order_items} />
                              <span className="mt-2 block text-center text-sm font-black text-ink">₩{order.total_amount?.toLocaleString()}</span>
                            </div>
                            {getOrderNotes(order) && (
                              <div className="mx-auto mb-1.5 max-w-md rounded-lg border border-hairline bg-surface-soft px-2 py-1 text-left">
                                <span className="text-[11px] font-bold text-body">요청사항: </span>
                                <span className="text-[11px] text-body">{getOrderNotes(order)}</span>
                              </div>
                            )}
                            {/* 구분선 */}
                            <div className="border-t border-hairline mb-1.5" />
                            {/* 2행: 상태 */}
                            <div className="flex justify-center">
                              <OrderStatusProgress
                                status={order.status}
                                className="max-w-[520px]"
                              />
                            </div>
                            {isAdmin && (
                              <>
                                <div className="mb-2 mt-0.5" />
                                <div className="mx-auto max-w-[520px]">
                                  <AdminActions order={order} />
                                </div>
                              </>
                            )}
                          </td>
                          {/* 액션 */}
                          {!isAdmin && (
                          <td className={`px-3 py-3 text-center align-middle rounded-r-xl ${rowBg}`}>
                              <div className="flex flex-col items-center gap-1.5">
                                {order.status === 'pending' && (
                                  cancelConfirmId === order.id ? (
                                    <div className="flex items-center gap-1">
                                      <span className="text-[11px] font-bold text-red-700">취소?</span>
                                      <button
                                        onClick={() => handleCustomerCancel(order.id)}
                                        disabled={cancellingId === order.id}
                                        className="px-2 py-1 bg-red-600 text-white rounded text-[11px] font-black hover:bg-red-700 disabled:opacity-60"
                                      >
                                        {cancellingId === order.id ? '처리중' : '확인'}
                                      </button>
                                      <button
                                        onClick={() => setCancelConfirmId(null)}
                                        className="px-2 py-1 bg-surface-card text-body rounded text-[11px] font-bold hover:bg-secondary-bg"
                                      >
                                        아니오
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setCancelConfirmId(order.id)}
                                      className="px-2 py-1 bg-surface-card text-mute rounded text-xs font-bold hover:bg-secondary-bg"
                                    >
                                      취소
                                    </button>
                                  )
                                )}
                                {order.status === 'pending' && (
                                  <button
                                    onClick={() => handleEditOrder(order)}
                                    className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded text-xs font-black hover:bg-blue-200"
                                  >
                                    수정
                                  </button>
                                )}
                                <button
                                  onClick={() => handleQuickOrder(order)}
                                  className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold hover:bg-red-200"
                                >
                                  빠른주문
                                </button>
                              </div>
                          </td>
                          )}
                        </tr>
                      );
                    })}
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
