import type { DocumentApprovalStatus, InvoiceStatus, PaymentMethod, QuoteApprovalStatus } from '@prisma/client';
import { BILLING_TYPES, DOCUMENT_APPROVAL_STATUSES, INVOICE_STATUSES, PAYMENT_METHODS, QUOTE_APPROVAL_STATUSES } from './constants';
import { createReferenceCode, sanitizeText } from './sanitize';

export type InvoiceLineItemInput = {
  description: string;
  quantity: number;
  unitPrice: number | null;
  amount: number;
  sortOrder: number;
};

export const QUOTE_APPROVAL_STATUS_VALUES = QUOTE_APPROVAL_STATUSES;
export const DOCUMENT_APPROVAL_STATUS_VALUES = DOCUMENT_APPROVAL_STATUSES;
export const INVOICE_STATUS_VALUES = INVOICE_STATUSES;
export const BILLING_TYPE_VALUES = BILLING_TYPES;
export const PAYMENT_METHOD_VALUES = PAYMENT_METHODS;

function parseMoneyValue(value: string | number | null | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (!value) return null;

  const normalized = sanitizeText(value, 60).replace(/[^0-9.-]/g, '');
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatCurrency(value: number | string | null | undefined) {
  const parsed = typeof value === 'number' ? value : parseMoneyValue(typeof value === 'string' ? value : undefined);
  if (typeof parsed !== 'number') return '-';

  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(parsed);
}

export function createInvoiceNumber() {
  return createReferenceCode('INV');
}

export function parseInvoiceLineItems(input?: string): InvoiceLineItemInput[] {
  if (!input) return [];

  return input
    .split(/\r?\n/)
    .map((line) => sanitizeText(line, 260))
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split('|').map((segment) => sanitizeText(segment, 120));
      const description = parts[0];
      const quantityCandidate = parts[1];
      const unitPriceCandidate = parts[2];
      const amountCandidate = parts[3];

      let quantity = 1;
      let unitPrice: number | null = null;
      let amount = parseMoneyValue(amountCandidate);

      if (parts.length >= 3) {
        quantity = Math.max(1, Math.round(parseMoneyValue(quantityCandidate) || 1));
        unitPrice = parseMoneyValue(unitPriceCandidate);
        if (unitPrice !== null) {
          amount = quantity * unitPrice;
        }
      } else if (parts.length === 2) {
        amount = parseMoneyValue(quantityCandidate);
        unitPrice = amount;
      }

      if (amount === null) {
        return null;
      }

      return {
        description,
        quantity,
        unitPrice,
        amount,
        sortOrder: index,
      };
    })
    .filter((item): item is InvoiceLineItemInput => Boolean(item?.description));
}

export function sumAmounts(values: Array<number | string | null | undefined>) {
  return values.reduce<number>((total, value) => {
    const parsed = typeof value === 'number' ? value : parseMoneyValue(value);
    return total + (typeof parsed === 'number' ? parsed : 0);
  }, 0);
}

export function amountsClose(left: number, right: number, tolerance = 0.01) {
  return Math.abs(left - right) <= tolerance;
}

export function calculateInvoiceTotals(input: {
  lineItems: Array<{ amount: number }>;
  subtotal?: number | null;
  tax?: number | null;
  total?: number | null;
}) {
  const computedSubtotal = input.lineItems.length
    ? input.lineItems.reduce((sum, item) => sum + item.amount, 0)
    : input.subtotal ?? (typeof input.total === 'number' ? Math.max(0, input.total - (input.tax ?? 0)) : 0);

  const computedTax = input.tax ?? 0;
  const computedTotal = input.total ?? computedSubtotal + computedTax;

  return {
    subtotal: Number.isFinite(computedSubtotal) ? computedSubtotal : 0,
    tax: Number.isFinite(computedTax) ? computedTax : 0,
    total: Number.isFinite(computedTotal) ? computedTotal : 0,
  };
}

export function deriveInvoiceStatus(input: {
  status: InvoiceStatus;
  issueDate?: Date | null;
  dueDate?: Date | null;
  total?: number | null;
  paidTotal?: number | null;
  now?: Date;
}) {
  if (input.status === 'VOID' || input.status === 'CANCELLED') {
    return input.status;
  }

  if (!input.issueDate) {
    return 'DRAFT' as InvoiceStatus;
  }

  const total = typeof input.total === 'number' ? input.total : 0;
  const paidTotal = typeof input.paidTotal === 'number' ? input.paidTotal : 0;
  const now = input.now || new Date();

  if (total > 0 && paidTotal >= total) {
    return 'PAID' as InvoiceStatus;
  }

  if (input.dueDate && input.dueDate.getTime() < now.getTime() && total > paidTotal) {
    return 'OVERDUE' as InvoiceStatus;
  }

  if (paidTotal > 0) {
    return 'PARTIALLY_PAID' as InvoiceStatus;
  }

  return 'ISSUED' as InvoiceStatus;
}

export function deriveQuoteApprovalStatus(input: {
  approvalStatus: QuoteApprovalStatus;
  quoteSentAt?: Date | null;
  validityDays?: number | null;
  now?: Date;
}) {
  if (['ACCEPTED', 'DECLINED', 'ARCHIVED', 'EXPIRED'].includes(input.approvalStatus)) {
    return input.approvalStatus;
  }

  const now = input.now || new Date();
  if (input.quoteSentAt && typeof input.validityDays === 'number' && input.validityDays > 0) {
    const expiresAt = new Date(input.quoteSentAt.getTime() + input.validityDays * 24 * 60 * 60 * 1000);
    if (expiresAt.getTime() < now.getTime()) {
      return 'EXPIRED' as QuoteApprovalStatus;
    }
  }

  if (input.approvalStatus === 'VIEWED') {
    return 'VIEWED' as QuoteApprovalStatus;
  }

  if (input.quoteSentAt) {
    return 'SENT' as QuoteApprovalStatus;
  }

  return input.approvalStatus;
}

export function canClientRespondToQuote(status: QuoteApprovalStatus) {
  return status === 'SENT' || status === 'VIEWED';
}

export function deriveDocumentApprovalStatus(input: {
  approvalStatus: DocumentApprovalStatus;
  clientViewedAt?: Date | null;
}) {
  if (['APPROVED', 'REJECTED', 'ARCHIVED'].includes(input.approvalStatus)) {
    return input.approvalStatus;
  }

  if (input.approvalStatus === 'VIEWED') {
    return 'VIEWED' as DocumentApprovalStatus;
  }

  if (input.clientViewedAt) {
    return 'VIEWED' as DocumentApprovalStatus;
  }

  return input.approvalStatus;
}

export function canClientRespondToDocument(status: DocumentApprovalStatus) {
  return status === 'SENT' || status === 'VIEWED';
}

export function getOutstandingBalance(input: { total?: number | null; paidTotal?: number | null }) {
  const total = typeof input.total === 'number' ? input.total : 0;
  const paid = typeof input.paidTotal === 'number' ? input.paidTotal : 0;
  return Math.max(0, total - paid);
}

export function isApprovalTerminal(status: QuoteApprovalStatus | DocumentApprovalStatus) {
  return ['ACCEPTED', 'DECLINED', 'APPROVED', 'REJECTED', 'ARCHIVED', 'EXPIRED'].includes(status);
}
