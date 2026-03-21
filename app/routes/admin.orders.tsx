import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useOutletContext, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getOrders, updateOrderStatus } from "~/lib/database";
import { supabase } from "~/lib/supabase";
import type { OrderStatus } from "~/types";
import { useNotifications } from "~/contexts/NotificationContext";
import OrderCancellationModal from "~/components/OrderCancellationModal";
import { OrderListSkeleton } from "~/components/LoadingSkeleton";
import OrderStatusProgress from "~/components/orders/OrderStatusProgress";
import { statusButtons } from "~/components/orders/orderUtils";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');
  return json({ error, success });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const orderId = formData.get('orderId') as string;
  const status = formData.get('status') as OrderStatus;
  const paymentStatus = formData.get('paymentStatus') as string;
  const intent = formData.get('intent') as string;

  if (intent === 'updateStatus' && orderId && status) {
    try {
      await updateOrderStatus(orderId, status);
      return redirect('/admin/orders');
    } catch (error) {
      return json({ error: '상태 업데이트에 실패했습니다.' }, { status: 400 });
    }
  }

  if (intent === 'updatePayment' && orderId && paymentStatus) {
    try {
      const { supabase } = await import('~/lib/supabase');
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: paymentStatus })
        .eq('id', orderId);
      if (error) throw error;
      return redirect('/admin/orders');
    } catch (error) {
      return json({ error: '결제 상태 업데이트에 실패했습니다.' }, { status: 400 });
    }
  }

  return json({ error: '잘못된 요청입니다.' }, { status: 400 });
}

export default function AdminOrdersPage() {
  const { error, success } = useLoaderData<typeof loader>();
  const { user } = useOutletContext<{ user: any; userRole: string | null }>();
  const navigation = useNavigation();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const { toasts, addToast } = useNotifications();

  const [cancellationModal, setCancellationModal] = useState<{
    isOpen: boolean;
    order: any | null;
  }>({ isOpen: false, order: null });

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted || !user) return;

    let isCancelled = false;
    const loadOrders = async () => {
      try {
        const result = await getOrders();
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
    if (!mounted || toasts.length === 0) return;
    const refresh = async () => {
      const allOrders = await getOrders(selectedStatus || undefined);
      setOrders(allOrders || []);
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
      await updateOrderStatus(cancellationModal.order.id, 'cancelled', reason);
      addToast(`주문이 취소되었습니다. (사유: ${reason})`, 'warning');
      const allOrders = await getOrders(selectedStatus || undefined);
      setOrders(allOrders || []);
    } catch (err) {
      addToast('주문 취소에 실패했습니다.', 'error');
      throw err;
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      addToast('주문 상태가 업데이트되었습니다.', 'success');
      const allOrders = await getOrders(selectedStatus || undefined);
      setOrders(allOrders || []);
    } catch (err) {
      addToast('상태 변경에 실패했습니다.', 'error');
    }
  };

  const handlePaymentConfirm = async (order: any) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'confirmed' })
        .eq('id', order.id);
      if (error) throw error;
      addToast('결제가 확인되었습니다.', 'success');
      const allOrders = await getOrders(selectedStatus || undefined);
      setOrders(allOrders || []);
    } catch (err) {
      addToast('결제 확인에 실패했습니다.', 'error');
    }
  };

  const handleStatusChangeWithNotification = async (order: any, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(order.id, newStatus);
      addToast('주문 상태가 업데이트되었습니다.', 'success');
      const allOrders = await getOrders(selectedStatus || undefined);
      setOrders(allOrders || []);
    } catch (err) {
      addToast('상태 변경에 실패했습니다.', 'error');
    }
  };

  const filteredOrders = orders.filter(order => {
    if (selectedStatus === 'inprogress') {
      return ['pending', 'preparing', 'ready', 'completed'].includes(order.status);
    }
    if (selectedStatus === 'done') {
      return order.payment_status === 'confirmed';
    }
    return true;
  });

  const handleFilterClick = (btn: typeof statusButtons[number]) => {
    setSelectedStatus(btn.key as any);
  };

  if (!mounted) return null;

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
        <div className="relative bg-ivory-100 border-4 border-wine-600 rounded-3xl p-4 sm:p-6 mb-8">
          <div className="flex flex-col items-center mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-wine-800">주문 관리</h2>
            <span className="mt-1 text-xs sm:text-sm text-wine-500 font-semibold">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>

          {/* 필터 버튼 */}
          <div className="flex flex-wrap gap-2 mb-6 justify-center">
            {statusButtons.map((btn) => (
              <button
                key={btn.key}
                onClick={() => handleFilterClick(btn)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${(btn.key === 'all' && !selectedStatus) ||
                  (btn.key === 'inprogress' && selectedStatus === 'inprogress') ||
                  (btn.key === 'done' && selectedStatus === 'done')
                  ? 'bg-gradient-wine text-white shadow-wine'
                  : 'bg-ivory-50 text-wine-700 hover:bg-wine-100'
                  }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 주문 목록 */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wine-600"></div>
            </div>
          ) : filteredOrders.length > 0 ? (
            <>
              {/* 모바일: 카드형 */}
              <div className="block sm:hidden space-y-4">
                {filteredOrders.map((order) => (
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
                          className="px-3 py-1 bg-wine-100 text-wine-800 rounded text-xs font-bold hover:bg-wine-200"
                        >
                          픽업완료
                        </button>
                      )}
                      {order.payment_status !== 'confirmed' && (
                        <button
                          onClick={() => handlePaymentConfirm(order)}
                          className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-xs font-bold hover:bg-purple-200"
                        >
                          결제확인
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
                    <tr className="bg-ivory-100 text-wine-700 text-sm">
                      <th className="px-2 py-2">주문번호</th>
                      <th className="px-2 py-2">주문인</th>
                      <th className="px-2 py-2">주문시간</th>
                      <th className="px-2 py-2">주문메뉴</th>
                      <th className="px-2 py-2">주문상태</th>
                      <th className="px-2 py-2">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order, idx) => (
                      <tr key={order.id} className="bg-ivory-50">
                        <td className="font-bold text-wine-700 align-middle text-xs">#{idx + 1}</td>
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
                                className="px-2 py-1 bg-wine-100 text-wine-800 rounded text-xs font-bold hover:bg-wine-200"
                              >
                                픽업완료
                              </button>
                            )}
                            {order.payment_status !== 'confirmed' && (
                              <button
                                onClick={() => handlePaymentConfirm(order)}
                                className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-bold hover:bg-purple-200"
                              >
                                결제확인
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
              <p className="text-wine-400">주문 내역이 없습니다.</p>
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
