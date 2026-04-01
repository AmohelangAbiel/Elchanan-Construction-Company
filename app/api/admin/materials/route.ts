import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { PROCUREMENT_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { materialItemFormSchema } from '../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
} from '../../../../lib/api';
import { buildRequestLogMeta } from '../../../../lib/logger';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.materials.create', requestId);

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
    unauthorizedEvent: 'admin.materials_create_unauthorized',
    forbiddenEvent: 'admin.materials_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
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

  const material = await prisma.materialItem.create({
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
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'MATERIAL_ITEM_CREATED',
      entity: 'MaterialItem',
      entityId: material.id,
      actorAdminId: adminSession.userId,
    },
  });

  const redirectUrl = new URL('/admin/materials?created=1', request.url);
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
