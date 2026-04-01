import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { CRM_ROLES } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';
import { leadUpdateSchema, splitTags } from '../../../../../lib/validators';
import { logActivity } from '../../../../../lib/crm';
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
  const requestMeta = buildRequestLogMeta(request, 'admin.leads.update', requestId);

  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403, undefined, { requestId });
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: CRM_ROLES,
    requestId,
    requestMeta,
    unauthorizedEvent: 'admin.lead_update_unauthorized',
    forbiddenEvent: 'admin.lead_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const baseReturnTo = safeRedirectPath(payload.returnTo, `/admin/leads/${params.id}`, ['/admin/leads']);
  const result = leadUpdateSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const existing = await prisma.lead.findFirst({
    where: { id: params.id, deletedAt: null },
    select: {
      id: true,
      status: true,
      assignedToAdminId: true,
      notes: true,
    },
  });

  if (!existing) {
    return jsonError('Lead not found.', 404, undefined, { requestId });
  }

  const nextAssignedToAdminId = result.data.assignedToAdminId || null;
  if (nextAssignedToAdminId) {
    const assignee = await prisma.adminUser.findFirst({
      where: { id: nextAssignedToAdminId, isActive: true },
      select: { id: true },
    });

    if (!assignee) {
      return jsonError('Assigned user is invalid or inactive.', 422, undefined, { requestId });
    }
  }

  const lastContactedAt = result.data.lastContactedAt
    ? new Date(result.data.lastContactedAt)
    : undefined;

  await prisma.lead.update({
    where: { id: params.id },
    data: {
      status: result.data.status,
      assignedToAdminId: nextAssignedToAdminId,
      companyName: result.data.companyName || null,
      location: result.data.location || null,
      notes: result.data.notes || null,
      tags: splitTags(result.data.tagsText),
      lastContactedAt,
    },
  });

  if (existing.status !== result.data.status) {
    await logActivity({
      type: 'LEAD_STATUS_CHANGED',
      title: 'Lead status updated',
      description: `Status changed from ${existing.status} to ${result.data.status}.`,
      actorAdminId: adminSession.userId,
      leadId: existing.id,
      metadata: {
        previousStatus: existing.status,
        nextStatus: result.data.status,
      },
    });
  }

  if (existing.assignedToAdminId !== nextAssignedToAdminId) {
    await logActivity({
      type: 'LEAD_ASSIGNED',
      title: 'Lead assignment updated',
      description: nextAssignedToAdminId
        ? 'Lead assigned to a staff owner.'
        : 'Lead assignment removed.',
      actorAdminId: adminSession.userId,
      leadId: existing.id,
      metadata: {
        previousAssignedToAdminId: existing.assignedToAdminId,
        nextAssignedToAdminId,
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
        leadId: existing.id,
        actorName: adminSession.email,
        actorEmail: adminSession.email,
        actorAdminId: adminSession.userId,
      },
    });
  }

  if ((result.data.notes || null) !== existing.notes) {
    await logActivity({
      type: 'NOTE_ADDED',
      title: 'Lead notes updated',
      description: 'Internal lead notes were edited.',
      actorAdminId: adminSession.userId,
      leadId: existing.id,
    });
  }

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'LEAD_UPDATED',
      entity: 'Lead',
      entityId: existing.id,
      actorAdminId: adminSession.userId,
      details: {
        status: result.data.status,
        assignedToAdminId: nextAssignedToAdminId,
        lastContactedAt: result.data.lastContactedAt || null,
      },
    },
  });

  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('updated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
