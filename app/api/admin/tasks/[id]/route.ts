import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { CRM_ROLES } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';
import { taskUpdateSchema } from '../../../../../lib/validators';
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
  const requestMeta = buildRequestLogMeta(request, 'admin.tasks.update', requestId);

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
    unauthorizedEvent: 'admin.task_update_unauthorized',
    forbiddenEvent: 'admin.task_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const baseReturnTo = safeRedirectPath(payload.returnTo, `/admin/tasks/${params.id}`, ['/admin/tasks']);
  const result = taskUpdateSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const existing = await prisma.followUpTask.findFirst({
    where: { id: params.id, deletedAt: null },
    select: {
      id: true,
      status: true,
      assignedToAdminId: true,
      startedAt: true,
      completedAt: true,
      leadId: true,
      enquiryId: true,
      quoteRequestId: true,
      deliveryProjectId: true,
    },
  });

  if (!existing) {
    return jsonError('Task not found.', 404, undefined, { requestId });
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

  const dueAt = new Date(result.data.dueAt);
  const now = new Date();

  const startedAtUpdate = result.data.status === 'IN_PROGRESS'
    ? (existing.startedAt || now)
    : result.data.status === 'DONE'
      ? (existing.startedAt || now)
      : null;

  const completedAtUpdate = result.data.status === 'DONE'
    ? (existing.completedAt || now)
    : null;

  await prisma.followUpTask.update({
    where: { id: existing.id },
    data: {
      title: result.data.title,
      description: result.data.description || null,
      status: result.data.status,
      priority: result.data.priority,
      dueAt,
      assignedToAdminId: nextAssignedToAdminId,
      startedAt: startedAtUpdate,
      completedAt: completedAtUpdate,
    },
  });

  if (existing.status !== result.data.status) {
    await logActivity({
      type: result.data.status === 'DONE' ? 'TASK_COMPLETED' : 'TASK_STATUS_CHANGED',
      title: 'Task status updated',
      description: `Status changed from ${existing.status} to ${result.data.status}.`,
      actorAdminId: adminSession.userId,
      taskId: existing.id,
      leadId: existing.leadId,
      enquiryId: existing.enquiryId,
      quoteRequestId: existing.quoteRequestId,
      deliveryProjectId: existing.deliveryProjectId,
      metadata: {
        previousStatus: existing.status,
        nextStatus: result.data.status,
      },
    });
  }

  if (existing.assignedToAdminId !== nextAssignedToAdminId) {
    await logActivity({
      type: 'TASK_ASSIGNED',
      title: 'Task assignment updated',
      description: nextAssignedToAdminId
        ? 'Task assigned to a staff member.'
        : 'Task assignment removed.',
      actorAdminId: adminSession.userId,
      taskId: existing.id,
      leadId: existing.leadId,
      enquiryId: existing.enquiryId,
      quoteRequestId: existing.quoteRequestId,
      deliveryProjectId: existing.deliveryProjectId,
      metadata: {
        previousAssignedToAdminId: existing.assignedToAdminId,
        nextAssignedToAdminId,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'FOLLOW_UP_TASK_UPDATED',
      entity: 'FollowUpTask',
      entityId: existing.id,
      actorAdminId: adminSession.userId,
      details: {
        status: result.data.status,
        priority: result.data.priority,
        assignedToAdminId: nextAssignedToAdminId,
      },
    },
  });

  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('updated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
