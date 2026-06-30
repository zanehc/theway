import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  order_id: string | null;
  type: string;
  message: string;
  status: string;
  created_at: string;
}

function getToastTypeForNotification(notificationType: string): ToastNotification['type'] {
  switch (notificationType) {
    case 'order_cancelled':
      return 'warning';
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
let sharedAudioContext: AudioContext | null = null;

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

async function getUnlockedAudioContext() {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  try {
    if (!sharedAudioContext) {
      sharedAudioContext = new AudioContextClass();
    }

    if (sharedAudioContext.state === 'suspended') {
      await sharedAudioContext.resume();
    }

    return sharedAudioContext;
  } catch (error) {
    console.warn('오디오 컨텍스트 준비 실패:', error);
    return null;
  }
}

async function playOrderChime() {
  try {
    const audioContext = await getUnlockedAudioContext();
    if (!audioContext) return;

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
  const announcedOrderIdsRef = useRef<Map<string, number>>(new Map());

  const shouldAnnounceOrder = useCallback((orderId?: string | null) => {
    if (!orderId) return true;

    const now = Date.now();
    const recentIds = announcedOrderIdsRef.current;
    recentIds.forEach((timestamp, id) => {
      if (now - timestamp > 60_000) recentIds.delete(id);
    });

    if (recentIds.has(orderId)) return false;
    recentIds.set(orderId, now);
    return true;
  }, []);

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
    if (ttsInitialized) return;

    getUnlockedAudioContext();

    if ('speechSynthesis' in window) {
      try {
        const testUtterance = new window.SpeechSynthesisUtterance(' ');
        testUtterance.volume = 0;
        testUtterance.lang = 'ko-KR';
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

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
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

          if (notification.type === 'announcement') {
            addToast(notification.message, 'info');
            return;
          }

          // 쿠폰 발급 알림은 수신자에게 성공 토스트로 표시
          if (notification.type === 'coupon') {
            addToast(notification.message, 'success');
            return;
          }

          // 새 주문은 관리자/스태프에게만 소리 + 토스트 (중복 방지 가드)
          if (notification.type === 'new_order') {
            if ((userRole === 'admin' || userRole === 'staff') && shouldAnnounceOrder(notification.order_id)) {
              playNewOrderAlert();
              addToast(notification.message, getToastTypeForNotification(notification.type), { speak: false });
            }
            return;
          }

          // 그 외(order_status, order_confirmation, order_cancelled, group_order 등)는
          // 알림 수신자(고객·목원·관리자) 본인에게 인앱 토스트로 표시한다.
          addToast(notification.message, getToastTypeForNotification(notification.type));
        }
      )
      .subscribe();

    // 새 주문 소리/토스트는 notifications 채널의 new_order 분기 단일 소스로 처리한다.
    // (이전의 orders-insert-audio 채널은 중복 알림 방지를 위해 제거)

    return () => {
      supabase.removeChannel(notificationsChannel);
    };
  }, [userId, userRole, addToast, shouldAnnounceOrder]);

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
