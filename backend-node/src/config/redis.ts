import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

let redis: Redis | null = null;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
  });

  redis.on("error", (err) => {
    console.error("Redis connection error:", err.message);
  });

  redis.connect().catch((err) => {
    console.warn("Redis unavailable — caching disabled:", err.message);
    redis = null;
  });
} else {
  console.warn("REDIS_URL not set — caching disabled");
}

export function getRedis(): Redis | null {
  return redis;
}
