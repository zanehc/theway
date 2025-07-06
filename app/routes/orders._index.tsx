import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { useState, useEffect } from "react";
import { getOrders, updateOrderStatus } from "~/lib/database";
import { supabase } from "~/lib/supabase";
import Header from "~/components/Header";
import type { OrderStatus } from "~/types";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const paymentStatus = url.searchParams.get('payment_status');
    
    const orders = await getOrders(status || undefined);
    
    // 결제 상태 필터링
    let filteredOrders = orders;
    if (paymentStatus) {
      filteredOrders = orders.filter(order => order.payment_status === paymentStatus);
    }
    
    return json({ orders: filteredOrders, currentStatus: status, currentPaymentStatus: paymentStatus });
  } catch (error) {
    console.error('Orders loader error:', error);
    return json({ orders: [], currentStatus: null, currentPaymentStatus: null });
  }
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
      return redirect('/orders');
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
      return redirect('/orders');
    } catch (error) {
      console.error('Update payment status error:', error);
      return json({ error: '결제 상태 업데이트에 실패했습니다.' }, { status: 400 });
    }
  }

  return json({ error: '잘못된 요청입니다.' }, { status: 400 });
}

const statusOptions: { value: OrderStatus; label: string; color: string; bgColor: string }[] = [
  { value: 'pending', label: '대기', color: 'text-yellow-800', bgColor: 'bg-yellow-100' },
  { value: 'preparing', label: '제조중', color: 'text-blue-800', bgColor: 'bg-blue-100' },
  { value: 'ready', label: '완료', color: 'text-green-800', bgColor: 'bg-green-100' },
  { value: 'completed', label: '픽업완료', color: 'text-wine-800', bgColor: 'bg-wine-100' },
  { value: 'cancelled', label: '취소', color: 'text-red-800', bgColor: 'bg-red-100' },
];

// 상태 옵션(ready=완료, completed=픽업완료, cancelled=취소)
const statusButtons = [
  { key: 'pending', label: '대기' },
  { key: 'preparing', label: '제조중' },
  { key: 'ready', label: '완료' },
  { key: 'completed', label: '픽업완료' },
  { key: 'payment_confirmed', label: '결제완료' },
  { key: 'cancelled', label: '취소' },
];

