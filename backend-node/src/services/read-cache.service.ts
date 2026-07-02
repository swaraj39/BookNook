type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export class ReadCacheService {
  private static cache = new Map<string, CacheEntry<unknown>>();
  private static inflight = new Map<string, Promise<unknown>>();
  private static generation = 0;

  static async getOrSet<T>(
    key: string,
    ttlMs: number,
    loader: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key) as CacheEntry<T> | undefined;

    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const running = this.inflight.get(key) as Promise<T> | undefined;
    if (running) {
      return running;
    }

    const generation = this.generation;
    const promise = loader()
      .then((value) => {
        if (generation === this.generation) {
          this.cache.set(key, {
            expiresAt: Date.now() + ttlMs,
            value,
          });
        }
        return value;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  static invalidate(prefix?: string) {
    this.generation += 1;

    if (!prefix) {
      this.cache.clear();
      this.inflight.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
    for (const key of this.inflight.keys()) {
      if (key.startsWith(prefix)) this.inflight.delete(key);
    }
  }
}
