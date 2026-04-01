ALTER TABLE "CompanyProfile"
  ADD COLUMN IF NOT EXISTS "displayName" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceAreaText" TEXT,
  ADD COLUMN IF NOT EXISTS "socialLinks" JSONB,
  ADD COLUMN IF NOT EXISTS "quotationFooter" TEXT,
  ADD COLUMN IF NOT EXISTS "quotationDisclaimer" TEXT,
  ADD COLUMN IF NOT EXISTS "emailSignature" TEXT,
  ADD COLUMN IF NOT EXISTS "emailFooter" TEXT;

ALTER TABLE "ContactEnquiry"
  ADD COLUMN IF NOT EXISTS "followUpNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "lastContactedAt" TIMESTAMP(3);

ALTER TABLE "QuoteRequest"
  ADD COLUMN IF NOT EXISTS "followUpNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "lastContactedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "quoteSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "quoteSummary" TEXT,
  ADD COLUMN IF NOT EXISTS "scopeNotes" TEXT,
  ADD COLUMN IF NOT EXISTS "lineItems" JSONB,
  ADD COLUMN IF NOT EXISTS "estimateSubtotal" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "estimateTax" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "estimateTotal" DECIMAL(12,2),
  ADD COLUMN IF NOT EXISTS "validityDays" INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS "exclusions" TEXT,
  ADD COLUMN IF NOT EXISTS "assumptions" TEXT,
  ADD COLUMN IF NOT EXISTS "termsDisclaimer" TEXT;

ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "galleryImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "beforeImage" TEXT,
  ADD COLUMN IF NOT EXISTS "afterImage" TEXT,
  ADD COLUMN IF NOT EXISTS "beforeAfterCaption" TEXT,
  ADD COLUMN IF NOT EXISTS "scopeNotes" TEXT;

ALTER TABLE "MediaAsset"
  ADD COLUMN IF NOT EXISTS "storagePath" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB,
  ADD COLUMN IF NOT EXISTS "uploadedByAdminId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'MediaAsset_uploadedByAdminId_fkey'
  ) THEN
    ALTER TABLE "MediaAsset"
      ADD CONSTRAINT "MediaAsset_uploadedByAdminId_fkey"
      FOREIGN KEY ("uploadedByAdminId") REFERENCES "AdminUser"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'CommunicationChannel'
  ) THEN
    CREATE TYPE "CommunicationChannel" AS ENUM ('NOTE', 'EMAIL', 'PHONE', 'WHATSAPP', 'SYSTEM');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'CommunicationDirection'
  ) THEN
    CREATE TYPE "CommunicationDirection" AS ENUM ('INBOUND', 'OUTBOUND', 'INTERNAL');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CommunicationLog" (
  "id" TEXT NOT NULL,
  "channel" "CommunicationChannel" NOT NULL,
  "direction" "CommunicationDirection" NOT NULL DEFAULT 'INTERNAL',
  "subject" TEXT,
  "message" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actorName" TEXT,
  "actorEmail" TEXT,
  "enquiryId" TEXT,
  "quoteRequestId" TEXT,
  "actorAdminId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommunicationLog_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CommunicationLog_enquiryId_fkey'
  ) THEN
    ALTER TABLE "CommunicationLog"
      ADD CONSTRAINT "CommunicationLog_enquiryId_fkey"
      FOREIGN KEY ("enquiryId") REFERENCES "ContactEnquiry"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CommunicationLog_quoteRequestId_fkey'
  ) THEN
    ALTER TABLE "CommunicationLog"
      ADD CONSTRAINT "CommunicationLog_quoteRequestId_fkey"
      FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'CommunicationLog_actorAdminId_fkey'
  ) THEN
    ALTER TABLE "CommunicationLog"
      ADD CONSTRAINT "CommunicationLog_actorAdminId_fkey"
      FOREIGN KEY ("actorAdminId") REFERENCES "AdminUser"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "ContactEnquiry_lastContactedAt_status_idx"
  ON "ContactEnquiry"("lastContactedAt", "status");

CREATE INDEX IF NOT EXISTS "QuoteRequest_quoteSentAt_status_idx"
  ON "QuoteRequest"("quoteSentAt", "status");

CREATE INDEX IF NOT EXISTS "QuoteRequest_lastContactedAt_status_idx"
  ON "QuoteRequest"("lastContactedAt", "status");

CREATE INDEX IF NOT EXISTS "MediaAsset_type_createdAt_idx"
  ON "MediaAsset"("type", "createdAt");

CREATE INDEX IF NOT EXISTS "MediaAsset_uploadedByAdminId_createdAt_idx"
  ON "MediaAsset"("uploadedByAdminId", "createdAt");

CREATE INDEX IF NOT EXISTS "CommunicationLog_enquiryId_occurredAt_idx"
  ON "CommunicationLog"("enquiryId", "occurredAt");

CREATE INDEX IF NOT EXISTS "CommunicationLog_quoteRequestId_occurredAt_idx"
  ON "CommunicationLog"("quoteRequestId", "occurredAt");

CREATE INDEX IF NOT EXISTS "CommunicationLog_channel_direction_occurredAt_idx"
  ON "CommunicationLog"("channel", "direction", "occurredAt");

CREATE INDEX IF NOT EXISTS "CommunicationLog_actorAdminId_createdAt_idx"
  ON "CommunicationLog"("actorAdminId", "createdAt");
