# Elchanan Construction Company Platform

Production-style Next.js business platform for Elchanan Construction Company with real backend workflows for enquiries, quotes, reviews, forum discussions, and admin content management.

## Stack
- Next.js 14 App Router + TypeScript
- Tailwind CSS design system (logo-driven brand tokens)
- Prisma ORM + PostgreSQL
- Zod validation
- Secure admin auth (hashed passwords + signed session cookie)

## Public Routes
- `/`
- `/about`
- `/services`
- `/services/[slug]`
- `/projects`
- `/projects/[slug]`
- `/solutions`
- `/pricing`
- `/quote`
- `/contact`
- `/faq`
- `/forum`
- `/forum/[slug]`
- `/reviews`

## Admin Routes
- `/admin`
- `/admin/login`
- `/admin/enquiries`
- `/admin/enquiries/[id]`
- `/admin/quotes`
- `/admin/quotes/[id]`
- `/admin/quotes/[id]/document`
- `/admin/reviews`
- `/admin/reviews/[id]`
- `/admin/forum`
- `/admin/forum/[id]`
- `/admin/services`
- `/admin/projects`
- `/admin/pricing`
- `/admin/media`
- `/admin/settings`

## Client Portal Routes
- `/portal/login`
- `/portal`
- `/portal/quotes`
- `/portal/quotes/[id]`
- `/portal/quotes/[id]/document`
- `/portal/projects`
- `/portal/projects/[id]`
- `/portal/documents`
- `/portal/profile`

## API Workflows
- Public:
  - `POST /api/enquiries`
  - `POST /api/quotes`
  - `POST /api/reviews`
  - `POST /api/forum`
  - `POST /api/forum/[slug]/replies`
- Admin:
  - `POST /api/admin/login`
  - `POST /api/admin/logout`
  - `POST /api/admin/session/revoke`
  - `POST /api/admin/enquiries/[id]`
  - `POST /api/admin/quotes/[id]`
  - `POST /api/admin/reviews/[id]`
  - `POST /api/admin/forum/[id]`
  - `POST /api/admin/forum/replies/[id]`
  - `POST /api/admin/services`
  - `POST /api/admin/services/[id]`
  - `POST /api/admin/projects`
  - `POST /api/admin/projects/[id]`
  - `POST /api/admin/pricing`
  - `POST /api/admin/pricing/[id]`
  - `POST /api/admin/media/upload`
  - `POST /api/admin/settings`
  - `GET /api/admin/reports/enquiries/export`
  - `GET /api/admin/reports/quotes/export`
- Portal:
  - `POST /api/portal/login`
  - `POST /api/portal/logout`
  - `POST /api/portal/profile`
  - `GET /api/portal/documents/[id]`
- Operations:
  - `GET /api/health`
  - `GET /api/health/ready`

## Database Models
- `AdminUser`
- `ClientUser`
- `CompanyProfile`
- `Lead`
- `ContactEnquiry`
- `QuoteRequest`
- `DeliveryProject`
- `ProjectMilestone`
- `ProjectUpdate`
- `PortalDocument`
- `Review`
- `ForumCategory`
- `ForumThread`
- `ForumReply`
- `Service`
- `Project`
- `PricingPlan`
- `MediaAsset`
- `AuditLog`
- `NewsletterSubscriber`

## Environment Variables
Copy `.env.example` to `.env` and set values:

