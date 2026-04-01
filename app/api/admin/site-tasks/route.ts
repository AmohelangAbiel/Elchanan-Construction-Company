import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { resolveSiteTaskDates } from '../../../../lib/operations-data';
import { SITE_OPERATIONS_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { siteTaskFormSchema } from '../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
  safeRedirectPath,
} from '../../../../lib/api';
import { buildRequestLogMeta } from '../../../../lib/logger';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.site_tasks.create', requestId);

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
    unauthorizedEvent: 'admin.site_tasks_create_unauthorized',
    forbiddenEvent: 'admin.site_tasks_create_forbidden',
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

  const [project, assignee, milestone] = await Promise.all([
    prisma.deliveryProject.findFirst({
      where: { id: result.data.deliveryProjectId, deletedAt: null },
      select: { id: true },
    }),
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

  if (!project) {
    return jsonError('Project was not found.', 404, undefined, { requestId });
  }

  if (result.data.assignedToAdminId && !assignee) {
    return jsonError('Assigned team member is invalid.', 422, undefined, { requestId });
  }

  if (result.data.projectMilestoneId && !milestone) {
    return jsonError('Selected milestone does not belong to this project.', 422, undefined, { requestId });
  }

  const statusDates = resolveSiteTaskDates({ nextStatus: result.data.status });

  const siteTask = await prisma.siteTask.create({
    data: {
      deliveryProjectId: result.data.deliveryProjectId,
      projectMilestoneId: result.data.projectMilestoneId || null,
      title: result.data.title,
      description: result.data.description || null,
      status: result.data.status,
      priority: result.data.priority,
      dueDate: result.data.dueDate ? new Date(result.data.dueDate) : null,
      startedAt: statusDates.startedAt,
      completedAt: statusDates.completedAt,
      assignedToAdminId: result.data.assignedToAdminId || null,
      createdByAdminId: adminSession.userId,
    },
    select: { id: true, deliveryProjectId: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'SITE_TASK_CREATED',
      entity: 'SiteTask',
      entityId: siteTask.id,
      actorAdminId: adminSession.userId,
      details: {
        deliveryProjectId: siteTask.deliveryProjectId,
        status: result.data.status,
        priority: result.data.priority,
      },
    },
  });

  const baseReturnTo = safeRedirectPath(
    payload.returnTo,
    `/admin/projects/${siteTask.deliveryProjectId}/operations`,
    ['/admin/projects', '/admin/site-tasks'],
  );
  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('siteTaskCreated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
