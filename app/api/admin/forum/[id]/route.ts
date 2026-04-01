import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { MODERATION_ROLES } from '../../../../../lib/permissions';
import { forumThreadUpdateSchema } from '../../../../../lib/validators';
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
    unauthorizedEvent: 'admin.forum_thread_update_unauthorized',
    forbiddenEvent: 'admin.forum_thread_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError('Unable to parse request.', 400);
  }

  const payload = formDataToObject(formData);
  const result = forumThreadUpdateSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten());
  }

  const existing = await prisma.forumThread.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true, publishedAt: true },
  });

  if (!existing) {
    return jsonError('Thread not found.', 404);
  }

  await prisma.forumThread.update({
    where: { id: params.id },
    data: {
      status: result.data.status,
      publishedAt:
        result.data.status === 'OPEN'
          ? existing.publishedAt || new Date()
          : existing.publishedAt,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'FORUM_THREAD_MODERATED',
      entity: 'ForumThread',
      entityId: params.id,
      actorAdminId: adminSession.userId,
      details: {
        status: result.data.status,
      },
    },
  });

  const redirectUrl = new URL(`/admin/forum/${params.id}`, request.url);
  redirectUrl.searchParams.set('updated', '1');
  return NextResponse.redirect(redirectUrl);
}

