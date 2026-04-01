import { prisma } from '../../../lib/prisma';
import { forumThreadSchema, parseBoolean } from '../../../lib/validators';
import { checkRateLimitMany } from '../../../lib/rate-limit';
import { containsBlockedLanguage } from '../../../lib/content-filter';
import { sendForumThreadAdminNotification } from '../../../lib/notifications';
import {
  assertSameOrigin,
  getRequestId,
  getRequesterMetadata,
  isRequestBodyWithinLimit,
  jsonError,
  jsonSuccess,
} from '../../../lib/api';
import {
  BODY_SIZE_LIMITS,
  FORUM_DEFAULT_CATEGORY_SLUG,
  RATE_LIMIT_WINDOWS,
} from '../../../lib/constants';
import { slugify } from '../../../lib/sanitize';
import { buildRequestLogMeta, logError, logWarn, serializeError } from '../../../lib/logger';

async function createUniqueThreadSlug(title: string) {
  const base = slugify(title) || 'discussion-topic';

  let candidate = base;
  let suffix = 1;

  while (await prisma.forumThread.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'public.forum.thread_submit', requestId);

  try {
    if (!assertSameOrigin(request)) {
      logWarn('submission.forum_thread_invalid_origin', requestMeta);
      return jsonError('Invalid request origin.', 403, undefined, { requestId });
    }

    if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.jsonForm)) {
      logWarn('submission.forum_thread_payload_too_large', requestMeta);
      return jsonError('Payload too large.', 413, undefined, { requestId });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      logWarn('submission.forum_thread_invalid_payload', requestMeta);
      return jsonError('Invalid request payload.', 400, undefined, { requestId });
    }

    const result = forumThreadSchema.safeParse(body);
    if (!result.success) {
      return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
    }

    if (result.data.honeypot) {
      logWarn('submission.forum_thread_honeypot_triggered', requestMeta);
      return jsonError('Spam detected.', 422, undefined, { requestId });
    }

    const consentGiven = parseBoolean(result.data.consentGiven, false);
    if (!consentGiven) {
      return jsonError('Consent is required before posting a discussion.', 422, undefined, { requestId });
    }

    const requester = getRequesterMetadata(request);
    const rateLimit = await checkRateLimitMany([
      {
        key: `forum-thread-ip:${requester.sourceIpHash || 'unknown-ip'}`,
        ...RATE_LIMIT_WINDOWS.forumSubmit,
      },
      {
        key: `forum-thread-author:${result.data.authorEmail || result.data.authorName}`,
        ...RATE_LIMIT_WINDOWS.forumSubmit,
      },
    ]);

    if (!rateLimit.allowed) {
      logWarn('submission.forum_thread_rate_limited', {
        ...requestMeta,
        retryAfterSeconds: rateLimit.retryAfterSeconds,
      });
      return jsonError(
        `Too many submissions. Please wait ${rateLimit.retryAfterSeconds} seconds.`,
        429,
        undefined,
        { requestId },
      );
    }

    if (containsBlockedLanguage(`${result.data.title} ${result.data.content}`)) {
      return jsonError('Discussion contains blocked content.', 422, undefined, { requestId });
    }

    const categorySlug = result.data.categorySlug || FORUM_DEFAULT_CATEGORY_SLUG;
    const category = await prisma.forumCategory.findFirst({
      where: {
        published: true,
        deletedAt: null,
        OR: [{ slug: categorySlug }, { slug: FORUM_DEFAULT_CATEGORY_SLUG }],
      },
      select: { id: true, name: true },
      orderBy: { sortOrder: 'asc' },
    });

    if (!category) {
      return jsonError('Forum categories are currently unavailable.', 503, undefined, { requestId });
    }

    const duplicate = await prisma.forumThread.findFirst({
      where: {
        deletedAt: null,
        authorName: result.data.authorName,
        title: result.data.title,
        content: result.data.content,
        createdAt: {
          gte: new Date(Date.now() - 12 * 60 * 60 * 1000),
        },
      },
      select: { slug: true },
    });

    if (duplicate) {
      return jsonSuccess({
        slug: duplicate.slug,
        duplicate: true,
        moderation: 'pending',
        message: 'A similar discussion was already submitted recently.',
      }, 200, { requestId });
    }

    const slug = await createUniqueThreadSlug(result.data.title);
    const excerpt = result.data.content.slice(0, 220);

    const thread = await prisma.forumThread.create({
      data: {
        categoryId: category.id,
        title: result.data.title,
        slug,
        content: result.data.content,
        excerpt,
        authorName: result.data.authorName,
        authorEmail: result.data.authorEmail,
        status: 'PENDING',
        sourceIpHash: requester.sourceIpHash,
      },
    });

    await sendForumThreadAdminNotification({
      title: thread.title,
      slug: thread.slug,
      authorName: thread.authorName,
      categoryName: category.name,
    });

    return jsonSuccess({
      slug,
      moderation: 'pending',
      message: 'Discussion submitted and awaiting moderation.',
    }, 200, { requestId });
  } catch (error) {
    logError('submission.forum_thread_failed', {
      ...requestMeta,
      error: serializeError(error),
    });
    return jsonError('Unable to submit discussion at the moment.', 500, undefined, { requestId });
  }
}

