import { getRedis } from "../config/redis";

const PREFIX = "bkc";
const DEFAULT_TTL = 300;

export class ReadCacheService {
  static async get<T>(key: string): Promise<T | null> {
    const redis = getRedis();
    if (!redis) return null;

    try {
      const raw = await redis.get(`${PREFIX}:${key}`);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  static async set(key: string, value: unknown, ttl: number = DEFAULT_TTL): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
      await redis.set(`${PREFIX}:${key}`, JSON.stringify(value), "EX", ttl);
    } catch {
    }
  }

  static async invalidate(key: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;

    try {
      await redis.del(`${PREFIX}:${key}`);
    } catch {
    }
  }
}
