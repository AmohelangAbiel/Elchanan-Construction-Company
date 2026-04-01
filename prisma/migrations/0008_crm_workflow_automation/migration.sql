-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DeliveryProjectStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('ENQUIRY_SUBMITTED', 'QUOTE_REQUESTED', 'REVIEW_SUBMITTED', 'THREAD_SUBMITTED', 'REPLY_SUBMITTED', 'LEAD_CREATED', 'LEAD_STATUS_CHANGED', 'LEAD_ASSIGNED', 'ENQUIRY_ASSIGNED', 'QUOTE_ASSIGNED', 'QUOTE_STATUS_CHANGED', 'QUOTE_WON', 'PROJECT_CONVERTED', 'TASK_CREATED', 'TASK_STATUS_CHANGED', 'TASK_ASSIGNED', 'TASK_COMPLETED', 'NOTE_ADDED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CommunicationChannel" ADD VALUE 'CALL';
ALTER TYPE "CommunicationChannel" ADD VALUE 'MEETING';
ALTER TYPE "CommunicationChannel" ADD VALUE 'GENERAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'SALES';
ALTER TYPE "UserRole" ADD VALUE 'CONTENT_MANAGER';
ALTER TYPE "UserRole" ADD VALUE 'MODERATOR';

-- AlterTable
ALTER TABLE "CommunicationLog" ADD COLUMN     "deliveryProjectId" TEXT,
ADD COLUMN     "leadId" TEXT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ContactEnquiry" ADD COLUMN     "assignedToAdminId" TEXT,
ADD COLUMN     "leadId" TEXT;

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "assignedToAdminId" TEXT,
ADD COLUMN     "leadId" TEXT;

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "companyName" TEXT,
    "location" TEXT,
    "notes" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceType" "LeadSourceType" NOT NULL DEFAULT 'DIRECT',
    "sourcePath" TEXT,
    "sourcePage" TEXT,
    "sourceReferrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "assignedToAdminId" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryProject" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DeliveryProjectStatus" NOT NULL DEFAULT 'PLANNED',
    "startTarget" TIMESTAMP(3),
    "notes" TEXT,
    "quoteRequestId" TEXT,
    "leadId" TEXT,
    "createdByAdminId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedToAdminId" TEXT,
    "createdByAdminId" TEXT,
    "leadId" TEXT,
    "enquiryId" TEXT,
    "quoteRequestId" TEXT,
    "deliveryProjectId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "actorAdminId" TEXT,
    "leadId" TEXT,
    "enquiryId" TEXT,
    "quoteRequestId" TEXT,
    "taskId" TEXT,
    "deliveryProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_status_createdAt_idx" ON "Lead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_assignedToAdminId_status_idx" ON "Lead"("assignedToAdminId", "status");

-- CreateIndex
CREATE INDEX "Lead_deletedAt_createdAt_idx" ON "Lead"("deletedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_email_phone_key" ON "Lead"("email", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "DeliveryProject_quoteRequestId_key" ON "DeliveryProject"("quoteRequestId");

-- CreateIndex
CREATE INDEX "DeliveryProject_status_createdAt_idx" ON "DeliveryProject"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DeliveryProject_leadId_status_idx" ON "DeliveryProject"("leadId", "status");

-- CreateIndex
CREATE INDEX "DeliveryProject_deletedAt_createdAt_idx" ON "DeliveryProject"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "FollowUpTask_status_dueAt_idx" ON "FollowUpTask"("status", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUpTask_priority_dueAt_idx" ON "FollowUpTask"("priority", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUpTask_assignedToAdminId_status_dueAt_idx" ON "FollowUpTask"("assignedToAdminId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "FollowUpTask_leadId_status_idx" ON "FollowUpTask"("leadId", "status");

-- CreateIndex
CREATE INDEX "FollowUpTask_enquiryId_status_idx" ON "FollowUpTask"("enquiryId", "status");

-- CreateIndex
CREATE INDEX "FollowUpTask_quoteRequestId_status_idx" ON "FollowUpTask"("quoteRequestId", "status");

-- CreateIndex
CREATE INDEX "FollowUpTask_deliveryProjectId_status_idx" ON "FollowUpTask"("deliveryProjectId", "status");

-- CreateIndex
CREATE INDEX "FollowUpTask_deletedAt_dueAt_idx" ON "FollowUpTask"("deletedAt", "dueAt");

-- CreateIndex
CREATE INDEX "ActivityLog_type_createdAt_idx" ON "ActivityLog"("type", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_leadId_createdAt_idx" ON "ActivityLog"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_enquiryId_createdAt_idx" ON "ActivityLog"("enquiryId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_quoteRequestId_createdAt_idx" ON "ActivityLog"("quoteRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_taskId_createdAt_idx" ON "ActivityLog"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_deliveryProjectId_createdAt_idx" ON "ActivityLog"("deliveryProjectId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_actorAdminId_createdAt_idx" ON "ActivityLog"("actorAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_leadId_occurredAt_idx" ON "CommunicationLog"("leadId", "occurredAt");

-- CreateIndex
CREATE INDEX "CommunicationLog_deliveryProjectId_occurredAt_idx" ON "CommunicationLog"("deliveryProjectId", "occurredAt");

-- CreateIndex
CREATE INDEX "ContactEnquiry_assignedToAdminId_status_idx" ON "ContactEnquiry"("assignedToAdminId", "status");

-- CreateIndex
CREATE INDEX "ContactEnquiry_leadId_createdAt_idx" ON "ContactEnquiry"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_assignedToAdminId_status_idx" ON "QuoteRequest"("assignedToAdminId", "status");

-- CreateIndex
CREATE INDEX "QuoteRequest_leadId_createdAt_idx" ON "QuoteRequest"("leadId", "createdAt");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToAdminId_fkey" FOREIGN KEY ("assignedToAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactEnquiry" ADD CONSTRAINT "ContactEnquiry_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactEnquiry" ADD CONSTRAINT "ContactEnquiry_assignedToAdminId_fkey" FOREIGN KEY ("assignedToAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_assignedToAdminId_fkey" FOREIGN KEY ("assignedToAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProject" ADD CONSTRAINT "DeliveryProject_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProject" ADD CONSTRAINT "DeliveryProject_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryProject" ADD CONSTRAINT "DeliveryProject_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_assignedToAdminId_fkey" FOREIGN KEY ("assignedToAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "ContactEnquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_deliveryProjectId_fkey" FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "ContactEnquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "FollowUpTask"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_deliveryProjectId_fkey" FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationLog" ADD CONSTRAINT "CommunicationLog_deliveryProjectId_fkey" FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
