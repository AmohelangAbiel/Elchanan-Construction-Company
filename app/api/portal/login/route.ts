import { prisma } from '../../../../lib/prisma';
import { portalLoginSchema } from '../../../../lib/validators';
import { checkRateLimitMany } from '../../../../lib/rate-limit';
import {
  createPortalToken,
  getPortalAuthConfigurationIssues,
  setPortalCookie,
  verifyPortalPassword,
} from '../../../../lib/portal-auth';
import {
  assertSameOrigin,
  getRequestId,
  getRequesterMetadata,
  isRequestBodyWithinLimit,
  jsonError,
  jsonSuccess,
} from '../../../../lib/api';
import { BODY_SIZE_LIMITS, RATE_LIMIT_WINDOWS } from '../../../../lib/constants';
import { buildRequestLogMeta, logError, logInfo, logWarn, serializeError } from '../../../../lib/logger';

const INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect.';
const LOGIN_UNAVAILABLE_MESSAGE = 'Portal login is temporarily unavailable.';
const CONFIG_ERROR_ACTION = 'Set PORTAL_SECRET and IP_HASH_SALT in Render, then redeploy the service.';
const DATABASE_ERROR_ACTION = 'Verify DATABASE_URL, database reachability, and Prisma migrations on Render.';
const PASSWORD_HASH_ERROR_ACTION = 'Reset the affected portal password hash or reseed the portal user.';
const GENERIC_ERROR_ACTION = 'Check the Render service logs for this request ID and verify the portal login configuration.';

function portalLoginConfigError(requestId: string, issues: string[]) {
  return jsonError(
    'Portal login is not configured on the server.',
    500,
    {
      issues,
      action: CONFIG_ERROR_ACTION,
    },
    {
      requestId,
      code: 'PORTAL_AUTH_CONFIG_INVALID',
    },
  );
}

function portalLoginServerError(requestId: string, code: string, action = GENERIC_ERROR_ACTION) {
  return jsonError(
    LOGIN_UNAVAILABLE_MESSAGE,
    500,
    { action },
    {
      requestId,
      code,
    },
  );
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'portal.login', requestId);

  try {
    if (!assertSameOrigin(request)) {
      logWarn('portal.login_rejected_origin', requestMeta);
      return jsonError('Invalid request origin.', 403, undefined, { requestId });
    }

    if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminLogin)) {
      logWarn('portal.login_payload_too_large', requestMeta);
      return jsonError('Payload too large.', 413, undefined, { requestId });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      logWarn('portal.login_invalid_payload', requestMeta);
      return jsonError('Invalid request payload.', 400, undefined, { requestId });
    }

    const result = portalLoginSchema.safeParse(body);
    if (!result.success) {
      logWarn('portal.login_validation_failed', requestMeta);
      return jsonError('Credentials are invalid.', 422, undefined, { requestId });
    }

    const authConfigIssues = getPortalAuthConfigurationIssues();
    if (authConfigIssues.length) {
      logError('portal.login_config_invalid', {
        ...requestMeta,
        issues: authConfigIssues,
      });
      return portalLoginConfigError(requestId, authConfigIssues);
    }

    const emailDomain = result.data.email.split('@')[1] || 'unknown';
    const requester = getRequesterMetadata(request);
    const hashedIp = requester.sourceIpHash || 'unknown-ip';

    const rateLimit = await checkRateLimitMany([
      {
        key: `portal-login-ip:${hashedIp}`,
        ...RATE_LIMIT_WINDOWS.portalLoginIp,
      },
      {
        key: `portal-login-email:${result.data.email}`,
        ...RATE_LIMIT_WINDOWS.portalLoginEmail,
      },
      {
        key: `portal-login-pair:${hashedIp}:${result.data.email}`,
        ...RATE_LIMIT_WINDOWS.portalLoginPair,
      },
    ]);

    if (!rateLimit.allowed) {
      logWarn('portal.login_rate_limited', {
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

    let user: {
      id: string;
      email: string;
      password: string;
      isActive: boolean;
      sessionVersion: number;
    } | null = null;

    try {
      user = await prisma.clientUser.findUnique({
        where: { email: result.data.email },
        select: {
          id: true,
          email: true,
          password: true,
          isActive: true,
          sessionVersion: true,
        },
      });
    } catch (error) {
      logError('portal.login_lookup_failed', {
        ...requestMeta,
        emailDomain,
        error: serializeError(error),
      });
      return portalLoginServerError(requestId, 'PORTAL_LOGIN_DATABASE_ERROR', DATABASE_ERROR_ACTION);
    }

    if (!user) {
      logWarn('portal.login_failed', {
        ...requestMeta,
        emailDomain,
        reason: 'missing_user',
      });

      return jsonError(INVALID_CREDENTIALS_MESSAGE, 401, undefined, { requestId });
    }

    if (!user.isActive) {
      logWarn('portal.login_failed', {
        ...requestMeta,
        emailDomain,
        userId: user.id,
        reason: 'inactive_user',
      });

      return jsonError(INVALID_CREDENTIALS_MESSAGE, 401, undefined, { requestId });
    }

    let passwordMatches = false;
    try {
      passwordMatches = verifyPortalPassword(result.data.password, user.password);
    } catch (error) {
      logError('portal.login_password_verification_error', {
        ...requestMeta,
        userId: user.id,
        emailDomain,
        error: serializeError(error),
      });
      return portalLoginServerError(
        requestId,
        'PORTAL_LOGIN_PASSWORD_HASH_ERROR',
        PASSWORD_HASH_ERROR_ACTION,
      );
    }

    if (!passwordMatches) {
      logWarn('portal.login_failed', {
        ...requestMeta,
        emailDomain,
        userId: user.id,
        reason: 'invalid_password',
      });

      return jsonError(INVALID_CREDENTIALS_MESSAGE, 401, undefined, { requestId });
    }

    let token: string;
    try {
      token = createPortalToken({
        userId: user.id,
        email: user.email,
        sessionVersion: user.sessionVersion,
      });
    } catch (error) {
      const issues = getPortalAuthConfigurationIssues();
      logError('portal.login_token_creation_failed', {
        ...requestMeta,
        userId: user.id,
        emailDomain,
        issues,
        error: serializeError(error),
      });

      if (issues.length) {
        return portalLoginConfigError(requestId, issues);
      }

      return portalLoginServerError(requestId, 'PORTAL_LOGIN_TOKEN_ERROR', CONFIG_ERROR_ACTION);
    }

    try {
      await prisma.clientUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      logError('portal.login_last_login_update_failed', {
        ...requestMeta,
        userId: user.id,
        emailDomain,
        error: serializeError(error),
      });
      return portalLoginServerError(requestId, 'PORTAL_LOGIN_DATABASE_ERROR', DATABASE_ERROR_ACTION);
    }

    const response = jsonSuccess({}, 200, { requestId });
    setPortalCookie(response, token);

    logInfo('portal.login_success', {
      ...requestMeta,
      userId: user.id,
    });

    return response;
  } catch (error) {
    logError('portal.login_unhandled_error', {
      ...requestMeta,
      error: serializeError(error),
    });
    return portalLoginServerError(requestId, 'PORTAL_LOGIN_FAILED');
  }
}
