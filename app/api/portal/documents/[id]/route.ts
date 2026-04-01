import { NextResponse } from 'next/server';
import { getRequestId, jsonError } from '../../../../../lib/api';
import { requirePortalAuth } from '../../../../../lib/portal-auth';
import { buildRequestLogMeta, logWarn } from '../../../../../lib/logger';

function resolveDocumentUrl(rawUrl: string, requestUrl: string) {
  if (rawUrl.startsWith('/')) {
    return new URL(rawUrl, requestUrl);
  }

  if (!/^https?:\/\//i.test(rawUrl)) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    if (url.protocol === 'https:') return url.toString();

    if (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) {
      return url.toString();
    }

    return null;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'portal.documents.get', requestId);
  const session = await requirePortalAuth();

  if (!session) {
    logWarn('portal.documents_unauthorized', requestMeta);
    return jsonError('Unauthorized', 401, undefined, { requestId });
  }

  if (!session.leadId) {
    logWarn('portal.documents_forbidden_unlinked_lead', requestMeta);
    return jsonError('Client profile is not linked to an authorized lead record.', 403, undefined, { requestId });
  }

  const { prisma } = await import('../../../../../lib/prisma');
  const document = await prisma.portalDocument.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
      clientVisible: true,
      OR: [
        { leadId: session.leadId },
        {
          quoteRequest: {
            leadId: session.leadId,
            deletedAt: null,
          },
        },
        {
          deliveryProject: {
            leadId: session.leadId,
            deletedAt: null,
            portalVisible: true,
          },
        },
      ],
    },
    select: {
      url: true,
    },
  });

  if (!document) {
    logWarn('portal.documents_not_found_or_forbidden', {
      ...requestMeta,
      documentId: params.id,
    });
    return jsonError('Document not found.', 404, undefined, { requestId });
  }

  const resolvedUrl = resolveDocumentUrl(document.url, request.url);
  if (!resolvedUrl) {
    logWarn('portal.documents_invalid_url', {
      ...requestMeta,
      documentId: params.id,
    });
    return jsonError('Document URL is not valid.', 422, undefined, { requestId });
  }

  const response = NextResponse.redirect(resolvedUrl);
  response.headers.set('x-request-id', requestId);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
