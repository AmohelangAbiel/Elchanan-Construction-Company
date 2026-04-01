CREATE TYPE "LeadSourceType" AS ENUM (
  'DIRECT',
  'CONTACT_PAGE',
  'QUOTE_PAGE',
  'SERVICE_PAGE',
  'PROJECT_PAGE',
  'WHATSAPP',
  'FORUM_PAGE',
  'OTHER'
);

ALTER TABLE "ContactEnquiry"
  ADD COLUMN "sourceType" "LeadSourceType" NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN "sourcePath" TEXT,
  ADD COLUMN "sourcePage" TEXT,
  ADD COLUMN "sourceReferrer" TEXT,
  ADD COLUMN "utmSource" TEXT,
  ADD COLUMN "utmMedium" TEXT,
  ADD COLUMN "utmCampaign" TEXT;

ALTER TABLE "QuoteRequest"
  ADD COLUMN "sourceType" "LeadSourceType" NOT NULL DEFAULT 'DIRECT',
  ADD COLUMN "sourcePath" TEXT,
  ADD COLUMN "sourcePage" TEXT,
  ADD COLUMN "sourceReferrer" TEXT,
  ADD COLUMN "utmSource" TEXT,
  ADD COLUMN "utmMedium" TEXT,
  ADD COLUMN "utmCampaign" TEXT;

CREATE INDEX "ContactEnquiry_sourceType_createdAt_idx" ON "ContactEnquiry"("sourceType", "createdAt");
CREATE INDEX "ContactEnquiry_sourcePage_createdAt_idx" ON "ContactEnquiry"("sourcePage", "createdAt");
CREATE INDEX "QuoteRequest_sourceType_createdAt_idx" ON "QuoteRequest"("sourceType", "createdAt");
CREATE INDEX "QuoteRequest_sourcePage_createdAt_idx" ON "QuoteRequest"("sourcePage", "createdAt");
