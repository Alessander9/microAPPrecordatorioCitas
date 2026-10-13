import type { IncomingMessage, ServerResponse } from 'http';
import { authenticateDevice } from './_lib/auth';
import { SubscribeBodySchema } from './_lib/types';
import { getRedisClient } from './_lib/redis';

// Helper to parse JSON body from incoming request
async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 64) {
        reject(new Error('Payload demasiado grande'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('JSON malformado'));
      }
    });
    req.on('error', reject);
  });
}

export default async function handler(req: IncomingMessage & { body?: any }, res: ServerResponse) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Método no permitido. Usa POST.' }));
  }

  try {
    const { deviceId, deviceRecord } = await authenticateDevice(req, true);
    const rawBody = req.body || (await parseJsonBody(req));

    const parseResult = SubscribeBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Datos de suscripción inválidos', details: parseResult.error.format() }));
    }

    const { subscription } = parseResult.data;
    const redis = getRedisClient();

    const updatedRecord = {
      ...(deviceRecord || {}),
      deviceId,
      subscription,
      updatedAt: new Date().toISOString(),
    };

    await redis.set(`device:${deviceId}`, updatedRecord);
    await redis.sadd('devices', deviceId);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, message: 'Suscripción guardada exitosamente.' }));
  } catch (err: any) {
    res.statusCode = err.message.includes('Credenciales') || err.message.includes('Cabeceras') ? 401 : 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'Error interno del servidor.' }));
  }
}
