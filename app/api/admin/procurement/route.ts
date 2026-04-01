import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import {
  createPurchaseRequestReference,
  parsePurchaseLineItemsFromFormData,
} from '../../../../lib/operations';
import {
  resolvePurchaseRequestLifecycle,
  syncProcurementItemsFromPurchaseRequest,
} from '../../../../lib/operations-data';
import { PROCUREMENT_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { purchaseRequestFormSchema } from '../../../../lib/validators';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
  safeRedirectPath,
} from '../../../../lib/api';
import { buildRequestLogMeta } from '../../../../lib/logger';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.procurement.create', requestId);

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
    unauthorizedEvent: 'admin.procurement_create_unauthorized',
    forbiddenEvent: 'admin.procurement_create_forbidden',
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

  let lineItems;
  try {
    lineItems = parsePurchaseLineItemsFromFormData(formData);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Unable to parse line items.', 422, undefined, { requestId });
  }

  if (!lineItems.length && result.data.status !== 'DRAFT') {
    return jsonError('At least one line item is required before submitting the purchase record beyond draft.', 422, undefined, { requestId });
  }

  const materialIds = [...new Set(lineItems.map((item) => item.materialItemId).filter(Boolean))] as string[];
  const procurementItemIds = [...new Set(lineItems.map((item) => item.projectProcurementItemId).filter(Boolean))] as string[];

  const [project, supplier, materials, procurementItems] = await Promise.all([
    prisma.deliveryProject.findFirst({
      where: { id: result.data.deliveryProjectId, deletedAt: null },
      select: { id: true },
    }),
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

  if (!project) {
    return jsonError('Project was not found.', 404, undefined, { requestId });
  }

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
    actorAdminId: adminSession.userId,
  });

  const created = await prisma.$transaction(async (tx) => {
    const purchaseRequest = await tx.purchaseRequest.create({
      data: {
        referenceCode: createPurchaseRequestReference(),
        deliveryProjectId: result.data.deliveryProjectId,
        supplierId: result.data.supplierId || null,
        createdByAdminId: adminSession.userId,
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
      select: { id: true, deliveryProjectId: true },
    });

    if (lineItems.length) {
      await tx.purchaseRequestLineItem.createMany({
        data: lineItems.map((lineItem) => ({
          purchaseRequestId: purchaseRequest.id,
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

    return purchaseRequest;
  });

  await syncProcurementItemsFromPurchaseRequest({
    linkedProcurementItemIds: procurementItemIds,
    status: result.data.status,
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'PURCHASE_REQUEST_CREATED',
      entity: 'PurchaseRequest',
      entityId: created.id,
      actorAdminId: adminSession.userId,
      details: {
        deliveryProjectId: created.deliveryProjectId,
        status: result.data.status,
        supplierId: result.data.supplierId || null,
        lineItemCount: lineItems.length,
      },
    },
  });

  const baseReturnTo = safeRedirectPath(
    payload.returnTo,
    `/admin/procurement/${created.id}`,
    ['/admin/procurement', '/admin/projects'],
  );
  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('created', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
