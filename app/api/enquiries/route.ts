import { prisma } from '../../../lib/prisma';
import { enquirySchema, parseBoolean } from '../../../lib/validators';
import { checkRateLimitMany } from '../../../lib/rate-limit';
import { createReferenceCode } from '../../../lib/sanitize';
import { sendEnquiryEmailNotifications } from '../../../lib/notifications';
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
  const requestMeta = buildRequestLogMeta(request, 'public.enquiries.submit', requestId);

  try {
    if (!assertSameOrigin(request)) {
      logWarn('submission.enquiry_invalid_origin', requestMeta);
      return jsonError('Invalid request origin.', 403, undefined, { requestId });
    }

    if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.jsonForm)) {
      logWarn('submission.enquiry_payload_too_large', requestMeta);
      return jsonError('Payload too large.', 413, undefined, { requestId });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      logWarn('submission.enquiry_invalid_payload', requestMeta);
      return jsonError('Invalid request payload.', 400, undefined, { requestId });
    }

    const result = enquirySchema.safeParse(body);
    if (!result.success) {
      return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
    }

    if (result.data.honeypot) {
      logWarn('submission.enquiry_honeypot_triggered', requestMeta);
      return jsonError('Spam detected.', 422, undefined, { requestId });
    }

    const consentGiven = parseBoolean(result.data.consentGiven, false);
    if (!consentGiven) {
      return jsonError('Consent is required before submitting this enquiry.', 422, undefined, { requestId });
    }

    const requester = getRequesterMetadata(request);
    const attribution = getLeadAttribution(result.data, request);
    const rateLimit = await checkRateLimitMany([
      {
        key: `enquiry-ip:${requester.sourceIpHash || 'unknown-ip'}`,
        ...RATE_LIMIT_WINDOWS.formSubmit,
      },
      {
        key: `enquiry-email:${result.data.email}`,
        ...RATE_LIMIT_WINDOWS.formSubmit,
      },
    ]);

    if (!rateLimit.allowed) {
      logWarn('submission.enquiry_rate_limited', {
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

    const duplicate = await prisma.contactEnquiry.findFirst({
      where: {
        deletedAt: null,
        email: result.data.email,
        subject: result.data.subject,
        message: result.data.message,
        createdAt: {
          gte: new Date(Date.now() - 10 * 60 * 1000),
        },
      },
      select: { referenceCode: true },
    });

    if (duplicate) {
      return jsonSuccess({
        referenceCode: duplicate.referenceCode,
        duplicate: true,
        message: 'A similar enquiry was already received recently.',
      }, 200, { requestId });
    }

    const leadResult = await upsertLeadRecord({
      fullName: result.data.fullName,
      email: result.data.email,
      phone: result.data.phone,
      location: result.data.location || null,
      notes: result.data.message,
      sourceType: attribution.sourceType,
      sourcePath: attribution.sourcePath,
      sourcePage: attribution.sourcePage,
      sourceReferrer: attribution.sourceReferrer,
      utmSource: attribution.utmSource,
      utmMedium: attribution.utmMedium,
      utmCampaign: attribution.utmCampaign,
      statusHint: 'NEW',
      assignedToAdminId: null,
    });

    const enquiry = await prisma.contactEnquiry.create({
      data: {
        leadId: leadResult.lead.id,
        fullName: result.data.fullName,
        email: result.data.email,
        phone: result.data.phone,
        subject: result.data.subject,
        serviceInterest: result.data.serviceInterest,
        preferredContactMethod: result.data.preferredContactMethod,
        location: result.data.location,
        message: result.data.message,
        consentGiven,
        referenceCode: createReferenceCode('ENQ'),
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
        enquiryId: enquiry.id,
        channel: 'SYSTEM',
        direction: 'INTERNAL',
        subject: 'Enquiry submitted',
        message: 'Enquiry captured through public contact form. Acknowledgement workflow started.',
        actorName: 'System',
        leadId: leadResult.lead.id,
      },
    });

    if (leadResult.isNew) {
      await logActivity({
        type: 'LEAD_CREATED',
        title: 'Lead created from enquiry',
        description: `New lead profile created from enquiry ${enquiry.referenceCode}.`,
        leadId: leadResult.lead.id,
        enquiryId: enquiry.id,
      });
    }

    await logActivity({
      type: 'ENQUIRY_SUBMITTED',
      title: 'New enquiry submitted',
      description: `Enquiry ${enquiry.referenceCode} captured from public website.`,
      leadId: leadResult.lead.id,
      enquiryId: enquiry.id,
      metadata: {
        sourceType: enquiry.sourceType,
        serviceInterest: enquiry.serviceInterest,
      },
    });

    await sendEnquiryEmailNotifications({
      referenceCode: enquiry.referenceCode,
      fullName: enquiry.fullName,
      email: enquiry.email,
      phone: enquiry.phone,
      subject: enquiry.subject,
      serviceInterest: enquiry.serviceInterest,
      preferredContactMethod: enquiry.preferredContactMethod,
      location: enquiry.location,
      message: enquiry.message,
    });

    return jsonSuccess({ referenceCode: enquiry.referenceCode }, 200, { requestId });
  } catch (error) {
    logError('submission.enquiry_failed', {
      ...requestMeta,
      error: serializeError(error),
    });
    return jsonError('Unable to submit enquiry at the moment.', 500, undefined, { requestId });
  }
}

