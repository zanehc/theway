self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: '이음카페', body: event.data.text() };
  }

  const title = payload.title || '이음카페';
  const options = {
    body: payload.body || '주문 상태가 변경되었습니다.',
    icon: '/church-logo-128.png',
    badge: '/church-logo-128.png',
    tag: payload.tag || payload.orderId || 'order-update',
    renotify: true,
    data: { url: payload.url || '/orders/history' },
  };

  // 앱이 열려서 포커스(visible)된 클라이언트가 있으면 OS 알림을 띄우지 않고
  // 인앱 토스트만 보이도록 클라이언트에 전달한다. (OS 푸시 + 인앱 토스트 중복 방지)
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      const hasVisibleClient = windowClients.some(
        (client) => client.visibilityState === 'visible'
      );

      if (hasVisibleClient) {
        windowClients.forEach((client) => {
          client.postMessage({ type: 'push', payload });
        });
        return;
      }

      return self.registration.showNotification(title, options);
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/orders/history';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});
