import crypto from 'crypto';
import { getRedisClient } from './redis';

export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export interface DeviceRecord {
  deviceId: string;
  secretHash: string;
  subscription?: any;
  updatedAt: string;
}

/**
 * Authenticates the incoming request from a device using x-device-id and x-device-secret headers.
 * If createIfMissing is true, allows registering a new device with its secret hash.
 */
export async function authenticateDevice(
  req: { headers: Record<string, string | string[] | undefined> },
  createIfMissing = false
): Promise<{ deviceId: string; deviceRecord: DeviceRecord | null }> {
  const deviceIdHeader = req.headers['x-device-id'];
  const deviceSecretHeader = req.headers['x-device-secret'];

  const deviceId = Array.isArray(deviceIdHeader) ? deviceIdHeader[0] : deviceIdHeader;
  const deviceSecret = Array.isArray(deviceSecretHeader) ? deviceSecretHeader[0] : deviceSecretHeader;

  if (!deviceId || !deviceSecret || typeof deviceId !== 'string' || typeof deviceSecret !== 'string') {
    throw new Error('Cabeceras x-device-id y x-device-secret son requeridas.');
  }

  // Basic regex check for device credentials (alphanumeric hex string)
  if (!/^[a-f0-9]{16,64}$/i.test(deviceId) || !/^[a-f0-9]{32,128}$/i.test(deviceSecret)) {
    throw new Error('Formato de credenciales de dispositivo no válido.');
  }

  const redis = getRedisClient();
  const key = `device:${deviceId}`;
  const existingRecord = await redis.get<DeviceRecord>(key);
  const computedHash = hashSecret(deviceSecret);

  if (existingRecord) {
    if (existingRecord.secretHash !== computedHash) {
      throw new Error('Credenciales de dispositivo no autorizadas.');
    }
    return { deviceId, deviceRecord: existingRecord };
  }

  if (createIfMissing) {
    const newRecord: DeviceRecord = {
      deviceId,
      secretHash: computedHash,
      updatedAt: new Date().toISOString(),
    };
    await redis.set(key, newRecord);
    await redis.sadd('devices', deviceId);
    return { deviceId, deviceRecord: newRecord };
  }

  throw new Error('Dispositivo no registrado en el sistema.');
}
