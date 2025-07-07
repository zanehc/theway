import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, useFetcher, Link, useNavigate, useLocation } from "@remix-run/react";
import { useState, useEffect, useRef } from "react";
import { getOrders, updateOrderStatus, createNotification, getOrdersByUserId } from "~/lib/database";
import { supabase } from "~/lib/supabase";
import Header from "~/components/Header";
import type { OrderStatus } from "~/types";
import React from 'react';

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const paymentStatus = url.searchParams.get('payment_status');
    
    // 서버 사이드에서는 기본 정보만 반환하고, 주문은 클라이언트에서 불러옴
    return json({ 
      orders: [], // 클라이언트에서 불러올 예정
      currentStatus: status, 
      currentPaymentStatus: paymentStatus,
      userRole: null // 클라이언트에서 설정할 예정
    });
  } catch (error) {
    console.error('Orders loader error:', error);
    return json({ orders: [], currentStatus: null, currentPaymentStatus: null, userRole: null });
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
  { key: 'all', label: '전체' },
  { key: 'pending', label: '대기' },
  { key: 'preparing', label: '제조중' },
  { key: 'ready', label: '제조완료' },
  { key: 'completed', label: '픽업완료' },
  { key: 'payment_confirmed', label: '결제완료' },
  { key: 'cancelled', label: '취소' },
];

