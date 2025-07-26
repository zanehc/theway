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
    if (!userId) {
      console.log('🔔 NotificationProvider: userId is missing, skipping subscription.');
      return;
    }

    const channelId = `notifications-for-user-${userId}`;
    console.log(`🔔 Setting up notification subscription on channel: ${channelId}`);

    const channel = supabase
      .channel(channelId, {
        config: {
          broadcast: {
            self: true,
          },
        },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 Notification received:', payload);
          const notification = payload.new;
          
          let toastType: 'info' | 'success' | 'warning' | 'error' = 'info';
          if (notification.type && ['info', 'success', 'warning', 'error'].includes(notification.type)) {
            toastType = notification.type;
          }
          
          addToast(notification.message, toastType);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`🔔 Successfully subscribed to ${channelId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`🔔 Subscription error on channel ${channelId}:`, err);
        }
        if (status === 'TIMED_OUT') {
          console.warn(`🔔 Subscription timed out on channel ${channelId}`);
        }
      });

    return () => {
      console.log(`🔔 Unsubscribing from channel: ${channelId}`);
      supabase.removeChannel(channel);
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