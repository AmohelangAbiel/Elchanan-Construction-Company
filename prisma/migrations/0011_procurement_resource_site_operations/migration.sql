-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MaterialItemStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ProcurementStatus" AS ENUM ('PLANNED', 'REQUESTED', 'ORDERED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseRequestStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProjectAssignmentRole" AS ENUM ('PROJECT_MANAGER', 'SITE_SUPERVISOR', 'SALES_SUPPORT', 'GENERAL_STAFF', 'CONTRACTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "SiteTaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "alternatePhone" TEXT,
    "address" TEXT,
    "cityArea" TEXT,
    "notes" TEXT,
    "supplyCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "estimatedUnitCost" DECIMAL(12,2),
    "notes" TEXT,
    "status" "MaterialItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "defaultSupplierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectProcurementItem" (
    "id" TEXT NOT NULL,
    "deliveryProjectId" TEXT NOT NULL,
    "materialItemId" TEXT,
    "preferredSupplierId" TEXT,
    "createdByAdminId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "unit" TEXT NOT NULL,
    "estimatedQuantity" DECIMAL(12,2) NOT NULL,
    "estimatedUnitCost" DECIMAL(12,2),
    "requiredBy" TIMESTAMP(3),
    "status" "ProcurementStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectProcurementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "referenceCode" TEXT NOT NULL,
    "deliveryProjectId" TEXT NOT NULL,
    "supplierId" TEXT,
    "createdByAdminId" TEXT,
    "approvedByAdminId" TEXT,
    "status" "PurchaseRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issueDate" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "orderedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequestLineItem" (
    "id" TEXT NOT NULL,
    "purchaseRequestId" TEXT NOT NULL,
    "projectProcurementItemId" TEXT,
    "materialItemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unit" TEXT NOT NULL,
    "estimatedUnitCost" DECIMAL(12,2),
    "actualUnitCost" DECIMAL(12,2),
    "receivedQuantity" DECIMAL(12,2),
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequestLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectAssignment" (
    "id" TEXT NOT NULL,
    "deliveryProjectId" TEXT NOT NULL,
    "adminUserId" TEXT,
    "createdByAdminId" TEXT,
    "role" "ProjectAssignmentRole" NOT NULL,
    "externalName" TEXT,
    "externalCompany" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTask" (
    "id" TEXT NOT NULL,
    "deliveryProjectId" TEXT NOT NULL,
    "projectMilestoneId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "SiteTaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "assignedToAdminId" TEXT,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteLog" (
    "id" TEXT NOT NULL,
    "deliveryProjectId" TEXT NOT NULL,
    "logDate" TIMESTAMP(3) NOT NULL,
    "summary" TEXT NOT NULL,
    "workCompleted" TEXT,
    "issuesRisks" TEXT,
    "nextSteps" TEXT,
    "weatherConditions" TEXT,
    "attachmentUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clientVisible" BOOLEAN NOT NULL DEFAULT false,
    "createdByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Supplier_status_updatedAt_idx" ON "Supplier"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Supplier_cityArea_status_idx" ON "Supplier"("cityArea", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialItem_code_key" ON "MaterialItem"("code");

-- CreateIndex
CREATE INDEX "MaterialItem_status_category_updatedAt_idx" ON "MaterialItem"("status", "category", "updatedAt");

-- CreateIndex
CREATE INDEX "MaterialItem_defaultSupplierId_status_idx" ON "MaterialItem"("defaultSupplierId", "status");

-- CreateIndex
CREATE INDEX "ProjectProcurementItem_deliveryProjectId_status_requiredBy_idx" ON "ProjectProcurementItem"("deliveryProjectId", "status", "requiredBy");

-- CreateIndex
CREATE INDEX "ProjectProcurementItem_preferredSupplierId_status_requiredB_idx" ON "ProjectProcurementItem"("preferredSupplierId", "status", "requiredBy");

-- CreateIndex
CREATE INDEX "ProjectProcurementItem_materialItemId_status_idx" ON "ProjectProcurementItem"("materialItemId", "status");

-- CreateIndex
CREATE INDEX "ProjectProcurementItem_createdByAdminId_createdAt_idx" ON "ProjectProcurementItem"("createdByAdminId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_referenceCode_key" ON "PurchaseRequest"("referenceCode");

-- CreateIndex
CREATE INDEX "PurchaseRequest_deliveryProjectId_status_createdAt_idx" ON "PurchaseRequest"("deliveryProjectId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequest_supplierId_status_expectedDeliveryDate_idx" ON "PurchaseRequest"("supplierId", "status", "expectedDeliveryDate");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_expectedDeliveryDate_idx" ON "PurchaseRequest"("status", "expectedDeliveryDate");

-- CreateIndex
CREATE INDEX "PurchaseRequest_createdByAdminId_createdAt_idx" ON "PurchaseRequest"("createdByAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequest_approvedByAdminId_createdAt_idx" ON "PurchaseRequest"("approvedByAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "PurchaseRequestLineItem_purchaseRequestId_sortOrder_idx" ON "PurchaseRequestLineItem"("purchaseRequestId", "sortOrder");

-- CreateIndex
CREATE INDEX "PurchaseRequestLineItem_projectProcurementItemId_idx" ON "PurchaseRequestLineItem"("projectProcurementItemId");

-- CreateIndex
CREATE INDEX "PurchaseRequestLineItem_materialItemId_idx" ON "PurchaseRequestLineItem"("materialItemId");

-- CreateIndex
CREATE INDEX "ProjectAssignment_deliveryProjectId_role_startDate_idx" ON "ProjectAssignment"("deliveryProjectId", "role", "startDate");

-- CreateIndex
CREATE INDEX "ProjectAssignment_adminUserId_startDate_idx" ON "ProjectAssignment"("adminUserId", "startDate");

-- CreateIndex
CREATE INDEX "SiteTask_deliveryProjectId_status_dueDate_idx" ON "SiteTask"("deliveryProjectId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "SiteTask_assignedToAdminId_status_dueDate_idx" ON "SiteTask"("assignedToAdminId", "status", "dueDate");

-- CreateIndex
CREATE INDEX "SiteTask_projectMilestoneId_status_idx" ON "SiteTask"("projectMilestoneId", "status");

-- CreateIndex
CREATE INDEX "SiteTask_createdByAdminId_createdAt_idx" ON "SiteTask"("createdByAdminId", "createdAt");

-- CreateIndex
CREATE INDEX "SiteLog_deliveryProjectId_logDate_idx" ON "SiteLog"("deliveryProjectId", "logDate");

-- CreateIndex
CREATE INDEX "SiteLog_createdByAdminId_logDate_idx" ON "SiteLog"("createdByAdminId", "logDate");

-- CreateIndex
CREATE INDEX "SiteLog_clientVisible_logDate_idx" ON "SiteLog"("clientVisible", "logDate");

-- AddForeignKey
ALTER TABLE "MaterialItem" ADD CONSTRAINT "MaterialItem_defaultSupplierId_fkey" FOREIGN KEY ("defaultSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProcurementItem" ADD CONSTRAINT "ProjectProcurementItem_deliveryProjectId_fkey" FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProcurementItem" ADD CONSTRAINT "ProjectProcurementItem_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProcurementItem" ADD CONSTRAINT "ProjectProcurementItem_preferredSupplierId_fkey" FOREIGN KEY ("preferredSupplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectProcurementItem" ADD CONSTRAINT "ProjectProcurementItem_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_deliveryProjectId_fkey" FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequest" ADD CONSTRAINT "PurchaseRequest_approvedByAdminId_fkey" FOREIGN KEY ("approvedByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestLineItem" ADD CONSTRAINT "PurchaseRequestLineItem_purchaseRequestId_fkey" FOREIGN KEY ("purchaseRequestId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestLineItem" ADD CONSTRAINT "PurchaseRequestLineItem_projectProcurementItemId_fkey" FOREIGN KEY ("projectProcurementItemId") REFERENCES "ProjectProcurementItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseRequestLineItem" ADD CONSTRAINT "PurchaseRequestLineItem_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_deliveryProjectId_fkey" FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTask" ADD CONSTRAINT "SiteTask_deliveryProjectId_fkey" FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTask" ADD CONSTRAINT "SiteTask_projectMilestoneId_fkey" FOREIGN KEY ("projectMilestoneId") REFERENCES "ProjectMilestone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTask" ADD CONSTRAINT "SiteTask_assignedToAdminId_fkey" FOREIGN KEY ("assignedToAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTask" ADD CONSTRAINT "SiteTask_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLog" ADD CONSTRAINT "SiteLog_deliveryProjectId_fkey" FOREIGN KEY ("deliveryProjectId") REFERENCES "DeliveryProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteLog" ADD CONSTRAINT "SiteLog_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

