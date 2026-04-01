import { clearPortalCookie } from '../../../../lib/portal-auth';
import { assertSameOrigin, getRequestId, jsonError, jsonSuccess } from '../../../../lib/api';
import { buildRequestLogMeta, logInfo, logWarn } from '../../../../lib/logger';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'portal.logout', requestId);

  if (!assertSameOrigin(request)) {
    logWarn('portal.logout_invalid_origin', requestMeta);
    return jsonError('Invalid request origin.', 403, undefined, { requestId });
  }

  const response = jsonSuccess({}, 200, { requestId });
  clearPortalCookie(response);
  logInfo('portal.logout_success', requestMeta);
  return response;
}
