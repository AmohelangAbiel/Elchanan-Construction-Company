-- CreateEnum
CREATE TYPE "QuoteApprovalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentApprovalStatus" AS ENUM ('DRAFT', 'SENT', 'VIEWED', 'APPROVED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingType" AS ENUM ('DEPOSIT', 'MILESTONE', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CARD', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PortalDocumentType" ADD VALUE 'AGREEMENT';
ALTER TYPE "PortalDocumentType" ADD VALUE 'SCOPE_DOCUMENT';
ALTER TYPE "PortalDocumentType" ADD VALUE 'TERMS_ATTACHMENT';
ALTER TYPE "PortalDocumentType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "PortalDocument" ADD COLUMN     "approvalStatus" "DocumentApprovalStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "clientRespondedAt" TIMESTAMP(3),
ADD COLUMN     "clientRespondedByClientUserId" TEXT,
ADD COLUMN     "clientResponseNote" TEXT,
ADD COLUMN     "clientViewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "QuoteRequest" ADD COLUMN     "approvalStatus" "QuoteApprovalStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "clientRespondedAt" TIMESTAMP(3),
ADD COLUMN     "clientRespondedByClientUserId" TEXT,
ADD COLUMN     "clientResponseNote" TEXT,
ADD COLUMN     "clientViewedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "billingType" "BillingType" NOT NULL DEFAULT 'OTHER',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "clientVisible" BOOLEAN NOT NULL DEFAULT false,
    "leadId" TEXT,
    "quoteRequestId" TEXT,
    "deliveryProjectId" TEXT,
    "projectMilestoneId" TEXT,
    "issuedByAdminId" TEXT,
    "issuedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2),
    "tax" DECIMAL(12,2),
    "total" DECIMAL(12,2),
    "notes" TEXT,
    "paymentInstructions" TEXT,
    "footerNote" TEXT,
    "clientViewedAt" TIMESTAMP(3),
    "clientViewedByClientUserId" TEXT,
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2),
    "amount" DECIMAL(12,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "paymentReference" TEXT,
    "notes" TEXT,
    "method" "PaymentMethod" NOT NULL,
    "recordedByAdminId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_leadId_status_dueDate_idx" ON "Invoice"("leadId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_quoteRequestId_status_createdAt_idx" ON "Invoice"("quoteRequestId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_deliveryProjectId_status_createdAt_idx" ON "Invoice"("deliveryProjectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_projectMilestoneId_status_createdAt_idx" ON "Invoice"("projectMilestoneId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_issuedByAdminId_createdAt_idx" ON "Invoice"("issuedByAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_clientVisible_status_dueDate_idx" ON "Invoice"("clientVisible", "status", "dueDate");

-- CreateIndex
CREATE INDEX "Invoice_deletedAt_createdAt_idx" ON "Invoice"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceLineItem_invoiceId_sortOrder_idx" ON "InvoiceLineItem"("invoiceId", "sortOrder");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_paymentDate_idx" ON "Payment"("invoiceId", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_recordedByAdminId_createdAt_idx" ON "Payment"("recordedByAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_deletedAt_createdAt_idx" ON "Payment"("deletedAt", "createdAt");

-- CreateIndex
CREATE INDEX "PortalDocument_approvalStatus_clientVisible_createdAt_idx" ON "PortalDocument"("approvalStatus", "clientVisible", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_approvalStatus_createdAt_idx" ON "QuoteRequest"("approvalStatus", "createdAt");

-- CreateIndex
CREATE INDEX "QuoteRequest_clientRespondedAt_approvalStatus_idx" ON "QuoteRequest"("clientRespondedAt", "approvalStatus");

-- AddForeignKey
ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_clientRespondedByClientUserId_fkey" FOREIGN KEY ("clientRespondedByClientUserId") REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortalDocument" ADD CONSTRAINT "PortalDocument_clientRespondedByClientUserId_fkey" FOREIGN KEY ("clientRespondedByClientUserId") REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_deliveryProjectId_fkey" FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issuedByAdminId_fkey" FOREIGN KEY ("issuedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientViewedByClientUserId_fkey" FOREIGN KEY ("clientViewedByClientUserId") REFERENCES "ClientUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLineItem" ADD CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_recordedByAdminId_fkey" FOREIGN KEY ("recordedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
