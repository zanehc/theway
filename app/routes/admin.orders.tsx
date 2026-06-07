import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, useOutletContext, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { supabase } from "~/lib/supabase";
import type { OrderStatus } from "~/types";
import { useNotifications } from "~/contexts/NotificationContext";
import OrderCancellationModal from "~/components/OrderCancellationModal";
import { OrderListSkeleton } from "~/components/LoadingSkeleton";
import OrderStatusProgress from "~/components/orders/OrderStatusProgress";
import { statusButtons } from "~/components/orders/orderUtils";

function getOrderNumber(order: any) {
  return order.order_number || order.id?.slice(-8) || '';
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
          className="inline-flex max-w-full flex-col rounded-2xl border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-black leading-tight text-ink sm:text-[15px]"
        >
          <span className="inline-flex max-w-full items-center gap-1">
            <span className="truncate">{item.menu?.name || '메뉴명 없음'}</span>
            <span className="shrink-0 text-primary">x {item.quantity}</span>
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

export async function action(_args: ActionFunctionArgs) {
  return json({ error: '관리자 주문 변경은 /api/admin-orders를 사용해주세요.' }, { status: 405 });
}

export default function AdminOrdersPage() {
  const { error, success } = useLoaderData<typeof loader>();
  const { user } = useOutletContext<{ user: any; userRole: string | null }>();
  const navigation = useNavigation();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [mounted, setMounted] = useState(false);
  const { toasts, addToast } = useNotifications();

  const [cancellationModal, setCancellationModal] = useState<{
    isOpen: boolean;
    order: any | null;
  }>({ isOpen: false, order: null });

  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const fetchAdminOrders = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('로그인 세션을 확인하지 못했습니다.');

    const res = await fetch('/api/admin-orders?range=all&limit=500', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || '관리자 주문 조회에 실패했습니다.');
    }

    return data.orders || [];
  };

  const requestAdminOrderUpdate = async (payload: Record<string, unknown>) => {
    const accessToken = await getAccessToken();
    if (!accessToken) throw new Error('로그인 세션을 확인하지 못했습니다.');

    const res = await fetch('/api/admin-orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || '주문 업데이트에 실패했습니다.');
    }
    return data.order;
  };

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !user) return;

    let isCancelled = false;
    const loadOrders = async () => {
      try {
        const result = await fetchAdminOrders();
        if (!isCancelled) {
          setOrders(result);
          setLoadError('');
        }
      } catch (err) {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : '관리자 주문 조회에 실패했습니다.';
          setOrders([]);
          setLoadError(message);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    loadOrders();
    return () => { isCancelled = true; };
  }, [mounted, user]);

  useEffect(() => {
    if (!mounted || toasts.length === 0) return;
    const refresh = async () => {
      try {
        const allOrders = await fetchAdminOrders();
        setOrders(allOrders);
        setLoadError('');
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : '관리자 주문 조회에 실패했습니다.');
      }
    };
    refresh();
  }, [toasts]); // eslint-disable-line react-hooks/exhaustive-deps

  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/admin/orders") {
    return <OrderListSkeleton />;
  }

  const handleOrderCancelClick = (order: any) => {
    setCancellationModal({ isOpen: true, order });
  };

  const handleCancellationModalClose = () => {
    setCancellationModal({ isOpen: false, order: null });
  };

  const handleOrderCancelConfirm = async (reason: string) => {
    if (!cancellationModal.order) return;
    try {
      await requestAdminOrderUpdate({
        intent: 'updateStatus',
        orderId: cancellationModal.order.id,
        status: 'cancelled',
        cancellationReason: reason,
      });
      addToast(`주문이 취소되었습니다. (사유: ${reason})`, 'warning');
      setOrders(await fetchAdminOrders());
    } catch (err) {
      addToast('주문 취소에 실패했습니다.', 'error');
      throw err;
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await requestAdminOrderUpdate({
        intent: 'updateStatus',
        orderId,
        status: newStatus,
      });
      addToast('주문 상태가 업데이트되었습니다.', 'success');
      setOrders(await fetchAdminOrders());
    } catch (err) {
      addToast('상태 변경에 실패했습니다.', 'error');
    }
  };

  const toggleSelectOrder = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (currentIds: string[]) => {
    const allSel = currentIds.length > 0 && currentIds.every((id) => selectedIds.has(id));
    if (allSel) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentIds));
    }
  };

  const exitDeleteMode = () => {
    setDeleteMode(false);
    setSelectedIds(new Set());
    setDeleteConfirming(false);
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error('로그인 세션을 확인하지 못했습니다.');

      const res = await fetch('/api/admin-orders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ intent: 'deleteOrders', orderIds: Array.from(selectedIds) }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '주문 삭제에 실패했습니다.');

      addToast(`${data.deletedCount}건의 주문이 삭제되었습니다.`, 'success');
      setSelectedIds(new Set());
      setDeleteMode(false);
      setDeleteConfirming(false);
      setOrders(await fetchAdminOrders());
    } catch (err) {
      addToast(err instanceof Error ? err.message : '주문 삭제에 실패했습니다.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChangeWithNotification = async (order: any, newStatus: OrderStatus) => {
    try {
      await requestAdminOrderUpdate({
        intent: 'updateStatus',
        orderId: order.id,
        status: newStatus,
      });
      addToast('주문 상태가 업데이트되었습니다.', 'success');
      setOrders(await fetchAdminOrders());
    } catch (err) {
      addToast('상태 변경에 실패했습니다.', 'error');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (selectedStatus === 'inprogress') {
      return ['pending', 'preparing', 'ready', 'completed'].includes(order.status);
    }
    if (selectedStatus === 'done') {
      return order.status === 'completed';
    }
    return true;
  });

  const filteredIds = filteredOrders.map((o: any) => o.id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id: string) => selectedIds.has(id));

  const handleFilterClick = (btn: typeof statusButtons[number]) => {
    setSelectedStatus(btn.key as any);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-canvas pb-20">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl shadow-large animate-slide-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-2xl shadow-large animate-slide-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="relative bg-surface-soft border-4 border-primary rounded-[32px] p-4 sm:p-6 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-ink">주문 관리</h2>
              <span className="mt-1 text-xs sm:text-sm text-mute font-semibold">
                전체 기간 주문 {filteredOrders.length.toLocaleString()}건
              </span>
            </div>
            {!deleteMode ? (
              <button
                type="button"
                onClick={() => setDeleteMode(true)}
                className="ml-4 shrink-0 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
              >
                삭제 모드
              </button>
            ) : (
              <button
                type="button"
                onClick={exitDeleteMode}
                className="ml-4 shrink-0 rounded-2xl border border-hairline bg-canvas px-3 py-2 text-xs font-bold text-body hover:bg-surface-card"
              >
                취소
              </button>
            )}
          </div>

          {/* 삭제 모드 툴바 */}
          {deleteMode && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleSelectAll(filteredIds)}
                  className="h-4 w-4 rounded accent-primary"
                />
                <span className="text-sm font-bold text-ink">전체 선택</span>
              </label>
              <span className="text-sm text-mute font-medium">
                {selectedIds.size > 0 ? `${selectedIds.size}건 선택됨` : ''}
              </span>
              <div className="ml-auto flex items-center gap-2">
                {deleteConfirming ? (
                  <>
                    <span className="text-sm font-bold text-red-700">정말 삭제할까요?</span>
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      disabled={deleting}
                      className="rounded-xl bg-red-600 px-4 py-1.5 text-sm font-black text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {deleting ? '삭제 중...' : '확인'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirming(false)}
                      className="rounded-xl border border-hairline bg-canvas px-4 py-1.5 text-sm font-bold text-body hover:bg-surface-card"
                    >
                      아니오
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirming(true)}
                    disabled={selectedIds.size === 0}
                    className="rounded-xl bg-red-600 px-4 py-1.5 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-200"
                  >
                    선택 삭제
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 필터 버튼 */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {statusButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleFilterClick(btn)}
                className={`px-4 py-2 rounded-2xl font-bold text-sm transition-all duration-300 ${(btn.key === 'all' && !selectedStatus) ||
                  (btn.key === 'inprogress' && selectedStatus === 'inprogress') ||
                  (btn.key === 'done' && selectedStatus === 'done')
                  ? 'bg-primary text-white '
                  : 'bg-canvas text-body hover:bg-surface-card'
                  }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 주문 목록 */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-5 text-center">
              <div className="text-sm font-bold text-red-700">{loadError}</div>
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const result = await fetchAdminOrders();
                    setOrders(result);
                    setLoadError('');
                  } catch (err) {
                    setLoadError(err instanceof Error ? err.message : '관리자 주문 조회에 실패했습니다.');
                  } finally {
                    setLoading(false);
                  }
                }}
                className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
              >
                다시 불러오기
              </button>
            </div>
          ) : filteredOrders.length > 0 ? (
            <>
              {/* 모바일: 카드형 */}
              <div className="block sm:hidden space-y-4">
                {filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className={`bg-canvas rounded-2xl border p-4 ${deleteMode && selectedIds.has(order.id) ? 'border-red-400 bg-red-50' : 'border-hairline'}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      {deleteMode && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(order.id)}
                          onChange={() => toggleSelectOrder(order.id)}
                          className="mt-0.5 mr-3 h-4 w-4 shrink-0 rounded accent-primary"
                        />
                      )}
                      <div className="flex-1">
                        <OrderStatusProgress status={order.status} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-ash">#{getOrderNumber(order)}</span>
                    </div>
                    <div className="font-bold text-ink mb-1">{order.customer_name}</div>
                    <div className="text-sm text-mute mb-2">{order.church_group}</div>
                    <div className="text-sm text-body mb-2">
                      {new Date(order.created_at).toLocaleString('ko-KR')}
                    </div>
                    <div className="mb-3">
                      <OrderItemBadges items={order.order_items} />
                    </div>
                    <div className="font-bold text-ink mb-3">₩{order.total_amount?.toLocaleString()}</div>

                    <div className="flex flex-wrap gap-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleStatusChangeWithNotification(order, 'preparing')}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold hover:bg-blue-200"
                        >
                          제조시작
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          onClick={() => handleStatusChangeWithNotification(order, 'ready')}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded text-xs font-bold hover:bg-green-200"
                        >
                          제조완료
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <button
                          onClick={() => handleStatusChange(order.id, 'completed')}
                          className="px-3 py-1 bg-surface-card text-ink rounded text-xs font-bold hover:bg-secondary-bg"
                        >
                          픽업완료
                        </button>
                      )}
                      {order.status !== 'cancelled' && (
                        <button
                          onClick={() => handleOrderCancelClick(order)}
                          className="px-3 py-1 bg-red-100 text-red-800 rounded text-xs font-bold hover:bg-red-200"
                        >
                          취소
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* 데스크탑: 테이블 */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full text-center border-separate border-spacing-y-2">
                  <thead>
                    <tr className="bg-surface-soft text-body text-sm">
                      {deleteMode && (
                        <th className="px-2 py-2 w-10">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() => toggleSelectAll(filteredIds)}
                            className="h-4 w-4 rounded accent-primary"
                          />
                        </th>
                      )}
                      <th className="px-2 py-2">주문번호</th>
                      <th className="px-2 py-2">주문인</th>
                      <th className="px-2 py-2">주문시간</th>
                      <th className="px-2 py-2">주문메뉴</th>
                      <th className="px-2 py-2">주문상태</th>
                      <th className="px-2 py-2">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className={`${deleteMode && selectedIds.has(order.id) ? 'bg-red-50' : 'bg-canvas'}`}>
                        {deleteMode && (
                          <td className="align-middle px-2">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(order.id)}
                              onChange={() => toggleSelectOrder(order.id)}
                              className="h-4 w-4 rounded accent-primary"
                            />
                          </td>
                        )}
                        <td className="font-bold text-body align-middle text-xs">#{getOrderNumber(order)}</td>
                        <td className="align-middle">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-ink">{order.customer_name}</span>
                            <span className="text-body text-xs mt-1">{order.church_group}</span>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="flex flex-col items-center">
                            <span className="text-body text-xs">{new Date(order.created_at).toLocaleDateString('ko-KR')}</span>
                            <span className="text-body text-xs mt-1">{new Date(order.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="align-middle">
                          <div className="flex flex-col items-center">
                            <OrderItemBadges items={order.order_items} />
                            <span className="font-bold text-ink mt-1">₩{order.total_amount?.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="align-middle">
                          <OrderStatusProgress status={order.status} />
                        </td>
                        <td className="align-middle">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleStatusChangeWithNotification(order, 'preparing')}
                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-bold hover:bg-blue-200"
                              >
                                제조시작
                              </button>
                            )}
                            {order.status === 'preparing' && (
                              <button
                                onClick={() => handleStatusChangeWithNotification(order, 'ready')}
                                className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-bold hover:bg-green-200"
                              >
                                제조완료
                              </button>
                            )}
                            {order.status === 'ready' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'completed')}
                                className="px-2 py-1 bg-surface-card text-ink rounded text-xs font-bold hover:bg-secondary-bg"
                              >
                                픽업완료
                              </button>
                            )}
                            {order.status !== 'cancelled' && (
                              <button
                                onClick={() => handleOrderCancelClick(order)}
                                className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold hover:bg-red-200"
                              >
                                취소
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
          onClose={handleCancellationModalClose}
          onConfirm={handleOrderCancelConfirm}
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