- `DATABASE_URL`
- `ADMIN_SECRET`
- `PORTAL_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_COMPANY_PHONE_DISPLAY` (optional display number for CTAs/header)
- `NEXT_PUBLIC_WHATSAPP_NUMBER` (optional fallback WhatsApp number for CTA links)
- `EMAIL_PROVIDER` (`console` or `smtp`)
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `EMAIL_ADMIN_ALERTS` (comma-separated)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` (when `EMAIL_PROVIDER=smtp`)
- `LOCAL_MEDIA_UPLOAD_DIR` (optional local storage override for uploads)
- `IP_HASH_SALT`
- `REDIS_URL` (optional for distributed rate limiting)
- `REDIS_TOKEN` (optional provider token/password auth)
- `REDIS_RATE_LIMIT_PREFIX` (optional key namespace)
- `REPORT_EXPORT_MAX_ROWS` (optional export cap, default `5000`, max `20000`)
- `BANNED_TERMS` (optional comma-separated list)
- `HEALTHCHECK_SECRET` (optional readiness endpoint secret)
- `LOG_LEVEL` (`debug`, `info`, `warn`, `error`)
- `DEBUG_LOGS` (optional, `true/false`)
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`
- `SEED_PORTAL_EMAIL`
- `SEED_PORTAL_PASSWORD`
- `SEED_PORTAL_NAME`
- `E2E_ADMIN_EMAIL` (optional, for Playwright login success test)
- `E2E_ADMIN_PASSWORD` (optional, for Playwright login success test)
- `E2E_PORTAL_EMAIL` (optional, for Playwright portal login/ownership tests)
- `E2E_PORTAL_PASSWORD` (optional, for Playwright portal login/ownership tests)
- `E2E_PORTAL_SECONDARY_EMAIL` (optional, secondary portal fixture identity for isolation tests)
- `E2E_PORTAL_SECONDARY_PASSWORD` (optional, secondary portal fixture password)
- `PLAYWRIGHT_PORT` (optional Playwright dev-server port, default `3100`)
- `PLAYWRIGHT_BASE_URL` (optional, disables local webServer startup when set)
- `PLAYWRIGHT_REUSE_SERVER` (optional, default `false`; set `true` to reuse an existing test server)

## Local Setup
1. Install dependencies
   ```bash
   npm install
   ```
2. Generate Prisma client
   ```bash
   npm run prisma:generate
   ```
3. Run migrations
   ```bash
   npm run prisma:migrate
   ```
4. Seed demo data
   ```bash
   npm run db:seed
   ```
5. Start dev server
   ```bash
   npm run dev
   ```

## Build
```bash
npm run build
```

## Runtime Health Checks
- Liveness: `GET /api/health`
- Readiness: `GET /api/health/ready`
  - If `HEALTHCHECK_SECRET` is configured, send `x-healthcheck-secret: <secret>` or `Authorization: Bearer <secret>`

## E2E Security Tests
```bash
npm run test:e2e
```

Playwright will auto-start the app on `http://127.0.0.1:3100` unless `PLAYWRIGHT_BASE_URL` is provided.
The suite auto-provisions a deterministic admin + forum fixture in `beforeAll`, so auth/revocation/redirect coverage runs even when seed credentials are not preconfigured.

## Seeded Admin Login
Defaults come from `.env` values used by the seed script:
- Email: value of `SEED_ADMIN_EMAIL` (default in `.env.example`: `admin@elchananconstruction.co.za`)
- Password: value of `SEED_ADMIN_PASSWORD` (default in `.env.example`: `ChangeMe_Elchanan_Admin_2026!`)

Change these immediately for non-demo environments.

## Seeded Portal Login
Defaults come from `.env` values used by the seed script:
- Email: value of `SEED_PORTAL_EMAIL` (default in `.env.example`: `client@elchananconstruction.co.za`)
- Password: value of `SEED_PORTAL_PASSWORD` (default in `.env.example`: `ChangeMe_Elchanan_Client_2026!`)

Portal access is intentionally isolated from admin/staff authentication and only exposes records linked to the same client lead.

## Branding
- Brand source: `Logo.jpeg`
- Web assets: `public/logo.svg`, `public/logo-mark.svg`
- Global design tokens are centralized in `app/globals.css` and Tailwind config.

## Notes
- Admin auth uses signed cookies plus `sessionVersion` validation against the database for session revocation support.
- Portal auth uses a separate signed cookie/token + `sessionVersion` on `ClientUser` and is fully isolated from admin routes/APIs.
- Forms include server-side validation, sanitization, honeypot spam checks, and rate-limit protection (Redis-backed when configured, with safe in-process fallback).
- Structured server logs are emitted for auth failures, throttling, submission failures, export events, and readiness checks.
- Email notifications use a provider abstraction (`console` fallback or SMTP when configured) for admin alerts and customer acknowledgements.
- Admin media uploads are stored locally in `public/uploads` by default (or `LOCAL_MEDIA_UPLOAD_DIR`), with MIME/size validation and safe filenames.
- Branded quotation output is available at `/admin/quotes/[id]/document` and is print/PDF-ready.
- Review/forum content is moderation-first (public site only shows approved/open content).
- Sitemap/metadata/local-business JSON-LD and robots are included.

## Deployment and Backup Docs
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Backup and Recovery Strategy](docs/BACKUP_AND_RECOVERY.md)
