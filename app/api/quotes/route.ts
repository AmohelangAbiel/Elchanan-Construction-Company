import { prisma } from '../../../lib/prisma';
import { parseBoolean, quoteSchema } from '../../../lib/validators';
import { checkRateLimitMany } from '../../../lib/rate-limit';
import { createReferenceCode } from '../../../lib/sanitize';
import { sendQuoteEmailNotifications } from '../../../lib/notifications';
import { getLeadAttribution } from '../../../lib/lead-attribution';
import { logActivity, upsertLeadRecord } from '../../../lib/crm';
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
  const requestMeta = buildRequestLogMeta(request, 'public.quotes.submit', requestId);

  try {
    if (!assertSameOrigin(request)) {
      logWarn('submission.quote_invalid_origin', requestMeta);
      return jsonError('Invalid request origin.', 403, undefined, { requestId });
    }

    if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.jsonForm)) {
      logWarn('submission.quote_payload_too_large', requestMeta);
      return jsonError('Payload too large.', 413, undefined, { requestId });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      logWarn('submission.quote_invalid_payload', requestMeta);
      return jsonError('Invalid request payload.', 400, undefined, { requestId });
    }

    const result = quoteSchema.safeParse(body);
    if (!result.success) {
      return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
    }

    if (result.data.honeypot) {
      logWarn('submission.quote_honeypot_triggered', requestMeta);
      return jsonError('Spam detected.', 422, undefined, { requestId });
    }

    const consentGiven = parseBoolean(result.data.consentGiven, false);
    if (!consentGiven) {
      return jsonError('Consent is required before submitting this quote request.', 422, undefined, { requestId });
    }

    const requester = getRequesterMetadata(request);
    const attribution = getLeadAttribution(result.data, request);
    const rateLimit = await checkRateLimitMany([
      {
        key: `quote-ip:${requester.sourceIpHash || 'unknown-ip'}`,
        ...RATE_LIMIT_WINDOWS.formSubmit,
      },
      {
        key: `quote-email:${result.data.email}`,
        ...RATE_LIMIT_WINDOWS.formSubmit,
      },
    ]);

    if (!rateLimit.allowed) {
      logWarn('submission.quote_rate_limited', {
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

    const duplicate = await prisma.quoteRequest.findFirst({
      where: {
        deletedAt: null,
        email: result.data.email,
        serviceType: result.data.serviceType,
        projectDescription: result.data.projectDescription,
        createdAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000),
        },
      },
      select: { referenceCode: true },
    });

    if (duplicate) {
      return jsonSuccess({
        referenceCode: duplicate.referenceCode,
        duplicate: true,
        message: 'A similar quote request was already received recently.',
      }, 200, { requestId });
    }

    const preferredStartDate = result.data.preferredStartDate
      ? new Date(result.data.preferredStartDate)
      : null;

    const leadResult = await upsertLeadRecord({
      fullName: result.data.fullName,
      email: result.data.email,
      phone: result.data.phone,
      location: result.data.location || null,
      notes: result.data.projectDescription,
      sourceType: attribution.sourceType,
      sourcePath: attribution.sourcePath,
      sourcePage: attribution.sourcePage,
      sourceReferrer: attribution.sourceReferrer,
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmCampaign: attribution.utmCampaign,
      statusHint: 'QUOTED',
      assignedToAdminId: null,
    });

    const quote = await prisma.quoteRequest.create({
      data: {
        leadId: leadResult.lead.id,
        fullName: result.data.fullName,
        email: result.data.email,
        phone: result.data.phone,
        serviceType: result.data.serviceType,
        projectType: result.data.projectType,
        location: result.data.location,
        estimatedBudgetRange: result.data.estimatedBudgetRange,
        preferredStartDate:
          preferredStartDate && !Number.isNaN(preferredStartDate.getTime())
            ? preferredStartDate
            : null,
        siteVisitRequired: parseBoolean(result.data.siteVisitRequired, false),
        projectDescription: result.data.projectDescription,
        attachmentUrl: result.data.attachmentUrl,
        consentGiven,
        referenceCode: createReferenceCode('QTE'),
        sourceType: attribution.sourceType,
        sourcePath: attribution.sourcePath,
        sourcePage: attribution.sourcePage,
        sourceReferrer: attribution.sourceReferrer,
        utmSource: attribution.utmSource,
        utmMedium: attribution.utmMedium,
        utmCampaign: attribution.utmCampaign,
        sourceIpHash: requester.sourceIpHash,
        userAgent: requester.userAgent,
      },
    });

    await prisma.communicationLog.create({
      data: {
        quoteRequestId: quote.id,
        channel: 'SYSTEM',
        direction: 'INTERNAL',
        subject: 'Quote request submitted',
        message: 'Quote request captured through public form. Estimator notification workflow started.',
        actorName: 'System',
        leadId: leadResult.lead.id,
      },
    });

    if (leadResult.isNew) {
      await logActivity({
        type: 'LEAD_CREATED',
        title: 'Lead created from quote request',
        description: `New lead profile created from quote ${quote.referenceCode}.`,
        leadId: leadResult.lead.id,
        quoteRequestId: quote.id,
      });
    }

    await logActivity({
      type: 'QUOTE_REQUESTED',
      title: 'New quote request submitted',
      description: `Quote ${quote.referenceCode} submitted via public form.`,
      leadId: leadResult.lead.id,
      quoteRequestId: quote.id,
      metadata: {
        sourceType: quote.sourceType,
        serviceType: quote.serviceType,
      },
    });

    await sendQuoteEmailNotifications({
      referenceCode: quote.referenceCode,
      fullName: quote.fullName,
      email: quote.email,
      phone: quote.phone,
      serviceType: quote.serviceType,
      projectType: quote.projectType,
      location: quote.location,
      estimatedBudgetRange: quote.estimatedBudgetRange,
      preferredStartDate: quote.preferredStartDate,
      siteVisitRequired: quote.siteVisitRequired,
      projectDescription: quote.projectDescription,
    });

    return jsonSuccess({ referenceCode: quote.referenceCode }, 200, { requestId });
  } catch (error) {
    logError('submission.quote_failed', {
      ...requestMeta,
      error: serializeError(error),
    });
    return jsonError('Unable to submit quote request at the moment.', 500, undefined, { requestId });
  }
}

