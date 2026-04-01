import { createClient } from 'redis';
import { logDebug, logWarn, serializeError } from './logger';

type RedisClient = ReturnType<typeof createClient>;

type RedisState = {
  client?: RedisClient;
  connectPromise?: Promise<RedisClient | null>;
  disabledUntil?: number;
  failureCount: number;
  lastError?: string;
};

const globalRedisState = globalThis as typeof globalThis & {
  __elchananRedisState?: RedisState;
};

const redisState: RedisState = globalRedisState.__elchananRedisState ?? {
  failureCount: 0,
};
if (!globalRedisState.__elchananRedisState) {
  globalRedisState.__elchananRedisState = redisState;
}

function getRedisConfig() {
  const url = (process.env.REDIS_URL || '').trim();
  if (!url) return null;

  const token = (process.env.REDIS_TOKEN || '').trim();
  return {
    url,
    token: token || undefined,
  };
}

function getRetryDelayMs(failureCount: number) {
  const bounded = Math.min(Math.max(failureCount, 1), 8);
  return Math.min(300000, 5000 * (2 ** (bounded - 1)));
}

function markFailure(error: unknown) {
  redisState.failureCount += 1;
  const retryDelayMs = getRetryDelayMs(redisState.failureCount);
  redisState.disabledUntil = Date.now() + retryDelayMs;
  redisState.lastError = serializeError(error).message;
  redisState.client = undefined;

  logWarn('redis.connection_failed', {
    failureCount: redisState.failureCount,
    retryDelayMs,
    reason: redisState.lastError,
  });
}

function markHealthy() {
  if (redisState.failureCount > 0 || redisState.lastError) {
    logDebug('redis.connection_restored', {
      previousFailures: redisState.failureCount,
    });
  }

  redisState.failureCount = 0;
  redisState.lastError = undefined;
  redisState.disabledUntil = undefined;
}

function isTemporarilyDisabled() {
  const until = redisState.disabledUntil;
  return Boolean(until && until > Date.now());
}

export function isRedisConfigured() {
  return Boolean(getRedisConfig());
}

export async function getRedisClient() {
  const config = getRedisConfig();
  if (!config) return null;

  if (redisState.client?.isOpen) return redisState.client;
  if (isTemporarilyDisabled()) return null;

  if (!redisState.connectPromise) {
    redisState.connectPromise = (async () => {
      try {
        const client = createClient({
          url: config.url,
          password: config.token,
          socket: {
            reconnectStrategy(retries) {
              return Math.min(retries * 50, 1000);
            },
          },
        });

        client.on('error', (error) => {
          redisState.lastError = serializeError(error).message;
          logWarn('redis.client_error', {
            reason: redisState.lastError,
          });
        });

        await client.connect();
        redisState.client = client;
        markHealthy();
        return client;
      } catch (error) {
        markFailure(error);
        return null;
      } finally {
        redisState.connectPromise = undefined;
      }
    })();
  }

  return redisState.connectPromise;
}

export async function getRedisHealth() {
  const configured = isRedisConfigured();
  if (!configured) {
    return {
      configured: false,
      available: false,
      mode: 'not_configured' as const,
      latencyMs: undefined as number | undefined,
    };
  }

  const startedAt = Date.now();
  const client = await getRedisClient();
  if (!client) {
    return {
      configured: true,
      available: false,
      mode: 'degraded' as const,
      latencyMs: Date.now() - startedAt,
      reason: redisState.lastError,
    };
  }

  try {
    await client.ping();
    return {
      configured: true,
      available: true,
      mode: 'ready' as const,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    markFailure(error);
    return {
      configured: true,
      available: false,
      mode: 'degraded' as const,
      latencyMs: Date.now() - startedAt,
      reason: serializeError(error).message,
    };
  }
}
