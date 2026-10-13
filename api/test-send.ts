import type { IncomingMessage, ServerResponse } from 'http';
import { authenticateDevice } from './_lib/auth';
import { configureWebPush } from './_lib/webpush';
import { getRedisClient } from './_lib/redis';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Método no permitido. Usa POST.' }));
  }

  try {
    const { deviceId, deviceRecord } = await authenticateDevice(req, false);

    if (!deviceRecord?.subscription) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'El dispositivo no tiene una suscripción push activa.' }));
    }

    const webpush = configureWebPush();

    const payload = JSON.stringify({
      title: 'Recordatorio de Citas',
      body: '¡Notificaciones configuradas exitosamente! Recibirás tus recordatorios diarios cada mañana.',
      url: '/',
    });

    try {
      await webpush.sendNotification(deviceRecord.subscription, payload);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ success: true, message: 'Notificación de prueba enviada.' }));
    } catch (pushErr: any) {
      if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
        // Subscription expired / gone
        const redis = getRedisClient();
        delete deviceRecord.subscription;
        await redis.set(`device:${deviceId}`, deviceRecord);
        await redis.srem('devices', deviceId);
        res.statusCode = 410;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ error: 'La suscripción en tu navegador ha expirado. Vuelve a activarla.' }));
      }
      throw pushErr;
    }
  } catch (err: any) {
    res.statusCode = err.message.includes('Credenciales') || err.message.includes('Cabeceras') ? 401 : 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'Error al enviar notificación de prueba.' }));
  }
}
