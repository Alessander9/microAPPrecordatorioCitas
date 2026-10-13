import { db, getSetting, setSetting } from '../db/db';
import { generateRandomHex } from './crypto';
import type { ReminderSyncItem } from '../types/client';

export interface DeviceCredentials {
  deviceId: string;
  deviceSecret: string;
}

/**
 * Gets or initializes the device identity stored in IndexedDB.
 */
export async function getOrCreateDeviceCredentials(): Promise<DeviceCredentials> {
  let deviceId = await getSetting<string>('deviceId');
  let deviceSecret = await getSetting<string>('deviceSecret');

  if (!deviceId || !deviceSecret) {
    deviceId = generateRandomHex(16); // 32 chars hex
    deviceSecret = generateRandomHex(32); // 64 chars hex
    await setSetting('deviceId', deviceId);
    await setSetting('deviceSecret', deviceSecret);
  }

  return { deviceId, deviceSecret };
}

/**
 * Syncs the privacy-preserving reminder list to the Vercel backend.
 * ONLY sends { id: opaqueId, fechaRecordatorio: YYYY-MM-DD, recordado: boolean }.
 * Personal details (nombre, teléfono, notas) are STRICTLY excluded.
 */
export async function syncRemindersToServer(): Promise<void> {
  try {
    const pushEnabled = await getSetting<boolean>('pushEnabled');
    if (!pushEnabled) {
      // If push is not enabled by user, no need to sync to server
      return;
    }

    const { deviceId, deviceSecret } = await getOrCreateDeviceCredentials();
    const clients = await db.clients.toArray();

    // Transform clients to opaque reminder items
    const reminders: ReminderSyncItem[] = clients.map(client => ({
      id: client.id,
      fechaRecordatorio: client.fechaProximaCita,
      recordado: Boolean(client.recordado),
    }));

    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-device-id': deviceId,
        'x-device-secret': deviceSecret,
      },
      body: JSON.stringify({ reminders }),
    });

    if (!response.ok) {
      console.warn('Sync failed with status:', response.status);
    }
  } catch (err) {
    // Fail silently in background to avoid disrupting offline usage
    console.warn('Background sync error (device may be offline):', err);
  }
}

/**
 * Updates application icon badge if Badging API is supported by the browser.
 */
export async function updateAppBadge(pendingCount: number): Promise<void> {
  if ('setAppBadge' in navigator) {
    try {
      if (pendingCount > 0) {
        await (navigator as any).setAppBadge(pendingCount);
      } else {
        await (navigator as any).clearAppBadge();
      }
    } catch (err) {
      console.debug('Badge API error:', err);
    }
  }
}