export default function Orders() {
  console.log('🔍 Orders component rendered');
  const { orders: initialOrders, currentStatus, userRole } = useLoaderData<typeof loader>();
  console.log('🔍 Loader data:', { initialOrders, currentStatus, userRole });
  const fetcher = useFetcher();
  const [orders, setOrders] = useState<any[]>(initialOrders);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | ''>(currentStatus as OrderStatus | '' || '');
  const [loading, setLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<{customer: string, church: string, message?: string, status?: OrderStatus} | null>(null);
  const alertTimeout = useRef<NodeJS.Timeout | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userRoleState, setUserRole] = useState<string | null>(userRole);
  const [currentPaymentStatus, setCurrentPaymentStatus] = useState<string>('');
  const navigate = useNavigate();
  const location = useLocation();
  const filteredOrders = orders.filter(order => {
    if (currentPaymentStatus === 'confirmed') {
      return order.payment_status === 'confirmed';
    }
    if (selectedStatus) {
      return order.status === selectedStatus;
    }
    return true;
  });
  const [currentPage, setCurrentPage] = useState(1);
  const ORDERS_PER_PAGE = 10;
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ORDERS_PER_PAGE, currentPage * ORDERS_PER_PAGE);
  const channelRef = useRef<any>(null);

  // URL 파라미터 동기화
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get('status') as OrderStatus | '';
    const paymentStatus = params.get('payment_status') || '';
    setSelectedStatus(status || '');
    setCurrentPaymentStatus(paymentStatus || '');
  }, [location.search]);

  // 클라이언트 사이드에서 사용자 정보와 주문 불러오기
  useEffect(() => {
    console.log('🔍 useEffect triggered with currentStatus:', currentStatus);
    
    const getUserAndOrders = async () => {
      try {
        console.log('🔍 useEffect getUserAndOrders started');
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        console.log('🔍 Current auth user:', user);
        
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('role, name, email')
            .eq('id', user.id)
            .single();
          console.log('🔍 User data from database:', userData);
          
          const role = userData?.role || null;
          console.log('🔍 Setting userRole to:', role);
          setUserRole(role);
          
          // 주문 불러오기
          if (role === 'admin') {
            console.log('🔍 Loading all orders for admin');
            console.log('🔍 currentStatus:', currentStatus);
            const allOrders = await getOrders(currentStatus || undefined);
            console.log('🔍 All orders loaded for admin:', allOrders);
            console.log('🔍 Orders length:', allOrders?.length || 0);
            setOrders(allOrders || []);
          } else if (role === 'customer' || role === null) {
            console.log('🔍 Loading orders for user:', user.id);
            const userOrders = await getOrdersByUserId(user.id);
            console.log('🔍 User orders loaded:', userOrders);
            
            // 상태 필터링
            let filteredOrders = userOrders;
            if (currentStatus) {
              filteredOrders = userOrders.filter(order => order.status === currentStatus);
            }
            setOrders(filteredOrders);
          } else {
            console.log('🔍 Unknown role:', role);
          }
        } else {
          console.log('🔍 No user found in useEffect');
        }
      } catch (error) {
        console.error('Error getting user and orders:', error);
      } finally {
        setLoading(false);
      }
    };
    getUserAndOrders();
  }, []); // 의존성 배열을 비워서 한 번만 실행

  // 주문 취소 핸들러
  const handleOrderCancel = async (order: any) => {
    try {
      console.log('❌ Cancelling order:', order.id);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) {
        console.error('Cancel order error:', error);
        alert('주문 취소에 실패했습니다.');
        return;
      }

      console.log('Order cancelled successfully:', order.id);
      
      // 즉시 로컬 상태 업데이트
      setOrders((prevOrders: any[]) => {
        const updatedOrders = prevOrders.map((o: any) => 
          o.id === order.id 
            ? { ...o, status: 'cancelled', updated_at: new Date().toISOString() }
            : o
        );
        console.log('Immediately updated orders state after cancellation:', updatedOrders);
        return updatedOrders;
      });
      
      // 취소 알림 생성 (고객에게만) - 별도 try-catch로 감싸기
      if (order.user_id) {
        try {
          console.log('📱 Creating cancellation notification for user:', order.user_id);
          
          const orderTime = new Date(order.created_at).toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          const menuNames = order.order_items?.map((item: any) => 
            `${item.menu?.name} ${item.quantity}개`
          ).join(', ') || '주문 메뉴';
          
          const message = `${order.customer_name}이/가 ${orderTime}에 주문하신 ${menuNames}가 취소되었습니다`;
          
          console.log('📝 Cancellation notification message:', message);
          
          await createNotification({
            user_id: order.user_id,
            order_id: order.id,
            type: 'order_cancelled',
            message
          });
          
          console.log('✅ Cancellation notification completed');
        } catch (notificationError) {
          console.error('❌ Notification creation failed:', notificationError);
          // 알림 생성 실패는 주문 취소 실패로 처리하지 않음
        }
      }
      
      // 주문 취소 성공 메시지
      alert('주문이 성공적으로 취소되었습니다.');
      
    } catch (error) {
      console.error('Order cancel error:', error);
      alert('주문 취소에 실패했습니다.');
    }
  };

  // Supabase Realtime: 주문 실시간 업데이트 (관리자: 전체, 고객: 본인 주문만)
  useEffect(() => {
    if (loading || !userRoleState || (!user && userRoleState !== 'admin')) {
      // 구독 해제
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
        console.log('🔌 Realtime subscription cleaned up (조건 불충족)');
      }
      return;
    }

    // 기존 구독 해제
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
      console.log('🔌 Realtime subscription cleaned up (재설정)');
    }

    console.log('🔄 Setting up realtime subscription...', { userRole: userRoleState, userId: user?.id });

    const channel = supabase
      .channel(`orders-realtime-${userRoleState}-${user?.id || 'admin'}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: userRoleState !== 'admin' ? `user_id=eq.${user.id}` : undefined,
      }, async (payload) => {
        console.log('📦 New order received:', payload.new);
        const newOrder = payload.new;
        if (userRoleState === 'admin') {
          setNewOrderAlert({
            customer: newOrder.customer_name,
            church: newOrder.church_group || '',
          });
        } else if (userRoleState === 'customer' && newOrder.user_id === user?.id) {
          setNewOrderAlert({
            customer: newOrder.customer_name,
            church: newOrder.church_group || '',
            message: '주문이 완료되었습니다',
            status: 'pending'
          });
        }
        try {
          const { data: orderWithItems } = await supabase
            .from('orders')
            .select(`*, order_items (*, menu:menus (*))`)
            .eq('id', newOrder.id)
            .single();
          if (orderWithItems) {
            setOrders((prevOrders: any[]) => {
              const exists = prevOrders.find(o => o.id === orderWithItems.id);
              if (exists) return prevOrders;
              return [orderWithItems, ...prevOrders];
            });
          }
        } catch (error) {
          console.error('❌ Error fetching new order details:', error);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: userRoleState !== 'admin' ? `user_id=eq.${user.id}` : undefined,
      }, async (payload) => {
        console.log('🔄 Order updated:', payload.new);
        const updatedOrder = payload.new;
        try {
          const { data: orderWithItems } = await supabase
            .from('orders')
            .select(`*, order_items (*, menu:menus (*))`)
            .eq('id', updatedOrder.id)
            .single();
          if (orderWithItems) {
            // prevOrder를 setOrders 이전에 찾는다
            let prevOrder: any = null;
            setOrders((prevOrders: any[]) => {
              prevOrder = prevOrders.find((o: any) => o.id === updatedOrder.id);
              return prevOrders.map((order: any) =>
                order.id === updatedOrder.id ? orderWithItems : order
              );
            });
            // 상태변경 팝업 알림 (고객)
            if (userRoleState === 'customer' && user?.id === orderWithItems.user_id && prevOrder) {
              const prevStatus = prevOrder.status;
              const currStatus = orderWithItems.status;
              let alertMsg = '';
              let alertStatus: OrderStatus | null = null;
              if (prevStatus === 'pending' && currStatus === 'preparing') {
                alertMsg = '주문하신 주문이 제조중입니다';
                alertStatus = 'preparing';
              } else if (prevStatus === 'preparing' && currStatus === 'ready') {
                alertMsg = '주문하신 주문이 제조완료되었습니다';
                alertStatus = 'ready';
              } else if (prevStatus === 'ready' && currStatus === 'completed') {
                alertMsg = '주문하신 주문이 픽업되었습니다';
                alertStatus = 'completed';
              } else if (
                prevStatus === 'completed' &&
                orderWithItems.payment_status === 'confirmed' &&
                prevOrder.payment_status !== 'confirmed'
              ) {
                alertMsg = '주문하신 주문이 결제완료되었습니다';
                alertStatus = 'completed';
              }
              if (alertMsg && alertStatus) {
                setNewOrderAlert({
                  customer: '',
                  church: '',
                  message: alertMsg,
                  status: alertStatus
                });
                if (alertTimeout.current) clearTimeout(alertTimeout.current);
                alertTimeout.current = setTimeout(() => setNewOrderAlert(null), 5000);
              }
            }
          }
        } catch (error) {
          console.error('❌ Error fetching updated order details:', error);
          setOrders((prevOrders: any[]) =>
            prevOrders.map((order: any) =>
              order.id === updatedOrder.id ? { ...order, ...updatedOrder } : order
          ));
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'orders',
        filter: userRoleState !== 'admin' ? `user_id=eq.${user.id}` : undefined,
      }, (payload) => {
        console.log('🗑️ Order deleted:', payload.old);
        const deletedOrderId = payload.old.id;
        setOrders((prevOrders: any[]) =>
          prevOrders.filter((order: any) => order.id !== deletedOrderId)
        );
      });

    channel.subscribe((status) => {
      console.log('📡 Realtime subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Realtime subscription active');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime subscription failed');
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
        console.log('🔌 Realtime subscription cleaned up (useEffect cleanup)');
      }
      if (alertTimeout.current) clearTimeout(alertTimeout.current);
    };
  }, [userRoleState, user, loading]);

  // Debug: Log current orders state
  useEffect(() => {
    console.log('Current orders state:', orders);
    console.log('Filtered orders:', filteredOrders);
    console.log('Selected status:', selectedStatus);
    console.log('User info:', { 
      userId: user?.id, 
      userEmail: user?.email,
      userRole,
      isAdmin: userRole === 'admin'
    });
    
    // 각 주문의 취소 가능 여부 확인
    filteredOrders.forEach(order => {
      const isAdminUser = userRole === 'admin';
      const isOwnOrder = order.user_id === user?.id;
      const canCancel = order.status === 'pending' && (
        isAdminUser || (!isAdminUser && isOwnOrder)
      );
      
      console.log(`🔍 Order ${order.id} cancel check:`, {
        orderId: order.id,
        orderStatus: order.status,
        orderUserId: order.user_id,
        orderCustomerName: order.customer_name,
        currentUserId: user?.id,
        currentUserEmail: user?.email,
        isAdmin: isAdminUser,
        isOwnOrder,
        canCancel,
        cancelButtonShouldShow: canCancel,
        // 상세 비교 정보
        userIdComparison: {
          orderUserId: order.user_id,
          currentUserId: user?.id,
          areEqual: order.user_id === user?.id,
          orderUserIdType: typeof order.user_id,
          currentUserIdType: typeof user?.id
        }
      });
    });
  }, [orders, filteredOrders, selectedStatus, user, userRole]);

  const getStatusColor = (status: OrderStatus) => {
    return statusOptions.find(option => option.value === status)?.color || 'text-gray-800';
  };

  const getStatusBgColor = (status: OrderStatus) => {
    return statusOptions.find(option => option.value === status)?.bgColor || 'bg-gray-100';
  };

  const getStatusLabel = (status: OrderStatus) => {
    return statusOptions.find(option => option.value === status)?.label || status;
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      console.log('Updating order status:', orderId, 'to', newStatus);
      
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Update status error:', error);
        alert('상태 업데이트에 실패했습니다.');
      } else {
        console.log('Status updated successfully:', orderId, 'to', newStatus);
        
        // 실시간 업데이트 대신 즉시 로컬 상태 업데이트
        setOrders((prevOrders: any[]) => {
          const updatedOrders = prevOrders.map((order: any) => 
            order.id === orderId 
              ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
              : order
          );
          console.log('Immediately updated orders state:', updatedOrders);
          return updatedOrders;
        });
      }
    } catch (error) {
      console.error('Status change error:', error);
      alert('상태 업데이트에 실패했습니다.');
    }
  };

  const handlePaymentConfirm = async (order: any) => {
    try {
      console.log('💳 Payment confirm:', { orderId: order.id, hasUserId: !!order.user_id });
      // 결제 상태 업데이트
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) {
        console.error('Update payment status error:', error);
        alert('결제 상태 업데이트에 실패했습니다.');
        return;
      }
      // 즉시 로컬 상태 업데이트
      setOrders((prevOrders: any[]) => {
        const updatedOrders = prevOrders.map((o: any) => 
          o.id === order.id 
            ? { ...o, payment_status: 'confirmed', updated_at: new Date().toISOString() }
            : o
        );
        console.log('Immediately updated payment status:', updatedOrders);
        return updatedOrders;
      });
      // 결제완료 알림 생성 (실패해도 팝업 띄우지 않음)
      if (order.user_id) {
        try {
          console.log('📱 Creating payment notification for user:', order.user_id);
          const orderTime = new Date(order.created_at).toLocaleString('ko-KR', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          const menuNames = order.order_items?.map((item: any) => 
            `${item.menu?.name} ${item.quantity}개`
          ).join(', ') || '주문 메뉴';
          const message = `${order.customer_name}이/가 ${orderTime}에 주문하신 ${menuNames}가 결제완료 상태입니다`;
          console.log('📝 Payment notification message:', message);
          await createNotification({
            user_id: order.user_id,
            order_id: order.id,
            type: 'order_payment_confirmed',
            message
          });
          console.log('✅ Payment notification completed');
        } catch (notificationError) {
          console.error('❌ Payment notification creation failed:', notificationError);
          // 알림 생성 실패는 팝업 띄우지 않음
        }
      } else {
        console.log('⚠️ No payment notification created - user_id missing');
      }
    } catch (error) {
      console.error('Payment confirm with notification error:', error);
      alert('결제 상태 업데이트에 실패했습니다.');
    }
  };

  // 상태 변경 핸들러 (알림 포함)
  const handleStatusChangeWithNotification = async (order: any, newStatus: OrderStatus) => {
    try {
      console.log('🔄 Status change with notification:', { orderId: order.id, newStatus, hasUserId: !!order.user_id });
      
      await handleStatusChange(order.id, newStatus);
      
      // 알림 생성 (고객에게만)
      if (order.user_id && ['preparing', 'ready', 'completed'].includes(newStatus)) {
        console.log('📱 Creating notification for user:', order.user_id);
        
        const statusMessages: Record<string, string> = {
          'preparing': '제조중',
          'ready': '제조완료',
          'completed': '픽업완료'
        };
        
        const orderTime = new Date(order.created_at).toLocaleString('ko-KR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit'
        });
        
        // 주문 메뉴 목록 생성
        const menuNames = order.order_items?.map((item: any) => 
          `${item.menu?.name} ${item.quantity}개`
        ).join(', ') || '주문 메뉴';
        
        const message = `${order.customer_name}이/가 ${orderTime}에 주문하신 ${menuNames}가 ${statusMessages[newStatus]} 상태입니다`;
        
        console.log('📝 Notification message:', message);
        
        await createNotification({
          user_id: order.user_id,
          order_id: order.id,
          type: `order_${newStatus}`,
          message
        });
        
        console.log('✅ Status change notification completed');
      } else {
        console.log('⚠️ No notification created - user_id missing or status not eligible:', { 
          hasUserId: !!order.user_id, 
          status: newStatus, 
          eligibleStatuses: ['preparing', 'ready', 'completed'] 
        });
      }
    } catch (error) {
      console.error('❌ Status change with notification error:', error);
    }
  };

  const isAdmin = userRoleState === 'admin';

  // 필터 버튼 클릭 핸들러
  const handleFilterClick = (btn: typeof statusButtons[number]) => {
    if (btn.key === 'payment_confirmed') {
      setSelectedStatus('');
      navigate('?payment_status=confirmed');
    } else if (btn.key === 'all') {
      setSelectedStatus('');
      navigate('');
    } else {
      setSelectedStatus(btn.key === 'cancelled' ? 'cancelled' : btn.key as OrderStatus);
      navigate('?status=' + btn.key);
    }
  };

  // 페이지 변경 시 스크롤 맨 위로 이동
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

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
          <div className="flex gap-2 sm:gap-3 items-center justify-center overflow-x-auto">
            {statusButtons
              .filter(btn => isAdmin || btn.key !== 'payment_confirmed') // 고객은 결제완료 필터 제거
              .map(btn => (
              <button
                key={btn.key}
                onClick={() => handleFilterClick(btn)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 shadow-soft hover:shadow-medium transform hover:-translate-y-1 ${
                  (btn.key === 'payment_confirmed' && currentPaymentStatus === 'confirmed') ||
                  (btn.key === 'all' && !selectedStatus && !currentPaymentStatus) ||
                  (btn.key !== 'payment_confirmed' && btn.key !== 'all' && selectedStatus === btn.key)
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
                <th className="px-2 py-2">주문자</th>
                <th className="px-2 py-2">상태</th>
                <th className="px-2 py-2">주문시간</th>
                <th className="px-2 py-2">주문메뉴</th>
                <th className="px-2 py-2">총금액</th>
                {isAdmin && <th className="px-2 py-2">상태변경</th>}
                <th className="px-2 py-2">취소</th>
                {isAdmin && <th className="px-2 py-2">삭제</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order, idx) => (
                <tr key={order.id} className="bg-ivory-50 border-b-4 border-dashed border-wine-600">
                  {/* 연번 */}
                  <td className="align-middle font-bold text-wine-700">{(currentPage - 1) * ORDERS_PER_PAGE + idx + 1}</td>
                  {/* 주문자 */}
                  <td className="align-middle">
                    <div className="font-bold text-wine-800">{order.customer_name}</div>
                    {order.church_group && (
                      <div className="text-xs text-wine-600">{order.church_group}</div>
                    )}
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
                       order.status === 'completed' && order.payment_status === 'confirmed' ? '결제완료' :
                       order.status === 'completed' ? '픽업완료' :
                       order.status === 'cancelled' ? '취소' : order.status}
                    </span>
                  </td>
                  {/* 주문시간 */}
                  <td className="align-middle text-xs text-wine-700">
                    <div>{new Date(order.created_at).toLocaleDateString('ko-KR')}</div>
                    <div>{new Date(order.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  {/* 주문메뉴(여러 행) */}
                  <td className="align-middle">
                    <div className="flex flex-col gap-1 items-center">
                      {order.order_items?.map((item: any) => (
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
                  {isAdmin && (
                    <td className="align-middle">
                      <div className="flex flex-col gap-1">
                        {order.status === 'pending' && (
                          <button
                            className="px-3 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition"
                            onClick={() => handleStatusChangeWithNotification(order, 'preparing')}
                          >
                            제조시작
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            className="px-3 py-2 bg-green-600 text-white rounded text-xs font-bold hover:bg-green-700 transition"
                            onClick={() => handleStatusChangeWithNotification(order, 'ready')}
                          >
                            제조완료
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button
                            className="px-3 py-2 bg-wine-600 text-white rounded text-xs font-bold hover:bg-wine-700 transition"
                            onClick={() => handleStatusChangeWithNotification(order, 'completed')}
                          >
                            픽업완료
                          </button>
                        )}
                        {order.status === 'completed' && order.payment_status !== 'confirmed' && (
                          <button
                            className="px-3 py-2 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 transition"
                            onClick={() => handlePaymentConfirm(order)}
                          >
                            결제완료
                          </button>
                        )}
                        {((order.status === 'completed' && order.payment_status === 'confirmed') || order.status === 'cancelled') && (
                          <span className="text-xs text-gray-500 font-medium">주문종료</span>
                        )}
                      </div>
                    </td>
                  )}
                  {/* 주문취소버튼 */}
                  <td className="align-middle">
                    {/* 관리자: 대기 상태 주문만 취소 가능 */}
                    {isAdmin && order.status === 'pending' && (
                      <button
                        className="px-3 py-2 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 transition"
                        onClick={() => handleOrderCancel(order)}
                      >
                        주문취소
                      </button>
                    )}
                    {/* 고객: 본인 주문이고 대기 상태일 때만 취소 가능 */}
                    {!isAdmin && order.user_id === user?.id && order.status === 'pending' && (
                      <button
                        className="px-3 py-2 bg-red-600 text-white rounded text-xs font-bold hover:bg-red-700 transition"
                        onClick={() => handleOrderCancel(order)}
                      >
                        주문취소
                      </button>
                    )}
                    {/* 취소된 주문 표시 */}
                    {order.status === 'cancelled' && (
                      <span className="text-xs text-red-600 font-medium">취소됨</span>
                    )}
                    {/* 취소 불가능한 상태 표시 */}
                    {order.status !== 'pending' && order.status !== 'cancelled' && (
                      <span className="text-xs text-gray-500 font-medium">취소불가</span>
                    )}
                    {/* 디버깅: 조건이 맞지 않을 때 표시 */}
                    {order.status === 'pending' && !isAdmin && order.user_id !== user?.id && (
                      <span className="text-xs text-orange-600 font-medium">본인주문아님</span>
                    )}
                  </td>
                  {/* 삭제 버튼 (관리자만) */}
                  {isAdmin && (
                    <td className="align-middle">
                      <button
                        className="px-2 py-1 bg-red-400 text-white rounded-full text-xs font-bold hover:bg-red-600 transition"
                        title="주문 강제 삭제"
                        onClick={async () => {
                          if (window.confirm('정말로 이 주문을 완전히 삭제하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) {
                            try {
                              // 먼저 order_items 삭제
                              const { error: itemsError } = await supabase
                                .from('order_items')
                                .delete()
                                .eq('order_id', order.id);
                              
                              if (itemsError) {
                                alert('주문 아이템 삭제에 실패했습니다: ' + itemsError.message);
                                return;
                              }
                              
                              // 그 다음 orders 삭제
                              const { error: orderError } = await supabase
                                .from('orders')
                                .delete()
                                .eq('id', order.id);
                              
                              if (orderError) {
                                alert('주문 삭제에 실패했습니다: ' + orderError.message);
                              } else {
                                setOrders(prev => prev.filter(o => o.id !== order.id));
                                alert('주문이 성공적으로 삭제되었습니다.');
                              }
                            } catch (err) {
                              alert('삭제 중 오류 발생: ' + err);
                            }
                          }
                        }}
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {paginatedOrders.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="py-8 text-wine-400 text-lg">주문이 없습니다.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* 페이지네이션 컨트롤 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6">
            <button
              className="px-3 py-1 rounded bg-ivory-200 text-wine-700 font-bold disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              이전
            </button>
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i + 1}
                className={`px-3 py-1 rounded font-bold ${currentPage === i + 1 ? 'bg-wine-600 text-ivory-50' : 'bg-ivory-100 text-wine-700'}`}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
            <button
              className="px-3 py-1 rounded bg-ivory-200 text-wine-700 font-bold disabled:opacity-50"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              다음
            </button>
          </div>
        )}
      </main>

      {/* 새 주문 알림 배너 (관리자/고객) */}
      {newOrderAlert && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99999] px-6 py-4 rounded-xl shadow-2xl font-bold text-lg flex items-center gap-4 cursor-pointer animate-fade-in ${getStatusBgColor(newOrderAlert.status || 'pending')} ${getStatusColor(newOrderAlert.status || 'pending')}`}
          onClick={() => setNewOrderAlert(null)}
        >
          <span>🛎️</span>
          <span>
            {newOrderAlert.message ? (
              <span>{newOrderAlert.message}</span>
            ) : (
              <>
                <span className="text-yellow-700 font-bold">{newOrderAlert.church || '새'}</span> 주문이 들어왔습니다!<br />
              </>
            )}
          </span>
        </div>
      )}
    </div>
  );
} 