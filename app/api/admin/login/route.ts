import { prisma } from '../../../../lib/prisma';
import { adminLoginSchema } from '../../../../lib/validators';
import { createAdminToken, setAdminCookie, verifyPassword } from '../../../../lib/auth';
import { checkRateLimitMany } from '../../../../lib/rate-limit';
import {
  assertSameOrigin,
  getRequestId,
  getRequesterMetadata,
  isRequestBodyWithinLimit,
  jsonError,
  jsonSuccess,
} from '../../../../lib/api';
import { BODY_SIZE_LIMITS, RATE_LIMIT_WINDOWS } from '../../../../lib/constants';
import { buildRequestLogMeta, logInfo, logWarn } from '../../../../lib/logger';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.login', requestId);

  if (!assertSameOrigin(request)) {
    logWarn('auth.login_rejected_origin', requestMeta);
    return jsonError('Invalid request origin.', 403, undefined, { requestId });
  }

  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminLogin)) {
    logWarn('auth.login_payload_too_large', requestMeta);
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    logWarn('auth.login_invalid_payload', requestMeta);
    return jsonError('Invalid request payload.', 400, undefined, { requestId });
  }

  const result = adminLoginSchema.safeParse(body);
  if (!result.success) {
    logWarn('auth.login_validation_failed', requestMeta);
    return jsonError('Credentials are invalid.', 422, undefined, { requestId });
  }

  const requester = getRequesterMetadata(request);
  const hashedIp = requester.sourceIpHash || 'unknown-ip';
  const rateLimit = await checkRateLimitMany([
    {
      key: `admin-login-ip:${hashedIp}`,
      ...RATE_LIMIT_WINDOWS.adminLoginIp,
    },
    {
      key: `admin-login-email:${result.data.email}`,
      ...RATE_LIMIT_WINDOWS.adminLoginEmail,
    },
    {
      key: `admin-login-pair:${hashedIp}:${result.data.email}`,
      ...RATE_LIMIT_WINDOWS.adminLoginPair,
    },
  ]);

  if (!rateLimit.allowed) {
    logWarn('auth.login_rate_limited', {
      ...requestMeta,
      retryAfterSeconds: rateLimit.retryAfterSeconds,
    });
    return jsonError(
      `Too many attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
      429,
      undefined,
      { requestId },
    );
  }

  const user = await prisma.adminUser.findUnique({ where: { email: result.data.email } });
  if (!user || !user.isActive || !verifyPassword(result.data.password, user.password)) {
    logWarn('auth.login_failed', {
      ...requestMeta,
      emailDomain: result.data.email.split('@')[1] || 'unknown',
    });
    return jsonError('Email or password is incorrect.', 401, undefined, { requestId });
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = createAdminToken({
    userId: user.id,
    email: user.email,
    sessionVersion: user.sessionVersion,
  });
  const response = jsonSuccess({}, 200, { requestId });
  setAdminCookie(response, token);

  logInfo('auth.login_success', {
    ...requestMeta,
    userId: user.id,
  });

  return response;
}
