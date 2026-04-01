import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../lib/prisma';
import { requireAdminAuth } from '../../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../../lib/admin-access';
import { MODERATION_ROLES } from '../../../../../../lib/permissions';
import { forumReplyUpdateSchema } from '../../../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
  safeRedirectPath,
} from '../../../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../../../lib/constants';
import { buildRequestLogMeta, logWarn } from '../../../../../../lib/logger';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.forum.reply_update', requestId);

  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403, undefined, { requestId });
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: MODERATION_ROLES,
    requestId,
    requestMeta,
    unauthorizedEvent: 'admin.forum_reply_update_unauthorized',
    forbiddenEvent: 'admin.forum_reply_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError('Unable to parse request.', 400, undefined, { requestId });
  }

  const payload = formDataToObject(formData);
  const result = forumReplyUpdateSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const existing = await prisma.forumReply.findFirst({
    where: { id: params.id, deletedAt: null },
    select: { id: true, threadId: true },
  });

  if (!existing) {
    return jsonError('Reply not found.', 404, undefined, { requestId });
  }

  await prisma.forumReply.update({
    where: { id: params.id },
    data: { status: result.data.status },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'FORUM_REPLY_MODERATED',
      entity: 'ForumReply',
      entityId: params.id,
      actorAdminId: adminSession.userId,
      details: {
        status: result.data.status,
        threadId: existing.threadId,
      },
    },
  });

  const baseReturnTo = safeRedirectPath(
    payload.returnTo,
    `/admin/forum/${existing.threadId}`,
    ['/admin/forum'],
  );
  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('replyUpdated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}

