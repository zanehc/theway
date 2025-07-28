import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '~/lib/supabase';

interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

interface NotificationContextType {
  toasts: ToastNotification[];
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string;
  userRole?: string | null;
}

export function NotificationProvider({ children, userId, userRole }: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    console.log('🔔 NotificationContext - 새 알림 추가:', { message, type, userId, userRole });
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastNotification = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };
    
    setToasts(prev => {
      const newToasts = [newToast, ...prev];
      console.log('🔔 NotificationContext - 업데이트된 toasts:', newToasts);
      return newToasts;
    });
    
    // TTS 음성 알림
    if ('speechSynthesis' in window) {
      const utterance = new window.SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  useEffect(() => {
    console.log('🔔 NotificationContext - useEffect 실행:', { userId, userRole });
    if (!userId) {
      console.log('🔔 NotificationContext - userId 없음, 구독 건너뜀');
      return;
    }

    console.log('🔔 NotificationContext - 주문 실시간 구독 시작');
    const ordersChannel = supabase
      .channel('orders-realtime-for-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('🔔 NotificationContext - 주문 이벤트 수신:', payload);
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as any;
            console.log('🔔 NotificationContext - 새 주문:', { newOrder, userRole });
            if (userRole === 'admin') {
              addToast(`새 주문: ${newOrder.customer_name} (${newOrder.church_group})`, 'info');
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as any;
            console.log('🔔 NotificationContext - 주문 업데이트:', { updatedOrder, oldStatus: payload.old.status, newStatus: updatedOrder.status, userRole, userId });
            if (payload.old.status !== updatedOrder.status) {
              if (userRole === 'admin') {
                addToast(`주문이 ${updatedOrder.status} 상태로 변경되었습니다.`, 'success');
              } else if (updatedOrder.user_id === userId) {
                addToast(`주문이 ${updatedOrder.status} 상태로 변경되었습니다.`, 'success');
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, [userId, userRole]);

  return (
    <NotificationContext.Provider value={{ toasts, addToast, removeToast, clearAllToasts }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}