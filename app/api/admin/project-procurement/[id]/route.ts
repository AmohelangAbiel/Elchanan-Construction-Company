import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { BODY_SIZE_LIMITS } from '../../../../../lib/constants';
import { PROCUREMENT_ROLES } from '../../../../../lib/permissions';
import { canTransitionProcurementStatus } from '../../../../../lib/operations';
import { prisma } from '../../../../../lib/prisma';
import { projectProcurementItemFormSchema } from '../../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
  safeRedirectPath,
} from '../../../../../lib/api';
import { buildRequestLogMeta } from '../../../../../lib/logger';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.project_procurement.update', requestId);

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
    unauthorizedEvent: 'admin.project_procurement_update_unauthorized',
    forbiddenEvent: 'admin.project_procurement_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const result = projectProcurementItemFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const existing = await prisma.projectProcurementItem.findUnique({
    where: { id: params.id },
    select: { id: true, status: true, deliveryProjectId: true },
  });

  if (!existing) {
    return jsonError('Procurement item not found.', 404, undefined, { requestId });
  }

  if (result.data.deliveryProjectId !== existing.deliveryProjectId) {
    return jsonError('Project context mismatch for procurement item.', 422, undefined, { requestId });
  }

  if (!canTransitionProcurementStatus(existing.status, result.data.status)) {
    return jsonError('Invalid procurement status transition.', 422, undefined, { requestId });
  }

  const [materialItem, supplier] = await Promise.all([
    result.data.materialItemId
      ? prisma.materialItem.findFirst({
          where: {
            id: result.data.materialItemId,
            status: { not: 'ARCHIVED' },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
    result.data.preferredSupplierId
      ? prisma.supplier.findFirst({
          where: {
            id: result.data.preferredSupplierId,
            status: { not: 'ARCHIVED' },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (result.data.materialItemId && !materialItem) {
    return jsonError('Material item is invalid.', 422, undefined, { requestId });
  }

  if (result.data.preferredSupplierId && !supplier) {
    return jsonError('Preferred supplier is invalid.', 422, undefined, { requestId });
  }

  await prisma.projectProcurementItem.update({
    where: { id: params.id },
    data: {
      materialItemId: result.data.materialItemId || null,
      preferredSupplierId: result.data.preferredSupplierId || null,
      name: result.data.name,
      category: result.data.category || null,
      description: result.data.description || null,
      unit: result.data.unit,
      estimatedQuantity: result.data.estimatedQuantity,
      estimatedUnitCost: result.data.estimatedUnitCost ?? null,
      requiredBy: result.data.requiredBy ? new Date(result.data.requiredBy) : null,
      status: result.data.status,
      notes: result.data.notes || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'PROJECT_PROCUREMENT_ITEM_UPDATED',
      entity: 'ProjectProcurementItem',
      entityId: params.id,
      actorAdminId: adminSession.userId,
      details: {
        previousStatus: existing.status,
        nextStatus: result.data.status,
      },
    },
  });

  const baseReturnTo = safeRedirectPath(
    payload.returnTo,
    `/admin/projects/${existing.deliveryProjectId}/operations`,
    ['/admin/projects', '/admin/procurement'],
  );
  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('procurementUpdated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
