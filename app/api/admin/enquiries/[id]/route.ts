import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { OPERATIONS_ROLES } from '../../../../../lib/permissions';
import { logActivity, syncLeadAssignment } from '../../../../../lib/crm';
import { enquiryUpdateSchema } from '../../../../../lib/validators';
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
  const requestMeta = buildRequestLogMeta(request, 'admin.enquiries.update', requestId);

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
    unauthorizedEvent: 'admin.enquiry_update_unauthorized',
    forbiddenEvent: 'admin.enquiry_update_forbidden',
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
    `/admin/enquiries/${params.id}`,
    ['/admin/enquiries'],
  );
  const result = enquiryUpdateSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const existing = await prisma.contactEnquiry.findFirst({
    where: { id: params.id, deletedAt: null },
    select: {
      id: true,
      status: true,
      assignedToAdminId: true,
      leadId: true,
    },
  });

  if (!existing) {
    return jsonError('Enquiry not found.', 404, undefined, { requestId });
  }

  const nextAssignedAdminId = result.data.assignedToAdminId || null;
  if (nextAssignedAdminId) {
    const assignee = await prisma.adminUser.findFirst({
      where: { id: nextAssignedAdminId, isActive: true },
      select: { id: true },
    });

    if (!assignee) {
      return jsonError('Assigned user is invalid or inactive.', 422, undefined, { requestId });
    }
  }

  const lastContactedAtUpdate = result.data.lastContactedAt
    ? new Date(result.data.lastContactedAt)
    : undefined;

  await prisma.contactEnquiry.update({
    where: { id: params.id },
    data: {
      status: result.data.status,
      assignedToAdminId: nextAssignedAdminId,
      notes: result.data.notes || null,
      followUpNotes: result.data.followUpNotes || null,
      lastContactedAt: lastContactedAtUpdate,
    },
  });

  if (existing.leadId) {
    await syncLeadAssignment(existing.leadId, nextAssignedAdminId);
  }

  if (existing.status !== result.data.status) {
    await logActivity({
      type: 'NOTE_ADDED',
      title: 'Enquiry status updated',
      description: `Status changed from ${existing.status} to ${result.data.status}.`,
      actorAdminId: adminSession.userId,
      enquiryId: existing.id,
      leadId: existing.leadId,
      metadata: {
        previousStatus: existing.status,
        nextStatus: result.data.status,
      },
    });
  }

  if (existing.assignedToAdminId !== nextAssignedAdminId) {
    await logActivity({
      type: 'ENQUIRY_ASSIGNED',
      title: 'Enquiry assignment updated',
      description: nextAssignedAdminId
        ? 'Enquiry assigned to a staff member.'
        : 'Enquiry assignment removed.',
      actorAdminId: adminSession.userId,
      enquiryId: existing.id,
      leadId: existing.leadId,
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
        enquiryId: params.id,
        leadId: existing.leadId,
        actorName: adminSession.email,
        actorEmail: adminSession.email,
        actorAdminId: adminSession.userId,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'ENQUIRY_UPDATED',
      entity: 'ContactEnquiry',
      entityId: params.id,
      actorAdminId: adminSession.userId,
      details: {
        status: result.data.status,
        assignedToAdminId: nextAssignedAdminId,
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
