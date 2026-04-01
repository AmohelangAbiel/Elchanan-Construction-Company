import crypto from 'crypto';
import { sanitizeText } from './sanitize';

export type EnvValidationReport = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    redisConfigured: boolean;
    smtpConfigured: boolean;
    uploadRootConfigured: boolean;
    healthSecretConfigured: boolean;
    portalSecretConfigured: boolean;
  };
};

function isTruthy(value: unknown) {
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function hasValue(value: unknown) {
  return typeof value === 'string' && Boolean(value.trim());
}

function isPlaceholderSecret(value: string | undefined) {
  if (!value) return true;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (normalized.includes('replace-with')) return true;
  return normalized.length < 16;
}

export function getEnvValidationReport(): EnvValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  const databaseUrl = sanitizeText(process.env.DATABASE_URL, 2048);
  const adminSecret = sanitizeText(process.env.ADMIN_SECRET, 512);
  const portalSecret = sanitizeText(process.env.PORTAL_SECRET, 512);
  const siteUrl = sanitizeText(process.env.NEXT_PUBLIC_SITE_URL, 2048);
  const ipHashSalt = sanitizeText(process.env.IP_HASH_SALT, 512);

  if (!databaseUrl) {
    errors.push('DATABASE_URL is missing.');
  } else if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    errors.push('DATABASE_URL must use a PostgreSQL connection string.');
  }

  if (isPlaceholderSecret(adminSecret)) {
    errors.push('ADMIN_SECRET is missing or too weak (use a strong secret of at least 24 characters).');
  }

  if (isPlaceholderSecret(portalSecret)) {
    errors.push('PORTAL_SECRET is missing or too weak (use a strong secret of at least 24 characters).');
  }

  if (!siteUrl) {
    warnings.push('NEXT_PUBLIC_SITE_URL is not set; canonical URLs and metadata may be inaccurate.');
  }

  if (isProduction && isPlaceholderSecret(ipHashSalt)) {
    errors.push('IP_HASH_SALT is required and must be strong in production.');
  } else if (!ipHashSalt) {
    warnings.push('IP_HASH_SALT is not set; development fallback hashing will be used.');
  }

  const redisConfigured = hasValue(process.env.REDIS_URL);
  if (redisConfigured && !hasValue(process.env.REDIS_RATE_LIMIT_PREFIX)) {
    warnings.push('REDIS_RATE_LIMIT_PREFIX is not set; default namespace will be used.');
  }

  const emailProvider = sanitizeText(process.env.EMAIL_PROVIDER, 20).toLowerCase() || 'console';
  const smtpConfigured = emailProvider === 'smtp'
    && hasValue(process.env.SMTP_HOST)
    && hasValue(process.env.SMTP_USER)
    && hasValue(process.env.SMTP_PASS);
  if (emailProvider === 'smtp' && !smtpConfigured) {
    errors.push('EMAIL_PROVIDER is smtp but SMTP_HOST/SMTP_USER/SMTP_PASS are incomplete.');
  }

  if (!hasValue(process.env.EMAIL_FROM)) {
    warnings.push('EMAIL_FROM is not set; fallback sender address will be used.');
  }

  if (!hasValue(process.env.SEED_ADMIN_PASSWORD) && !isProduction) {
    warnings.push('SEED_ADMIN_PASSWORD is not set; default demo password may be used for seed.');
  }

  if (isProduction && !hasValue(process.env.HEALTHCHECK_SECRET)) {
    warnings.push('HEALTHCHECK_SECRET is not set; readiness endpoint will remain publicly accessible.');
  }

  if (isProduction && !hasValue(process.env.LOG_LEVEL)) {
    warnings.push('LOG_LEVEL is not set; default production log level "info" will be used.');
  }

  if (!hasValue(process.env.LOCAL_MEDIA_UPLOAD_DIR)) {
    warnings.push('LOCAL_MEDIA_UPLOAD_DIR is not set; media uploads default to ./public/uploads.');
  }

  if (redisConfigured && hasValue(process.env.REDIS_TOKEN) && !process.env.REDIS_URL?.includes('@')) {
    warnings.push('REDIS_TOKEN is set. Ensure your provider supports password auth with the configured REDIS_URL.');
  }

  const healthSecretConfigured = hasValue(process.env.HEALTHCHECK_SECRET);
  const portalSecretConfigured = !isPlaceholderSecret(portalSecret);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary: {
      redisConfigured,
      smtpConfigured,
      uploadRootConfigured: hasValue(process.env.LOCAL_MEDIA_UPLOAD_DIR),
      healthSecretConfigured,
      portalSecretConfigured,
    },
  };
}

export function isReadinessTokenValid(request: Request) {
  const configuredSecret = sanitizeText(process.env.HEALTHCHECK_SECRET, 512);
  if (!configuredSecret) return true;

  const provided = sanitizeText(
    request.headers.get('x-healthcheck-secret') || request.headers.get('authorization') || '',
    512,
  );
  if (!provided) return false;

  function safeEquals(value: string) {
    const a = Buffer.from(configuredSecret);
    const b = Buffer.from(value);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  if (safeEquals(provided)) return true;
  if (provided.startsWith('Bearer ')) {
    return safeEquals(sanitizeText(provided.slice('Bearer '.length), 512));
  }

  return false;
}

export function getExportRowLimit() {
  const raw = Number(process.env.REPORT_EXPORT_MAX_ROWS || '5000');
  if (!Number.isFinite(raw)) return 5000;
  return Math.min(Math.max(Math.floor(raw), 200), 20000);
}

export function shouldEmitDebugLogs() {
  return isTruthy(process.env.DEBUG_LOGS);
}
