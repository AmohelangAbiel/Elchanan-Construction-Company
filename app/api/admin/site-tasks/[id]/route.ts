import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { BODY_SIZE_LIMITS } from '../../../../../lib/constants';
import { resolveSiteTaskDates } from '../../../../../lib/operations-data';
import { canTransitionSiteTaskStatus } from '../../../../../lib/operations';
import { SITE_OPERATIONS_ROLES } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';
import { siteTaskFormSchema } from '../../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
  safeRedirectPath,
} from '../../../../../lib/api';
import { buildRequestLogMeta } from '../../../../../lib/logger';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.site_tasks.update', requestId);

  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403, undefined, { requestId });
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: SITE_OPERATIONS_ROLES,
    requestId,
    requestMeta,
    unauthorizedEvent: 'admin.site_tasks_update_unauthorized',
    forbiddenEvent: 'admin.site_tasks_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const result = siteTaskFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const existing = await prisma.siteTask.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      deliveryProjectId: true,
      status: true,
      startedAt: true,
      completedAt: true,
    },
  });

  if (!existing) {
    return jsonError('Site task was not found.', 404, undefined, { requestId });
  }

  if (result.data.deliveryProjectId !== existing.deliveryProjectId) {
    return jsonError('Project context mismatch for site task.', 422, undefined, { requestId });
  }

  if (!canTransitionSiteTaskStatus(existing.status, result.data.status)) {
    return jsonError('Invalid site task status transition.', 422, undefined, { requestId });
  }

  const [assignee, milestone] = await Promise.all([
    result.data.assignedToAdminId
      ? prisma.adminUser.findFirst({
          where: { id: result.data.assignedToAdminId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
    result.data.projectMilestoneId
      ? prisma.projectMilestone.findFirst({
          where: {
            id: result.data.projectMilestoneId,
            deliveryProjectId: result.data.deliveryProjectId,
            deletedAt: null,
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (result.data.assignedToAdminId && !assignee) {
    return jsonError('Assigned team member is invalid.', 422, undefined, { requestId });
  }

  if (result.data.projectMilestoneId && !milestone) {
    return jsonError('Selected milestone does not belong to this project.', 422, undefined, { requestId });
  }

  const statusDates = resolveSiteTaskDates({
    currentStatus: existing.status,
    nextStatus: result.data.status,
    startedAt: existing.startedAt,
    completedAt: existing.completedAt,
  });

  await prisma.siteTask.update({
    where: { id: params.id },
    data: {
      projectMilestoneId: result.data.projectMilestoneId || null,
      title: result.data.title,
      description: result.data.description || null,
      status: result.data.status,
      priority: result.data.priority,
      dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null,
      startedAt: statusDates.startedAt,
      completedAt: statusDates.completedAt,
      assignedToAdminId: result.data.assignedToAdminId || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'SITE_TASK_UPDATED',
      entity: 'SiteTask',
      entityId: params.id,
      actorAdminId: adminSession.userId,
      details: {
        deliveryProjectId: existing.deliveryProjectId,
        previousStatus: existing.status,
        nextStatus: result.data.status,
      },
    },
  });

  const baseReturnTo = safeRedirectPath(
    payload.returnTo,
    `/admin/projects/${existing.deliveryProjectId}/operations`,
    ['/admin/projects', '/admin/site-tasks'],
  );
  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('siteTaskUpdated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
