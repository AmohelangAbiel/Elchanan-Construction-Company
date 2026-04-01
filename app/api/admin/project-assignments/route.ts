import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { SITE_OPERATIONS_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { projectAssignmentFormSchema } from '../../../../lib/validators';
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
  const requestMeta = buildRequestLogMeta(request, 'admin.project_assignments.create', requestId);

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
    unauthorizedEvent: 'admin.project_assignments_create_unauthorized',
    forbiddenEvent: 'admin.project_assignments_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const result = projectAssignmentFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const [project, admin] = await Promise.all([
    prisma.deliveryProject.findFirst({
      where: { id: result.data.deliveryProjectId, deletedAt: null },
      select: { id: true },
    }),
    result.data.adminUserId
      ? prisma.adminUser.findFirst({
          where: { id: result.data.adminUserId, isActive: true },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (!project) {
    return jsonError('Project was not found.', 404, undefined, { requestId });
  }

  if (result.data.adminUserId && !admin) {
    return jsonError('Assigned staff member is invalid.', 422, undefined, { requestId });
  }

  const startDate = result.data.startDate ? new Date(result.data.startDate) : null;
  const endDate = result.data.endDate ? new Date(result.data.endDate) : null;

  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    return jsonError('Assignment end date cannot be earlier than the start date.', 422, undefined, { requestId });
  }

  const assignment = await prisma.projectAssignment.create({
    data: {
      deliveryProjectId: result.data.deliveryProjectId,
      adminUserId: result.data.adminUserId || null,
      createdByAdminId: adminSession.userId,
      role: result.data.role,
      externalName: result.data.externalName || null,
      externalCompany: result.data.externalCompany || null,
      startDate,
      endDate,
      notes: result.data.notes || null,
    },
    select: { id: true, deliveryProjectId: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'PROJECT_ASSIGNMENT_CREATED',
      entity: 'ProjectAssignment',
      entityId: assignment.id,
      actorAdminId: adminSession.userId,
      details: {
        deliveryProjectId: assignment.deliveryProjectId,
        role: result.data.role,
      },
    },
  });

  const baseReturnTo = safeRedirectPath(
    payload.returnTo,
    `/admin/projects/${assignment.deliveryProjectId}/operations`,
    ['/admin/projects'],
  );
  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('assignmentCreated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
