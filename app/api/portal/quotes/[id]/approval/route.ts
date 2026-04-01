import { type QuoteApprovalStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requirePortalAuth } from '../../../../../../lib/portal-auth';
import { assertSameOrigin, formDataToObject, getRequestId, isRequestBodyWithinLimit, jsonError, safeRedirectPath } from '../../../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../../../lib/constants';
import { syncLeadStatusFromQuote } from '../../../../../../lib/crm';
import { prisma } from '../../../../../../lib/prisma';
import { canClientRespondToQuote, deriveQuoteApprovalStatus } from '../../../../../../lib/billing';
import { quoteApprovalSubmissionSchema } from '../../../../../../lib/validators';

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
  const baseReturnTo = safeRedirectPath(payload.returnTo, `/portal/quotes/${params.id}`, ['/portal/quotes']);
  const result = quoteApprovalSubmissionSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const quote = await prisma.quoteRequest.findFirst({
    where: {
      id: params.id,
      leadId: session.leadId,
      deletedAt: null,
    },
    select: {
      id: true,
      leadId: true,
      status: true,
      approvalStatus: true,
      quoteSentAt: true,
      validityDays: true,
      clientViewedAt: true,
      clientRespondedAt: true,
      clientResponseNote: true,
    },
  });

  if (!quote) {
    return jsonError('Quote request not found.', 404, undefined, { requestId });
  }

  const derivedStatus = deriveQuoteApprovalStatus({
    approvalStatus: quote.approvalStatus,
    quoteSentAt: quote.quoteSentAt,
    validityDays: quote.validityDays,
  });

  const nextApprovalStatus = (result.data.approvalStatus || 'VIEWED') as QuoteApprovalStatus;
  const responseNote = result.data.clientResponseNote || null;
  const now = new Date();

  if (nextApprovalStatus === 'ACCEPTED' && !canClientRespondToQuote(derivedStatus)) {
    return jsonError('This quote is no longer available for acceptance.', 422, undefined, { requestId });
  }

  if (nextApprovalStatus === 'DECLINED' && derivedStatus === 'ARCHIVED') {
    return jsonError('This quote is archived and cannot be updated.', 422, undefined, { requestId });
  }

  const nextStatus: QuoteApprovalStatus =
    nextApprovalStatus === 'VIEWED'
      ? derivedStatus === 'DRAFT'
        ? quote.approvalStatus
        : derivedStatus === 'ARCHIVED'
          ? 'ARCHIVED'
        : derivedStatus === 'EXPIRED'
          ? 'EXPIRED'
          : 'VIEWED'
      : nextApprovalStatus;

  await prisma.$transaction(async (tx) => {
    await tx.quoteRequest.update({
      where: { id: quote.id },
      data: {
        approvalStatus: nextStatus,
        clientViewedAt: quote.clientViewedAt || now,
        clientRespondedAt: nextApprovalStatus === 'ACCEPTED' || nextApprovalStatus === 'DECLINED' ? now : quote.clientRespondedAt,
        clientResponseNote: nextApprovalStatus === 'ACCEPTED' || nextApprovalStatus === 'DECLINED' ? responseNote : quote.clientResponseNote,
        clientRespondedByClientUserId:
          nextApprovalStatus === 'ACCEPTED' || nextApprovalStatus === 'DECLINED'
            ? session.userId
            : undefined,
        status:
          nextApprovalStatus === 'ACCEPTED'
            ? 'WON'
            : nextApprovalStatus === 'DECLINED'
              ? 'LOST'
              : quote.status,
      },
    });

    if (nextApprovalStatus === 'ACCEPTED' || nextApprovalStatus === 'DECLINED') {
      await tx.communicationLog.create({
        data: {
          channel: 'SYSTEM',
          direction: 'INBOUND',
          subject:
            nextApprovalStatus === 'ACCEPTED'
              ? 'Quote accepted via portal'
              : 'Quote declined via portal',
          message:
            responseNote ||
            (nextApprovalStatus === 'ACCEPTED'
              ? 'Client confirmed quote acceptance through the portal.'
              : 'Client declined the quote through the portal.'),
          quoteRequestId: quote.id,
          leadId: quote.leadId,
          actorName: session.fullName,
          actorEmail: session.email,
        },
      });
    }
  });

  if (nextApprovalStatus === 'ACCEPTED' || nextApprovalStatus === 'DECLINED') {
    await syncLeadStatusFromQuote(
      quote.id,
      nextApprovalStatus === 'ACCEPTED' ? 'WON' : 'LOST',
    );
  }

  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set(nextApprovalStatus === 'ACCEPTED' ? 'accepted' : nextApprovalStatus === 'DECLINED' ? 'declined' : 'viewed', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
