import crypto from 'crypto';

const MULTISPACE_REGEX = /\s+/g;
const TAG_REGEX = /<[^>]*>/g;

export function sanitizeText(value: unknown, maxLength = 4000): string {
  if (typeof value !== 'string') return '';

  return value
    .replace(TAG_REGEX, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(MULTISPACE_REGEX, ' ')
    .trim()
    .slice(0, maxLength);
}

export function sanitizeOptionalText(value: unknown, maxLength = 4000): string | undefined {
  const sanitized = sanitizeText(value, maxLength);
  return sanitized.length ? sanitized : undefined;
}

export function normalizeEmail(value: unknown): string {
  return sanitizeText(value, 320).toLowerCase();
}

export function normalizePhone(value: unknown): string {
  return sanitizeText(value, 50)
    .replace(/[^0-9+()\-\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createReferenceCode(prefix: string): string {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(2, 10);
  const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${stamp}-${randomPart}`;
}

export function slugify(input: string): string {
  return sanitizeText(input, 160)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('IP_HASH_SALT must be configured in production.');
    }
    return crypto.createHash('sha256').update(`dev-ip-hash-salt:${ip}`).digest('hex');
  }
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

export function extractRequestIp(headers: Headers): string | null {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null;
  }

  return headers.get('x-real-ip');
}
