import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, Link, useNavigate, useLocation } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { getOrders, updateOrderStatus, getOrdersByUserId } from "~/lib/database";
import { supabase } from "~/lib/supabase";
import type { OrderStatus } from "~/types";
import React from 'react';

const statusOptions: { value: OrderStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'pending', label: '대기', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  { value: 'preparing', label: '제조중', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  { value: 'ready', label: '제조완료', color: 'text-green-800', bgColor: 'bg-green-100' },
  { value: 'completed', label: '픽업완료', color: 'text-wine-800', bgColor: 'bg-wine-100' },
  { value: 'cancelled', label: '취소', color: 'text-red-800', bgColor: 'bg-red-100' },
];

const statusButtons = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'preparing', label: '제조중' },
  { key: 'ready', label: '제조완료' },
  { key: 'completed', label: '픽업완료' },
  { key: 'payment_confirmed', label: '결제완료' },
  { key: 'cancelled', label: '취소' },
];

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  const success = url.searchParams.get('success');

  // 서버에서는 기본 구조만 제공
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
      return redirect('/');
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
      return redirect('/');
  } catch (error) {
      console.error('Update payment status error:', error);
      return json({ error: '결제 상태 업데이트에 실패했습니다.' }, { status: 400 });
    }
  }

  return json({ error: '잘못된 요청입니다.' }, { status: 400 });
}

export default function Index() {
  const { initialOrders, currentStatus, currentPaymentStatus, error, success } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>('');
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
              const allOrders = await getOrders(selectedStatus || undefined);
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

  // 필터 버튼 클릭
  const handleFilterClick = (btn: typeof statusButtons[number]) => {
    if (btn.key === 'all') {
      setSelectedStatus('');
      setCurrentPaymentStatusState('');
      navigate('/', { replace: true });
    } else if (btn.key === 'payment_confirmed') {
      setSelectedStatus('');
      setCurrentPaymentStatusState('confirmed');
      navigate('/?payment_status=confirmed', { replace: true });
    } else {
      setSelectedStatus(btn.key as OrderStatus);
      setCurrentPaymentStatusState('');
      navigate(`/?status=${btn.key}`, { replace: true });
    }
    setCurrentPage(1);
  };

  // 로딩 중이거나 클라이언트가 아니면 로딩 화면 표시
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm pb-20">
      
      {/* OAuth 결과 메시지 */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-large animate-slide-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}
      
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-large animate-slide-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        </div>
      )}

      {/* 새 주문 알림 */}
      {newOrderAlert && (
        <div className="fixed top-4 left-4 z-50 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg shadow-large animate-slide-in">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-bold">새 주문!</div>
              <div className="text-sm">{newOrderAlert.customer} ({newOrderAlert.church})</div>
            </div>
          </div>
        </div>
      )}
      
      {/* 대시보드 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 사용자 인사말 */}
        {user && (
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-wine-800">
              {userData?.name || user.email}님 안녕하세요
            </h1>
          </div>
        )}
        
        {/* 카페 주문현황 */}
        <div className="relative bg-ivory-100 border-4 border-wine-600 rounded-3xl p-4 sm:p-6 mb-8">
          <div className="flex flex-col items-center mb-4">
            <h2 className="text-2xl sm:text-3xl font-black text-wine-800">카페 주문현황</h2>
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
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 ${
                  (btn.key === 'all' && !selectedStatus && !currentPaymentStatusState) ||
                  (btn.key === 'payment_confirmed' && currentPaymentStatusState === 'confirmed') ||
                  (btn.key === selectedStatus)
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
          ) : orders.length > 0 ? (
            <>
              {/* 모바일: 카드형 */}
              <div className="block sm:hidden space-y-4">
                {orders
                  .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                  .map((order) => (
                  <div key={order.id} className="bg-ivory-50 rounded-xl border border-wine-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-wine-400">#{order.id.slice(-8)}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusBgColor(order.status)} ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status, order.payment_status)}
                      </span>
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
                      <th className="px-2 py-2">목장</th>
                      <th className="px-2 py-2">주문시간</th>
                      <th className="px-2 py-2">주문메뉴</th>
                      <th className="px-2 py-2">주문금액</th>
                      <th className="px-2 py-2">상태</th>
                      {userRoleState === 'admin' && <th className="px-2 py-2">액션</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {orders
                      .slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE)
                      .map((order) => (
                      <tr key={order.id} className="bg-ivory-50">
                        <td className="font-bold text-wine-700 align-middle text-xs">
                          #{order.id.slice(-8)}
                        </td>
                        <td className="align-middle">
                          <div className="font-bold text-wine-800">{order.customer_name}</div>
                        </td>
                        <td className="align-middle">
                          <div className="text-wine-700">{order.church_group}</div>
                        </td>
                        <td className="align-middle">
                          <div className="text-wine-700 text-sm">
                            {new Date(order.created_at).toLocaleString('ko-KR')}
              </div>
                        </td>
                        <td className="align-middle">
                          <div className="flex flex-col gap-1 items-center">
                            {order.order_items?.map((item: any) => (
                              <div key={item.id} className="text-xs text-wine-700">
                                {item.menu?.name} x {item.quantity}
            </div>
                            ))}
          </div>
                        </td>
                        <td className="align-middle">
                          <div className="font-bold text-wine-800">₩{order.total_amount?.toLocaleString()}</div>
                        </td>
                        <td className="align-middle">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusBgColor(order.status)} ${getStatusColor(order.status)}`}>
                            {getStatusLabel(order.status, order.payment_status)}
                          </span>
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

          <Link
            to="/menus"
            className="bg-gradient-ivory text-wine-800 rounded-xl p-4 sm:p-6 text-center hover:shadow-ivory transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1"
          >
            <div className="flex flex-col items-center">
              <svg className="w-8 h-8 sm:w-12 sm:h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="font-bold text-sm sm:text-base">메뉴 관리</h3>
            </div>
          </Link>

          {userRoleState === 'admin' && (
            <Link
              to="/reports"
              className="bg-gradient-wine text-ivory-50 rounded-xl p-4 sm:p-6 text-center hover:shadow-wine transition-all duration-300 shadow-medium hover:shadow-large transform hover:-translate-y-1"
            >
              <div className="flex flex-col items-center">
                <svg className="w-8 h-8 sm:w-12 sm:h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="font-bold text-sm sm:text-base">매출 보고서</h3>
              </div>
            </Link>
          )}
          </div>
      </div>
    </div>
  );
}
