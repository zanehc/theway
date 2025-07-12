// Service Worker for Web Push Notifications
const CACHE_NAME = 'theway-v1';

// 설치 시 캐시 생성
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  self.skipWaiting();
});

// 활성화 시 이전 캐시 정리
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 푸시 알림 수신 처리
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  if (event.data) {
    const data = event.data.json();
    console.log('Push data:', data);
    
    const options = {
      body: data.message,
      icon: '/logo-light.png',
      badge: '/logo-light.png',
      tag: data.tag || 'order-notification',
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: '확인',
          icon: '/logo-light.png'
        },
        {
          action: 'close',
          title: '닫기'
        }
      ],
      data: {
        url: data.url || '/orders',
        orderId: data.orderId
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'The Way 주문 알림', options)
    );
  }
});

// 알림 클릭 처리
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/orders';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 이미 열린 탭이 있는지 확인
      for (const client of clientList) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // 새 탭 열기
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// 백그라운드 동기화 (선택사항)
self.addEventListener('sync', (event) => {
  console.log('Background sync:', event);
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    console.log('Performing background sync...');
    // 백그라운드에서 수행할 작업들
  } catch (error) {
    console.error('Background sync failed:', error);
  }
} 