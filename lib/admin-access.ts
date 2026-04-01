import type { UserRole } from '@prisma/client';
import type { AdminSession } from './auth';
import { jsonError } from './api';
import { logWarn } from './logger';
import { hasRoleAccess } from './permissions';

type AdminApiAccessInput = {
  session: AdminSession | null;
  allowedRoles: UserRole[];
  requestId?: string;
  requestMeta?: Record<string, unknown>;
  unauthorizedEvent: string;
  forbiddenEvent: string;
};

export function enforceAdminApiRole(input: AdminApiAccessInput) {
  if (!input.session) {
    logWarn(input.unauthorizedEvent, input.requestMeta);
    return jsonError('Unauthorized', 401, undefined, { requestId: input.requestId });
  }

  if (!hasRoleAccess(input.session.role, input.allowedRoles)) {
    logWarn(input.forbiddenEvent, {
      ...input.requestMeta,
      role: input.session.role,
    });
    return jsonError('Forbidden', 403, undefined, { requestId: input.requestId });
  }

  return null;
}

