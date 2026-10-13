import type { IncomingMessage, ServerResponse } from 'http';
import { getRedisClient } from '../_lib/redis';
import { configureWebPush } from '../_lib/webpush';
import { getTodayDateLima } from '../_lib/types';
import type { DeviceRecord } from '../_lib/auth';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Método no permitido. El cron de Vercel requiere GET.' }));
  }

  // 1. Verify Authorization header with CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'];
    const expectedHeader = `Bearer ${cronSecret}`;
    if (!authHeader || authHeader !== expectedHeader) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'No autorizado. Se requiere Authorization: Bearer ${CRON_SECRET}.' }));
    }
  }

  try {
    const redis = getRedisClient();
    const webpush = configureWebPush();

    const todayLima = getTodayDateLima(); // YYYY-MM-DD in America/Lima
    const deviceIds = await redis.smembers<string[]>('devices');

    let notificationsSent = 0;
    let prunedSubscriptions = 0;

    if (Array.isArray(deviceIds) && deviceIds.length > 0) {
      for (const deviceId of deviceIds) {
        try {
          const deviceRecord = await redis.get<DeviceRecord>(`device:${deviceId}`);
          if (!deviceRecord?.subscription) {
            continue;
          }

          const reminders = (await redis.get<any[]>(`reminders:${deviceId}`)) || [];
          
          // Count pending reminders with fechaRecordatorio <= todayLima and not yet marked as reminded
          const pendingCount = reminders.filter(
            r => r.fechaRecordatorio && r.fechaRecordatorio <= todayLima && !r.recordado
          ).length;

          if (pendingCount > 0) {
            const body =
              pendingCount === 1
                ? 'Tienes 1 recordatorio para hoy'
                : `Tienes ${pendingCount} recordatorios para hoy`;

            const payload = JSON.stringify({
              title: 'Recordatorio de Citas',
              body,
              url: '/',
            });

            try {
              await webpush.sendNotification(deviceRecord.subscription, payload);
              notificationsSent++;
            } catch (pushErr: any) {
              // If subscription is 404 or 410, prune it from Redis
              if (pushErr.statusCode === 404 || pushErr.statusCode === 410) {
                delete deviceRecord.subscription;
                await redis.set(`device:${deviceId}`, deviceRecord);
                await redis.srem('devices', deviceId);
                prunedSubscriptions++;
              } else {
                console.error(`Error enviando push a dispositivo ${deviceId}:`, pushErr);
              }
            }
          }
        } catch (deviceErr) {
          console.error(`Error procesando dispositivo ${deviceId}:`, deviceErr);
        }
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        success: true,
        dateLima: todayLima,
        devicesFound: deviceIds ? deviceIds.length : 0,
        notificationsSent,
        prunedSubscriptions,
        timestamp: new Date().toISOString(),
      })
    );
  } catch (err: any) {
    console.error('Error en cron/send:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'Error ejecutando cron de recordatorios.' }));
  }
}
