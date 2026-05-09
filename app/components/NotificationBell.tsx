import { useState, useEffect } from 'react';
import { supabase } from '~/lib/supabase';
import type { Notification } from '~/types';

interface NotificationBellProps {
  userId?: string;
  userRole?: string;
}

export function NotificationBell({ userId, userRole }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // 알림 조회 함수
  const fetchNotifications = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('알림 조회 오류:', error);
        return;
      }

      const typedNotifications = (data || []) as unknown as Notification[];
      setNotifications(typedNotifications);
      setUnreadCount(typedNotifications.filter(n => n.status === 'unread').length);
    } catch (error) {
      console.error('알림 조회 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('id', notificationId);

      if (!error) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, status: 'read' } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('알림 읽음 처리 오류:', error);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    if (!userId || unreadCount === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'read' })
        .eq('user_id', userId)
        .eq('status', 'unread');

      if (!error) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, status: 'read' }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('모든 알림 읽음 처리 오류:', error);
    }
  };

  // 실시간 알림 구독
  useEffect(() => {
    if (!userId) return;

    fetchNotifications();

    // 실시간 구독 설정
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('새 알림 수신:', payload);
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('알림 업데이트:', payload);
          const updatedNotification = payload.new as Notification;
          setNotifications(prev => 
            prev.map(n => 
              n.id === updatedNotification.id ? updatedNotification : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  // 알림 타입별 아이콘
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
        return '🛒';
      case 'order_status':
        return '📋';
      case 'payment_confirmed':
        return '💳';
      default:
        return '📢';
    }
  };

  // 시간 포맷팅
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '방금 전';
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    if (days < 7) return `${days}일 전`;
    return date.toLocaleDateString();
  };

  if (!userId) return null;

  return (
    <div className="relative">
      {/* 알림 벨 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-mute hover:text-ink focus:outline-none focus:ring-2 focus:ring-focus-outer rounded-2xl"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* 읽지 않은 알림 카운트 */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 bg-white rounded-2xl  border border-hairline-soft">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-4 border-b border-hairline-soft">
            <h3 className="text-lg font-semibold text-ink">알림</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-mute hover:text-ink"
              >
                모두 읽음
              </button>
            )}
          </div>

          {/* 알림 목록 */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-mute">
                로딩 중...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-4 text-center text-mute">
                새로운 알림이 없습니다
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-hairline-soft cursor-pointer hover:bg-surface-soft ${
                    notification.status === 'unread' ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start space-x-3">
                    <span className="text-lg flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${
                        notification.status === 'unread' 
                          ? 'text-ink font-medium' 
                          : 'text-mute'
                      }`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-mute mt-1">
                        {formatTime(notification.created_at)}
                      </p>
                    </div>
                    {notification.status === 'unread' && (
                      <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 푸터 */}
          {notifications.length > 0 && (
            <div className="p-3 bg-surface-soft text-center border-t border-hairline-soft">
              <button className="text-sm text-mute hover:text-ink">
                모든 알림 보기
              </button>
            </div>
          )}
        </div>
      )}

      {/* 드롭다운 외부 클릭 시 닫기 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
