import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Owns push-notification support/subscription state, the timezone-cookie +
 * service-worker registration effect, and the enable-notifications handler
 * that calls `/api/push/subscribe`.
 */
export function usePushNotifications() {
  const [isPushSupported, setIsPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Register Service Worker and check subscription
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        document.cookie = `chorez_timezone=${encodeURIComponent(tz)}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {
      // ignore
    }

    if ('serviceWorker' in navigator && 'PushManager' in window) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsPushSupported(true);
      navigator.serviceWorker.register('/sw.js')
        .then(async (reg) => {
          const sub = await reg.pushManager.getSubscription();
          setIsSubscribed(!!sub);
        })
        .catch(err => console.error('SW registration failed:', err));
    }
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    if (!isPushSupported) return;
    setIsSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission not granted');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }),
      });

      setIsSubscribed(true);
    } catch (error) {
      console.error('Push subscription failed:', error);
      alert('Failed to enable notifications. Please check your browser settings.');
    } finally {
      setIsSubscribing(false);
    }
  }, [isPushSupported]);

  return {
    isPushSupported,
    isSubscribed,
    isSubscribing,
    handleEnableNotifications,
  };
}
