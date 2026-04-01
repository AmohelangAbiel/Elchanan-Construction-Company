import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { CONTENT_ROLES } from '../../../../lib/permissions';
import {
  normalizeSlugOrFallback,
  parseBoolean,
  pricingInputSchema,
  splitLines,
} from '../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  isRequestBodyWithinLimit,
  jsonError,
} from '../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';

export async function POST(request: Request) {
  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403);
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413);
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: CONTENT_ROLES,
    unauthorizedEvent: 'admin.pricing_create_unauthorized',
    forbiddenEvent: 'admin.pricing_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400);

  const payload = formDataToObject(formData);
  const result = pricingInputSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten());
  }

  const slug = normalizeSlugOrFallback(result.data.slug, result.data.title);

  const existing = await prisma.pricingPlan.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return jsonError('A pricing package with this slug already exists.', 409);
  }

  const plan = await prisma.pricingPlan.create({
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
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'PRICING_PLAN_CREATED',
      entity: 'PricingPlan',
      entityId: plan.id,
      actorAdminId: adminSession.userId,
    },
  });

  return NextResponse.redirect(new URL('/admin/pricing?created=1', request.url));
}

