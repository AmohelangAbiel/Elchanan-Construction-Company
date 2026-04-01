import type { ProcurementStatus, PurchaseRequestStatus, SiteTaskStatus } from '@prisma/client';
import {
  MATERIAL_ITEM_STATUSES,
  PROCUREMENT_STATUSES,
  PROJECT_ASSIGNMENT_ROLES,
  PURCHASE_REQUEST_STATUSES,
  SITE_TASK_STATUSES,
  SUPPLIER_STATUSES,
} from './constants';
import { createReferenceCode, sanitizeOptionalText, sanitizeText } from './sanitize';

export type NumericValue = number | string | null | undefined | { toString(): string };

export const SUPPLIER_STATUS_VALUES = SUPPLIER_STATUSES;
export const MATERIAL_ITEM_STATUS_VALUES = MATERIAL_ITEM_STATUSES;
export const PROCUREMENT_STATUS_VALUES = PROCUREMENT_STATUSES;
export const PURCHASE_REQUEST_STATUS_VALUES = PURCHASE_REQUEST_STATUSES;
export const PROJECT_ASSIGNMENT_ROLE_VALUES = PROJECT_ASSIGNMENT_ROLES;
export const SITE_TASK_STATUS_VALUES = SITE_TASK_STATUSES;

export function formatStatusLabel(value: string) {
  return value.replace(/_/g, ' ');
}

export function createPurchaseRequestReference() {
  return createReferenceCode('PUR');
}

export function createDeliveryProjectCode() {
  return createReferenceCode('PRJ');
}

