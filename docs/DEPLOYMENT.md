# Production Deployment Guide

This guide describes a reliable baseline deployment for the Elchanan Construction Company platform.

## Required Services
- Node.js 18+ runtime
- PostgreSQL 14+ database
- Redis (recommended for distributed rate limiting)
- SMTP provider (optional but recommended for real email delivery)
- Persistent storage for uploads (`public/uploads` or `LOCAL_MEDIA_UPLOAD_DIR`)

## Required Environment Variables
- `DATABASE_URL`
- `ADMIN_SECRET`
- `IP_HASH_SALT`
- `NEXT_PUBLIC_SITE_URL`

## Recommended Environment Variables
- `NEXT_PUBLIC_COMPANY_PHONE_DISPLAY`
- `NEXT_PUBLIC_WHATSAPP_NUMBER`
- `REDIS_URL`
- `REDIS_TOKEN` (if your Redis provider uses token/password auth)
- `REDIS_RATE_LIMIT_PREFIX`
- `REPORT_EXPORT_MAX_ROWS`
- `BANNED_TERMS`
- `EMAIL_PROVIDER` (`smtp` in production)
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `EMAIL_ADMIN_ALERTS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `LOCAL_MEDIA_UPLOAD_DIR`
- `HEALTHCHECK_SECRET`
- `LOG_LEVEL`
- `DEBUG_LOGS`

## Optional Bootstrap/Test Variables
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`
- `E2E_ADMIN_EMAIL`
- `E2E_ADMIN_PASSWORD`

## Build and Start
1. Install dependencies:
   - `npm install`
2. Generate Prisma client:
   - `npm run prisma:generate`
3. Apply migrations:
   - `npm run prisma:deploy`
4. (Optional first deployment) seed baseline data:
   - `npm run db:seed`
5. Build:
   - `npm run build`
6. Start:
   - `npm run start`

## CI/Smoke Verification Commands
- `npm run lint`
- `npm run build`
- `npm run test:e2e`

## Health and Readiness
- Liveness: `GET /api/health`
- Readiness: `GET /api/health/ready`
  - If `HEALTHCHECK_SECRET` is set, send it via:
    - `x-healthcheck-secret: <secret>` or
    - `Authorization: Bearer <secret>`

Readiness includes:
- app status
- database connectivity
- redis availability (or fallback mode)
- environment validation status

## Migration and Release Flow
1. Deploy code.
2. Run `npm run prisma:deploy`.
3. Run smoke checks:
   - `/api/health`
   - `/api/health/ready` (with secret if configured)
4. Run key auth checks:
   - admin login
   - one protected admin mutation
5. Monitor logs for:
   - `auth.*`
   - `rate_limit.*`
   - `submission.*`
   - `report_export.*`
   - `health.*`

## Redis Assumptions
- If Redis is unavailable, rate limiting falls back to in-memory mode.
- Fallback preserves functionality but is not shared across instances.
- Production should keep Redis healthy for consistent throttling.

## Storage Assumptions
- Development default: `public/uploads`.
- Production should use a persistent volume or set `LOCAL_MEDIA_UPLOAD_DIR`.
- Keep upload directory in backups.

## Email Assumptions
- `EMAIL_PROVIDER=console` is safe for dev/testing.
- Use `EMAIL_PROVIDER=smtp` with full SMTP credentials in production.
- Verify SPF/DKIM/DMARC on sending domain.

## Common Failure Modes
- Missing/weak `ADMIN_SECRET`:
  - symptom: auth failures or login issues
  - fix: set strong secret and redeploy
- Database connection failure:
  - symptom: readiness degraded / 503
  - fix: validate `DATABASE_URL`, DB availability, network rules
- Redis unavailable:
  - symptom: readiness degraded, `rate_limit.redis_fallback` logs
  - fix: restore Redis connectivity and credentials
- SMTP misconfiguration:
  - symptom: `email.smtp_send_failed` logs
  - fix: verify SMTP host, auth, and port security settings
