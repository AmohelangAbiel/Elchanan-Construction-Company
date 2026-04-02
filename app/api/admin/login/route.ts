import { prisma } from '../../../../lib/prisma';
import { adminLoginSchema } from '../../../../lib/validators';
import {
  createAdminToken,
  getAdminAuthConfigurationIssues,
  setAdminCookie,
  verifyPassword,
} from '../../../../lib/auth';
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
import { buildRequestLogMeta, logError, logInfo, logWarn, serializeError } from '../../../../lib/logger';

const INVALID_CREDENTIALS_MESSAGE = 'Email or password is incorrect.';
const LOGIN_UNAVAILABLE_MESSAGE = 'Admin login is temporarily unavailable.';
const CONFIG_ERROR_ACTION = 'Set ADMIN_SECRET and IP_HASH_SALT in Render, then redeploy the service.';
const DATABASE_ERROR_ACTION = 'Verify DATABASE_URL, database reachability, and Prisma migrations on Render.';
const PASSWORD_HASH_ERROR_ACTION = 'Reset the affected admin password hash or reseed the admin account.';
const GENERIC_ERROR_ACTION = 'Check the Render service logs for this request ID and verify the admin login configuration.';

function adminLoginConfigError(requestId: string, issues: string[]) {
  return jsonError(
    'Admin login is not configured on the server.',
    500,
    {
      issues,
      action: CONFIG_ERROR_ACTION,
    },
    {
      requestId,
      code: 'ADMIN_AUTH_CONFIG_INVALID',
    },
  );
}

function adminLoginServerError(requestId: string, code: string, action = GENERIC_ERROR_ACTION) {
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
  const requestMeta = buildRequestLogMeta(request, 'admin.login', requestId);

  try {
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

    const authConfigIssues = getAdminAuthConfigurationIssues();
    if (authConfigIssues.length) {
      logError('auth.login_config_invalid', {
        ...requestMeta,
        issues: authConfigIssues,
      });
      return adminLoginConfigError(requestId, authConfigIssues);
    }

    const emailDomain = result.data.email.split('@')[1] || 'unknown';
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

    let user: {
      id: string;
      email: string;
      password: string;
      isActive: boolean;
      sessionVersion: number;
    } | null = null;

    try {
      user = await prisma.adminUser.findUnique({
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
      logError('auth.login_lookup_failed', {
        ...requestMeta,
        emailDomain,
        error: serializeError(error),
      });
      return adminLoginServerError(requestId, 'ADMIN_LOGIN_DATABASE_ERROR', DATABASE_ERROR_ACTION);
    }

    if (!user) {
      logWarn('auth.login_failed', {
        ...requestMeta,
        emailDomain,
        reason: 'missing_user',
      });
      return jsonError(INVALID_CREDENTIALS_MESSAGE, 401, undefined, { requestId });
    }

    if (!user.isActive) {
      logWarn('auth.login_failed', {
        ...requestMeta,
        emailDomain,
        userId: user.id,
        reason: 'inactive_user',
      });
      return jsonError(INVALID_CREDENTIALS_MESSAGE, 401, undefined, { requestId });
    }

    let passwordMatches = false;
    try {
      passwordMatches = verifyPassword(result.data.password, user.password);
    } catch (error) {
      logError('auth.login_password_verification_error', {
        ...requestMeta,
        userId: user.id,
        emailDomain,
        error: serializeError(error),
      });
      return adminLoginServerError(
        requestId,
        'ADMIN_LOGIN_PASSWORD_HASH_ERROR',
        PASSWORD_HASH_ERROR_ACTION,
      );
    }

    if (!passwordMatches) {
      logWarn('auth.login_failed', {
        ...requestMeta,
        emailDomain,
        userId: user.id,
        reason: 'invalid_password',
      });
      return jsonError(INVALID_CREDENTIALS_MESSAGE, 401, undefined, { requestId });
    }

    let token: string;
    try {
      token = createAdminToken({
        userId: user.id,
        email: user.email,
        sessionVersion: user.sessionVersion,
      });
    } catch (error) {
      const issues = getAdminAuthConfigurationIssues();
      logError('auth.login_token_creation_failed', {
        ...requestMeta,
        userId: user.id,
        emailDomain,
        issues,
        error: serializeError(error),
      });

      if (issues.length) {
        return adminLoginConfigError(requestId, issues);
      }

      return adminLoginServerError(requestId, 'ADMIN_LOGIN_TOKEN_ERROR', CONFIG_ERROR_ACTION);
    }

    try {
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      logError('auth.login_last_login_update_failed', {
        ...requestMeta,
        userId: user.id,
        emailDomain,
        error: serializeError(error),
      });
      return adminLoginServerError(requestId, 'ADMIN_LOGIN_DATABASE_ERROR', DATABASE_ERROR_ACTION);
    }

    const response = jsonSuccess({}, 200, { requestId });
    setAdminCookie(response, token);

    logInfo('auth.login_success', {
      ...requestMeta,
      userId: user.id,
    });

    return response;
  } catch (error) {
    logError('auth.login_unhandled_error', {
      ...requestMeta,
      error: serializeError(error),
    });
    return adminLoginServerError(requestId, 'ADMIN_LOGIN_FAILED');
  }
}
