import { NextResponse } from 'next/server';
import { type BillingType, type InvoiceStatus } from '@prisma/client';
import { requireAdminAuth } from '../../../../../lib/auth';
import { assertSameOrigin, formDataToObject, getRequestId, isRequestBodyWithinLimit, jsonError, safeRedirectPath } from '../../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../../lib/constants';
import { buildRequestLogMeta } from '../../../../../lib/logger';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { OPERATIONS_ROLES } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';
import { amountsClose, calculateInvoiceTotals, deriveInvoiceStatus, parseInvoiceLineItems } from '../../../../../lib/billing';
import { invoiceFormSchema } from '../../../../../lib/validators';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.invoices.update', requestId);

  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403, undefined, { requestId });
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: OPERATIONS_ROLES,
    requestId,
    requestMeta,
    unauthorizedEvent: 'admin.invoice_update_unauthorized',
    forbiddenEvent: 'admin.invoice_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError('Unable to parse request.', 400, undefined, { requestId });
  }

  const payload = formDataToObject(formData);
  const baseReturnTo = safeRedirectPath(payload.returnTo, `/admin/invoices/${params.id}`, ['/admin/invoices']);
  const result = invoiceFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const existing = await prisma.invoice.findFirst({
    where: { id: params.id, deletedAt: null },
    select: {
      id: true,
      status: true,
      invoiceNumber: true,
      leadId: true,
      quoteRequestId: true,
      deliveryProjectId: true,
      projectMilestoneId: true,
      issuedAt: true,
      dueDate: true,
      clientVisible: true,
      paidAt: true,
      voidedAt: true,
      cancelledAt: true,
      total: true,
      payments: {
        where: { deletedAt: null },
        select: { amount: true },
      },
    },
  });

  if (!existing) {
    return jsonError('Invoice not found.', 404, undefined, { requestId });
  }

  const parsedLineItems = parseInvoiceLineItems(result.data.lineItemsText || undefined);
  const lineItemSubtotal = parsedLineItems.reduce((sum, item) => sum + item.amount, 0);
  const taxValue = result.data.tax ?? 0;

  if (parsedLineItems.length && result.data.subtotal !== undefined && !amountsClose(result.data.subtotal, lineItemSubtotal)) {
    return jsonError('Subtotal must match the parsed line items total.', 422, undefined, { requestId });
  }

  if (parsedLineItems.length && result.data.total !== undefined && !amountsClose(result.data.total, lineItemSubtotal + taxValue)) {
    return jsonError('Total must equal the parsed line items total plus tax.', 422, undefined, { requestId });
  }

  if (!parsedLineItems.length && result.data.subtotal !== undefined && result.data.total !== undefined && !amountsClose(result.data.total, result.data.subtotal + taxValue)) {
    return jsonError('Total must equal subtotal plus tax.', 422, undefined, { requestId });
  }

  if (!parsedLineItems.length && result.data.total !== undefined && taxValue > result.data.total + 0.01) {
    return jsonError('Tax cannot exceed the invoice total.', 422, undefined, { requestId });
  }

  const totals = calculateInvoiceTotals({
    lineItems: parsedLineItems,
    subtotal: result.data.subtotal ?? (result.data.total !== undefined ? null : Number(existing.total || 0)),
    tax: taxValue,
    total: result.data.total ?? Number(existing.total || 0),
  });

  const [quote, deliveryProject, projectMilestone, directLead] = await Promise.all([
    result.data.quoteRequestId
      ? prisma.quoteRequest.findFirst({
          where: { id: result.data.quoteRequestId, deletedAt: null },
          select: {
            id: true,
            leadId: true,
            convertedProject: {
              select: { id: true, leadId: true, deletedAt: true, portalVisible: true },
            },
          },
        })
      : Promise.resolve(null),
    result.data.deliveryProjectId
      ? prisma.deliveryProject.findFirst({
          where: { id: result.data.deliveryProjectId, deletedAt: null },
          select: { id: true, leadId: true, quoteRequestId: true, portalVisible: true },
        })
      : Promise.resolve(null),
    result.data.projectMilestoneId
      ? prisma.projectMilestone.findFirst({
          where: { id: result.data.projectMilestoneId, deletedAt: null },
          select: {
            id: true,
            deliveryProjectId: true,
            deliveryProject: {
              select: { id: true, leadId: true, portalVisible: true, deletedAt: true },
            },
          },
        })
      : Promise.resolve(null),
    result.data.leadId
      ? prisma.lead.findFirst({
          where: { id: result.data.leadId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (result.data.quoteRequestId && !quote) {
    return jsonError('Quote request not found.', 404, undefined, { requestId });
  }

  if (result.data.deliveryProjectId && !deliveryProject) {
    return jsonError('Delivery project not found.', 404, undefined, { requestId });
  }

  if (result.data.projectMilestoneId && !projectMilestone) {
    return jsonError('Project milestone not found.', 404, undefined, { requestId });
  }

  if (result.data.leadId && !directLead) {
    return jsonError('Lead not found.', 404, undefined, { requestId });
  }

  const resolvedLeadId =
    result.data.leadId ||
    quote?.leadId ||
    deliveryProject?.leadId ||
    projectMilestone?.deliveryProject?.leadId ||
    existing.leadId ||
    null;

  if (!resolvedLeadId) {
    return jsonError('Invoice must remain linked to a client lead.', 422, undefined, { requestId });
  }

  if (result.data.leadId && quote && quote.leadId !== result.data.leadId) {
    return jsonError('Selected lead does not match the linked quote.', 422, undefined, { requestId });
  }

  if (result.data.leadId && deliveryProject && deliveryProject.leadId !== result.data.leadId) {
    return jsonError('Selected lead does not match the linked project.', 422, undefined, { requestId });
  }

  if (result.data.leadId && projectMilestone && projectMilestone.deliveryProject?.leadId !== result.data.leadId) {
    return jsonError('Selected lead does not match the linked milestone project.', 422, undefined, { requestId });
  }

  if (quote && deliveryProject && quote.convertedProject && quote.convertedProject.id !== deliveryProject.id) {
    return jsonError('The selected project does not match the linked quote.', 422, undefined, { requestId });
  }

  if (projectMilestone && deliveryProject && projectMilestone.deliveryProjectId !== deliveryProject.id) {
    return jsonError('The selected milestone does not belong to the selected project.', 422, undefined, { requestId });
  }

  const action = (payload.action || 'SAVE').toUpperCase();

  const nextInvoiceStatus = action === 'VOID'
    ? 'VOID'
    : action === 'CANCEL'
      ? 'CANCELLED'
      : action === 'ISSUE'
        ? 'ISSUED'
        : result.data.status && ['DRAFT', 'ISSUED', 'VOID', 'CANCELLED'].includes(result.data.status)
          ? result.data.status
          : existing.status;

  const issuedAt =
    nextInvoiceStatus === 'DRAFT'
      ? null
      : result.data.issuedAt
        ? new Date(result.data.issuedAt)
        : existing.issuedAt || new Date();

  const dueDate =
    result.data.dueDate
      ? new Date(result.data.dueDate)
      : issuedAt && nextInvoiceStatus !== 'DRAFT'
        ? new Date(issuedAt.getTime() + 14 * DAY_MS)
        : existing.dueDate || null;

  const clientVisible =
    nextInvoiceStatus === 'VOID' || nextInvoiceStatus === 'CANCELLED' || nextInvoiceStatus === 'DRAFT'
      ? false
      : result.data.clientVisible !== false;

  const paymentTotal = existing.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const computedStatus = nextInvoiceStatus === 'VOID' || nextInvoiceStatus === 'CANCELLED'
    ? nextInvoiceStatus
    : deriveInvoiceStatus({
        status: nextInvoiceStatus as 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE' | 'VOID' | 'CANCELLED',
        issueDate: issuedAt,
        dueDate,
        total: totals.total,
        paidTotal: paymentTotal,
      });

  const updateData = {
    title: result.data.title,
    description: result.data.description || null,
    billingType: (result.data.billingType || 'OTHER') as BillingType,
    status: computedStatus as InvoiceStatus,
    clientVisible,
    leadId: resolvedLeadId,
    quoteRequestId: quote?.id || result.data.quoteRequestId || null,
    deliveryProjectId: deliveryProject?.id || result.data.deliveryProjectId || quote?.convertedProject?.id || null,
    projectMilestoneId: projectMilestone?.id || result.data.projectMilestoneId || null,
    issuedAt,
    dueDate,
    subtotal: totals.subtotal,
    tax: totals.tax,
    total: totals.total,
    notes: result.data.notes || null,
    paymentInstructions: result.data.paymentInstructions || null,
    footerNote: result.data.footerNote || null,
    paidAt: computedStatus === 'PAID' ? existing.paidAt || issuedAt || new Date() : existing.paidAt,
    voidedAt: nextInvoiceStatus === 'VOID' ? existing.voidedAt || new Date() : existing.voidedAt,
    cancelledAt: nextInvoiceStatus === 'CANCELLED' ? existing.cancelledAt || new Date() : existing.cancelledAt,
  } as const;

  const shouldReplaceLineItems = Object.prototype.hasOwnProperty.call(payload, 'lineItemsText');

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id: existing.id },
      data: updateData,
    });

    if (shouldReplaceLineItems) {
      await tx.invoiceLineItem.deleteMany({
        where: { invoiceId: existing.id },
      });

      if (parsedLineItems.length) {
        await tx.invoiceLineItem.createMany({
          data: parsedLineItems.map((item) => ({
            invoiceId: existing.id,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            amount: item.amount,
            sortOrder: item.sortOrder,
          })),
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actor: adminSession.email,
        action: 'INVOICE_UPDATED',
        entity: 'Invoice',
        entityId: existing.id,
        actorAdminId: adminSession.userId,
        details: {
          status: computedStatus,
          clientVisible,
          leadId: resolvedLeadId,
          quoteRequestId: quote?.id || result.data.quoteRequestId || null,
          deliveryProjectId: deliveryProject?.id || result.data.deliveryProjectId || quote?.convertedProject?.id || null,
          projectMilestoneId: projectMilestone?.id || result.data.projectMilestoneId || null,
          action,
        },
      },
    });
  });

  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('updated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
