import type {
  ProcurementStatus,
  PurchaseRequestStatus,
  SiteTaskStatus,
} from '@prisma/client';
import type { NumericValue } from './operations';
import {
  calculatePurchaseRequestTotals,
  calculateRequirementEstimatedTotal,
  canTransitionProcurementStatus,
  deriveProcurementStatusFromPurchaseStatus,
  toNumber,
} from './operations';
import { prisma } from './prisma';

export function resolveSiteTaskDates(input: {
  currentStatus?: SiteTaskStatus;
  nextStatus: SiteTaskStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
}) {
  const now = new Date();

  const startedAt =
    input.nextStatus === 'IN_PROGRESS' || input.nextStatus === 'DONE' || input.nextStatus === 'BLOCKED'
      ? input.startedAt || now
      : null;

  const completedAt = input.nextStatus === 'DONE' ? input.completedAt || now : null;

  return {
    startedAt,
    completedAt,
  };
}

export function resolvePurchaseRequestLifecycle(input: {
  status: PurchaseRequestStatus;
  requestDate: Date;
  issueDate?: Date | null;
  existing?: {
    submittedAt?: Date | null;
    approvedAt?: Date | null;
    orderedAt?: Date | null;
    receivedAt?: Date | null;
    approvedByAdminId?: string | null;
  };
  actorAdminId: string;
}) {
  if (input.status === 'DRAFT') {
    return {
      requestDate: input.requestDate,
      submittedAt: null,
      approvedAt: null,
      orderedAt: null,
      receivedAt: null,
      approvedByAdminId: null,
    };
  }

  const now = new Date();
  const submittedAt =
    input.status === 'SUBMITTED' ||
    input.status === 'APPROVED' ||
    input.status === 'ORDERED' ||
    input.status === 'PARTIALLY_RECEIVED' ||
    input.status === 'RECEIVED'
      ? input.existing?.submittedAt || now
      : input.existing?.submittedAt || null;

  const approvedAt =
    input.status === 'APPROVED' ||
    input.status === 'ORDERED' ||
    input.status === 'PARTIALLY_RECEIVED' ||
    input.status === 'RECEIVED'
      ? input.existing?.approvedAt || now
      : null;

  const orderedAt =
    input.status === 'ORDERED' || input.status === 'PARTIALLY_RECEIVED' || input.status === 'RECEIVED'
      ? input.existing?.orderedAt || input.issueDate || now
      : null;

  const receivedAt = input.status === 'RECEIVED' ? input.existing?.receivedAt || now : null;

  return {
    requestDate: input.requestDate,
    submittedAt,
    approvedAt,
    orderedAt,
    receivedAt,
    approvedByAdminId: approvedAt ? input.existing?.approvedByAdminId || input.actorAdminId : null,
  };
}

export async function syncProcurementItemsFromPurchaseRequest(input: {
  linkedProcurementItemIds: string[];
  status: PurchaseRequestStatus;
}) {
  const nextStatus = deriveProcurementStatusFromPurchaseStatus(input.status);
  if (!nextStatus) return;

  const uniqueIds = [...new Set(input.linkedProcurementItemIds.filter(Boolean))];
  if (!uniqueIds.length) return;

  const items = await prisma.projectProcurementItem.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, status: true },
  });

  await Promise.all(
    items.map((item) => {
      if (item.status === 'CANCELLED') {
        return Promise.resolve(null);
      }

      const shouldAdvance =
        item.status !== nextStatus &&
        canTransitionProcurementStatus(item.status, nextStatus) &&
        procurementStatusRank(nextStatus) >= procurementStatusRank(item.status);

      if (!shouldAdvance) {
        return Promise.resolve(null);
      }

      return prisma.projectProcurementItem.update({
        where: { id: item.id },
        data: { status: nextStatus },
      });
    }),
  );
}

function procurementStatusRank(status: ProcurementStatus) {
  switch (status) {
    case 'PLANNED':
      return 1;
    case 'REQUESTED':
      return 2;
    case 'ORDERED':
      return 3;
    case 'RECEIVED':
      return 4;
    case 'CANCELLED':
    default:
      return 0;
  }
}

