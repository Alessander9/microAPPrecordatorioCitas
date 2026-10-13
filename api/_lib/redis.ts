import { Redis } from '@upstash/redis';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Redis no configurado: Asegúrate de configurar UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN en Vercel.'
    );
  }

  redisInstance = new Redis({
    url,
    token,
  });

  return redisInstance;
}
