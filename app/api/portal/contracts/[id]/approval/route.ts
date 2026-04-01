import { type DocumentApprovalStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requirePortalAuth } from '../../../../../../lib/portal-auth';
import { assertSameOrigin, formDataToObject, getRequestId, isRequestBodyWithinLimit, jsonError, safeRedirectPath } from '../../../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../../../lib/constants';
import { prisma } from '../../../../../../lib/prisma';
import { canClientRespondToDocument, deriveDocumentApprovalStatus } from '../../../../../../lib/billing';
import { documentApprovalSubmissionSchema } from '../../../../../../lib/validators';

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
  const baseReturnTo = safeRedirectPath(payload.returnTo, `/portal/contracts/${params.id}`, ['/portal/contracts']);
  const result = documentApprovalSubmissionSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const document = await prisma.portalDocument.findFirst({
    where: {
      id: params.id,
      leadId: session.leadId,
      deletedAt: null,
      clientVisible: true,
    },
    select: {
      id: true,
      leadId: true,
      approvalStatus: true,
      clientVisible: true,
      clientViewedAt: true,
      clientResponseNote: true,
      type: true,
    },
  });

  if (!document) {
    return jsonError('Contract document not found.', 404, undefined, { requestId });
  }

  const derivedStatus = deriveDocumentApprovalStatus({
    approvalStatus: document.approvalStatus,
    clientViewedAt: document.clientViewedAt,
  });

  const nextApprovalStatus = (result.data.approvalStatus || 'VIEWED') as DocumentApprovalStatus;
  const responseNote = result.data.clientResponseNote || null;
  const now = new Date();

  if (nextApprovalStatus === 'APPROVED' && !canClientRespondToDocument(derivedStatus)) {
    return jsonError('This document is no longer available for approval.', 422, undefined, { requestId });
  }

  if (nextApprovalStatus === 'REJECTED' && derivedStatus === 'ARCHIVED') {
    return jsonError('This document is archived and cannot be updated.', 422, undefined, { requestId });
  }

  const nextStatus: DocumentApprovalStatus =
    nextApprovalStatus === 'VIEWED'
      ? derivedStatus === 'DRAFT'
        ? document.approvalStatus
        : derivedStatus === 'ARCHIVED'
          ? 'ARCHIVED'
        : 'VIEWED'
      : nextApprovalStatus;

  await prisma.$transaction(async (tx) => {
    await tx.portalDocument.update({
      where: { id: document.id },
      data: {
        approvalStatus: nextStatus,
        clientViewedAt: document.clientViewedAt || now,
        clientRespondedAt: nextApprovalStatus === 'APPROVED' || nextApprovalStatus === 'REJECTED' ? now : undefined,
        clientResponseNote: nextApprovalStatus === 'APPROVED' || nextApprovalStatus === 'REJECTED' ? responseNote : document.clientResponseNote,
        clientRespondedByClientUserId:
          nextApprovalStatus === 'APPROVED' || nextApprovalStatus === 'REJECTED'
            ? session.userId
            : undefined,
      },
    });

    if (nextApprovalStatus === 'APPROVED' || nextApprovalStatus === 'REJECTED') {
      await tx.communicationLog.create({
        data: {
          channel: 'SYSTEM',
          direction: 'INBOUND',
          subject:
            nextApprovalStatus === 'APPROVED'
              ? 'Contract approved via portal'
              : 'Contract rejected via portal',
          message:
            responseNote ||
            (nextApprovalStatus === 'APPROVED'
              ? 'Client approved the contract document through the portal.'
              : 'Client rejected the contract document through the portal.'),
          leadId: document.leadId,
          actorName: session.fullName,
          actorEmail: session.email,
        },
      });
    }
  });

  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set(nextApprovalStatus === 'APPROVED' ? 'approved' : nextApprovalStatus === 'REJECTED' ? 'rejected' : 'viewed', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
