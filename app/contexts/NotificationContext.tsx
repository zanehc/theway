import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

  // 주문 상태를 명확한 한국어 메시지로 변환 (취소사유 포함)
  const getStatusMessage = (status: string, cancellationReason?: string) => {
    switch (status) {
      case 'pending':
        return '주문이 접수되었습니다';
      case 'preparing':
        return '주문 상태가 제조중으로 변경되었습니다';
      case 'ready':
        return '주문 상태가 제조완료로 변경되었습니다';
      case 'completed':
        return '주문 상태가 픽업완료로 변경되었습니다';
      case 'cancelled':
        return cancellationReason 
          ? `주문이 취소되었습니다.\n취소 사유: ${cancellationReason}`
          : '주문이 취소되었습니다';
      default:
        return `주문 상태가 ${status}로 변경되었습니다`;
    }
  };

  // 결제 상태 메시지
  const getPaymentMessage = (paymentStatus: string) => {
    switch (paymentStatus) {
      case 'confirmed':
        return '주문이 결제완료되었습니다';
      case 'pending':
        return null; // 결제 대기 중 알림은 표시하지 않음
      default:
        return `결제 상태가 ${paymentStatus}로 변경되었습니다`;
    }
  };

  const addToast = useCallback((message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastNotification = {
      id,
      message,
      type,
      timestamp: Date.now(),
    };

    setToasts(prev => [newToast, ...prev]);

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
        // TTS playback failed silently
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
        }

        // 에러 핸들링
        utterance.onerror = (event) => {
          console.error('TTS 오류:', event.error);
        };

        // iOS에서 약간의 지연 후 재생
        setTimeout(() => {
          window.speechSynthesis.speak(utterance);
        }, 100);

      } catch (error) {
        // TTS speakMessage failed silently
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
      } catch (error) {
        // TTS initialization failed silently
      }
    }
  }, [ttsInitialized]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const ordersChannel = supabase
      .channel('orders-realtime-for-all')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as any;
            if (userRole === 'admin') {
              addToast(`새 주문: ${newOrder.customer_name} (${newOrder.church_group})`, 'info');
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as any;
            const oldOrder = payload.old as any;

            // 결제 상태와 주문 상태가 동시에 변경되었는지 확인
            const paymentStatusChanged = oldOrder.payment_status !== updatedOrder.payment_status;
            const orderStatusChanged = oldOrder.status !== updatedOrder.status;
            
            // 픽업완료 버튼으로 인한 상태 변경 감지
            const isPickupCompleted = orderStatusChanged && 
              oldOrder.status === 'ready' && 
              updatedOrder.status === 'completed';
            
            // 결제확인 버튼으로 인한 상태 변경 감지
            const isPaymentConfirmed = paymentStatusChanged && 
              oldOrder.payment_status === 'pending' && 
              updatedOrder.payment_status === 'confirmed';
            
            // 픽업완료 처리 - 결제 상태가 동시에 변경되어도 픽업완료 알림만
            if (isPickupCompleted) {
              const statusMessage = getStatusMessage(
                updatedOrder.status, 
                updatedOrder.cancellation_reason
              );
              if (userRole === 'admin') {
                addToast(`[관리자] ${statusMessage}`, 'success');
              } else if (updatedOrder.user_id === userId) {
                addToast(statusMessage, 'success');
              }
            }
            // 결제확인 처리 - 주문 상태가 동시에 변경되어도 결제완료 알림만
            else if (isPaymentConfirmed) {
              const paymentMessage = getPaymentMessage(updatedOrder.payment_status);
              if (paymentMessage) {
                if (userRole === 'admin') {
                  addToast(`[관리자] ${paymentMessage}`, 'info');
                } else if (updatedOrder.user_id === userId) {
                  addToast(paymentMessage, 'info');
                }
              }
            }
            // 기타 주문 상태 변경 (취소, 제조중, 제조완료 등)
            else if (orderStatusChanged && !isPickupCompleted) {
              const statusMessage = getStatusMessage(
                updatedOrder.status, 
                updatedOrder.cancellation_reason
              );
              const toastType = updatedOrder.status === 'cancelled' ? 'warning' : 'success';
              
              if (userRole === 'admin') {
                addToast(`[관리자] ${statusMessage}`, toastType);
              } else if (updatedOrder.user_id === userId) {
                addToast(statusMessage, toastType);
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
    <NotificationContext.Provider value={{ toasts, addToast, showNotification, removeToast, clearAllToasts, initializeTTS }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    // SSR이나 Context 초기화 중에는 기본값 반환
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