import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { CONTENT_ROLES } from '../../../../../lib/permissions';
import {
  normalizeSlugOrFallback,
  parseBoolean,
  pricingInputSchema,
  splitLines,
} from '../../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  isRequestBodyWithinLimit,
  jsonError,
  safeRedirectPath,
} from '../../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../../lib/constants';
import { sanitizeText } from '../../../../../lib/sanitize';

function buildRedirectUrl(requestUrl: string, basePath: string, state: string) {
  const redirectUrl = new URL(basePath, requestUrl);
  redirectUrl.searchParams.set(state, '1');
  return redirectUrl;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403);
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413);
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: CONTENT_ROLES,
    unauthorizedEvent: 'admin.pricing_update_unauthorized',
    forbiddenEvent: 'admin.pricing_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400);

  const payload = formDataToObject(formData);
  const action = sanitizeText(payload.action, 24).toUpperCase();
  const returnTo = safeRedirectPath(payload.returnTo, '/admin/pricing', ['/admin/pricing']);

  const existing = await prisma.pricingPlan.findUnique({
    where: { id: params.id },
    select: { id: true, deletedAt: true },
  });

  if (!existing) {
    return jsonError('Pricing package not found.', 404);
  }

  if (action === 'ARCHIVE') {
    if (!existing.deletedAt) {
      await prisma.pricingPlan.update({
        where: { id: params.id },
        data: {
          deletedAt: new Date(),
          published: false,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actor: adminSession.email,
        action: 'PRICING_PLAN_ARCHIVED',
        entity: 'PricingPlan',
        entityId: params.id,
        actorAdminId: adminSession.userId,
      },
    });

    return NextResponse.redirect(buildRedirectUrl(request.url, returnTo, 'archived'));
  }

  if (action === 'RESTORE') {
    if (existing.deletedAt) {
      await prisma.pricingPlan.update({
        where: { id: params.id },
        data: {
          deletedAt: null,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        actor: adminSession.email,
        action: 'PRICING_PLAN_RESTORED',
        entity: 'PricingPlan',
        entityId: params.id,
        actorAdminId: adminSession.userId,
      },
    });

    return NextResponse.redirect(buildRedirectUrl(request.url, returnTo, 'restored'));
  }

  if (existing.deletedAt) {
    return jsonError('Archived pricing package must be restored before editing.', 409);
  }

  const result = pricingInputSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten());
  }

  const slug = normalizeSlugOrFallback(result.data.slug, result.data.title);

  const slugTaken = await prisma.pricingPlan.findFirst({
    where: { slug, id: { not: params.id } },
    select: { id: true },
  });

  if (slugTaken) {
    return jsonError('A pricing package with this slug already exists.', 409);
  }

  await prisma.pricingPlan.update({
    where: { id: params.id },
    data: {
      title: result.data.title,
      slug,
      range: result.data.range,
      summary: result.data.summary,
      description: result.data.description,
      items: splitLines(result.data.itemsText),
      seoTitle: result.data.seoTitle || null,
      seoDescription: result.data.seoDescription || null,
      sortOrder: result.data.sortOrder,
      published: parseBoolean(result.data.published, true),
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'PRICING_PLAN_UPDATED',
      entity: 'PricingPlan',
      entityId: params.id,
      actorAdminId: adminSession.userId,
    },
  });

  return NextResponse.redirect(buildRedirectUrl(request.url, returnTo, 'updated'));
}
