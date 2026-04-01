import { prisma } from '../../../lib/prisma';
import { parseBoolean, reviewSchema } from '../../../lib/validators';
import { checkRateLimitMany } from '../../../lib/rate-limit';
import { containsBlockedLanguage } from '../../../lib/content-filter';
import { sendReviewAdminNotification } from '../../../lib/notifications';
import {
  assertSameOrigin,
  getRequestId,
  getRequesterMetadata,
  isRequestBodyWithinLimit,
  jsonError,
  jsonSuccess,
} from '../../../lib/api';
import { BODY_SIZE_LIMITS, RATE_LIMIT_WINDOWS } from '../../../lib/constants';
import { buildRequestLogMeta, logError, logWarn, serializeError } from '../../../lib/logger';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'public.reviews.submit', requestId);

  try {
    if (!assertSameOrigin(request)) {
      logWarn('submission.review_invalid_origin', requestMeta);
      return jsonError('Invalid request origin.', 403, undefined, { requestId });
    }

    if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.jsonForm)) {
      logWarn('submission.review_payload_too_large', requestMeta);
      return jsonError('Payload too large.', 413, undefined, { requestId });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      logWarn('submission.review_invalid_payload', requestMeta);
      return jsonError('Invalid request payload.', 400, undefined, { requestId });
    }

    const result = reviewSchema.safeParse(body);
    if (!result.success) {
      return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
    }

    if (result.data.honeypot) {
      logWarn('submission.review_honeypot_triggered', requestMeta);
      return jsonError('Spam detected.', 422, undefined, { requestId });
    }

    const consentGiven = parseBoolean(result.data.consentGiven, false);
    if (!consentGiven) {
      return jsonError('Consent is required before submitting this review.', 422, undefined, { requestId });
    }

    const requester = getRequesterMetadata(request);
    const rateLimit = await checkRateLimitMany([
      {
        key: `review-ip:${requester.sourceIpHash || 'unknown-ip'}`,
        ...RATE_LIMIT_WINDOWS.formSubmit,
      },
      {
        key: `review-author:${result.data.email || result.data.name}`,
        ...RATE_LIMIT_WINDOWS.formSubmit,
      },
    ]);

    if (!rateLimit.allowed) {
      logWarn('submission.review_rate_limited', {
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

    if (containsBlockedLanguage(`${result.data.title || ''} ${result.data.message}`)) {
      return jsonError('Review contains blocked content.', 422, undefined, { requestId });
    }

    const duplicate = await prisma.review.findFirst({
      where: {
        deletedAt: null,
        email: result.data.email || undefined,
        message: result.data.message,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true },
    });

    if (duplicate) {
      return jsonSuccess({ duplicate: true }, 200, { requestId });
    }

    const review = await prisma.review.create({
      data: {
        name: result.data.name,
        email: result.data.email,
        rating: result.data.rating,
        projectContext: result.data.projectContext,
        title: result.data.title,
        message: result.data.message,
        consentGiven,
        status: 'PENDING',
        sourceIpHash: requester.sourceIpHash,
      },
    });

    await sendReviewAdminNotification({
      name: review.name,
      rating: review.rating,
      projectContext: review.projectContext,
      message: review.message,
    });

    return jsonSuccess({}, 200, { requestId });
  } catch (error) {
    logError('submission.review_failed', {
      ...requestMeta,
      error: serializeError(error),
    });
    return jsonError('Unable to submit review at the moment.', 500, undefined, { requestId });
  }
}

