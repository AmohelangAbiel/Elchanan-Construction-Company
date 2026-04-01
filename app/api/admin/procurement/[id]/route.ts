import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../../lib/admin-access';
import { BODY_SIZE_LIMITS } from '../../../../../lib/constants';
import {
  canTransitionPurchaseRequestStatus,
  parsePurchaseLineItemsFromFormData,
} from '../../../../../lib/operations';
import {
  resolvePurchaseRequestLifecycle,
  syncProcurementItemsFromPurchaseRequest,
} from '../../../../../lib/operations-data';
import { PROCUREMENT_ROLES } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';
import { purchaseRequestFormSchema } from '../../../../../lib/validators';
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
  const requestMeta = buildRequestLogMeta(request, 'admin.procurement.update', requestId);

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
    unauthorizedEvent: 'admin.procurement_update_unauthorized',
    forbiddenEvent: 'admin.procurement_update_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const result = purchaseRequestFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const existing = await prisma.purchaseRequest.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      deliveryProjectId: true,
      status: true,
      submittedAt: true,
      approvedAt: true,
      orderedAt: true,
      receivedAt: true,
      approvedByAdminId: true,
    },
  });

  if (!existing) {
    return jsonError('Purchase record was not found.', 404, undefined, { requestId });
  }

  if (result.data.deliveryProjectId !== existing.deliveryProjectId) {
    return jsonError('Project context mismatch for purchase record.', 422, undefined, { requestId });
  }

  if (!canTransitionPurchaseRequestStatus(existing.status, result.data.status)) {
    return jsonError('Invalid purchase record status transition.', 422, undefined, { requestId });
  }

  let lineItems;
  try {
    lineItems = parsePurchaseLineItemsFromFormData(formData);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to parse line items.', 422, undefined, { requestId });
  }

  if (!lineItems.length && result.data.status !== 'DRAFT') {
    return jsonError('At least one line item is required before moving beyond draft.', 422, undefined, { requestId });
  }

  const materialIds = [...new Set(lineItems.map((item) => item.materialItemId).filter(Boolean))] as string[];
  const procurementItemIds = [...new Set(lineItems.map((item) => item.projectProcurementItemId).filter(Boolean))] as string[];

  const [supplier, materials, procurementItems] = await Promise.all([
    result.data.supplierId
      ? prisma.supplier.findFirst({
          where: { id: result.data.supplierId, status: { not: 'ARCHIVED' } },
          select: { id: true },
        })
      : Promise.resolve(null),
    materialIds.length
      ? prisma.materialItem.findMany({
          where: {
            id: { in: materialIds },
            status: { not: 'ARCHIVED' },
          },
          select: { id: true },
        })
      : Promise.resolve([]),
    procurementItemIds.length
      ? prisma.projectProcurementItem.findMany({
          where: {
            id: { in: procurementItemIds },
            deliveryProjectId: result.data.deliveryProjectId,
          },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  if (result.data.supplierId && !supplier) {
    return jsonError('Supplier is invalid.', 422, undefined, { requestId });
  }

  if (materials.length !== materialIds.length) {
    return jsonError('One or more selected material items are invalid.', 422, undefined, { requestId });
  }

  if (procurementItems.length !== procurementItemIds.length) {
    return jsonError('One or more linked procurement requirements are invalid for this project.', 422, undefined, { requestId });
  }

  const requestDate = result.data.requestDate ? new Date(result.data.requestDate) : new Date();
  const issueDate = result.data.issueDate ? new Date(result.data.issueDate) : null;
  const expectedDeliveryDate = result.data.expectedDeliveryDate ? new Date(result.data.expectedDeliveryDate) : null;
  const lifecycle = resolvePurchaseRequestLifecycle({
    status: result.data.status,
    requestDate,
    issueDate,
    existing,
    actorAdminId: adminSession.userId,
  });

  await prisma.$transaction(async (tx) => {
    await tx.purchaseRequest.update({
      where: { id: params.id },
      data: {
        supplierId: result.data.supplierId || null,
        approvedByAdminId: lifecycle.approvedByAdminId,
        status: result.data.status,
        requestDate: lifecycle.requestDate,
        issueDate,
        expectedDeliveryDate,
        submittedAt: lifecycle.submittedAt,
        approvedAt: lifecycle.approvedAt,
        orderedAt: lifecycle.orderedAt,
        receivedAt: lifecycle.receivedAt,
        notes: result.data.notes || null,
        internalNotes: result.data.internalNotes || null,
      },
    });

    await tx.purchaseRequestLineItem.deleteMany({
      where: { purchaseRequestId: params.id },
    });

    if (lineItems.length) {
      await tx.purchaseRequestLineItem.createMany({
        data: lineItems.map((lineItem) => ({
          purchaseRequestId: params.id,
          projectProcurementItemId: lineItem.projectProcurementItemId,
          materialItemId: lineItem.materialItemId,
          description: lineItem.description,
          quantity: lineItem.quantity,
          unit: lineItem.unit,
          estimatedUnitCost: lineItem.estimatedUnitCost,
          actualUnitCost: lineItem.actualUnitCost,
          receivedQuantity: lineItem.receivedQuantity,
          notes: lineItem.notes,
          sortOrder: lineItem.sortOrder,
        })),
      });
    }
  });

  await syncProcurementItemsFromPurchaseRequest({
    linkedProcurementItemIds: procurementItemIds,
    status: result.data.status,
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'PURCHASE_REQUEST_UPDATED',
      entity: 'PurchaseRequest',
      entityId: params.id,
      actorAdminId: adminSession.userId,
      details: {
        deliveryProjectId: existing.deliveryProjectId,
        previousStatus: existing.status,
        nextStatus: result.data.status,
        supplierId: result.data.supplierId || null,
        lineItemCount: lineItems.length,
      },
    },
  });

  const baseReturnTo = safeRedirectPath(
    payload.returnTo,
    `/admin/procurement/${params.id}`,
    ['/admin/procurement', '/admin/projects'],
  );
  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('updated', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
