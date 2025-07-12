import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    console.log('🔔 Current notification state:', notification);
    
    setNotification({ message, status });
    
    // 기존 타임아웃 클리어
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 5초 후 자동으로 숨기기
    timeoutRef.current = setTimeout(() => {
      console.log('🔔 Auto-hiding notification after 5 seconds');
      setNotification(null);
    }, 5000);
  };

  const hideNotification = () => {
    setNotification(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

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
      
      {/* 전역 알림 배너 - Portal 사용 */}
      {notification && typeof document !== 'undefined' && createPortal(
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[99999] px-6 py-4 rounded-xl shadow-2xl font-bold text-lg flex items-center gap-4 cursor-pointer animate-bounce ${
            notification.status === 'pending' ? 'bg-yellow-400 text-yellow-900 border-2 border-yellow-600' :
            notification.status === 'preparing' ? 'bg-blue-400 text-blue-900 border-2 border-blue-600' :
            notification.status === 'ready' ? 'bg-green-400 text-green-900 border-2 border-green-600' :
            notification.status === 'completed' ? 'bg-purple-400 text-purple-900 border-2 border-purple-600' :
            notification.status === 'cancelled' ? 'bg-red-400 text-red-900 border-2 border-red-600' :
            'bg-gray-400 text-gray-900 border-2 border-gray-600'
          }`}
          onClick={hideNotification}
        >
          <div className="flex items-center gap-2">
            {notification.status === 'pending' && <span>⏳</span>}
            {notification.status === 'preparing' && <span>👨‍🍳</span>}
            {notification.status === 'ready' && <span>✅</span>}
            {notification.status === 'completed' && <span>🎉</span>}
            {notification.status === 'cancelled' && <span>❌</span>}
            {!notification.status && <span>🔔</span>}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              hideNotification();
            }}
            className="text-gray-500 hover:text-gray-700 text-xl"
          >
            ×
          </button>
        </div>,
        document.body
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    // Provider가 없을 때는 기본값 반환 (에러 대신)
    console.warn('useNotification must be used within a NotificationProvider, returning default values');
    return {
      showNotification: (message: string, status?: OrderStatus) => {
        console.log('🔔 Notification not available:', message, status);
      },
      hideNotification: () => {
        console.log('🔔 Hide notification not available');
      },
      notification: null
    };
  }
  return context;
} 