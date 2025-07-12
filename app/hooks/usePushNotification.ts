import { useState, useEffect, useCallback } from 'react';

interface PushNotificationHook {
  isSupported: boolean;
  isSubscribed: boolean;
  isPermissionGranted: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<boolean>;
}

export function usePushNotification(userId?: string): PushNotificationHook {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  // 브라우저 지원 여부 확인
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window;
      setIsSupported(supported);
      console.log('🔔 Push notification support:', supported);
    };
    
    checkSupport();
  }, []);

  // 권한 상태 확인
  useEffect(() => {
    if (!isSupported) return;
    
    const checkPermission = () => {
      const permission = Notification.permission;
      setIsPermissionGranted(permission === 'granted');
      console.log('🔔 Notification permission:', permission);
    };
    
    checkPermission();
  }, [isSupported]);

  // 구독 상태 확인
  useEffect(() => {
    if (!isSupported) return;
    
    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        console.log('🔔 Push subscription status:', !!subscription);
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
      }
    };
    
    checkSubscription();
  }, [isSupported]);

  // 권한 요청
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.log('🔔 Push notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setIsPermissionGranted(granted);
      console.log('🔔 Permission request result:', permission);
      return granted;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return false;
    }
  }, [isSupported]);

  // 구독
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.log('🔔 Push notifications not supported');
      return false;
    }

    if (!isPermissionGranted) {
      const granted = await requestPermission();
      if (!granted) {
        console.log('🔔 Permission denied');
        return false;
      }
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // VAPID 공개 키 (실제 구현 시 서버에서 가져와야 함)
      const vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // 실제 키로 교체 필요
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      });

      console.log('🔔 Push subscription created:', subscription);
      
      // 서버에 구독 정보 전송
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: userId || 'unknown'
        })
      });

      if (response.ok) {
        setIsSubscribed(true);
        console.log('🔔 Subscription saved to server');
        return true;
      } else {
        console.error('🔔 Failed to save subscription to server');
        return false;
      }
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return false;
    }
  }, [isSupported, isPermissionGranted, requestPermission]);

  // 구독 해제
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        console.log('🔔 Push subscription removed');
        
        // 서버에서 구독 정보 제거
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
                  body: JSON.stringify({
          subscription: subscription.toJSON(),
          userId: userId || 'unknown'
        })
        });
        
        setIsSubscribed(false);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      return false;
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isPermissionGranted,
    subscribe,
    unsubscribe,
    requestPermission
  };
} 