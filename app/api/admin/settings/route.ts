import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { CONTENT_ROLES } from '../../../../lib/permissions';
import { settingsInputSchema } from '../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  isRequestBodyWithinLimit,
  jsonError,
} from '../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { sanitizeText } from '../../../../lib/sanitize';

function parseLines(value?: string) {
  if (!value) return [] as string[];

  return value
    .split(/\r?\n|,/)
    .map((line) => sanitizeText(line, 120))
    .filter(Boolean);
}

function parseHours(hoursJson?: string) {
  if (!hoursJson) return null;

  try {
    const parsed = JSON.parse(hoursJson);
    if (Array.isArray(parsed)) {
      const normalized = parsed
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const day = sanitizeText((item as { day?: unknown }).day, 24);
          const hours = sanitizeText((item as { hours?: unknown }).hours, 40);
          if (!day || !hours) return null;
          return { day, hours };
        })
        .filter((item): item is { day: string; hours: string } => Boolean(item))
        .slice(0, 10);

      return normalized;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403);
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413);
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: CONTENT_ROLES,
    unauthorizedEvent: 'admin.settings_unauthorized',
    forbiddenEvent: 'admin.settings_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400);

  const payload = formDataToObject(formData);
  const result = settingsInputSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten());
  }

  const profile = await prisma.companyProfile.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true, hours: true },
  });

  const serviceAreas = parseLines(result.data.serviceAreasText);
  const parsedHours = parseHours(result.data.hoursJson);
  const socialLinks = {
    website: result.data.websiteUrl || null,
    facebook: result.data.facebookUrl || null,
    instagram: result.data.instagramUrl || null,
    linkedin: result.data.linkedinUrl || null,
  };

  const updatePayload = {
    companyName: result.data.companyName,
    displayName: result.data.displayName || null,
    tagline: result.data.tagline,
    description: result.data.description,
    phone: result.data.phone,
    email: result.data.email,
    whatsapp: result.data.whatsapp || null,
    address: result.data.address,
    serviceAreas,
    serviceAreaText: result.data.serviceAreaText || null,
    socialLinks,
    quotationFooter: result.data.quotationFooter || null,
    quotationDisclaimer: result.data.quotationDisclaimer || null,
    emailSignature: result.data.emailSignature || null,
    emailFooter: result.data.emailFooter || null,
    heroHeadline: result.data.heroHeadline || null,
    seoTitle: result.data.seoTitle || null,
    seoDescription: result.data.seoDescription || null,
    hours: parsedHours || (profile?.hours || []),
  };

  let profileId = profile?.id;

  if (profileId) {
    await prisma.companyProfile.update({
      where: { id: profileId },
      data: updatePayload,
    });
  } else {
    const created = await prisma.companyProfile.create({ data: updatePayload });
    profileId = created.id;
  }

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'SETTINGS_UPDATED',
      entity: 'CompanyProfile',
      entityId: profileId,
      actorAdminId: adminSession.userId,
    },
  });

  return NextResponse.redirect(new URL('/admin/settings?updated=1', request.url));
}


