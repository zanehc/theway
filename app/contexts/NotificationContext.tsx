import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '~/lib/supabase';
import type { OrderStatus } from '~/types';

interface NotificationContextType {
  showNotification: (message: string, status?: OrderStatus) => void;
  hideNotification: () => void;
  notification: { message: string; status?: OrderStatus } | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<{ message: string; status?: OrderStatus } | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showNotification = (message: string, status?: OrderStatus) => {
    console.log('🔔 showNotification called:', message, status);
    setNotification({ message, status });
    
    // 기존 타임아웃 클리어
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 5초 후 자동으로 숨기기
    timeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 5000);
  };

  const hideNotification = () => {
    setNotification(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  // 전역 주문 알림 구독
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = userData?.role;

      // 관리자용 새 주문 알림 구독
      if (role === 'admin') {
        console.log('🔔 Setting up admin new order notifications');
        const adminChannel = supabase
          .channel('admin-new-order-notifications')
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
          }, (payload) => {
            console.log('🔔 Admin received new order:', payload.new);
            const newOrder = payload.new;
            const message = `${newOrder.church_group || '새'} 주문이 들어왔습니다!`;
            showNotification(message, 'pending');
          })
          .subscribe((status) => {
            console.log('🔔 Admin notification channel status:', status);
          });

        return () => {
          console.log('🔔 Cleaning up admin notification channel');
          adminChannel.unsubscribe();
        };
      }

      // 고객용 주문 상태 변경 알림 구독
      if (role === 'customer') {
        console.log('🔔 Setting up customer order status notifications');
        const customerChannel = supabase
          .channel('customer-order-status-notifications')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `user_id=eq.${user.id}`,
          }, async (payload) => {
            console.log('🔔 Customer received order update:', payload);
            const updatedOrder = payload.new;
            const oldOrder = payload.old;
            
            if (!oldOrder || !updatedOrder) return;

            const prevStatus = oldOrder.status;
            const currStatus = updatedOrder.status;
            
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
              updatedOrder.payment_status === 'confirmed' &&
              oldOrder.payment_status !== 'confirmed'
            ) {
              alertMsg = '주문하신 주문이 결제완료되었습니다';
              alertStatus = 'completed';
            }

            if (alertMsg && alertStatus) {
              console.log('🔔 Showing customer notification:', alertMsg, alertStatus);
              showNotification(alertMsg, alertStatus);
            }
          })
          .subscribe((status) => {
            console.log('🔔 Customer notification channel status:', status);
          });

        return () => {
          console.log('🔔 Cleaning up customer notification channel');
          customerChannel.unsubscribe();
        };
      }
    };

    getUser();
  }, []);

  // 컴포넌트 언마운트 시 타임아웃 클리어
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, hideNotification, notification }}>
      {children}
      
      {/* 전역 알림 배너 */}
      {notification && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99999] px-6 py-4 rounded-xl shadow-2xl font-bold text-lg flex items-center gap-4 cursor-pointer animate-fade-in ${
            notification.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            notification.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
            notification.status === 'ready' ? 'bg-green-100 text-green-800' :
            notification.status === 'completed' ? 'bg-wine-100 text-wine-800' :
            notification.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-wine-100 text-wine-800'
          }`}
          onClick={hideNotification}
        >
          <span>🛎️</span>
          <span>{notification.message}</span>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
} 