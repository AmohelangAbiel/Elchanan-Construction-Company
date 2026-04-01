import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { forumReplySchema } from '../../../../../lib/validators';
import { checkRateLimitMany } from '../../../../../lib/rate-limit';
import { containsBlockedLanguage } from '../../../../../lib/content-filter';
import { sendForumReplyAdminNotification } from '../../../../../lib/notifications';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  getRequesterMetadata,
  isRequestBodyWithinLimit,
} from '../../../../../lib/api';
import { BODY_SIZE_LIMITS, RATE_LIMIT_WINDOWS } from '../../../../../lib/constants';
import { buildRequestLogMeta, logError, logWarn, serializeError } from '../../../../../lib/logger';

function redirectToThread(request: Request, slug: string, state: string, requestId?: string) {
  const response = NextResponse.redirect(new URL(`/forum/${slug}?reply=${state}`, request.url));
  if (requestId) {
    response.headers.set('x-request-id', requestId);
  }
  return response;
}

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'public.forum.reply_submit', requestId);

  try {
    if (!assertSameOrigin(request)) {
      logWarn('submission.forum_reply_invalid_origin', requestMeta);
      return redirectToThread(request, params.slug, 'error', requestId);
    }

    if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.forumReply)) {
      logWarn('submission.forum_reply_payload_too_large', requestMeta);
      return redirectToThread(request, params.slug, 'invalid', requestId);
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return redirectToThread(request, params.slug, 'invalid', requestId);
    }

    const payload = formDataToObject(formData);
    const result = forumReplySchema.safeParse(payload);

    if (!result.success) {
      return redirectToThread(request, params.slug, 'invalid', requestId);
    }

    if (result.data.honeypot) {
      logWarn('submission.forum_reply_honeypot_triggered', requestMeta);
      return redirectToThread(request, params.slug, 'spam', requestId);
    }

    if (containsBlockedLanguage(result.data.content)) {
      return redirectToThread(request, params.slug, 'blocked', requestId);
    }

    const requester = getRequesterMetadata(request);
    const rateLimit = await checkRateLimitMany([
      {
        key: `forum-reply-ip:${requester.sourceIpHash || 'unknown-ip'}`,
        ...RATE_LIMIT_WINDOWS.forumSubmit,
      },
      {
        key: `forum-reply-author:${result.data.authorEmail || result.data.authorName}`,
        ...RATE_LIMIT_WINDOWS.forumSubmit,
      },
    ]);

    if (!rateLimit.allowed) {
      logWarn('submission.forum_reply_rate_limited', {
        ...requestMeta,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
      return redirectToThread(request, params.slug, 'rate-limited', requestId);
    }

    const thread = await prisma.forumThread.findFirst({
      where: { slug: params.slug, deletedAt: null },
      select: { id: true, status: true, title: true },
    });

    if (!thread || thread.status !== 'OPEN') {
      return redirectToThread(request, params.slug, 'closed', requestId);
    }

    const duplicate = await prisma.forumReply.findFirst({
      where: {
        threadId: thread.id,
        deletedAt: null,
        authorName: result.data.authorName,
        content: result.data.content,
        createdAt: {
          gte: new Date(Date.now() - 6 * 60 * 60 * 1000),
        },
      },
      select: { id: true },
    });

    if (!duplicate) {
      await prisma.forumReply.create({
        data: {
          threadId: thread.id,
          authorName: result.data.authorName,
          authorEmail: result.data.authorEmail || null,
          content: result.data.content,
          status: 'PENDING',
          sourceIpHash: requester.sourceIpHash,
        },
      });

      await sendForumReplyAdminNotification({
        threadTitle: thread.title,
        threadSlug: params.slug,
        authorName: result.data.authorName,
      });
    }

    return redirectToThread(request, params.slug, 'pending', requestId);
  } catch (error) {
    logError('submission.forum_reply_failed', {
      ...requestMeta,
      error: serializeError(error),
    });
    return redirectToThread(request, params.slug, 'error', requestId);
  }
}

