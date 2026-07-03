import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

function createRedisClient(): Redis | null {
  if (!REDIS_URL) {
    console.warn("[Redis] REDIS_URL not set — caching disabled, will fall through to DB");
    return null;
  }

  const client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  client.on("connect", () => {
    console.log("[Redis] Connected");
  });

  client.on("error", (err) => {
    console.error("[Redis] Error:", (err as Error).message);
  });

  (async () => {
    try {
      await client.connect();
      try {
        await client.config("SET", "maxmemory", "25mb");
        await client.config("SET", "maxmemory-policy", "allkeys-lru");
        console.log("[Redis] maxmemory set to 25MB with allkeys-lru eviction");
      } catch {
        console.warn("[Redis] Could not set maxmemory (permission denied on managed Redis)");
      }
    } catch (err) {
      console.error("[Redis] Initial connection failed:", (err as Error).message);
    }
  })();

  return client;
}

const redis = createRedisClient();

export default redis;
