import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '~/lib/supabase';

interface ToastNotification {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: number;
}

interface DbNotification {
  id: string;
  user_id: string;
  order_id: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
}

function getToastTypeForNotification(notificationType: string): ToastNotification['type'] {
  switch (notificationType) {
    case 'order_cancelled':
      return 'warning';
    case 'payment_confirmed':
      return 'info';
    case 'order_status':
      return 'success';
    default:
      return 'info';
  }
}

interface NotificationContextType {
  toasts: ToastNotification[];
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  showNotification: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  removeToast: (id: string) => void;
  clearAllToasts: () => void;
  initializeTTS: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  userId?: string;
  userRole?: string | null;
}

export function NotificationProvider({ children, userId, userRole }: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [ttsInitialized, setTtsInitialized] = useState(false);

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
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

    // TTS 음성 알림 (iOS Safari 호환성 개선)
    if ('speechSynthesis' in window) {
      try {
        // iOS에서 speechSynthesis 초기화
        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.addEventListener('voiceschanged', () => {
            speakMessage(message);
          });
        } else {
          speakMessage(message);
        }
      } catch (error) {
        console.warn('TTS 재생 실패:', error);
      }
    }

    function speakMessage(text: string) {
      try {
        // 기존 음성 정지
        window.speechSynthesis.cancel();

        const utterance = new window.SpeechSynthesisUtterance(text);

        // iOS Safari 최적화 설정
        utterance.lang = 'ko-KR';
        utterance.rate = 0.8; // iOS에서 좀 더 느리게
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // iOS에서 한국어 음성 찾기
        const voices = window.speechSynthesis.getVoices();
        const koreanVoice = voices.find(voice =>
          voice.lang.includes('ko') || voice.lang.includes('KR')
        );
        if (koreanVoice) {
          utterance.voice = koreanVoice;
          console.log('🎵 TTS - 한국어 음성 사용:', koreanVoice.name);
        }

        // 에러 핸들링
        utterance.onerror = (event) => {
          console.error('TTS 오류:', event.error);
        };

        utterance.onstart = () => {
          console.log('🎵 TTS 시작:', text);
        };

        utterance.onend = () => {
          console.log('🎵 TTS 완료');
        };

        // iOS에서 약간의 지연 후 재생
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 100);

      } catch (error) {
        console.warn('TTS speakMessage 실패:', error);
      }
    }
  }, [userId, userRole]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // showNotification은 addToast의 별칭 (더 직관적인 이름)
  const showNotification = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    addToast(message, type);
  }, [addToast]);

  // TTS 초기화 (사용자 제스처 필요 시)
  const initializeTTS = useCallback(() => {
    if ('speechSynthesis' in window && !ttsInitialized) {
      try {
        // 빈 텍스트로 TTS 테스트 (iOS에서 권한 요청)
        const testUtterance = new window.SpeechSynthesisUtterance('');
        testUtterance.volume = 0;
        window.speechSynthesis.speak(testUtterance);
        setTtsInitialized(true);
        console.log('🎵 TTS 초기화 완료');
      } catch (error) {
        console.warn('TTS 초기화 실패:', error);
      }
    }
  }, [ttsInitialized]);

  useEffect(() => {
    console.log('🔔 NotificationContext - useEffect 실행:', { userId, userRole });
    if (!userId) {
      console.log('🔔 NotificationContext - userId 없음, 구독 건너뜀');
      return;
    }

    console.log('🔔 NotificationContext - 실시간 알림 구독 시작');
    const notificationsChannel = supabase
      .channel(`notifications-toast-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as DbNotification;
          console.log('🔔 NotificationContext - 알림 이벤트 수신:', notification);
          window.dispatchEvent(new CustomEvent('theway:order-notification', { detail: notification }));
          if (userRole === 'admin' || userRole === 'staff') {
            addToast(notification.message, getToastTypeForNotification(notification.type));
          }
        }
      )
      .subscribe();

    const ordersChannel = userRole === 'admin' || userRole === 'staff'
      ? supabase
        .channel(`orders-admin-toast-${userId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload) => {
            const newOrder = payload.new as any;
            console.log('🔔 NotificationContext - 새 주문:', { newOrder, userRole });
            const group = newOrder.church_group ? ` · ${newOrder.church_group}` : '';
            const amount = newOrder.total_amount ? ` · ${Number(newOrder.total_amount).toLocaleString()}원` : '';
            addToast(`새 주문! ${newOrder.customer_name}${group}${amount}`, 'info');
          }
        )
        .subscribe()
      : null;

    return () => {
      supabase.removeChannel(notificationsChannel);
      if (ordersChannel) {
        supabase.removeChannel(ordersChannel);
      }
    };
  }, [userId, userRole, addToast]);

  return (
    <NotificationContext.Provider value={{ toasts, addToast, showNotification, removeToast, clearAllToasts, initializeTTS }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    // SSR이나 Context 초기화 중에는 기본값 반환
    console.warn('useNotifications called outside of NotificationProvider, returning default values');
    return {
      toasts: [],
      addToast: () => {},
      showNotification: () => {},
      removeToast: () => {},
      clearAllToasts: () => {},
      initializeTTS: () => {}
    };
  }
  return context;
}
