import { clearAdminCookie } from '../../../../lib/auth';
import { assertSameOrigin, getRequestId, jsonError, jsonSuccess } from '../../../../lib/api';
import { buildRequestLogMeta, logInfo, logWarn } from '../../../../lib/logger';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.logout', requestId);

  if (!assertSameOrigin(request)) {
    logWarn('auth.logout_invalid_origin', requestMeta);
    return jsonError('Invalid request origin.', 403, undefined, { requestId });
  }

  const response = jsonSuccess({}, 200, { requestId });
  clearAdminCookie(response);
  logInfo('auth.logout_success', requestMeta);
  return response;
}
