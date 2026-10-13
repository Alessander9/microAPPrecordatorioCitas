import type { IncomingMessage, ServerResponse } from 'http';
import { authenticateDevice } from './_lib/auth';
import { SyncBodySchema } from './_lib/types';
import { getRedisClient } from './_lib/redis';

async function parseJsonBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1024 * 256) {
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
    const { deviceId } = await authenticateDevice(req, false);
    const rawBody = req.body || (await parseJsonBody(req));

    const parseResult = SyncBodySchema.safeParse(rawBody);
    if (!parseResult.success) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      return res.end(JSON.stringify({ error: 'Lista de recordatorios inválida', details: parseResult.error.format() }));
    }

    const { reminders } = parseResult.data;
    const redis = getRedisClient();

    // Store opaque reminders under reminders:${deviceId}
    await redis.set(`reminders:${deviceId}`, reminders);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ success: true, count: reminders.length }));
  } catch (err: any) {
    res.statusCode = err.message.includes('Credenciales') || err.message.includes('Cabeceras') || err.message.includes('no registrado') ? 401 : 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: err.message || 'Error interno del servidor.' }));
  }
}
