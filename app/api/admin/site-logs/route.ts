import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { parseBoolean, siteLogFormSchema, splitMediaLines } from '../../../../lib/validators';
import { SITE_OPERATIONS_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
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
  const requestMeta = buildRequestLogMeta(request, 'admin.site_logs.create', requestId);

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
    unauthorizedEvent: 'admin.site_logs_create_unauthorized',
    forbiddenEvent: 'admin.site_logs_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const result = siteLogFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const project = await prisma.deliveryProject.findFirst({
    where: { id: result.data.deliveryProjectId, deletedAt: null },
    select: { id: true },
  });

  if (!project) {
    return jsonError('Project was not found.', 404, undefined, { requestId });
  }

  const siteLog = await prisma.siteLog.create({
    data: {
      deliveryProjectId: result.data.deliveryProjectId,
      logDate: new Date(result.data.logDate),
      summary: result.data.summary,
      workCompleted: result.data.workCompleted || null,
      issuesRisks: result.data.issuesRisks || null,
      nextSteps: result.data.nextSteps || null,
      weatherConditions: result.data.weatherConditions || null,
      attachmentUrls: splitMediaLines(result.data.attachmentUrlsText),
      clientVisible: parseBoolean(result.data.clientVisible, false),
      createdByAdminId: adminSession.userId,
    },
    select: { id: true, deliveryProjectId: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'SITE_LOG_CREATED',
      entity: 'SiteLog',
      entityId: siteLog.id,
      actorAdminId: adminSession.userId,
      details: {
        deliveryProjectId: siteLog.deliveryProjectId,
      },
    },
  });

  const baseReturnTo = safeRedirectPath(
    payload.returnTo,
    `/admin/projects/${siteLog.deliveryProjectId}/operations`,
    ['/admin/projects', '/admin/site-logs'],
  );
  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('siteLogCreated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
