import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { OPERATIONS_ROLES } from '../../../../../lib/permissions';
import {
  convertWonQuoteToDeliveryProject,
  logActivity,
  syncLeadAssignment,
  syncLeadStatusFromQuote,
} from '../../../../../lib/crm';
import { parseBoolean, parseLineItems, quoteUpdateSchema } from '../../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
  safeRedirectPath,
} from '../../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../../lib/constants';
import { buildRequestLogMeta } from '../../../../../lib/logger';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.quotes.update', requestId);

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
    unauthorizedEvent: 'admin.quote_update_unauthorized',
    forbiddenEvent: 'admin.quote_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError('Unable to parse request.', 400, undefined, { requestId });
  }

  const payload = formDataToObject(formData);
  const baseReturnTo = safeRedirectPath(
    payload.returnTo,
    `/admin/quotes/${params.id}`,
    ['/admin/quotes'],
  );
  const result = quoteUpdateSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const existing = await prisma.quoteRequest.findFirst({
    where: { id: params.id, deletedAt: null },
    select: {
      id: true,
      status: true,
      assignedToAdminId: true,
      leadId: true,
      quoteSentAt: true,
      convertedProject: {
        select: { id: true },
      },
    },
  });

  if (!existing) {
    return jsonError('Quote request not found.', 404, undefined, { requestId });
  }

  let leadStatusBefore: string | null = null;
  if (existing.leadId) {
    const linkedLead = await prisma.lead.findUnique({
      where: { id: existing.leadId },
      select: { status: true },
    });
    leadStatusBefore = linkedLead?.status || null;
  }

  const nextAssignedAdminId = result.data.assignedToAdminId || null;
  const shouldConvertToProject = parseBoolean(result.data.convertToProject, false);

  if (shouldConvertToProject && result.data.status !== 'WON') {
    return jsonError('Quote must be marked as WON before conversion to a delivery project.', 422, undefined, { requestId });
  }

  if (nextAssignedAdminId) {
    const assignee = await prisma.adminUser.findFirst({
      where: { id: nextAssignedAdminId, isActive: true },
      select: { id: true },
    });

    if (!assignee) {
      return jsonError('Assigned user is invalid or inactive.', 422, undefined, { requestId });
    }
  }

  const quoteSentNow = parseBoolean(result.data.quoteSentNow, false);
  const quoteSentAtUpdate = result.data.quoteSentAt
    ? new Date(result.data.quoteSentAt)
    : quoteSentNow
      ? new Date()
      : undefined;

  const lastContactedAtUpdate = result.data.lastContactedAt
    ? new Date(result.data.lastContactedAt)
    : undefined;

  await prisma.quoteRequest.update({
    where: { id: params.id },
    data: {
      status: result.data.status,
      assignedToAdminId: nextAssignedAdminId,
      internalNotes: result.data.internalNotes || null,
      followUpNotes: result.data.followUpNotes || null,
      lastContactedAt: lastContactedAtUpdate,
      quoteSentAt: quoteSentAtUpdate,
      quoteSummary: result.data.quoteSummary || null,
      scopeNotes: result.data.scopeNotes || null,
      attachmentUrl: result.data.attachmentUrl || null,
      lineItems: result.data.lineItemsText ? parseLineItems(result.data.lineItemsText) : undefined,
      estimateSubtotal: result.data.estimateSubtotal ?? null,
      estimateTax: result.data.estimateTax ?? null,
      estimateTotal: result.data.estimateTotal ?? null,
      validityDays: result.data.validityDays || 14,
      exclusions: result.data.exclusions || null,
      assumptions: result.data.assumptions || null,
      termsDisclaimer: result.data.termsDisclaimer || null,
    },
  });

  if (existing.leadId) {
    await syncLeadAssignment(existing.leadId, nextAssignedAdminId);

    if (result.data.leadStatus) {
      await prisma.lead.update({
        where: { id: existing.leadId },
        data: { status: result.data.leadStatus },
      });

      if (leadStatusBefore && leadStatusBefore !== result.data.leadStatus) {
        await logActivity({
          type: 'LEAD_STATUS_CHANGED',
          title: 'Lead status updated from quote workflow',
          description: `Lead status changed from ${leadStatusBefore} to ${result.data.leadStatus}.`,
          actorAdminId: adminSession.userId,
          leadId: existing.leadId,
          quoteRequestId: existing.id,
          metadata: {
            previousStatus: leadStatusBefore,
            nextStatus: result.data.leadStatus,
          },
        });
      }
    } else {
      await syncLeadStatusFromQuote(existing.id, result.data.status);
    }
  }

  let convertedProjectId: string | null = existing.convertedProject?.id || null;
  if (shouldConvertToProject && !convertedProjectId) {
    try {
      const project = await convertWonQuoteToDeliveryProject({
        quoteId: existing.id,
        actorAdminId: adminSession.userId,
        title: result.data.deliveryProjectTitle,
        startTarget: result.data.deliveryProjectStartTarget
          ? new Date(result.data.deliveryProjectStartTarget)
          : null,
        notes: result.data.deliveryProjectNotes,
      });

      convertedProjectId = project.id;

      if (project.created) {
        await logActivity({
          type: 'PROJECT_CONVERTED',
          title: 'Quote converted to delivery project',
          description: 'Won quote converted into a delivery project foundation.',
          actorAdminId: adminSession.userId,
          leadId: existing.leadId,
          quoteRequestId: existing.id,
          deliveryProjectId: convertedProjectId,
        });
      }
    } catch (error) {
      return jsonError(error instanceof Error ? error.message : 'Unable to convert quote to delivery project.', 422, undefined, { requestId });
    }
  }

  if (existing.status !== result.data.status) {
    await logActivity({
      type: 'QUOTE_STATUS_CHANGED',
      title: 'Quote status updated',
      description: `Status changed from ${existing.status} to ${result.data.status}.`,
      actorAdminId: adminSession.userId,
      leadId: existing.leadId,
      quoteRequestId: existing.id,
      metadata: {
        previousStatus: existing.status,
        nextStatus: result.data.status,
      },
    });

    if (result.data.status === 'WON') {
      await logActivity({
        type: 'QUOTE_WON',
        title: 'Quote marked as won',
        description: 'Quote won status confirmed in admin workflow.',
        actorAdminId: adminSession.userId,
        leadId: existing.leadId,
        quoteRequestId: existing.id,
      });
    }
  }

  if (existing.assignedToAdminId !== nextAssignedAdminId) {
    await logActivity({
      type: 'QUOTE_ASSIGNED',
      title: 'Quote assignment updated',
      description: nextAssignedAdminId
        ? 'Quote assigned to a staff member.'
        : 'Quote assignment removed.',
      actorAdminId: adminSession.userId,
      leadId: existing.leadId,
      quoteRequestId: existing.id,
      metadata: {
        previousAssignedToAdminId: existing.assignedToAdminId,
        nextAssignedToAdminId: nextAssignedAdminId,
      },
    });
  }

  if (result.data.communicationMessage) {
    await prisma.communicationLog.create({
      data: {
        channel: result.data.communicationChannel || 'NOTE',
        direction: result.data.communicationDirection || 'INTERNAL',
        subject: result.data.communicationSubject || null,
        message: result.data.communicationMessage,
        quoteRequestId: params.id,
        leadId: existing.leadId,
        deliveryProjectId: convertedProjectId,
        actorName: adminSession.email,
        actorEmail: adminSession.email,
        actorAdminId: adminSession.userId,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'QUOTE_UPDATED',
      entity: 'QuoteRequest',
      entityId: params.id,
      actorAdminId: adminSession.userId,
      details: {
        status: result.data.status,
        assignedToAdminId: nextAssignedAdminId,
        quoteSentAt: quoteSentAtUpdate || existing.quoteSentAt,
        convertedProjectId,
      },
    },
  });

  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('updated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
