import { Prisma, type InvoiceStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { assertSameOrigin, formDataToObject, getRequestId, isRequestBodyWithinLimit, jsonError, safeRedirectPath } from '../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { buildRequestLogMeta } from '../../../../lib/logger';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { OPERATIONS_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { deriveInvoiceStatus, getOutstandingBalance } from '../../../../lib/billing';
import { paymentFormSchema } from '../../../../lib/validators';

class PaymentMutationError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PaymentMutationError';
    this.status = status;
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.payments.create', requestId);

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
    unauthorizedEvent: 'admin.payment_create_unauthorized',
    forbiddenEvent: 'admin.payment_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError('Unable to parse request.', 400, undefined, { requestId });
  }

  const payload = formDataToObject(formData);
  const baseReturnTo = safeRedirectPath(payload.returnTo, '/admin/payments', ['/admin/payments', '/admin/invoices']);
  const result = paymentFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const amount = Number(result.data.amount);
  const paymentDate = result.data.paymentDate ? new Date(result.data.paymentDate) : new Date();
  let nextOutstanding = 0;
  let nextStatus: InvoiceStatus = 'ISSUED';

  try {
    await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id: result.data.invoiceId, deletedAt: null },
        select: {
          id: true,
          status: true,
          clientVisible: true,
          dueDate: true,
          total: true,
          issuedAt: true,
          paidAt: true,
          invoiceNumber: true,
          payments: {
            where: { deletedAt: null },
            select: { amount: true },
          },
        },
      });

      if (!invoice) {
        throw new PaymentMutationError('Invoice not found.', 404);
      }

      if (invoice.status === 'VOID' || invoice.status === 'CANCELLED') {
        throw new PaymentMutationError('Cannot record a payment against a void or cancelled invoice.', 422);
      }

      if (!invoice.issuedAt) {
        throw new PaymentMutationError('Invoice must be issued before a payment can be recorded.', 422);
      }

      const paidTotal = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
      const outstanding = getOutstandingBalance({
        total: Number(invoice.total || 0),
        paidTotal,
      });

      if (amount > outstanding + 0.01) {
        throw new PaymentMutationError('Payment amount exceeds the remaining invoice balance.', 422);
      }

      const nextPaidTotal = paidTotal + amount;
      nextOutstanding = getOutstandingBalance({
        total: Number(invoice.total || 0),
        paidTotal: nextPaidTotal,
      });
      nextStatus = deriveInvoiceStatus({
        status: invoice.status,
        issueDate: invoice.issuedAt,
        dueDate: invoice.dueDate,
        total: Number(invoice.total || 0),
        paidTotal: nextPaidTotal,
        now: paymentDate,
      });

      const created = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          amount,
          paymentDate,
          paymentReference: result.data.paymentReference || null,
          notes: result.data.notes || null,
          method: (result.data.method || 'BANK_TRANSFER') as 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'OTHER',
          recordedByAdminId: adminSession.userId,
        },
        select: { id: true },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          status: nextStatus,
          paidAt: nextStatus === 'PAID' ? paymentDate : invoice.paidAt,
          clientVisible: invoice.clientVisible && nextStatus !== 'VOID' && nextStatus !== 'CANCELLED' && nextStatus !== 'DRAFT',
        },
      });

      await tx.auditLog.create({
        data: {
          actor: adminSession.email,
          action: 'PAYMENT_RECORDED',
          entity: 'Payment',
          entityId: created.id,
          actorAdminId: adminSession.userId,
          details: {
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount,
            paymentDate,
            nextStatus,
            outstandingBalance: nextOutstanding,
          },
        },
      });
      return created;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (error instanceof PaymentMutationError) {
      return jsonError(error.message, error.status, undefined, { requestId });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return jsonError('Another payment was recorded at the same time. Please retry.', 409, undefined, { requestId });
    }

    throw error;
  }

  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('paymentRecorded', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
