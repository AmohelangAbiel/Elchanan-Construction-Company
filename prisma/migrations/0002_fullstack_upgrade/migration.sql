-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "ReplyStatus" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN');

-- AlterEnum
DO $$
BEGIN
  ALTER TYPE "ThreadStatus" ADD VALUE IF NOT EXISTS 'PENDING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AdminUser hardening
ALTER TABLE "AdminUser"
  ALTER COLUMN "role" DROP DEFAULT,
  ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole",
  ALTER COLUMN "role" SET DEFAULT 'ADMIN';

ALTER TABLE "AdminUser"
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

-- Company profile expansions
ALTER TABLE "CompanyProfile"
  ADD COLUMN IF NOT EXISTS "heroHeadline" TEXT,
  ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Enquiries and quotes security fields
ALTER TABLE "ContactEnquiry"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sourceIpHash" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

ALTER TABLE "QuoteRequest"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sourceIpHash" TEXT,
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

-- Reviews moderation fields
ALTER TABLE "Review"
  ADD COLUMN IF NOT EXISTS "consentGiven" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sourceIpHash" TEXT;

-- Forum model upgrades
ALTER TABLE "ForumCategory"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "published" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ForumThread"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "excerpt" TEXT,
  ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sourceIpHash" TEXT;

ALTER TABLE "ForumReply"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sourceIpHash" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "ReplyStatus" NOT NULL DEFAULT 'PENDING';

-- Content model upgrades
ALTER TABLE "Service"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT;

UPDATE "Service" SET "details" = ARRAY[]::TEXT[] WHERE "details" IS NULL;
ALTER TABLE "Service" ALTER COLUMN "details" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Service" ALTER COLUMN "details" SET NOT NULL;

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "location" TEXT,
  ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "summary" TEXT;

UPDATE "Project" SET "summary" = LEFT("description", 160) WHERE "summary" IS NULL;
ALTER TABLE "Project" ALTER COLUMN "summary" SET NOT NULL;
ALTER TABLE "Project" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
ALTER TABLE "Project" ALTER COLUMN "published" SET DEFAULT false;

ALTER TABLE "PricingPlan"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "seoTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "seoDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "summary" TEXT;

UPDATE "PricingPlan" SET "summary" = LEFT("description", 160) WHERE "summary" IS NULL;
ALTER TABLE "PricingPlan" ALTER COLUMN "summary" SET NOT NULL;
UPDATE "PricingPlan" SET "items" = ARRAY[]::TEXT[] WHERE "items" IS NULL;
ALTER TABLE "PricingPlan" ALTER COLUMN "items" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "PricingPlan" ALTER COLUMN "items" SET NOT NULL;

ALTER TABLE "MediaAsset"
  ADD COLUMN IF NOT EXISTS "altText" TEXT,
  ADD COLUMN IF NOT EXISTS "bytes" INTEGER,
  ADD COLUMN IF NOT EXISTS "mimeType" TEXT;

ALTER TABLE "AuditLog"
  ADD COLUMN IF NOT EXISTS "actorAdminId" TEXT;

ALTER TABLE "NewsletterSubscriber"
  ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Indexes
CREATE INDEX IF NOT EXISTS "ContactEnquiry_status_createdAt_idx" ON "ContactEnquiry"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "ContactEnquiry_email_createdAt_idx" ON "ContactEnquiry"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "QuoteRequest_status_createdAt_idx" ON "QuoteRequest"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "QuoteRequest_email_createdAt_idx" ON "QuoteRequest"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "Review_status_featured_createdAt_idx" ON "Review"("status", "featured", "createdAt");
CREATE INDEX IF NOT EXISTS "ForumCategory_published_sortOrder_idx" ON "ForumCategory"("published", "sortOrder");
CREATE INDEX IF NOT EXISTS "ForumThread_status_updatedAt_idx" ON "ForumThread"("status", "updatedAt");
CREATE INDEX IF NOT EXISTS "ForumThread_categoryId_status_idx" ON "ForumThread"("categoryId", "status");
CREATE INDEX IF NOT EXISTS "ForumReply_threadId_status_createdAt_idx" ON "ForumReply"("threadId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Service_published_sortOrder_idx" ON "Service"("published", "sortOrder");
CREATE INDEX IF NOT EXISTS "Project_status_published_sortOrder_idx" ON "Project"("status", "published", "sortOrder");
CREATE INDEX IF NOT EXISTS "PricingPlan_published_sortOrder_idx" ON "PricingPlan"("published", "sortOrder");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_createdAt_idx" ON "AuditLog"("entity", "entityId", "createdAt");
CREATE INDEX IF NOT EXISTS "AuditLog_actorAdminId_createdAt_idx" ON "AuditLog"("actorAdminId", "createdAt");

-- Foreign keys
DO $$
BEGIN
  ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_actorAdminId_fkey"
    FOREIGN KEY ("actorAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
