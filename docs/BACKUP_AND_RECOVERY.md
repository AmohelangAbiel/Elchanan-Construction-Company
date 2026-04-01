# Backup and Recovery Strategy

This document defines the minimum production backup posture for the platform.

## What Must Be Backed Up
- PostgreSQL database (all schemas used by Prisma)
- Uploaded media files (`public/uploads` or `LOCAL_MEDIA_UPLOAD_DIR`)
- Environment and secret configuration (stored in your secret manager, not in repo)

## Backup Frequency
- Database:
  - daily full backup
  - optional hourly WAL/archive strategy for point-in-time recovery
- Media assets:
  - daily snapshot
  - additional snapshot before major content changes
- Secrets/config:
  - backup versioned entries in your secret manager with access control

## Suggested Database Backup Commands
- Full dump:
  - `pg_dump --format=custom --file=backup.dump "<DATABASE_URL>"`
- Plain SQL dump:
  - `pg_dump --format=plain --file=backup.sql "<DATABASE_URL>"`

PowerShell helper examples are provided:
- `scripts/backup-postgres.ps1`
- `scripts/restore-postgres.ps1`

## Restore Validation (Non-Production)
Run restore drills regularly:
1. Restore database dump to a staging database.
2. Restore media snapshot to staging storage path.
3. Start app with staging environment values.
4. Verify:
   - admin login
   - enquiries/quotes list
   - media rendering
   - quote document rendering
   - key report exports

## Recovery Priorities
1. Restore DB connectivity and data.
2. Restore media assets.
3. Re-apply environment secrets.
4. Run migrations (`npm run prisma:deploy`) only if needed for target schema.
5. Validate `/api/health` and `/api/health/ready`.

## RPO/RTO Baseline Targets
- RPO (data loss window): <= 24 hours (or lower if WAL/PITR enabled)
- RTO (service restore time): <= 4 hours

## Operational Notes
- Never store production secrets in `.env` committed to source control.
- Keep backup storage encrypted and access-controlled.
- Test restore procedures at least quarterly.
- Store retention policy and ownership (who can trigger restore) in your internal runbook.

