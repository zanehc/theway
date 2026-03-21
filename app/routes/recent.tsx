import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, useNavigate, useLocation, useOutletContext, useNavigation } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { getOrders, updateOrderStatus, getOrdersByUserId } from "~/lib/database";
import { supabase } from "~/lib/supabase";
import type { OrderStatus } from "~/types";
import { useNotifications } from "~/contexts/NotificationContext";
import OrderCancellationModal from "~/components/OrderCancellationModal";
import { OrderListSkeleton } from "~/components/LoadingSkeleton";

const statusOptions: { value: OrderStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'pending', label: '대기', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  { value: 'preparing', label: '제조중', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  { value: 'ready', label: '제조완료', color: 'text-green-800', bgColor: 'bg-green-100' },
  { value: 'completed', label: '픽업완료', color: 'text-wine-800', bgColor: 'bg-wine-100' },
  { value: 'cancelled', label: '취소', color: 'text-red-800', bgColor: 'bg-red-100' },
];

// 필터 버튼 3개로 축소
const statusButtons = [
  { key: 'inprogress', label: '주문중' }, // 주문완료, 제조중, 제조완료, 픽업완료
  { key: 'done', label: '주문완료' },     // 픽업완료, 결제완료
  { key: 'all', label: '전체' },          // 전체
];

// 주문 상태 단계 정의
const orderSteps = [
  { key: 'pending', label: '주문완료' },
  { key: 'preparing', label: '제조중' },
  { key: 'ready', label: '제조완료' },
  { key: 'completed', label: '픽업완료' },
];

// 결제 상태 표시 컴포넌트
function PaymentStatusBadge({ status }: { status?: string }) {
  const isConfirmed = status === 'confirmed';

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${isConfirmed
      ? 'bg-green-100 text-green-800'
      : 'bg-gray-100 text-gray-800'
      }`}>
      <span className={`w-2 h-2 mr-2 rounded-full ${isConfirmed ? 'bg-green-500' : 'bg-gray-400'}`}></span>
      {isConfirmed ? '결제완료' : '결제대기'}
    </div>
  );
}


// 주문 상태 진행바 컴포넌트
function OrderStatusProgress({ status, paymentStatus }: { status: string, paymentStatus?: string }) {
  // 주문 진행 상태 (주문완료 -> 제조중 -> 제조완료 -> 픽업완료)
  const orderStep = orderSteps.findIndex(s => s.key === status);
  const isPaymentConfirmed = paymentStatus === 'confirmed';

  return (
    <div className="w-full flex flex-col items-center mb-2">
      {/* 주문 진행 상태 표시 */}
      <div className="flex w-full justify-between mb-1">
        {orderSteps.slice(0, 4).map((step, idx) => (
          <span
            key={step.key}
            className={`text-xs font-bold ${idx <= orderStep ? 'text-wine-800' : 'text-gray-400'
              }`}
            style={{ minWidth: 50, textAlign: 'center' }}
          >
            {step.label}
          </span>
        ))}
        {/* 결제완료 별도 표시 */}
        <span
          className={`text-xs font-bold ${isPaymentConfirmed ? 'text-green-700' : 'text-gray-400'
            }`}
          style={{ minWidth: 50, textAlign: 'center' }}
        >
          결제완료
        </span>
      </div>

      {/* 주문 진행바 */}
      <div className="relative w-full h-2 bg-gray-200 rounded-full mb-1">
        {/* 주문 진행 상태 진행바 (80%까지만) */}
        <div
          className="absolute h-2 rounded-full bg-wine-600 transition-all duration-500"
          style={{ width: `${Math.min(((orderStep + 1) / 4) * 80, 80)}%` }}
        />
        {/* 결제완료 영역 (마지막 20%) */}
        <div
          className={`absolute h-2 rounded-full transition-all duration-500 ${isPaymentConfirmed ? 'bg-green-500' : 'bg-gray-200'
            }`}
          style={{ width: '20%', right: 0 }}
        />
      </div>

    </div>
  );
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');

  return json({
    initialOrders: [],
    currentStatus: null,
    currentPaymentStatus: null,
    userRole: null,
    error,
    success
  });
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
      return redirect('/recent');
    } catch (error) {
      console.error('Update status error:', error);
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
      return redirect('/recent');
    } catch (error) {
      console.error('Update payment status error:', error);
      return json({ error: '결제 상태 업데이트에 실패했습니다.' }, { status: 400 });
    }
  }

  return json({ error: '잘못된 요청입니다.' }, { status: 400 });
}

export default function RecentPage() {
  const { initialOrders, currentStatus, currentPaymentStatus, error, success } = useLoaderData<typeof loader>();
  const outletContext = useOutletContext<{ user: any; userRole: string | null; authReady: boolean }>();
  const navigation = useNavigation();
  const fetcher = useFetcher();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // outletContext에서 제공하는 인증 상태를 우선 사용
  const contextUser = outletContext?.user || null;
  const contextUserRole = outletContext?.userRole || null;

  const [user, setUser] = useState<any>(contextUser);
  const [userRoleState, setUserRole] = useState<string | null>(contextUserRole);
  const [userData, setUserData] = useState<any>(null);
  const [currentPaymentStatusState, setCurrentPaymentStatusState] = useState<string>('');

  // 모든 훅은 조건부 return 전에 호출되어야 함 (React 훅 규칙)
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const ORDERS_PER_PAGE = 10;
  const channelRef = useRef<any>(null);
  const { toasts, addToast } = useNotifications();

  // 취소 모달 상태
  const [cancellationModal, setCancellationModal] = useState<{
    isOpen: boolean;
    order: any | null;
  }>({ isOpen: false, order: null });

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

  // outletContext에서 user/userRole이 변경되면 로컬 상태 동기화
  useEffect(() => {
    setUser(contextUser);
    setUserRole(contextUserRole);
  }, [contextUser, contextUserRole]);

  // URL 파라미터 동기화
  useEffect(() => {
    if (!mounted) return;

    const params = new URLSearchParams(location.search);
    const status = params.get('status') as OrderStatus | '';
    const paymentStatus = params.get('payment_status') || '';

    if (paymentStatus === 'confirmed') {
      setSelectedStatus('');
      setCurrentPaymentStatusState('confirmed');
    } else if (status) {
      setSelectedStatus(status);
      setCurrentPaymentStatusState('');
    } else {
      setSelectedStatus('');
      setCurrentPaymentStatusState('');
    }
  }, [location.search, mounted]);

  // 주문 데이터 로딩 (user 상태 기반)
  useEffect(() => {
    if (!mounted) return;

    let isCancelled = false;

    const loadOrders = async () => {
      const currentUser = user;

      if (!currentUser) {
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        const role = userRoleState || 'customer';

        const result = role === 'admin'
          ? await getOrders()
          : await getOrdersByUserId(currentUser.id);

        if (!isCancelled) {
          setOrders(result || []);
        }
      } catch (error) {
        console.error('주문 로딩 실패:', error);
        if (!isCancelled) {
          setOrders([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      isCancelled = true;
    };
  }, [mounted, user, userRoleState]);



  // 알림에 따른 주문 목록 새로고침 (toasts 변경 시에만 실행)
  useEffect(() => {
    // 초기 로딩 시에는 loadOrders에서 처리하므로 건너뜀 (중복 방지)
    if (!mounted || toasts.length === 0) return;

    const refreshOrders = async () => {
      if (userRoleState === 'admin') {
        const allOrders = await getOrders();
        setOrders(allOrders || []);
      } else if (user) {
        const userOrders = await getOrdersByUserId(user.id);
        setOrders(userOrders || []);
      }
    };

    refreshOrders();
  }, [toasts]); // 의존성 간소화 - toasts 변경 시에만 새로고침

  // Safari 호환성을 위한 안전한 네비게이션 상태 체크 (모든 훅 호출 후에 조건부 return)
  if (navigation.state === "loading" && navigation.location?.pathname && navigation.location.pathname !== "/recent") {
    return <OrderListSkeleton />;
  }

  // 취소 모달 열기
  const handleOrderCancelClick = (order: any) => {
    setCancellationModal({
      isOpen: true,
      order: order
    });
  };

  // 취소 모달 닫기
  const handleCancellationModalClose = () => {
    setCancellationModal({
      isOpen: false,
      order: null
    });
  };

  // 취소사유와 함께 주문 취소 실행
  const handleOrderCancelConfirm = async (reason: string) => {
    if (!cancellationModal.order) return;

    try {
      await updateOrderStatus(cancellationModal.order.id, 'cancelled', reason);

      addToast(`주문이 취소되었습니다. (사유: ${reason})`, 'warning');

      // 주문 목록 새로고침
      if (userRoleState === 'admin') {
        const allOrders = await getOrders(selectedStatus || undefined);
        setOrders(allOrders || []);
      } else {
        const userOrders = await getOrdersByUserId(user.id);
        setOrders(userOrders || []);
      }
    } catch (error) {
      console.error('Cancel order error:', error);
      addToast('주문 취소에 실패했습니다.', 'error');
      throw error; // 모달에서 에러 처리하도록 다시 throw
    }
  };

  // 상태별 색상 및 스타일 함수들
  const getStatusColor = (status: OrderStatus) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || 'text-gray-800';
  };

  const getStatusBgColor = (status: OrderStatus) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.bgColor || 'bg-gray-100';
  };

  const getStatusLabel = (status: OrderStatus, paymentStatus?: string) => {
    if (paymentStatus === 'confirmed') return '결제완료';
    const option = statusOptions.find(opt => opt.value === status);
    return option?.label || status;
  };

  // 주문 상태 변경
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(orderId, newStatus);

      addToast('주문 상태가 업데이트되었습니다.', 'success');

      // 주문 목록 새로고침
      if (userRoleState === 'admin') {
        const allOrders = await getOrders(selectedStatus || undefined);
        setOrders(allOrders || []);
      } else {
        const userOrders = await getOrdersByUserId(user.id);
        setOrders(userOrders || []);
      }
    } catch (error) {
      console.error('Status change error:', error);
      addToast('상태 변경에 실패했습니다.', 'error');
    }
  };

  // 결제 확인
  const handlePaymentConfirm = async (order: any) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ payment_status: 'confirmed' })
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;

      addToast('결제가 확인되었습니다.', 'success');

      // 주문 목록 새로고침
      if (userRoleState === 'admin') {
        const allOrders = await getOrders(selectedStatus || undefined);
        setOrders(allOrders || []);
      } else {
        const userOrders = await getOrdersByUserId(user.id);
        setOrders(userOrders || []);
      }
    } catch (error) {
      console.error('Payment confirm error:', error);
      addToast('결제 확인에 실패했습니다.', 'error');
    }
  };

  // 상태 변경
  const handleStatusChangeWithNotification = async (order: any, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(order.id, newStatus);
      addToast('주문 상태가 업데이트되었습니다.', 'success');

      // 주문 목록 새로고침
      if (userRoleState === 'admin') {
        const allOrders = await getOrders(selectedStatus || undefined);
        setOrders(allOrders || []);
      } else {
        const userOrders = await getOrdersByUserId(user.id);
        setOrders(userOrders || []);
      }
    } catch (error) {
      console.error('Status change error:', error);
      addToast('상태 변경에 실패했습니다.', 'error');
    }
  };

  // 필터링 로직 (관리자)
  const filteredOrders = orders.filter(order => {
    if (userRoleState !== 'admin') return true;
    if (selectedStatus === 'inprogress') {
      return (
        order.status === 'pending' ||
        order.status === 'preparing' ||
        order.status === 'ready' ||
        order.status === 'completed'
      );
    }
    if (selectedStatus === 'done') {
      return order.payment_status === 'confirmed';
    }
    // 전체
    return true;
  });

  // 필터 버튼 클릭
  const handleFilterClick = (btn: typeof statusButtons[number]) => {
    setSelectedStatus(btn.key as any);
    setCurrentPage(1);
  };

  // 빠른 주문
  const handleQuickOrder = (order: any) => {
    try {
      const orderItems = order.order_items.map((item: any) => {
        return {
          menu_id: item.menu_id,
          quantity: item.quantity,
          unit_price: item.unit_price ?? item.price ?? (item.menu?.price ?? 0),
          menu_name: item.menu_name
        };
      });

      localStorage.setItem('quickOrderItems', JSON.stringify(orderItems));

      // React Router navigate 사용으로 변경 (세션 유지)
      navigate('/orders/new');
    } catch (error) {
      console.error('빠른주문 처리 실패:', error);
      addToast('빠른주문 처리에 실패했습니다.', 'error');
    }
  };

  if (!mounted) {
    return null;
  }

  // 비로그인 사용자 처리
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

          {/* 스켈레톤 필터 버튼들 */}
          <div className="flex gap-2 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded-lg w-20 animate-pulse"></div>
            ))}
          </div>

          {/* 스켈레톤 주문 카드들 */}
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
      {/* OAuth 결과 메시지 */}
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

      {/* 대시보드 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 사용자 인사말 */}
        {user && (
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-wine-800">
              {userData?.name || user.email}님의 주문 내역
            </h1>
          </div>
        )}

        {/* 카페 주문현황 */}
        <div className="relative bg-ivory-100 border-4 border-wine-600 rounded-3xl p-4 sm:p-6 mb-8">
          <div className="flex flex-col items-center mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-wine-800">주문 현황</h2>
            <span className="mt-1 text-xs sm:text-sm text-wine-500 font-semibold">
              {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </span>
          </div>

          {/* 필터 버튼 */}
          {userRoleState === 'admin' && (
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
          )}

          {/* 주문 목록 */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wine-600"></div>
            </div>
          ) : filteredOrders.length > 0 ? (
            <>
              {/* 모바일: 카드형 */}
              <div className="block sm:hidden space-y-4">
                {filteredOrders
                  .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                  .map((order) => (
                    <div key={order.id} className="bg-ivory-50 rounded-xl border border-wine-200 p-4">
                      {/* 주문 상태 진행바 */}
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

                      {/* 관리자 액션 버튼 */}
                      {userRoleState === 'admin' && (
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
                      )}

                      {/* 빠른 주문 버튼 */}
                      {userRoleState !== 'admin' && (
                        <button
                          onClick={() => handleQuickOrder(order)}
                          className="mt-2 w-full px-3 py-1 bg-red-100 text-red-800 rounded text-xs font-bold hover:bg-red-200"
                        >
                          빠른 주문
                        </button>
                      )}
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
                      {userRoleState === 'admin' && <th className="px-2 py-2">액션</th>}
                      <th className="px-2 py-2">빠른주문</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders
                      .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                      .map((order, idx) => (
                        <tr key={order.id} className="bg-ivory-50">
                          {/* 주문번호: #1, #2 등 인덱스 기반 */}
                          <td className="font-bold text-wine-700 align-middle text-xs">
                            #{(currentPage - 1) * ORDERS_PER_PAGE + idx + 1}
                          </td>
                          {/* 주문인/목장명 2행 */}
                          <td className="align-middle">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-wine-800">{order.customer_name}</span>
                              <span className="text-wine-700 text-xs mt-1">{order.church_group}</span>
                            </div>
                          </td>
                          {/* 주문시간: 날짜/시간 2행 */}
                          <td className="align-middle">
                            <div className="flex flex-col items-center">
                              <span className="text-wine-700 text-xs">{new Date(order.created_at).toLocaleDateString('ko-KR')}</span>
                              <span className="text-wine-700 text-xs mt-1">{new Date(order.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </td>
                          {/* 주문메뉴/주문금액 2행 */}
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
                          {/* 상태 진행바만 표시 (뱃지 제거) */}
                          <td className="align-middle">
                            <OrderStatusProgress status={order.status} paymentStatus={order.payment_status} />
                          </td>
                          {userRoleState === 'admin' && (
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
                          )}
                          <td className="align-middle">
                            {userRoleState !== 'admin' && (
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
              {filteredOrders.length > ORDERS_PER_PAGE && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-wine-100 text-wine-700 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-wine-200 transition-all duration-300"
                  >
                    이전
                  </button>

                  <span className="px-4 py-2 text-wine-700 font-bold">
                    {currentPage} / {Math.ceil(filteredOrders.length / ORDERS_PER_PAGE)}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / ORDERS_PER_PAGE), prev + 1))}
                    disabled={currentPage === Math.ceil(filteredOrders.length / ORDERS_PER_PAGE)}
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

      {/* 취소사유 모달 */}
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