export default function Orders() {
  const { orders, currentStatus, currentPaymentStatus } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>(currentStatus as OrderStatus | '' || '');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // URL 파라미터로 전달된 상태가 있으면 필터 적용
  useEffect(() => {
    if (currentStatus) {
      setSelectedStatus(currentStatus as OrderStatus);
    }
  }, [currentStatus]);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single();
          setUserRole(userData?.role || null);
        }
      } catch (error) {
        console.error('Error getting user role:', error);
      } finally {
        setLoading(false);
      }
    };

    getUserRole();
  }, []);

  const filteredOrders = selectedStatus 
    ? orders.filter(order => order.status === selectedStatus)
    : orders;

  const getStatusColor = (status: OrderStatus) => {
    return statusOptions.find(option => option.value === status)?.color || 'text-gray-800';
  };

  const getStatusBgColor = (status: OrderStatus) => {
    return statusOptions.find(option => option.value === status)?.bgColor || 'bg-gray-100';
  };

  const getStatusLabel = (status: OrderStatus) => {
    return statusOptions.find(option => option.value === status)?.label || status;
  };

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    const formData = new FormData();
    formData.append('intent', 'updateStatus');
    formData.append('orderId', orderId);
    formData.append('status', newStatus);
    fetcher.submit(formData, { method: 'post' });
  };

  const handlePaymentConfirm = (orderId: string) => {
    const formData = new FormData();
    formData.append('intent', 'updatePayment');
    formData.append('orderId', orderId);
    formData.append('paymentStatus', 'confirmed');
    fetcher.submit(formData, { method: 'post' });
  };

  const isAdmin = userRole === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <Header />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-wine-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        <div className="mb-12 animate-fade-in">
          <h1 className="text-5xl font-black text-wine-800 mb-4 tracking-tight">주문 현황</h1>
          <p className="text-2xl text-wine-600 font-medium">
            {isAdmin ? '현재 주문 상태를 확인하고 관리하세요' : '현재 주문 상태를 확인하세요'}
          </p>
        </div>

        {/* 필터 */}
        <div className="bg-gradient-ivory rounded-3xl border-4 border-wine-600 shadow-soft p-6 sm:p-8 mb-8 animate-slide-up">
          <div className="flex flex-wrap gap-3 sm:gap-4 items-center justify-center">
            {statusButtons.map(btn => (
              <button
                key={btn.key}
                onClick={() => {
                  if (btn.key === 'payment_confirmed') {
                    setSelectedStatus('');
                    window.location.search = '?payment_status=confirmed';
                  } else {
                    setSelectedStatus(btn.key === 'cancelled' ? 'cancelled' : btn.key as OrderStatus);
                    if (window.location.search.includes('payment_status')) {
                      window.location.search = '?status=' + btn.key;
                    }
                  }
                }}
                className={`px-6 py-3 rounded-2xl text-base sm:text-lg font-bold transition-all duration-300 shadow-soft hover:shadow-medium transform hover:-translate-y-1 ${
                  (btn.key === 'payment_confirmed' && currentPaymentStatus === 'confirmed') || (btn.key !== 'payment_confirmed' && selectedStatus === btn.key)
                    ? 'bg-gradient-wine text-ivory-50 shadow-wine'
                    : 'bg-ivory-200/80 text-wine-700 hover:bg-wine-100'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* 주문 목록 */}
        <div className="bg-gradient-ivory rounded-3xl shadow-soft border border-ivory-200/50 overflow-hidden animate-slide-up">
          <div className="px-12 py-8 border-b border-ivory-200/50 bg-ivory-100/30">
            <h2 className="text-3xl font-black text-wine-800">
              주문 목록 ({filteredOrders.length}개)
            </h2>
          </div>
          
          {filteredOrders.length > 0 ? (
            <div className="divide-y divide-ivory-200/50">
              {filteredOrders.map((order, index) => (
                <div key={order.id} className="p-10 hover:bg-ivory-100/50 transition-all duration-300 animate-fade-in" style={{animationDelay: `${index * 0.1}s`}}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-6 mb-4">
                        <h3 className="text-3xl font-black text-wine-800">
                          {order.customer_name}
                        </h3>
                        <span className={`px-6 py-3 rounded-2xl text-lg font-bold shadow-sm ${getStatusBgColor(order.status)} ${getStatusColor(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                        {order.church_group && (
                          <span className="px-6 py-3 bg-ivory-200 text-wine-700 rounded-2xl text-lg font-bold shadow-sm">
                            {order.church_group}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-lg text-wine-500 mb-6 font-medium">
                        주문 시간: {new Date(order.created_at).toLocaleString('ko-KR')}
                      </p>

                      {/* 주문 아이템 */}
                      <div className="space-y-3 mb-6">
                        {order.order_items?.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-lg bg-ivory-100/50 p-4 rounded-2xl">
                            <span className="text-wine-800 font-bold">
                              {item.menu?.name} x {item.quantity}
                            </span>
                            <span className="text-wine-600 font-bold">
                              ₩{item.total_price.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="mb-6 bg-wine-50 p-6 rounded-2xl border border-wine-100">
                          <p className="text-lg text-wine-700 font-bold">
                            요청사항: {order.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-6 text-lg text-wine-600 font-bold">
                          <span>결제: {order.payment_method === 'cash' ? '현금' : '계좌이체'}</span>
                          <span className={`px-4 py-2 rounded-2xl ${
                            order.payment_status === 'confirmed' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {order.payment_status === 'confirmed' ? '결제완료' : '결제대기'}
                          </span>
                        </div>
                        <span className="text-3xl font-black text-wine-600">
                          총 ₩{order.total_amount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* 상태 변경 버튼 - 관리자만 표시 */}
                    {isAdmin && (
                      <div className="ml-8 flex flex-col space-y-4">
                        {order.status !== 'completed' && order.status !== 'cancelled' && (
                          <>
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'preparing')}
                                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl text-lg font-bold hover:shadow-large transition-all duration-300 transform hover:-translate-y-1 shadow-medium"
                              >
                                제조 시작
                              </button>
                            )}
                            {order.status === 'preparing' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'ready')}
                                className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl text-lg font-bold hover:shadow-large transition-all duration-300 transform hover:-translate-y-1 shadow-medium"
                              >
                                제조 완료
                              </button>
                            )}
                            {order.status === 'ready' && (
                              <button
                                onClick={() => handleStatusChange(order.id, 'completed')}
                                className="px-8 py-4 bg-gradient-to-r from-wine-500 to-wine-600 text-white rounded-2xl text-lg font-bold hover:shadow-large transition-all duration-300 transform hover:-translate-y-1 shadow-medium"
                              >
                                픽업 완료
                              </button>
                            )}
                            <button
                              onClick={() => handleStatusChange(order.id, 'cancelled')}
                              className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-2xl text-lg font-bold hover:shadow-large transition-all duration-300 transform hover:-translate-y-1 shadow-medium"
                            >
                              주문 취소
                            </button>
                          </>
                        )}
                        
                        {/* 결제 상태 변경 버튼 */}
                        {order.payment_status !== 'confirmed' && (
                          <button
                            onClick={() => handlePaymentConfirm(order.id)}
                            className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl text-lg font-bold hover:shadow-large transition-all duration-300 transform hover:-translate-y-1 shadow-medium"
                          >
                            결제 완료
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-20 text-center">
              <p className="text-wine-400 text-2xl font-medium">해당 상태의 주문이 없습니다.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 