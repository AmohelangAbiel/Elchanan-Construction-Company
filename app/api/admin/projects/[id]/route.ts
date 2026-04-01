import { NextResponse } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { CONTENT_ROLES } from '../../../../../lib/permissions';
import {
  normalizeSlugOrFallback,
  parseBoolean,
  projectInputSchema,
  splitMediaLines,
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
    unauthorizedEvent: 'admin.project_update_unauthorized',
    forbiddenEvent: 'admin.project_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400);

  const payload = formDataToObject(formData);
  const action = sanitizeText(payload.action, 24).toUpperCase();
  const returnTo = safeRedirectPath(payload.returnTo, '/admin/projects', ['/admin/projects']);

  const existing = await prisma.project.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, deletedAt: true },
  });

  if (!existing) {
    return jsonError('Project not found.', 404);
  }

  if (action === 'ARCHIVE') {
    await prisma.project.update({
      where: { id: params.id },
      data: {
        status: 'ARCHIVED',
        published: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: adminSession.email,
        action: 'PROJECT_ARCHIVED',
        entity: 'Project',
        entityId: params.id,
        actorAdminId: adminSession.userId,
      },
    });

    return NextResponse.redirect(buildRedirectUrl(request.url, returnTo, 'archived'));
  }

  if (action === 'RESTORE') {
    await prisma.project.update({
      where: { id: params.id },
      data: {
        status: 'DRAFT',
      },
    });

    await prisma.auditLog.create({
      data: {
        actor: adminSession.email,
        action: 'PROJECT_RESTORED',
        entity: 'Project',
        entityId: params.id,
        actorAdminId: adminSession.userId,
      },
    });

    return NextResponse.redirect(buildRedirectUrl(request.url, returnTo, 'restored'));
  }

  if (existing.deletedAt) {
    return jsonError('Project not found.', 404);
  }

  const result = projectInputSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten());
  }

  const slug = normalizeSlugOrFallback(result.data.slug, result.data.title);

  const slugTaken = await prisma.project.findFirst({
    where: { slug, id: { not: params.id } },
    select: { id: true },
  });

  if (slugTaken) {
    return jsonError('A project with this slug already exists.', 409);
  }

  await prisma.project.update({
    where: { id: params.id },
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
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'PROJECT_UPDATED',
      entity: 'Project',
      entityId: params.id,
      actorAdminId: adminSession.userId,
    },
  });

  return NextResponse.redirect(buildRedirectUrl(request.url, returnTo, 'updated'));
}
