import { NextResponse } from 'next/server';
import { requirePortalAuth } from '../../../../../../lib/portal-auth';
import { assertSameOrigin, formDataToObject, getRequestId, isRequestBodyWithinLimit, jsonError } from '../../../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../../../lib/constants';
import { getPortalInvoiceOwnershipFilter } from '../../../../../../lib/portal';
import { prisma } from '../../../../../../lib/prisma';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request);

  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403, undefined, { requestId });
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.jsonForm)) {
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requirePortalAuth();
  if (!session) {
    return jsonError('Unauthorized.', 401, undefined, { requestId });
  }

  if (!session.leadId) {
    return jsonError('Client profile is not linked to an authorized lead record.', 403, undefined, { requestId });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError('Unable to parse request.', 400, undefined, { requestId });
  }

  const payload = formDataToObject(formData);
  void payload.returnTo;

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
      clientVisible: true,
      ...getPortalInvoiceOwnershipFilter(session.leadId),
    },
    select: {
      id: true,
      clientViewedAt: true,
      clientViewedByClientUserId: true,
    },
  });

  if (!invoice) {
    return jsonError('Invoice not found.', 404, undefined, { requestId });
  }

  if (!invoice.clientViewedAt || !invoice.clientViewedByClientUserId) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        clientViewedAt: invoice.clientViewedAt || new Date(),
        clientViewedByClientUserId: invoice.clientViewedByClientUserId || session.userId,
      },
    });
  }

  const response = NextResponse.json({ success: true });
  response.headers.set('x-request-id', requestId);
  return response;
}
