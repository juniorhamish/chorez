self.addEventListener('push', function (event) {
  if (event.data) {
    const data = JSON.parse(event.data.text());
    const options = {
      body: data.body,
      icon: '/icon.png', // Make sure this exists
      badge: '/icon.png',
      data: {
        url: data.url
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
