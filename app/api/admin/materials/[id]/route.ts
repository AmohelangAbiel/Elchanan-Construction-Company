import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { BODY_SIZE_LIMITS } from '../../../../../lib/constants';
import { PROCUREMENT_ROLES } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';
import { sanitizeText } from '../../../../../lib/sanitize';
import { materialItemFormSchema } from '../../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
} from '../../../../../lib/api';
import { buildRequestLogMeta } from '../../../../../lib/logger';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.materials.update', requestId);

  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403, undefined, { requestId });
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: PROCUREMENT_ROLES,
    requestId,
    requestMeta,
    unauthorizedEvent: 'admin.materials_update_unauthorized',
    forbiddenEvent: 'admin.materials_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const action = sanitizeText(payload.action, 24).toUpperCase();

  const existing = await prisma.materialItem.findUnique({
    where: { id: params.id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return jsonError('Material item not found.', 404, undefined, { requestId });
  }

  if (action === 'ARCHIVE') {
    await prisma.materialItem.update({
      where: { id: params.id },
      data: { status: 'ARCHIVED' },
    });

    await prisma.auditLog.create({
      data: {
        actor: adminSession.email,
        action: 'MATERIAL_ITEM_ARCHIVED',
        entity: 'MaterialItem',
        entityId: params.id,
        actorAdminId: adminSession.userId,
      },
    });

    const redirectUrl = new URL('/admin/materials?archived=1', request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set('x-request-id', requestId);
    return response;
  }

  if (action === 'RESTORE') {
    await prisma.materialItem.update({
      where: { id: params.id },
      data: { status: 'ACTIVE' },
    });

    await prisma.auditLog.create({
      data: {
        actor: adminSession.email,
        action: 'MATERIAL_ITEM_RESTORED',
        entity: 'MaterialItem',
        entityId: params.id,
        actorAdminId: adminSession.userId,
      },
    });

    const redirectUrl = new URL('/admin/materials?restored=1', request.url);
    const response = NextResponse.redirect(redirectUrl);
    response.headers.set('x-request-id', requestId);
    return response;
  }

  const result = materialItemFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const defaultSupplierId = result.data.defaultSupplierId || null;
  if (defaultSupplierId) {
    const supplier = await prisma.supplier.findFirst({
      where: {
        id: defaultSupplierId,
        status: { not: 'ARCHIVED' },
      },
      select: { id: true },
    });

    if (!supplier) {
      return jsonError('Default supplier is invalid.', 422, undefined, { requestId });
    }
  }

  await prisma.materialItem.update({
    where: { id: params.id },
    data: {
      name: result.data.name,
      code: result.data.code || null,
      category: result.data.category || null,
      description: result.data.description || null,
      unit: result.data.unit,
      estimatedUnitCost: result.data.estimatedUnitCost ?? null,
      notes: result.data.notes || null,
      status: result.data.status,
      defaultSupplierId,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'MATERIAL_ITEM_UPDATED',
      entity: 'MaterialItem',
      entityId: params.id,
      actorAdminId: adminSession.userId,
    },
  });

  const redirectUrl = new URL('/admin/materials?updated=1', request.url);
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
