import React from 'react';
import { useNotifications } from '~/contexts/NotificationContext';

export function GlobalToast() {
  try {
    const { toasts, removeToast, clearAllToasts } = useNotifications();

    if (!toasts || toasts.length === 0) return null;

    const getToastIcon = (type: string) => {
      switch (type) {
        case 'success':
          return '✅';
        case 'error':
          return '❌';
        case 'warning':
          return '⚠️';
        default:
          return '🔔';
      }
    };

    const getToastColors = (type: string) => {
      switch (type) {
        case 'success':
          return 'bg-green-100 border-green-400 text-green-800';
        case 'error':
          return 'bg-red-100 border-red-400 text-red-800';
        case 'warning':
          return 'bg-yellow-100 border-yellow-400 text-yellow-800';
        default:
          return 'bg-blue-100 border-blue-400 text-blue-800';
      }
    };

    const formatTime = (timestamp: number) => {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('ko-KR', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    };

    return (
      <div className="fixed top-4 right-4 z-[99999] space-y-2 max-w-sm">
        {/* 전체 닫기 버튼 (토스트가 2개 이상일 때만 표시) */}
        {toasts.length > 1 && (
          <div className="flex justify-end">
            <button
              onClick={clearAllToasts}
              className="text-xs bg-surface-dark text-white px-2 py-1 rounded-2xl hover:bg-charcoal transition-colors"
            >
              모두 닫기
            </button>
          </div>
        )}
        
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`border rounded-2xl  p-4 transition-all duration-300 transform animate-slide-in-right ${getToastColors(toast.type)}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {getToastIcon(toast.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-relaxed">
                    {toast.message}
                  </p>
                  <p className="text-xs opacity-75 mt-1">
                    {formatTime(toast.timestamp)}
                  </p>
                </div>
              </div>
              
              {/* 확인 버튼 */}
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 ml-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-2xl text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                확인
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  } catch (error) {
    console.error('GlobalToast error:', error);
    return null;
  }
}