export function buildProjectOperationsSnapshot(input: {
  procurementItems: Array<{
    status: ProcurementStatus;
    estimatedQuantity: NumericValue;
    estimatedUnitCost?: NumericValue;
    requiredBy?: Date | null;
  }>;
  purchaseRequests: Array<{
    status: PurchaseRequestStatus;
    lineItems: Array<{
      quantity: NumericValue;
      estimatedUnitCost?: NumericValue;
      actualUnitCost?: NumericValue;
      receivedQuantity?: NumericValue;
    }>;
  }>;
  siteTasks: Array<{
    status: SiteTaskStatus;
    dueDate?: Date | null;
  }>;
  siteLogs: Array<{
    logDate: Date;
  }>;
  now?: Date;
}) {
  const now = input.now || new Date();

  const estimatedProcurementCost = input.procurementItems.reduce((sum, item) => (
    sum +
    calculateRequirementEstimatedTotal({
      quantity: item.estimatedQuantity,
      estimatedUnitCost: item.estimatedUnitCost,
    })
  ), 0);

  const purchaseTotals = input.purchaseRequests.reduce(
    (totals, record) => {
      const lineTotals = calculatePurchaseRequestTotals(record.lineItems);

      const requested =
        record.status === 'SUBMITTED' ||
        record.status === 'APPROVED' ||
        record.status === 'ORDERED' ||
        record.status === 'PARTIALLY_RECEIVED' ||
        record.status === 'RECEIVED'
          ? lineTotals.estimated
          : 0;

      const ordered =
        record.status === 'ORDERED' || record.status === 'PARTIALLY_RECEIVED' || record.status === 'RECEIVED'
          ? lineTotals.actual || lineTotals.estimated
          : 0;

      const received =
        record.status === 'PARTIALLY_RECEIVED' || record.status === 'RECEIVED'
          ? lineTotals.received || lineTotals.actual || lineTotals.estimated
          : 0;

      return {
        requested: totals.requested + requested,
        ordered: totals.ordered + ordered,
        received: totals.received + received,
      };
    },
    { requested: 0, ordered: 0, received: 0 },
  );

  const overdueTasks = input.siteTasks.filter((task) => (
    task.status !== 'DONE' &&
    task.status !== 'CANCELLED' &&
    task.dueDate &&
    task.dueDate.getTime() < now.getTime()
  )).length;

  const blockedTasks = input.siteTasks.filter((task) => task.status === 'BLOCKED').length;
  const openTasks = input.siteTasks.filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED').length;
  const nextRequiredBy = input.procurementItems
    .filter((item) => item.requiredBy && item.status !== 'RECEIVED' && item.status !== 'CANCELLED')
    .sort((left, right) => (left.requiredBy!.getTime() - right.requiredBy!.getTime()))[0]?.requiredBy || null;

  const latestSiteLogAt = input.siteLogs
    .map((log) => log.logDate)
    .sort((left, right) => right.getTime() - left.getTime())[0] || null;

  return {
    estimatedProcurementCost,
    requestedValue: purchaseTotals.requested,
    orderedValue: purchaseTotals.ordered,
    receivedValue: purchaseTotals.received,
    overdueTasks,
    blockedTasks,
    openTasks,
    nextRequiredBy,
    latestSiteLogAt,
  };
}

export function sumRequirementEstimate(input: Array<{ estimatedQuantity: NumericValue; estimatedUnitCost?: NumericValue }>) {
  return input.reduce((sum, item) => (
    sum +
    calculateRequirementEstimatedTotal({
      quantity: item.estimatedQuantity,
      estimatedUnitCost: item.estimatedUnitCost,
    })
  ), 0);
}

export function getReceivedProgressPercent(input: {
  receivedValue: number;
  estimatedProcurementCost: number;
}) {
  const estimate = toNumber(input.estimatedProcurementCost);
  if (estimate <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((input.receivedValue / estimate) * 100)));
}