export function toNumber(value: NumericValue) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (value && typeof value.toString === 'function') {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

export function calculateRequirementEstimatedTotal(input: {
  quantity: NumericValue;
  estimatedUnitCost?: NumericValue;
}) {
  return toNumber(input.quantity) * toNumber(input.estimatedUnitCost);
}

export function calculatePurchaseLineAmounts(input: {
  quantity: NumericValue;
  estimatedUnitCost?: NumericValue;
  actualUnitCost?: NumericValue;
  receivedQuantity?: NumericValue;
}) {
  const quantity = toNumber(input.quantity);
  const estimatedUnitCost = toNumber(input.estimatedUnitCost);
  const actualUnitCost = toNumber(input.actualUnitCost);
  const receivedQuantity = toNumber(input.receivedQuantity);

  return {
    quantity,
    estimatedTotal: quantity * estimatedUnitCost,
    actualTotal: quantity * actualUnitCost,
    receivedTotal: receivedQuantity * (actualUnitCost || estimatedUnitCost),
  };
}

export function calculatePurchaseRequestTotals(
  lineItems: Array<{
    quantity: NumericValue;
    estimatedUnitCost?: NumericValue;
    actualUnitCost?: NumericValue;
    receivedQuantity?: NumericValue;
  }>,
) {
  return lineItems.reduce(
    (totals, lineItem) => {
      const line = calculatePurchaseLineAmounts(lineItem);
      return {
        estimated: totals.estimated + line.estimatedTotal,
        actual: totals.actual + line.actualTotal,
        received: totals.received + line.receivedTotal,
      };
    },
    { estimated: 0, actual: 0, received: 0 },
  );
}

const procurementStatusTransitions: Record<ProcurementStatus, ProcurementStatus[]> = {
  PLANNED: ['REQUESTED', 'ORDERED', 'CANCELLED'],
  REQUESTED: ['ORDERED', 'CANCELLED'],
  ORDERED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

const purchaseRequestStatusTransitions: Record<PurchaseRequestStatus, PurchaseRequestStatus[]> = {
  DRAFT: ['SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'],
  SUBMITTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['ORDERED', 'CANCELLED'],
  REJECTED: ['DRAFT', 'CANCELLED'],
  ORDERED: ['PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'],
  PARTIALLY_RECEIVED: ['RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

const siteTaskStatusTransitions: Record<SiteTaskStatus, SiteTaskStatus[]> = {
  TODO: ['IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED'],
  IN_PROGRESS: ['TODO', 'BLOCKED', 'DONE', 'CANCELLED'],
  BLOCKED: ['TODO', 'IN_PROGRESS', 'CANCELLED'],
  DONE: ['TODO', 'IN_PROGRESS'],
  CANCELLED: ['TODO'],
};

export function canTransitionProcurementStatus(current: ProcurementStatus, next: ProcurementStatus) {
  return current === next || procurementStatusTransitions[current].includes(next);
}

export function canTransitionPurchaseRequestStatus(current: PurchaseRequestStatus, next: PurchaseRequestStatus) {
  return current === next || purchaseRequestStatusTransitions[current].includes(next);
}

export function canTransitionSiteTaskStatus(current: SiteTaskStatus, next: SiteTaskStatus) {
  return current === next || siteTaskStatusTransitions[current].includes(next);
}

export function deriveProcurementStatusFromPurchaseStatus(status: PurchaseRequestStatus): ProcurementStatus | null {
  if (status === 'DRAFT' || status === 'SUBMITTED' || status === 'APPROVED') {
    return 'REQUESTED';
  }

  if (status === 'ORDERED' || status === 'PARTIALLY_RECEIVED') {
    return 'ORDERED';
  }

  if (status === 'RECEIVED') {
    return 'RECEIVED';
  }

  return null;
}

export function getPurchaseDocumentLabel(status: PurchaseRequestStatus) {
  if (status === 'ORDERED' || status === 'PARTIALLY_RECEIVED' || status === 'RECEIVED') {
    return 'Purchase Order';
  }

  return 'Purchase Request';
}

export function parseTextList(input?: string, maxLength = 80, limit = 24) {
  if (!input) return [];

  return input
    .split(/\r?\n|,/)
    .map((item) => sanitizeText(item, maxLength))
    .filter(Boolean)
    .slice(0, limit);
}

export type PurchaseLineItemInput = {
  description: string;
  quantity: number;
  unit: string;
  estimatedUnitCost: number | null;
  actualUnitCost: number | null;
  receivedQuantity: number | null;
  materialItemId: string | null;
  projectProcurementItemId: string | null;
  notes: string | null;
  sortOrder: number;
};

export function parsePurchaseLineItemsFromFormData(formData: FormData) {
  const descriptions = formData.getAll('lineDescription');
  const quantities = formData.getAll('lineQuantity');
  const units = formData.getAll('lineUnit');
  const estimatedUnitCosts = formData.getAll('lineEstimatedUnitCost');
  const actualUnitCosts = formData.getAll('lineActualUnitCost');
  const receivedQuantities = formData.getAll('lineReceivedQuantity');
  const materialItemIds = formData.getAll('lineMaterialItemId');
  const projectProcurementItemIds = formData.getAll('lineProjectProcurementItemId');
  const notes = formData.getAll('lineNotes');

  const totalRows = Math.max(
    descriptions.length,
    quantities.length,
    units.length,
    estimatedUnitCosts.length,
    actualUnitCosts.length,
    receivedQuantities.length,
    materialItemIds.length,
    projectProcurementItemIds.length,
    notes.length,
  );

  const lineItems: PurchaseLineItemInput[] = [];

  for (let index = 0; index < totalRows; index += 1) {
    const description = sanitizeText(descriptions[index], 220);
    const unit = sanitizeText(units[index], 40);
    const quantity = toNumber(typeof quantities[index] === 'string' ? quantities[index] : '');

    const estimatedUnitCostValue = toNumber(typeof estimatedUnitCosts[index] === 'string' ? estimatedUnitCosts[index] : '');
    const actualUnitCostValue = toNumber(typeof actualUnitCosts[index] === 'string' ? actualUnitCosts[index] : '');
    const receivedQuantityValue = toNumber(typeof receivedQuantities[index] === 'string' ? receivedQuantities[index] : '');

    if (!description && !quantity && !unit) {
      continue;
    }

    if (!description) {
      throw new Error(`Line item ${index + 1}: description is required.`);
    }

    if (!unit) {
      throw new Error(`Line item ${index + 1}: unit is required.`);
    }

    if (quantity <= 0) {
      throw new Error(`Line item ${index + 1}: quantity must be greater than zero.`);
    }

    const receivedQuantity = receivedQuantityValue > 0 ? receivedQuantityValue : null;
    if (receivedQuantity !== null && receivedQuantity > quantity) {
      throw new Error(`Line item ${index + 1}: received quantity cannot exceed requested quantity.`);
    }

    lineItems.push({
      description,
      quantity,
      unit,
      estimatedUnitCost: estimatedUnitCostValue > 0 ? estimatedUnitCostValue : null,
      actualUnitCost: actualUnitCostValue > 0 ? actualUnitCostValue : null,
      receivedQuantity,
      materialItemId: sanitizeOptionalText(materialItemIds[index], 120) || null,
      projectProcurementItemId: sanitizeOptionalText(projectProcurementItemIds[index], 120) || null,
      notes: sanitizeOptionalText(notes[index], 4000) || null,
      sortOrder: index,
    });
  }

  return lineItems;
}
