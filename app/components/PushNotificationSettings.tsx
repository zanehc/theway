import { useState, useEffect } from 'react';
import { usePushNotification } from '~/hooks/usePushNotification';

interface PushNotificationSettingsProps {
  userId: string;
}

export default function PushNotificationSettings({ userId }: PushNotificationSettingsProps) {
  const {
    isSupported,
    isSubscribed,
    isPermissionGranted,
    subscribe,
    unsubscribe,
    requestPermission
  } = usePushNotification(userId);

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Service Worker 등록
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('🔔 Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('🔔 Service Worker registration failed:', error);
        });
    }
  }, []);

  const handleSubscribe = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const success = await subscribe();
      if (success) {
        setMessage('푸시 알림이 활성화되었습니다! 📱');
      } else {
        setMessage('푸시 알림 활성화에 실패했습니다. 브라우저 설정을 확인해주세요.');
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      setMessage('푸시 알림 활성화 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const success = await unsubscribe();
      if (success) {
        setMessage('푸시 알림이 비활성화되었습니다.');
      } else {
        setMessage('푸시 알림 비활성화에 실패했습니다.');
      }
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      setMessage('푸시 알림 비활성화 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    setMessage(null);

    try {
      const granted = await requestPermission();
      if (granted) {
        setMessage('알림 권한이 허용되었습니다! 이제 푸시 알림을 활성화할 수 있습니다.');
      } else {
        setMessage('알림 권한이 거부되었습니다. 브라우저 설정에서 권한을 허용해주세요.');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      setMessage('권한 요청 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-yellow-600">⚠️</span>
          <h3 className="font-semibold text-yellow-800">푸시 알림 미지원</h3>
        </div>
        <p className="text-sm text-yellow-700">
          현재 브라우저에서 푸시 알림을 지원하지 않습니다. 
          Chrome, Firefox, Safari 등의 최신 브라우저를 사용해주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">📱</span>
        <h3 className="text-lg font-semibold text-gray-900">푸시 알림 설정</h3>
      </div>

      <div className="space-y-4">
        {/* 권한 상태 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">알림 권한</p>
            <p className="text-sm text-gray-600">
              {isPermissionGranted ? '허용됨' : '거부됨'}
            </p>
          </div>
          {!isPermissionGranted && (
            <button
              onClick={handleRequestPermission}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '요청 중...' : '권한 요청'}
            </button>
          )}
        </div>

        {/* 구독 상태 */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-900">푸시 알림</p>
            <p className="text-sm text-gray-600">
              {isSubscribed ? '활성화됨' : '비활성화됨'}
            </p>
          </div>
          {isPermissionGranted && (
            <button
              onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg disabled:opacity-50 ${
                isSubscribed
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isLoading 
                ? '처리 중...' 
                : isSubscribed 
                  ? '비활성화' 
                  : '활성화'
              }
            </button>
          )}
        </div>

        {/* 알림 메시지 */}
        {message && (
          <div className={`p-3 rounded-lg ${
            message.includes('실패') || message.includes('오류') || message.includes('거부')
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            <p className="text-sm">{message}</p>
          </div>
        )}

        {/* 설명 */}
        <div className="text-sm text-gray-600 space-y-2">
          <p>• 푸시 알림을 활성화하면 주문 상태 변경 시 모바일에서도 알림을 받을 수 있습니다.</p>
          <p>• 브라우저가 닫혀있어도 알림을 받을 수 있습니다.</p>
          <p>• 언제든지 비활성화할 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
} 