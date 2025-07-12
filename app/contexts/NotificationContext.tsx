import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
            notification.status === 'completed' ? 'bg-purple-100 text-purple-800' :
            notification.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
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