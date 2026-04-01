type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown> | undefined;

const LOG_PRIORITIES: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const REDACT_KEYS = [
  'password',
  'token',
  'secret',
  'api_key',
  'apikey',
  'jwt',
  'authorization',
  'bearer',
  'cookie',
  'set-cookie',
  'database_url',
  'redis_url',
  'connection_string',
  'smtp_pass',
  'smtp_user',
  'admin_secret',
];

const URI_CREDENTIAL_PATTERN = /([a-z][a-z0-9+.-]*:\/\/[^:\s/]+:)[^@\s]+@/gi;
const BEARER_TOKEN_PATTERN = /(bearer\s+)[a-z0-9\-._~+/]+=*/gi;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;

function resolveLogLevel(): LogLevel {
  const value = (process.env.LOG_LEVEL || '').trim().toLowerCase();
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }

  return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

function shouldLog(level: LogLevel) {
  const configured = resolveLogLevel();
  return LOG_PRIORITIES[level] >= LOG_PRIORITIES[configured];
}

function shouldRedactKey(key: string) {
  const lower = key.toLowerCase();
  return REDACT_KEYS.some((part) => lower.includes(part));
}

function redactStringValue(value: string) {
  return value
    .replace(URI_CREDENTIAL_PATTERN, '$1[redacted]@')
    .replace(BEARER_TOKEN_PATTERN, '$1[redacted]')
    .replace(JWT_PATTERN, '[redacted-jwt]');
}

function redactValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[depth-limit]';

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }

  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, inner]) => {
      output[key] = shouldRedactKey(key) ? '[redacted]' : redactValue(inner, depth + 1);
    });
    return output;
  }

  if (typeof value === 'string') {
    return redactStringValue(value);
  }

  return value;
}

export function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    };
  }

  return {
    message: typeof error === 'string' ? error : 'Unknown error',
  };
}

function emit(level: LogLevel, event: string, meta?: LogMeta) {
  if (!shouldLog(level)) return;

  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    app: 'elchanan-construction-platform',
    env: process.env.NODE_ENV || 'development',
    ...(meta ? { meta: redactValue(meta) } : {}),
  };

  const line = JSON.stringify(payload);

  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function logDebug(event: string, meta?: LogMeta) {
  emit('debug', event, meta);
}

export function logInfo(event: string, meta?: LogMeta) {
  emit('info', event, meta);
}

export function logWarn(event: string, meta?: LogMeta) {
  emit('warn', event, meta);
}

export function logError(event: string, meta?: LogMeta) {
  emit('error', event, meta);
}

export function getOrCreateRequestId(request: Request) {
  const fromHeader = request.headers.get('x-request-id')?.trim();
  if (fromHeader && fromHeader.length <= 120) {
    return fromHeader;
  }

  const randomPart = Math.random().toString(16).slice(2, 10);
  return `req_${Date.now().toString(36)}_${randomPart}`;
}

export function buildRequestLogMeta(request: Request, route: string, requestId: string) {
  const url = new URL(request.url);

  return {
    requestId,
    route,
    method: request.method,
    path: url.pathname,
  };
}
