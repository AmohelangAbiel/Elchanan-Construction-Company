import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import {
  clearAdminCookie,
  requireAdminAuth,
  revokeAdminSessions,
} from '../../../../../lib/auth';
import { assertSameOrigin, getRequestId, jsonError } from '../../../../../lib/api';
import { buildRequestLogMeta, logInfo, logWarn } from '../../../../../lib/logger';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.session.revoke', requestId);

  if (!assertSameOrigin(request)) {
    logWarn('auth.session_revoke_invalid_origin', requestMeta);
    return jsonError('Invalid request origin.', 403, undefined, { requestId });
  }

  const session = await requireAdminAuth();
  if (!session) {
    logWarn('auth.session_revoke_unauthorized', requestMeta);
    return jsonError('Unauthorized', 401, undefined, { requestId });
  }

  await revokeAdminSessions(session.userId);

  await prisma.auditLog.create({
    data: {
      actor: session.email,
      action: 'ADMIN_SESSIONS_REVOKED',
      entity: 'AdminUser',
      entityId: session.userId,
      actorAdminId: session.userId,
    },
  });

  const response = NextResponse.redirect(new URL('/admin/login?revoked=1', request.url));
  clearAdminCookie(response);
  response.headers.set('x-request-id', requestId);

  logInfo('auth.session_revoke_success', {
    ...requestMeta,
    userId: session.userId,
  });

  return response;
}
