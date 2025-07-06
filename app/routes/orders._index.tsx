import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, Link } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { getOrders, updateOrderStatus, createNotification } from "~/lib/database";
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
  const [newOrderAlert, setNewOrderAlert] = useState<{customer: string, church: string} | null>(null);
  const alertTimeout = useRef<NodeJS.Timeout | null>(null);

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

  // Supabase Realtime: 새 주문 알림 (관리자만)
  useEffect(() => {
    if (userRole !== 'admin') return;
    const channel = supabase
      .channel('orders-insert')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
      }, payload => {
        const order = payload.new;
        setNewOrderAlert({
          customer: order.customer_name,
          church: order.church_group || '',
        });
        // 사운드: 목장명 주문~! 음성
        const msg = `${order.church_group ? order.church_group + ' ' : ''}주문이 들어왔습니다!`;
        if ('speechSynthesis' in window) {
          const utter = new window.SpeechSynthesisUtterance(msg);
          utter.lang = 'ko-KR';
          window.speechSynthesis.speak(utter);
        }
        // 7초 후 알림 자동 사라짐
        if (alertTimeout.current) clearTimeout(alertTimeout.current);
        alertTimeout.current = setTimeout(() => setNewOrderAlert(null), 7000);
      })
      .subscribe();
    return () => {
      channel.unsubscribe();
      if (alertTimeout.current) clearTimeout(alertTimeout.current);
    };
  }, [userRole]);

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

  // 상태 변경 핸들러 (알림 포함)
  const handleStatusChangeWithNotification = async (order: any, newStatus: OrderStatus) => {
    await handleStatusChange(order.id, newStatus);
    // 제조완료/결제완료 시 알림
    if (newStatus === 'ready') {
      // 제조완료 알림
      if (order.user_id) {
        await createNotification({
          user_id: order.user_id,
          order_id: order.id,
          type: 'order_ready',
          message: `${order.customer_name}님의 주문이 제조완료되었습니다!`
        });
      }
    } else if (newStatus === 'completed') {
      // 픽업완료(주문완료) → 결제완료 버튼으로 넘어감(알림 X)
    } else if (newStatus === 'payment_confirmed') {
      // 결제완료 알림
      if (order.user_id) {
        await createNotification({
          user_id: order.user_id,
          order_id: order.id,
          type: 'order_paid',
          message: `${order.customer_name}님의 주문이 결제완료되었습니다!`
        });
      }
    }
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
        <div className="overflow-x-auto animate-slide-up">
          <table className="min-w-full text-center border-separate border-spacing-y-1 bg-white">
            <thead>
              <tr className="bg-ivory-100 text-wine-700 text-sm">
                <th className="px-2 py-2">연번</th>
                <th className="px-2 py-2">주문자<br/><span className="text-xs text-wine-400">(이름/목장)</span></th>
                <th className="px-2 py-2">상태</th>
                <th className="px-2 py-2">주문시간</th>
                <th className="px-2 py-2">주문메뉴</th>
                <th className="px-2 py-2">총금액</th>
                <th className="px-2 py-2">상태변경</th>
                <th className="px-2 py-2">취소</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order, idx) => (
                <tr key={order.id} className="bg-ivory-50">
                  {/* 연번 */}
                  <td className="align-middle font-bold text-wine-700">{idx + 1}</td>
                  {/* 주문자(2행) */}
                  <td className="align-middle">
                    <div className="font-bold text-wine-800">{order.customer_name}</div>
                    <div className="text-xs text-wine-600">{order.church_group || '-'}</div>
                  </td>
                  {/* 상태뱃지 */}
                  <td className="align-middle">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'ready' ? 'bg-green-100 text-green-800' :
                      order.status === 'completed' ? 'bg-wine-100 text-wine-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.status === 'pending' ? '대기' :
                       order.status === 'preparing' ? '제조중' :
                       order.status === 'ready' ? '제조완료' :
                       order.status === 'completed' ? '주문완료' :
                       order.status === 'cancelled' ? '취소' : order.status}
                    </span>
                  </td>
                  {/* 주문시간 */}
                  <td className="align-middle text-xs text-wine-700">
                    {new Date(order.created_at).toLocaleString('ko-KR')}
                  </td>
                  {/* 주문메뉴(여러 행) */}
                  <td className="align-middle">
                    <div className="flex flex-col gap-1 items-center">
                      {order.order_items?.map(item => (
                        <div key={item.id} className="text-xs text-wine-700">
                          {item.menu?.name} x{item.quantity}
                        </div>
                      ))}
                    </div>
                  </td>
                  {/* 총금액 */}
                  <td className="align-middle font-bold text-wine-800">
                    ₩{order.total_amount.toLocaleString()}
                  </td>
                  {/* 상태표시버튼 */}
                  <td className="align-middle">
                    {isAdmin && order.status !== 'cancelled' && order.status !== 'completed' && order.status !== 'ready' && (
                      <button
                        className="px-3 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition"
                        onClick={() => handleStatusChangeWithNotification(order, 'preparing')}
                      >
                        제조시작
                      </button>
                    )}
                    {isAdmin && order.status === 'preparing' && (
                      <button
                        className="px-3 py-2 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 transition"
                        onClick={() => handleStatusChangeWithNotification(order, 'ready')}
                      >
                        제조완료
                      </button>
                    )}
                    {isAdmin && order.status === 'ready' && (
                      <button
                        className="px-3 py-2 bg-wine-600 text-white rounded text-xs font-bold hover:bg-wine-700 transition"
                        onClick={() => handleStatusChangeWithNotification(order, 'completed')}
                      >
                        픽업완료
                      </button>
                    )}
                    {isAdmin && order.status === 'completed' && order.payment_status !== 'confirmed' && (
                      <button
                        className="px-3 py-2 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 transition"
                        onClick={() => handleStatusChangeWithNotification(order, 'payment_confirmed')}
                      >
                        결제완료
                      </button>
                    )}
                    {isAdmin && ((order.status === 'completed' && order.payment_status === 'confirmed') || order.status === 'cancelled') && (
                      <span className="text-xs text-wine-400">종료</span>
                    )}
                  </td>
                  {/* 주문취소버튼 */}
                  <td className="align-middle">
                    {isAdmin && order.status !== 'cancelled' && order.status !== 'completed' && (
                      <button
                        className="px-3 py-2 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 transition"
                        onClick={() => handleStatusChange(order.id, 'cancelled')}
                      >
                        주문취소
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* 새 주문 알림 배너 (관리자만) */}
      {newOrderAlert && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] bg-wine-600 text-ivory-50 px-6 py-4 rounded-xl shadow-2xl font-bold text-lg flex items-center gap-4 cursor-pointer animate-fade-in"
          onClick={() => {
            setNewOrderAlert(null);
            window.location.href = '/orders?status=pending';
          }}
        >
          <span>🛎️</span>
          <span>
            <span className="text-yellow-200">{newOrderAlert.church || '새'}</span> 주문이 들어왔습니다!<br />
            <span className="text-sm text-ivory-200">(클릭 시 대기중 주문으로 이동)</span>
          </span>
        </div>
      )}
    </div>
  );
} 