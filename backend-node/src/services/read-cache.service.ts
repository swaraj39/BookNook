import redis from "../config/redis";

const KEY_PREFIX = "bkc:";

function prefixed(key: string): string {
  return `${KEY_PREFIX}${key}`;
}

export class ReadCacheService {
  private static inflight = new Map<string, Promise<unknown>>();

  static async getOrSet<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>
  ): Promise<T> {
    const running = this.inflight.get(key) as Promise<T> | undefined;
    if (running) return running;

    if (redis) {
      try {
        const cached = await redis.get(prefixed(key));
        if (cached !== null) {
          return JSON.parse(cached) as T;
        }
      } catch (err) {
        console.error("[ReadCache] Redis GET failed, falling through:", (err as Error).message);
      }
    }

    const running2 = this.inflight.get(key) as Promise<T> | undefined;
    if (running2) return running2;

    const promise = loader()
      .then(async (value) => {
        if (redis) {
          try {
            await redis.set(prefixed(key), JSON.stringify(value), "PX", ttlMs);
          } catch (err) {
            console.error("[ReadCache] Redis SET failed:", (err as Error).message);
          }
        }
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  static async invalidate(prefix?: string): Promise<void> {
    if (!redis) return;

    const pattern = prefix ? `${KEY_PREFIX}${prefix}*` : `${KEY_PREFIX}*`;

    try {
      let cursor = "0";
      do {
        const [nextCursor, keys] = await redis.scan(
          cursor,
          "MATCH",
          pattern,
          "COUNT",
          100
        );
        if (keys.length > 0) {
          await redis.del(...keys);
        }
        cursor = nextCursor;
      } while (cursor !== "0");
    } catch (err) {
      console.error("[ReadCache] Invalidation failed:", (err as Error).message);
    }
  }
}
