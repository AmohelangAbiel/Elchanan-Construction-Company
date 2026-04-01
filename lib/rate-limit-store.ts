import crypto from 'crypto';
import { getRedisClient, getRedisHealth, isRedisConfigured } from './redis';
import { logWarn } from './logger';

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitIncrementResult = {
  count: number;
  resetAt: number;
};

export type RateLimitStore = {
  increment(key: string, windowMs: number): Promise<RateLimitIncrementResult>;
};

class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private operationCount = 0;

  private pruneExpiredBuckets(now: number) {
    this.operationCount += 1;
    if (this.operationCount % 50 !== 0 && this.buckets.size < 5000) return;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }

    if (this.buckets.size > 10000) {
      const sorted = [...this.buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
      const overflow = this.buckets.size - 10000;
      for (let index = 0; index < overflow; index += 1) {
        const key = sorted[index]?.[0];
        if (key) this.buckets.delete(key);
      }
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitIncrementResult> {
    const now = Date.now();
    this.pruneExpiredBuckets(now);
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      this.buckets.set(key, { count: 1, resetAt });
      return { count: 1, resetAt };
    }

    bucket.count += 1;
    return { count: bucket.count, resetAt: bucket.resetAt };
  }
}

class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly prefix: string) {}

  async increment(key: string, windowMs: number): Promise<RateLimitIncrementResult> {
    const client = await getRedisClient();
    if (!client) {
      throw new Error('Redis rate limit backend unavailable.');
    }

    const redisKey = `${this.prefix}:${key}`;
    const now = Date.now();
    const result = await client.eval(
      `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return {current, ttl}
      `,
      {
        keys: [redisKey],
        arguments: [String(windowMs)],
      },
    ) as unknown;

    const [countRaw, ttlRaw] = Array.isArray(result) ? result : [1, windowMs];
    const count = Number(countRaw) || 1;
    const ttl = Number(ttlRaw);
    const resetAt = now + (Number.isFinite(ttl) && ttl > 0 ? ttl : windowMs);

    return { count, resetAt };
  }
}

type RateLimitState = {
  memoryStore?: MemoryRateLimitStore;
  redisStore?: RedisRateLimitStore;
};

const rateLimitState = globalThis as typeof globalThis & {
  __elchananRateLimitState?: RateLimitState;
};

const state: RateLimitState = rateLimitState.__elchananRateLimitState ?? {};
if (!rateLimitState.__elchananRateLimitState) {
  rateLimitState.__elchananRateLimitState = state;
}

function getMemoryStore() {
  if (!state.memoryStore) {
    state.memoryStore = new MemoryRateLimitStore();
  }

  return state.memoryStore;
}

function getRedisStore(): RedisRateLimitStore | null {
  if (!isRedisConfigured()) return null;

  if (!state.redisStore) {
    const prefix = process.env.REDIS_RATE_LIMIT_PREFIX || 'elchanan:rate-limit';
    state.redisStore = new RedisRateLimitStore(prefix);
  }

  return state.redisStore;
}

export function getRateLimitStore(): RateLimitStore {
  const memory = getMemoryStore();
  const redisStore = getRedisStore();

  return {
    async increment(key: string, windowMs: number): Promise<RateLimitIncrementResult> {
      if (redisStore) {
        try {
          return await redisStore.increment(key, windowMs);
        } catch (error) {
          const keyHash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
          logWarn('rate_limit.redis_fallback', {
            scope: key.split(':')[0],
            keyHash,
            windowMs,
            reason: error instanceof Error ? error.message : 'unknown',
          });
        }
      }

      return memory.increment(key, windowMs);
    },
  };
}

export async function getRateLimitBackendHealth() {
  const redis = await getRedisHealth();
  return {
    redis,
    mode: redis.available ? 'redis' : 'memory-fallback',
  };
}
