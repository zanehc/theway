import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, Link, useNavigate, useLocation } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { getOrders, updateOrderStatus, getOrdersByUserId } from "~/lib/database";
import { supabase } from "~/lib/supabase";
import type { OrderStatus } from "~/types";

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

// 주문 상태 단계 정의 (종료 제거)
const orderSteps = [
  { key: 'pending', label: '주문완료' },
  { key: 'preparing', label: '제조중' },
  { key: 'ready', label: '제조완료' },
  { key: 'completed', label: '픽업완료' },
  { key: 'payment_confirmed', label: '결제완료' },
];

// 주문 상태 진행바 컴포넌트
function OrderStatusProgress({ status, paymentStatus }: { status: string, paymentStatus?: string }) {
  // 결제완료/종료 상태 처리
  let currentStep = orderSteps.findIndex(s => s.key === status);
  if (paymentStatus === 'confirmed') currentStep = 4;
  if (status === 'ended') currentStep = 5;

  return (
    <div className="w-full flex flex-col items-center mb-2">
      <div className="flex w-full justify-between mb-1">
        {orderSteps.map((step, idx) => (
          <span
            key={step.key}
            className={`text-xs font-bold ${idx === currentStep ? 'text-wine-800' : 'text-gray-400'}`}
            style={{ minWidth: 60, textAlign: 'center' }}
          >
            {step.label}
          </span>
        ))}
      </div>
      <div className="relative w-full h-2 bg-gray-200 rounded-full">
        <div
          className="absolute h-2 rounded-full bg-wine-600 transition-all duration-500"
          style={{ width: `${((currentStep + 1) / orderSteps.length) * 100}%` }}
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
  const fetcher = useFetcher();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<{customer: string, church: string, message?: string, status?: OrderStatus} | null>(null);
  const alertTimeout = useRef<NodeJS.Timeout | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userRoleState, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [currentPaymentStatusState, setCurrentPaymentStatusState] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const ORDERS_PER_PAGE = 10;
  const channelRef = useRef<any>(null);

  // 클라이언트 마운트 확인
  useEffect(() => {
    setMounted(true);
  }, []);

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

  // 사용자 정보와 주문 불러오기
  useEffect(() => {
    if (!mounted) return;
    
    const getUserAndOrders = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        
        if (user) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, name, email')
            .eq('id', user.id)
            .single();
          
          if (!userError && userData) {
            const role = userData?.role || null;
            setUserRole(role);
            setUserData(userData);
            
            if (role === 'admin') {
              const allOrders = await getOrders(); // 항상 전체 주문 불러오기
              setOrders(allOrders || []);
            } else if (role === 'customer' || role === null) {
              const userOrders = await getOrdersByUserId(user.id);
              setOrders(userOrders || []);
            }
          }
        }
      } catch (error) {
        console.error('Error loading user and orders:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserAndOrders();
  }, [mounted, selectedStatus]);

  // 실시간 업데이트
  useEffect(() => {
    if (!mounted || !user) return;

    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newOrder = payload.new as any;
          
          if (userRoleState === 'admin') {
            setNewOrderAlert({
              customer: newOrder.customer_name,
              church: newOrder.church_group,
              status: newOrder.status
            });
            
            if (alertTimeout.current) {
              clearTimeout(alertTimeout.current);
            }
            alertTimeout.current = setTimeout(() => {
              setNewOrderAlert(null);
            }, 5000);
          }
          
          // 주문 목록 새로고침
          if (userRoleState === 'admin') {
            const allOrders = await getOrders(selectedStatus || undefined);
            setOrders(allOrders || []);
          } else {
            const userOrders = await getOrdersByUserId(user.id);
            setOrders(userOrders || []);
          }
        } else if (payload.eventType === 'UPDATE') {
          // 주문 상태 변경 시 목록 새로고침
          if (userRoleState === 'admin') {
            const allOrders = await getOrders(selectedStatus || undefined);
            setOrders(allOrders || []);
          } else {
            // 고객: 내 주문 상태 변경 알림
            if (
              payload.new.user_id === user.id &&
              payload.old.status !== payload.new.status
            ) {
              setNewOrderAlert({
                customer: '',
                church: '',
                message: `주문이 ${getStatusLabel(payload.new.status)} 상태로 변경되었습니다.`,
                status: payload.new.status
              });
              if (alertTimeout.current) clearTimeout(alertTimeout.current);
              alertTimeout.current = setTimeout(() => setNewOrderAlert(null), 5000);
            }
            const userOrders = await getOrdersByUserId(user.id);
            setOrders(userOrders || []);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [mounted, user, userRoleState, selectedStatus]);

  // 주문 취소 처리
  const handleOrderCancel = async (order: any) => {
    if (!confirm('정말로 이 주문을 취소하시겠습니까?')) return;
    
    try {
      await updateOrderStatus(order.id, 'cancelled');
      alert('주문이 취소되었습니다.');
      
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
      alert('주문 취소에 실패했습니다.');
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
      alert('주문 상태가 업데이트되었습니다.');
      
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
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 결제 확인
  const handlePaymentConfirm = async (order: any) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ payment_status: 'confirmed' })
        .eq('id', order.id);
      
      if (error) throw error;
      
      alert('결제가 확인되었습니다.');
      
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
      alert('결제 확인에 실패했습니다.');
    }
  };

  // 상태 변경
  const handleStatusChangeWithNotification = async (order: any, newStatus: OrderStatus) => {
    try {
      await updateOrderStatus(order.id, newStatus);
      alert('주문 상태가 업데이트되었습니다.');
      
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
      alert('상태 변경에 실패했습니다.');
    }
  };

  // 필터링 로직 (관리자)
  const filteredOrders = orders.filter(order => {
    if (userRoleState !== 'admin') return true;
    if (selectedStatus === 'inprogress') {
      // 주문중: 대기(pending), 제조중(preparing), 제조완료(ready), 픽업완료(결제 전, completed + payment_status !== confirmed)
      return (
        order.status === 'pending' ||
        order.status === 'preparing' ||
        order.status === 'ready' ||
        (order.status === 'completed' && order.payment_status !== 'confirmed')
      );
    }
    if (selectedStatus === 'done') {
      // 주문완료: 픽업완료(결제완료) 또는 결제완료
      return (
        (order.status === 'completed' && order.payment_status === 'confirmed') ||
        order.payment_status === 'confirmed'
      );
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
    console.log('빠른주문 order_items:', order.order_items);
    const orderItems = order.order_items.map((item: any) => {
      console.log('item:', item);
      return {
        menu_id: item.menu_id,
        quantity: item.quantity,
        unit_price: item.unit_price ?? item.price ?? (item.menu?.price ?? 0),
        menu_name: item.menu_name
      };
    });
    console.log('빠른주문 orderItems to save:', orderItems);
    localStorage.setItem('quickOrderItems', JSON.stringify(orderItems));
    window.location.href = '/orders/new';
  };

  if (!mounted) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory-50 pb-20">
      {/* 새 주문/상태변경 알림 */}
      {newOrderAlert && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-large animate-slide-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              {newOrderAlert.customer && newOrderAlert.church ? (
                <>
                  <div className="font-bold">새 주문!</div>
                  <div className="text-sm">{newOrderAlert.customer} ({newOrderAlert.church})</div>
                </>
              ) : (
                <div className="font-bold">{newOrderAlert.message}</div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                    (btn.key === 'all' && !selectedStatus) ||
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
                            onClick={() => handleOrderCancel(order)}
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
                      <th className="px-2 py-2">상태</th>
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
                                    onClick={() => handleOrderCancel(order)}
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

        {/* 빠른 액션 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Link
            to="/orders/new"
            className="bg-gradient-wine text-ivory-50 rounded-xl p-4 sm:p-6 text-center hover:shadow-wine transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1"
          >
            <div className="flex flex-col items-center">
              <svg className="w-8 h-8 sm:w-12 sm:h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <h3 className="font-bold text-sm sm:text-base">새 주문</h3>
            </div>
          </Link>
          
          {/* 주문현황 밑의 빠른 액션(메뉴보기, 매출보고서) 버튼 제거 */}
        </div>
      </div>
    </div>
  );
} 