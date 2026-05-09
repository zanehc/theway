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
    tag: payload.orderId || 'order-update',
    renotify: true,
    data: { url: payload.url || '/orders/history' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
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
