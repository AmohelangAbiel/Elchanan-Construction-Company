import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { CONTENT_ROLES } from '../../../../lib/permissions';
import {
  normalizeSlugOrFallback,
  parseBoolean,
  projectInputSchema,
  splitMediaLines,
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
    unauthorizedEvent: 'admin.project_create_unauthorized',
    forbiddenEvent: 'admin.project_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400);

  const payload = formDataToObject(formData);
  const result = projectInputSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten());
  }

  const slug = normalizeSlugOrFallback(result.data.slug, result.data.title);

  const existing = await prisma.project.findUnique({ where: { slug }, select: { id: true } });
  if (existing) {
    return jsonError('A project with this slug already exists.', 409);
  }

  const project = await prisma.project.create({
    data: {
      title: result.data.title,
      slug,
      category: result.data.category,
      summary: result.data.summary,
      description: result.data.description,
      image: result.data.image,
      galleryImages: splitMediaLines(result.data.galleryImagesText),
      beforeImage: result.data.beforeImage || null,
      afterImage: result.data.afterImage || null,
      beforeAfterCaption: result.data.beforeAfterCaption || null,
      scopeNotes: result.data.scopeNotes || null,
      location: result.data.location || null,
      seoTitle: result.data.seoTitle || null,
      seoDescription: result.data.seoDescription || null,
      status: result.data.status,
      published: parseBoolean(result.data.published, result.data.status === 'PUBLISHED'),
      sortOrder: result.data.sortOrder,
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'PROJECT_CREATED',
      entity: 'Project',
      entityId: project.id,
      actorAdminId: adminSession.userId,
    },
  });

  return NextResponse.redirect(new URL('/admin/projects?created=1', request.url));
}

