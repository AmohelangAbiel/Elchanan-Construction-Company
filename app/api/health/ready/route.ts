import { getRequestId, jsonError, jsonSuccess } from '../../../../lib/api';
import { getEnvValidationReport, isReadinessTokenValid } from '../../../../lib/env';
import { logInfo, logWarn } from '../../../../lib/logger';
import { prisma } from '../../../../lib/prisma';
import { getRateLimitBackendHealth } from '../../../../lib/rate-limit-store';

export const dynamic = 'force-dynamic';

async function checkDatabaseHealth() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return {
      ok: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt,
    };
  }
}

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const responseHeaders = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };

  if (!isReadinessTokenValid(request)) {
    return jsonError('Unauthorized readiness probe.', 401, undefined, {
      requestId,
      headers: responseHeaders,
    });
  }

  const [dbHealth, rateLimitHealth] = await Promise.all([
    checkDatabaseHealth(),
    getRateLimitBackendHealth(),
  ]);

  const envReport = getEnvValidationReport();
  const ready = dbHealth.ok && envReport.ok;
  const statusCode = ready ? 200 : 503;

  const payload = {
    status: ready ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    requestId,
    checks: {
      app: 'ok',
      database: dbHealth.ok ? 'ok' : 'down',
      redis: !rateLimitHealth.redis.configured
        ? 'not_configured'
        : rateLimitHealth.redis.available
          ? 'ok'
          : 'degraded',
      config: envReport.ok ? 'ok' : 'invalid',
    },
    details: {
      databaseLatencyMs: dbHealth.latencyMs,
      redisLatencyMs: rateLimitHealth.redis.latencyMs,
      rateLimitMode: rateLimitHealth.mode,
      envWarningCount: envReport.warnings.length,
      envErrorCount: envReport.errors.length,
    },
  };

  if (ready) {
    logInfo('health.readiness_ok', payload);
  } else {
    logWarn('health.readiness_degraded', payload);
  }

  return jsonSuccess(payload, statusCode, {
    requestId,
    headers: responseHeaders,
  });
}
