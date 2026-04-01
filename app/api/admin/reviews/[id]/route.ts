import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { MODERATION_ROLES } from '../../../../../lib/permissions';
import { parseBoolean, reviewUpdateSchema } from '../../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  isRequestBodyWithinLimit,
  jsonError,
} from '../../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../../lib/constants';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403);
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413);
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: MODERATION_ROLES,
    unauthorizedEvent: 'admin.review_update_unauthorized',
    forbiddenEvent: 'admin.review_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError('Unable to parse request.', 400);
  }

  const payload = formDataToObject(formData);
  const result = reviewUpdateSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten());
  }

  const existing = await prisma.review.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true },
  });

  if (!existing) {
    return jsonError('Review not found.', 404);
  }

  await prisma.review.update({
    where: { id: params.id },
    data: {
      status: result.data.status,
      featured: parseBoolean(result.data.featured, false),
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'REVIEW_MODERATED',
      entity: 'Review',
      entityId: params.id,
      actorAdminId: adminSession.userId,
      details: {
        status: result.data.status,
        featured: parseBoolean(result.data.featured, false),
      },
    },
  });

  const redirectUrl = new URL(`/admin/reviews/${params.id}`, request.url);
  redirectUrl.searchParams.set('updated', '1');
  return NextResponse.redirect(redirectUrl);
}

