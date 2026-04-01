import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { CONTENT_ROLES } from '../../../../lib/permissions';
import {
  normalizeSlugOrFallback,
  parseBoolean,
  serviceInputSchema,
  splitLines,
} from '../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
} from '../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { buildRequestLogMeta, logWarn } from '../../../../lib/logger';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.services.create', requestId);

  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403, undefined, { requestId });
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: CONTENT_ROLES,
    requestId,
    requestMeta,
    unauthorizedEvent: 'admin.service_create_unauthorized',
    forbiddenEvent: 'admin.service_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const result = serviceInputSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const slug = normalizeSlugOrFallback(result.data.slug, result.data.title);

  const existing = await prisma.service.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return jsonError('A service with this slug already exists.', 409, undefined, { requestId });
  }

  const service = await prisma.service.create({
    data: {
      title: result.data.title,
      slug,
      summary: result.data.summary,
      description: result.data.description,
      details: splitLines(result.data.detailsText),
      image: result.data.image || null,
      seoTitle: result.data.seoTitle || null,
      seoDescription: result.data.seoDescription || null,
      sortOrder: result.data.sortOrder,
      published: parseBoolean(result.data.published, true),
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'SERVICE_CREATED',
      entity: 'Service',
      entityId: service.id,
      actorAdminId: adminSession.userId,
    },
  });

  const response = NextResponse.redirect(new URL('/admin/services?created=1', request.url));
  response.headers.set('x-request-id', requestId);
  return response;
}

