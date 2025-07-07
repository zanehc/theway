import { useState, useEffect } from 'react';
import { useFetcher } from '@remix-run/react';
import type { Notification } from '~/types';
import { supabase } from '~/lib/supabase';

interface NotificationBellProps {
  userId: string;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const fetcher = useFetcher();

  // 알림 데이터 로드
  useEffect(() => {
    if (userId) {
      console.log('🔔 Loading notifications for user:', userId);
      fetcher.load(`/api/notifications?userId=${userId}`);
    }
  }, [userId]);

  // fetcher 데이터가 업데이트되면 notifications 상태 업데이트
  useEffect(() => {
    if (fetcher.data && typeof fetcher.data === 'object' && 'notifications' in fetcher.data) {
      const newNotifications = fetcher.data.notifications as Notification[];
      console.log('📨 Notifications loaded:', newNotifications.length, 'notifications');
      setNotifications(newNotifications);
    }
  }, [fetcher.data]);

  // 실시간 알림 업데이트
  useEffect(() => {
    if (!userId) return;
    
    console.log('🔔 Setting up realtime notifications for bell:', userId);
    
    const channel = supabase
      .channel('bell-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const newNotification = payload.new as Notification;
        console.log('📨 Bell received new notification:', newNotification);
        
        if (newNotification.user_id === userId) {
          console.log('✅ Bell notification matches user, updating state');
          setNotifications(prev => [newNotification, ...prev]);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
      }, (payload) => {
        const updatedNotification = payload.new as Notification;
        console.log('📨 Bell received updated notification:', updatedNotification);
        
        if (updatedNotification.user_id === userId) {
          console.log('✅ Bell notification update matches user, updating state');
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
        }
      })
      .subscribe((status) => {
        console.log('🔔 Bell notification channel status:', status);
      });
      
    return () => {
      console.log('🔔 Cleaning up bell notification channel');
      channel.unsubscribe();
    };
  }, [userId]);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const handleNotificationClick = (notificationId: string) => {
    // 알림을 읽음 처리
    fetcher.submit(
      { notificationId, intent: 'markAsRead' },
      { method: 'post', action: '/api/notifications' }
    );
    // 알림 팝업 닫기
    setIsOpen(false);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}시간 전`;
    return `${Math.floor(diffInMinutes / 1440)}일 전`;
  };

  return (
    <div className="relative">
      {/* 알림 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-wine-600 hover:text-wine-700 transition-colors"
        aria-label="알림"
      >
        {/* 종 아이콘 */}
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-5 5v-5zM10.5 3.75a6 6 0 0 1 6 6v4.5l2.25 2.25a1.5 1.5 0 0 1-1.5 2.25h-13.5a1.5 1.5 0 0 1-1.5-2.25L7.5 14.25V9.75a6 6 0 0 1 6-6z"
          />
        </svg>

        {/* 알림 개수 badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 팝업 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">알림</h3>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                새로운 알림이 없습니다
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    notification.status === 'unread' ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 mb-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    {notification.status === 'unread' && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full ml-2 flex-shrink-0"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 팝업 외부 클릭 시 닫기 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
} 