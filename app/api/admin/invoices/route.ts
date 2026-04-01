import { NextResponse } from 'next/server';
import { Prisma, type BillingType, type InvoiceStatus } from '@prisma/client';
import { requireAdminAuth } from '../../../../lib/auth';
import { assertSameOrigin, formDataToObject, getRequestId, isRequestBodyWithinLimit, jsonError, safeRedirectPath } from '../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { buildRequestLogMeta } from '../../../../lib/logger';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { OPERATIONS_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { amountsClose, calculateInvoiceTotals, createInvoiceNumber, deriveInvoiceStatus, parseInvoiceLineItems } from '../../../../lib/billing';
import { invoiceFormSchema } from '../../../../lib/validators';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.invoices.create', requestId);

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
    unauthorizedEvent: 'admin.invoice_create_unauthorized',
    forbiddenEvent: 'admin.invoice_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError('Unable to parse request.', 400, undefined, { requestId });
  }

  const payload = formDataToObject(formData);
  const baseReturnTo = safeRedirectPath(payload.returnTo, '/admin/invoices', ['/admin/invoices']);
  const result = invoiceFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
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
    subtotal: result.data.subtotal ?? null,
    tax: taxValue,
    total: result.data.total ?? null,
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
    null;

  if (!resolvedLeadId) {
    return jsonError('An invoice must be linked to a client lead, quote, project, or milestone.', 422, undefined, { requestId });
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

  const normalizedStatus =
    result.data.status === 'VOID' || result.data.status === 'CANCELLED'
      ? result.data.status
      : result.data.status === 'DRAFT'
        ? 'DRAFT'
        : 'ISSUED';

  const issuedAt =
    result.data.issuedAt
      ? new Date(result.data.issuedAt)
      : normalizedStatus === 'DRAFT'
        ? null
        : new Date();

  const dueDate =
    result.data.dueDate
      ? new Date(result.data.dueDate)
      : issuedAt && normalizedStatus !== 'DRAFT'
        ? new Date(issuedAt.getTime() + 14 * DAY_MS)
        : null;

  const clientVisible =
    normalizedStatus === 'VOID' || normalizedStatus === 'CANCELLED' || normalizedStatus === 'DRAFT'
      ? false
      : result.data.clientVisible !== false;

  const computedStatus = deriveInvoiceStatus({
    status: normalizedStatus as InvoiceStatus,
    issueDate: issuedAt,
    dueDate,
    total: totals.total,
    paidTotal: 0,
  });

  const invoiceNumber = createInvoiceNumber();

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.invoice.create({
      data: {
        invoiceNumber,
        title: result.data.title,
        description: result.data.description || null,
        billingType: (result.data.billingType || 'OTHER') as BillingType,
        status: computedStatus,
        clientVisible,
        leadId: resolvedLeadId,
        quoteRequestId: quote?.id || result.data.quoteRequestId || null,
        deliveryProjectId: deliveryProject?.id || result.data.deliveryProjectId || quote?.convertedProject?.id || null,
        projectMilestoneId: projectMilestone?.id || result.data.projectMilestoneId || null,
        issuedByAdminId: adminSession.userId,
        issuedAt,
        dueDate,
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        notes: result.data.notes || null,
        paymentInstructions: result.data.paymentInstructions || null,
        footerNote: result.data.footerNote || null,
      },
      select: { id: true },
    });

    if (parsedLineItems.length) {
      await tx.invoiceLineItem.createMany({
        data: parsedLineItems.map((item) => ({
          invoiceId: created.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        actor: adminSession.email,
        action: 'INVOICE_CREATED',
        entity: 'Invoice',
        entityId: created.id,
        actorAdminId: adminSession.userId,
        details: {
          invoiceNumber,
          status: computedStatus,
          leadId: resolvedLeadId,
          quoteRequestId: quote?.id || result.data.quoteRequestId || null,
          deliveryProjectId: deliveryProject?.id || result.data.deliveryProjectId || quote?.convertedProject?.id || null,
          projectMilestoneId: projectMilestone?.id || result.data.projectMilestoneId || null,
        } satisfies Prisma.InputJsonValue,
      },
    });

    return created;
  });

  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('created', '1');
  redirectUrl.pathname = `/admin/invoices/${invoice.id}`;
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
