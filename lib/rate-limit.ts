import { getRateLimitStore } from './rate-limit-store';
import crypto from 'crypto';
import { logWarn } from './logger';

type RateLimitOptions = {
  key: string;
  max: number;
  windowMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const store = getRateLimitStore();

export async function checkRateLimit({
  key,
  max,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const result = await store.increment(key, windowMs);
  const retryAfterSeconds = Math.max(
    0,
    Math.ceil((result.resetAt - now) / 1000),
  );

  if (result.count > max) {
    const keyHash = crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);
    logWarn('rate_limit.blocked', {
      scope: key.split(':')[0],
      keyHash,
      max,
      count: result.count,
      windowMs,
      retryAfterSeconds,
    });

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    remaining: Math.max(0, max - result.count),
    retryAfterSeconds: 0,
  };
}

export async function checkRateLimitMany(
  rules: RateLimitOptions[],
): Promise<RateLimitResult> {
  let retryAfterSeconds = 0;
  let minRemaining = Number.POSITIVE_INFINITY;

  for (const rule of rules) {
    const result = await checkRateLimit(rule);
    if (!result.allowed) {
      retryAfterSeconds = Math.max(retryAfterSeconds, result.retryAfterSeconds);
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }
    minRemaining = Math.min(minRemaining, result.remaining);
  }

  return {
    allowed: true,
    remaining: Number.isFinite(minRemaining) ? minRemaining : 0,
    retryAfterSeconds: 0,
  };
}
