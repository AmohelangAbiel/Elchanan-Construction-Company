-- CreateEnum
CREATE TYPE "ProjectMilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED');

-- CreateEnum
CREATE TYPE "PortalDocumentType" AS ENUM ('QUOTE', 'PROJECT', 'GENERAL', 'IMAGE', 'CONTRACT', 'INVOICE');

-- AlterTable
ALTER TABLE "DeliveryProject"
  ADD COLUMN "portalVisible" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "projectCode" TEXT,
  ADD COLUMN "clientSummary" TEXT,
  ADD COLUMN "estimatedCompletion" TIMESTAMP(3),
  ADD COLUMN "lastClientUpdateAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ClientUser" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "displayName" TEXT,
  "phone" TEXT,
  "companyName" TEXT,
  "location" TEXT,
  "contactPreference" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sessionVersion" INTEGER NOT NULL DEFAULT 0,
  "lastLoginAt" TIMESTAMP(3),
  "leadId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClientUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectMilestone" (
  "id" TEXT NOT NULL,
  "deliveryProjectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "ProjectMilestoneStatus" NOT NULL DEFAULT 'PENDING',
  "targetDate" TIMESTAMP(3),
  "completedDate" TIMESTAMP(3),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "clientVisible" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUpdate" (
  "id" TEXT NOT NULL,
  "deliveryProjectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "body" TEXT NOT NULL,
  "postedByLabel" TEXT,
  "postedByAdminId" TEXT,
  "clientVisible" BOOLEAN NOT NULL DEFAULT true,
  "imageUrl" TEXT,
  "attachmentUrl" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProjectUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalDocument" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "type" "PortalDocumentType" NOT NULL DEFAULT 'GENERAL',
  "url" TEXT NOT NULL,
  "fileName" TEXT,
  "mimeType" TEXT,
  "bytes" INTEGER,
  "clientVisible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "leadId" TEXT,
  "quoteRequestId" TEXT,
  "deliveryProjectId" TEXT,
  "uploadedByAdminId" TEXT,
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PortalDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryProject_projectCode_key" ON "DeliveryProject"("projectCode");

-- CreateIndex
CREATE INDEX "DeliveryProject_leadId_portalVisible_status_idx" ON "DeliveryProject"("leadId", "portalVisible", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClientUser_email_key" ON "ClientUser"("email");

-- CreateIndex
CREATE INDEX "ClientUser_leadId_isActive_idx" ON "ClientUser"("leadId", "isActive");

-- CreateIndex
CREATE INDEX "ClientUser_isActive_createdAt_idx" ON "ClientUser"("isActive", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectMilestone_deliveryProjectId_clientVisible_sortOrder_idx" ON "ProjectMilestone"("deliveryProjectId", "clientVisible", "sortOrder");

-- CreateIndex
CREATE INDEX "ProjectMilestone_deliveryProjectId_status_targetDate_idx" ON "ProjectMilestone"("deliveryProjectId", "status", "targetDate");

-- CreateIndex
CREATE INDEX "ProjectMilestone_deletedAt_createdAt_idx" ON "ProjectMilestone"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectUpdate_deliveryProjectId_clientVisible_publishedAt_idx" ON "ProjectUpdate"("deliveryProjectId", "clientVisible", "publishedAt");

-- CreateIndex
CREATE INDEX "ProjectUpdate_postedByAdminId_createdAt_idx" ON "ProjectUpdate"("postedByAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "ProjectUpdate_deletedAt_createdAt_idx" ON "ProjectUpdate"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "PortalDocument_leadId_clientVisible_createdAt_idx" ON "PortalDocument"("leadId", "clientVisible", "createdAt");

-- CreateIndex
CREATE INDEX "PortalDocument_quoteRequestId_clientVisible_createdAt_idx" ON "PortalDocument"("quoteRequestId", "clientVisible", "createdAt");

-- CreateIndex
CREATE INDEX "PortalDocument_deliveryProjectId_clientVisible_createdAt_idx" ON "PortalDocument"("deliveryProjectId", "clientVisible", "createdAt");

-- CreateIndex
CREATE INDEX "PortalDocument_type_clientVisible_createdAt_idx" ON "PortalDocument"("type", "clientVisible", "createdAt");

-- CreateIndex
CREATE INDEX "PortalDocument_uploadedByAdminId_createdAt_idx" ON "PortalDocument"("uploadedByAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "PortalDocument_deletedAt_createdAt_idx" ON "PortalDocument"("deletedAt", "createdAt");

-- AddForeignKey
ALTER TABLE "ClientUser"
  ADD CONSTRAINT "ClientUser_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectMilestone"
  ADD CONSTRAINT "ProjectMilestone_deliveryProjectId_fkey"
  FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate"
  ADD CONSTRAINT "ProjectUpdate_deliveryProjectId_fkey"
  FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectUpdate"
  ADD CONSTRAINT "ProjectUpdate_postedByAdminId_fkey"
  FOREIGN KEY ("postedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalDocument"
  ADD CONSTRAINT "PortalDocument_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalDocument"
  ADD CONSTRAINT "PortalDocument_quoteRequestId_fkey"
  FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalDocument"
  ADD CONSTRAINT "PortalDocument_deliveryProjectId_fkey"
  FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalDocument"
  ADD CONSTRAINT "PortalDocument_uploadedByAdminId_fkey"
  FOREIGN KEY ("uploadedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
