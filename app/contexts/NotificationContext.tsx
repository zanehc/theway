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
  addToast: (message: string, type?: 'info' | 'success' | 'warning' | 'error', options?: { speak?: boolean }) => void;
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

function getKoreanVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(voice => voice.lang.includes('ko') || voice.lang.includes('KR'));
}

function speakText(text: string, options?: { rate?: number; pitch?: number; volume?: number }) {
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();

    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = options?.rate ?? 0.85;
    utterance.pitch = options?.pitch ?? 1.05;
    utterance.volume = options?.volume ?? 1;

    const koreanVoice = getKoreanVoice();
    if (koreanVoice) {
      utterance.voice = koreanVoice;
      console.log('🎵 TTS - 한국어 음성 사용:', koreanVoice.name);
    }

    utterance.onerror = (event) => {
      console.error('TTS 오류:', event.error);
    };

    utterance.onstart = () => {
      console.log('🎵 TTS 시작:', text);
    };

    utterance.onend = () => {
      console.log('🎵 TTS 완료');
    };

    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 100);
  } catch (error) {
    console.warn('TTS speakText 실패:', error);
  }
}

function playOrderChime() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const audioContext = new AudioContextClass();
    const masterGain = audioContext.createGain();
    masterGain.connect(audioContext.destination);
    masterGain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.32, audioContext.currentTime + 0.02);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 1.05);

    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = audioContext.currentTime + index * 0.16;
      const end = start + 0.34;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.36, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      oscillator.connect(gain);
      gain.connect(masterGain);
      oscillator.start(start);
      oscillator.stop(end);
    });
  } catch (error) {
    console.warn('주문 알림음 재생 실패:', error);
  }
}

function playNewOrderAlert() {
  playOrderChime();

  const speakOrderMessage = () => {
    speakText('이음카페 주문!', { rate: 0.82, pitch: 1.12, volume: 1 });
  };

  if ('speechSynthesis' in window && window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', speakOrderMessage, { once: true });
    return;
  }

  speakOrderMessage();
}

export function NotificationProvider({ children, userId, userRole }: NotificationProviderProps) {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [ttsInitialized, setTtsInitialized] = useState(false);

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info', options?: { speak?: boolean }) => {
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

    if (options?.speak === false) {
      return;
    }

    // TTS 음성 알림 (iOS Safari 호환성 개선)
    if ('speechSynthesis' in window) {
      try {
        // iOS에서 speechSynthesis 초기화
        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.addEventListener('voiceschanged', () => {
            speakText(message);
          });
        } else {
          speakText(message);
        }
      } catch (error) {
        console.warn('TTS 재생 실패:', error);
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
    if (userRole !== 'admin' && userRole !== 'staff') return;

    const unlockAudio = () => {
      initializeTTS();
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, [userRole, initializeTTS]);

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
            if (notification.type === 'new_order') {
              playNewOrderAlert();
              addToast(notification.message, getToastTypeForNotification(notification.type), { speak: false });
            } else {
              addToast(notification.message, getToastTypeForNotification(notification.type));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
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
