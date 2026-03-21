import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useOutletContext, useNavigation } from "@remix-run/react";
import { useState, useEffect } from "react";
import { updateOrderStatus } from "~/lib/database";
import { supabase } from "~/lib/supabase";
import type { OrderStatus } from "~/types";
import { useNotifications } from "~/contexts/NotificationContext";
import OrderCancellationModal from "~/components/OrderCancellationModal";
import { OrderListSkeleton } from "~/components/LoadingSkeleton";

// 파이프라인 컬럼 정의
const PIPELINE_COLUMNS = [
  { key: 'pending', label: '대기', emoji: '🔔', headerBg: 'bg-yellow-50 border-yellow-300', badgeBg: 'bg-yellow-100 text-yellow-800' },
  { key: 'preparing', label: '제조중', emoji: '☕', headerBg: 'bg-blue-50 border-blue-300', badgeBg: 'bg-blue-100 text-blue-800' },
  { key: 'ready', label: '제조완료', emoji: '✅', headerBg: 'bg-green-50 border-green-300', badgeBg: 'bg-green-100 text-green-800' },
  { key: 'completed', label: '픽업완료', emoji: '🎉', headerBg: 'bg-wine-50 border-wine-300', badgeBg: 'bg-wine-100 text-wine-800' },
] as const;

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
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline');
  const { toasts, addToast } = useNotifications();

  const [cancellationModal, setCancellationModal] = useState<{
    isOpen: boolean;
    order: any | null;
  }>({ isOpen: false, order: null });

  useEffect(() => { setMounted(true); }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch('/api/get-orders');
      const result = await response.json();
      if (result.success) {
        setOrders(result.data || []);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mounted || !user) return;
    loadOrders();
  }, [mounted, user]);

  // 토스트(알림) 변경 시 주문 목록 새로고침
  useEffect(() => {
    if (!mounted || toasts.length === 0) return;
    loadOrders();
  }, [toasts]); // eslint-disable-line react-hooks/exhaustive-deps

  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/admin/orders") {
    return <OrderListSkeleton />;
  }

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      addToast('주문 상태가 업데이트되었습니다.', 'success');
      await loadOrders();
    } catch {
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
      await loadOrders();
    } catch {
      addToast('결제 확인에 실패했습니다.', 'error');
    }
  };

  const handleOrderCancelClick = (order: any) => {
    setCancellationModal({ isOpen: true, order });
  };

  const handleOrderCancelConfirm = async (reason: string) => {
    if (!cancellationModal.order) return;
    try {
      await updateOrderStatus(cancellationModal.order.id, 'cancelled', reason);
      addToast(`주문이 취소되었습니다. (사유: ${reason})`, 'warning');
      await loadOrders();
    } catch (err) {
      addToast('주문 취소에 실패했습니다.', 'error');
      throw err;
    }
  };

  if (!mounted) return null;

  // 오늘 주문만 필터
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => new Date(o.created_at) >= today);

  // 파이프라인 컬럼별 주문 분류
  const ordersByStatus = PIPELINE_COLUMNS.reduce((acc, col) => {
    acc[col.key] = todayOrders.filter(o => o.status === col.key);
    return acc;
  }, {} as Record<string, any[]>);

  // 취소된 주문
  const cancelledOrders = todayOrders.filter(o => o.status === 'cancelled');

  // 다음 상태 버튼 설정
  const getNextAction = (order: any) => {
    switch (order.status) {
      case 'pending': return { label: '제조시작', nextStatus: 'preparing' as OrderStatus, color: 'bg-blue-500 hover:bg-blue-600 text-white' };
      case 'preparing': return { label: '제조완료', nextStatus: 'ready' as OrderStatus, color: 'bg-green-500 hover:bg-green-600 text-white' };
      case 'ready': return { label: '픽업완료', nextStatus: 'completed' as OrderStatus, color: 'bg-wine-600 hover:bg-wine-700 text-white' };
      default: return null;
    }
  };

  const getTimeSince = (dateStr: string) => {
    const mins = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    if (mins < 1) return '방금';
    if (mins < 60) return `${mins}분 전`;
    return `${Math.floor(mins / 60)}시간 전`;
  };

  return (
    <div className="min-h-screen bg-ivory-50 pb-20">
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg animate-slide-in">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg animate-slide-in">
          {success}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-wine-800">주문 관리</h1>
            <p className="text-xs sm:text-sm text-wine-500 font-medium">
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
              {' · '}오늘 {todayOrders.length}건
            </p>
          </div>
          <div className="flex gap-1 bg-ivory-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'pipeline' ? 'bg-white text-wine-800 shadow-sm' : 'text-wine-500'}`}
            >
              보드
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-wine-800 shadow-sm' : 'text-wine-500'}`}
            >
              목록
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wine-600"></div>
          </div>
        ) : viewMode === 'pipeline' ? (
          /* ===== 파이프라인 (칸반 보드) 뷰 ===== */
          <>
            {/* 모바일: 수직 파이프라인 */}
            <div className="block lg:hidden space-y-3">
              {PIPELINE_COLUMNS.map(col => {
                const colOrders = ordersByStatus[col.key] || [];
                if (colOrders.length === 0 && col.key === 'completed') return null; // 픽업완료는 비면 숨김
                return (
                  <div key={col.key} className={`border-2 rounded-xl overflow-hidden ${col.headerBg}`}>
                    <div className="px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{col.emoji}</span>
                        <span className="font-bold text-sm">{col.label}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeBg}`}>
                        {colOrders.length}
                      </span>
                    </div>
                    {colOrders.length > 0 && (
                      <div className="bg-white/80 p-2 space-y-2">
                        {colOrders.map((order: any) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            nextAction={getNextAction(order)}
                            onStatusChange={handleStatusChange}
                            onPaymentConfirm={handlePaymentConfirm}
                            onCancel={handleOrderCancelClick}
                            getTimeSince={getTimeSince}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 데스크탑: 가로 칸반 보드 */}
            <div className="hidden lg:grid lg:grid-cols-4 gap-3">
              {PIPELINE_COLUMNS.map(col => {
                const colOrders = ordersByStatus[col.key] || [];
                return (
                  <div key={col.key} className={`border-2 rounded-xl overflow-hidden ${col.headerBg} min-h-[300px]`}>
                    <div className="px-3 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg">{col.emoji}</span>
                        <span className="font-bold text-sm">{col.label}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.badgeBg}`}>
                        {colOrders.length}
                      </span>
                    </div>
                    <div className="bg-white/50 p-2 space-y-2 min-h-[250px]">
                      {colOrders.length > 0 ? colOrders.map((order: any) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          nextAction={getNextAction(order)}
                          onStatusChange={handleStatusChange}
                          onPaymentConfirm={handlePaymentConfirm}
                          onCancel={handleOrderCancelClick}
                          getTimeSince={getTimeSince}
                        />
                      )) : (
                        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
                          주문 없음
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 취소된 주문 */}
            {cancelledOrders.length > 0 && (
              <div className="mt-4 border-2 border-red-200 rounded-xl overflow-hidden bg-red-50">
                <div className="px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">❌</span>
                    <span className="font-bold text-sm text-red-700">취소됨</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">
                    {cancelledOrders.length}
                  </span>
                </div>
                <div className="bg-white/80 p-2 space-y-2">
                  {cancelledOrders.map((order: any) => (
                    <div key={order.id} className="bg-white border border-red-100 rounded-lg p-2.5 opacity-60">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-sm text-gray-600">{order.customer_name}</span>
                        <span className="text-xs text-gray-400">{getTimeSince(order.created_at)}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {order.order_items?.map((i: any) => `${i.menu?.name} x${i.quantity}`).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          /* ===== 리스트 뷰 ===== */
          <div className="space-y-3">
            {todayOrders.length > 0 ? todayOrders.map((order: any) => (
              <div key={order.id} className="bg-white border-2 border-wine-100 rounded-xl p-3 sm:p-4">
                {/* 진행 바 */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    {PIPELINE_COLUMNS.map((step, idx) => {
                      const currentIdx = PIPELINE_COLUMNS.findIndex(s => s.key === order.status);
                      const isActive = idx <= currentIdx;
                      return (
                        <span key={step.key} className={`text-xs font-bold ${isActive ? 'text-wine-800' : 'text-gray-300'}`}>
                          {step.label}
                        </span>
                      );
                    })}
                    <span className={`text-xs font-bold ${order.payment_status === 'confirmed' ? 'text-green-700' : 'text-gray-300'}`}>
                      결제완료
                    </span>
                  </div>
                  <div className="relative w-full h-2 bg-gray-200 rounded-full">
                    <div
                      className="absolute h-2 rounded-full bg-wine-600 transition-all"
                      style={{ width: `${Math.min(((PIPELINE_COLUMNS.findIndex(s => s.key === order.status) + 1) / 4) * 80, 80)}%` }}
                    />
                    <div
                      className={`absolute h-2 rounded-full transition-all ${order.payment_status === 'confirmed' ? 'bg-green-500' : 'bg-gray-200'}`}
                      style={{ width: '20%', right: 0 }}
                    />
                  </div>
                </div>

                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-bold text-wine-800">{order.customer_name}</span>
                    {order.church_group && (
                      <span className="text-wine-500 text-xs ml-2">{order.church_group}</span>
                    )}
                  </div>
                  <span className="text-xs text-wine-400">{getTimeSince(order.created_at)}</span>
                </div>

                <div className="space-y-1 mb-2">
                  {order.order_items?.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm text-wine-700">
                      <span>{item.menu?.name} x {item.quantity}</span>
                      <span>₩{item.total_price?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-wine-100">
                  <span className="font-bold text-wine-800">₩{order.total_amount?.toLocaleString()}</span>
                  <div className="flex gap-1.5">
                    {(() => {
                      const action = getNextAction(order);
                      return action ? (
                        <button
                          onClick={() => handleStatusChange(order.id, action.nextStatus)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold ${action.color}`}
                        >
                          {action.label}
                        </button>
                      ) : null;
                    })()}
                    {order.payment_status !== 'confirmed' && (
                      <button
                        onClick={() => handlePaymentConfirm(order)}
                        className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-xs font-bold hover:bg-purple-200"
                      >
                        결제확인
                      </button>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'completed' && (
                      <button
                        onClick={() => handleOrderCancelClick(order)}
                        className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-xs font-bold hover:bg-red-200"
                      >
                        취소
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )) : (
              <div className="text-center py-16">
                <p className="text-wine-400">오늘 주문이 없습니다.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {cancellationModal.order && (
        <OrderCancellationModal
          isOpen={cancellationModal.isOpen}
          onClose={() => setCancellationModal({ isOpen: false, order: null })}
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

// 주문 카드 컴포넌트
function OrderCard({ order, nextAction, onStatusChange, onPaymentConfirm, onCancel, getTimeSince }: {
  order: any;
  nextAction: { label: string; nextStatus: OrderStatus; color: string } | null;
  onStatusChange: (id: string, status: OrderStatus) => void;
  onPaymentConfirm: (order: any) => void;
  onCancel: (order: any) => void;
  getTimeSince: (date: string) => string;
}) {
  const itemSummary = order.order_items
    ?.map((i: any) => `${i.menu?.name} x${i.quantity}`)
    .join(', ') || '';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 shadow-sm">
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-bold text-sm text-wine-800">{order.customer_name}</span>
        <span className="text-xs text-gray-400">{getTimeSince(order.created_at)}</span>
      </div>

      {order.church_group && (
        <span className="text-xs text-wine-500">{order.church_group}</span>
      )}

      <p className="text-xs text-wine-700 mt-1 leading-relaxed">{itemSummary}</p>

      <div className="flex items-center justify-between mt-2">
        <span className="font-bold text-sm text-wine-800">₩{order.total_amount?.toLocaleString()}</span>
        <div className="flex items-center gap-1">
          {order.payment_status === 'confirmed' ? (
            <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">결제완료</span>
          ) : (
            <button
              onClick={() => onPaymentConfirm(order)}
              className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold hover:bg-purple-200"
            >
              결제확인
            </button>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-1.5 mt-2">
        {nextAction && (
          <button
            onClick={() => onStatusChange(order.id, nextAction.nextStatus)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${nextAction.color}`}
          >
            {nextAction.label}
          </button>
        )}
        {order.status !== 'cancelled' && order.status !== 'completed' && (
          <button
            onClick={() => onCancel(order)}
            className="px-2 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100"
          >
            취소
          </button>
        )}
      </div>
    </div>
  );
}
