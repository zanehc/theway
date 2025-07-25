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
}

export function NotificationProvider({ children, userId }: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastNotification = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };
    
    setToasts(prev => [newToast, ...prev]);
    
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

  // 실시간 알림 구독 - 모든 탭에서 작동
  useEffect(() => {
    if (!userId) return;

    console.log('🔔 Setting up global notification subscription for user:', userId);

    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 Global notification received:', payload);
          const notification = payload.new;
          
          // 알림 타입에 따른 토스트 타입 결정
          let toastType: 'info' | 'success' | 'warning' | 'error' = 'info';
          switch (notification.type) {
            case 'new_order':
              toastType = 'info';
              break;
            case 'order_status':
              toastType = 'success';
              break;
            case 'payment_confirmed':
              toastType = 'success';
              break;
            case 'order_confirmation':
              toastType = 'success';
              break;
            default:
              toastType = 'info';
          }
          
          addToast(notification.message, toastType);
        }
      )
      .subscribe();

    return () => {
      console.log('🔔 Unsubscribing from global notifications');
      channel.unsubscribe();
    };
  }, [userId]);

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