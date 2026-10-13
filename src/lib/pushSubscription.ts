import { getSetting, setSetting } from '../db/db';
import { getOrCreateDeviceCredentials } from './syncService';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function isPushNotificationSupported(): Promise<boolean> {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getPushSubscriptionState(): Promise<{
  supported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
}> {
  const supported = await isPushNotificationSupported();
  if (!supported) {
    return { supported: false, permission: 'denied', isSubscribed: false };
  }

  const permission = Notification.permission;
  const isEnabledLocally = Boolean(await getSetting<boolean>('pushEnabled'));

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  return {
    supported: true,
    permission,
    isSubscribed: Boolean(subscription && isEnabledLocally),
  };
}

export async function subscribeToPushNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supported = await isPushNotificationSupported();
    if (!supported) {
      return {
        success: false,
        error: 'Las notificaciones push no están soportadas en este navegador o dispositivo.',
      };
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Permiso denegado. Por favor habilita las notificaciones en la configuración de tu navegador.',
      };
    }

    const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      return {
        success: false,
        error: 'VITE_VAPID_PUBLIC_KEY no está configurada.',
      };
    }

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      });
    }

    // Get device credentials
    const { deviceId, deviceSecret } = await getOrCreateDeviceCredentials();

    // Send subscription to /api/subscribe
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': deviceId,
        'x-device-secret': deviceSecret,
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `Error al guardar suscripción en el servidor (${res.status}).`,
      };
    }

    await setSetting('pushEnabled', true);
    await setSetting('pushSubscription', subscription.toJSON());

    return { success: true };
  } catch (err: any) {
    console.error('Error subscribing to push:', err);
    return {
      success: false,
      error: err.message || 'Error inesperado al activar notificaciones.',
    };
  }
}

export async function unsubscribeFromPushNotifications(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
    }

    const { deviceId, deviceSecret } = await getOrCreateDeviceCredentials();
    await fetch('/api/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': deviceId,
        'x-device-secret': deviceSecret,
      },
    }).catch(() => {});

    await setSetting('pushEnabled', false);
    await setSetting('pushSubscription', null);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
