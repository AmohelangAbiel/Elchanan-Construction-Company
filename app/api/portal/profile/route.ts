import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requirePortalAuth } from '../../../../lib/portal-auth';
import { portalProfileUpdateSchema } from '../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
  safeRedirectPath,
} from '../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { buildRequestLogMeta, logWarn } from '../../../../lib/logger';

function shouldRedirectToDocument(request: Request) {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/html');
}

function redirectToProfileState(request: Request, requestId: string, returnTo: string, stateKey: string) {
  const redirectUrl = new URL(returnTo, request.url);
  redirectUrl.searchParams.set(stateKey, '1');
  const response = NextResponse.redirect(redirectUrl, 303);
  response.headers.set('x-request-id', requestId);
  return response;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'portal.profile.update', requestId);

  if (!assertSameOrigin(request)) {
    logWarn('portal.profile_invalid_origin', requestMeta);
    return jsonError('Invalid request origin.', 403, undefined, { requestId });
  }

  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    if (shouldRedirectToDocument(request)) {
      return redirectToProfileState(request, requestId, '/portal/profile', 'error');
    }
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requirePortalAuth();
  if (!session) {
    if (shouldRedirectToDocument(request)) {
      const redirectUrl = new URL('/portal/login?sessionExpired=1', request.url);
      const response = NextResponse.redirect(redirectUrl, 303);
      response.headers.set('x-request-id', requestId);
      return response;
    }
    return jsonError('Unauthorized', 401, undefined, { requestId });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    if (shouldRedirectToDocument(request)) {
      return redirectToProfileState(request, requestId, '/portal/profile', 'error');
    }
    return jsonError('Unable to parse request.', 400, undefined, { requestId });
  }

  const payload = formDataToObject(formData);
  const baseReturnTo = safeRedirectPath(payload.returnTo, '/portal/profile', ['/portal/profile']);
  const parsed = portalProfileUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    if (shouldRedirectToDocument(request)) {
      return redirectToProfileState(request, requestId, baseReturnTo, 'error');
    }
    return jsonError('Validation failed.', 422, parsed.error.flatten(), { requestId });
  }

  await prisma.clientUser.update({
    where: { id: session.userId },
    data: {
      fullName: parsed.data.fullName,
      displayName: parsed.data.displayName || null,
      phone: parsed.data.phone || null,
      companyName: parsed.data.companyName || null,
      location: parsed.data.location || null,
      contactPreference: parsed.data.contactPreference || null,
    },
  });

  if (session.leadId) {
    await prisma.lead.updateMany({
      where: {
        id: session.leadId,
        deletedAt: null,
      },
      data: {
        fullName: parsed.data.fullName,
        phone: parsed.data.phone || undefined,
        companyName: parsed.data.companyName || null,
        location: parsed.data.location || null,
      },
    });
  }

  return redirectToProfileState(request, requestId, baseReturnTo, 'updated');
}
