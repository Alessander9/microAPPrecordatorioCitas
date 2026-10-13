import type { IncomingMessage, ServerResponse } from 'http';
import { authenticateDevice } from './_lib/auth';
import { getRedisClient } from './_lib/redis';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Método no permitido. Usa POST.' }));
  }

  try {
    const { deviceId, deviceRecord } = await authenticateDevice(req, false);
    const redis = getRedisClient();

    if (deviceRecord) {
      delete deviceRecord.subscription;
      await redis.set(`device:${deviceId}`, deviceRecord);
    }

    await redis.srem('devices', deviceId);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, message: 'Suscripción eliminada.' }));
  } catch (err: any) {
    res.statusCode = err.message.includes('Credenciales') || err.message.includes('Cabeceras') ? 401 : 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'Error interno del servidor.' }));
  }
}
