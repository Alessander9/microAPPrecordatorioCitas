import type { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Método no permitido. Usa GET.' }));
  }

  const redisConfigured = Boolean(
    (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
    (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)
  );

  const vapidConfigured = Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  );

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  return res.end(
    JSON.stringify({
      status: 'ok',
      service: 'Recordatorio de Citas Backend',
      timestamp: new Date().toISOString(),
      redisConfigured,
      vapidConfigured,
    })
  );
}
