self.addEventListener('push', function (event) {
  if (event.data) {
    const data = JSON.parse(event.data.text());
    const options = {
      body: data.body,
      icon: '/favicon.ico', // Make sure this exists
      badge: '/favicon.ico',
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
