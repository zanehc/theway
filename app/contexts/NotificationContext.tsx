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
            const oldOrder = payload.old as any;
            console.log('🔔 NotificationContext - 주문 업데이트:', { 
              updatedOrder, 
              oldStatus: oldOrder.status, 
              newStatus: updatedOrder.status,
              oldPaymentStatus: oldOrder.payment_status,
              newPaymentStatus: updatedOrder.payment_status,
              userRole, 
              userId 
            });
            
            // 결제 상태와 주문 상태가 동시에 변경되었는지 확인
            const paymentStatusChanged = oldOrder.payment_status !== updatedOrder.payment_status;
            const orderStatusChanged = oldOrder.status !== updatedOrder.status;
            
            console.log('🔔 NotificationContext - 상태 변경 감지:', {
              paymentStatusChanged,
              orderStatusChanged,
              oldPaymentStatus: oldOrder.payment_status,
              newPaymentStatus: updatedOrder.payment_status,
              oldOrderStatus: oldOrder.status,
              newOrderStatus: updatedOrder.status
            });
            
            // 주문 상태 변경 알림 우선 처리
            if (orderStatusChanged) {
              const statusMessage = getStatusMessage(
                updatedOrder.status, 
                updatedOrder.cancellation_reason
              );
              const toastType = updatedOrder.status === 'cancelled' ? 'warning' : 'success';
              
              console.log('📢 주문 상태 변경 알림 전송:', statusMessage);
              
              if (userRole === 'admin') {
                addToast(`[관리자] ${statusMessage}`, toastType);
              } else if (updatedOrder.user_id === userId) {
                addToast(statusMessage, toastType);
              }
            }
            // 결제 상태만 변경된 경우 (주문 상태가 변경되지 않은 경우에만)
            else if (paymentStatusChanged && !orderStatusChanged) {
              const paymentMessage = getPaymentMessage(updatedOrder.payment_status);
              if (paymentMessage) { // null이 아닐 때만 알림 표시
                console.log('💳 결제 상태 변경 알림 전송:', paymentMessage);
                
                if (userRole === 'admin') {
                  addToast(`[관리자] ${paymentMessage}`, 'info');
                } else if (updatedOrder.user_id === userId) {
                  addToast(paymentMessage, 'info');
                }
              }
            }
            
            // 동시 변경된 경우 로그
            if (paymentStatusChanged && orderStatusChanged) {
              console.log('⚡ 주문 상태와 결제 상태가 동시 변경됨 - 주문 상태 알림만 전송');
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
    // SSR이나 Context 초기화 중에는 기본값 반환
    console.warn('useNotifications called outside of NotificationProvider, returning default values');
    return {
      toasts: [],
      addToast: () => {},
      removeToast: () => {},
      clearAllToasts: () => {}
    };
  }
  return context;
}