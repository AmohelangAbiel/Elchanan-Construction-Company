import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { PROCUREMENT_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { splitTextList, supplierFormSchema } from '../../../../lib/validators';
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
  const requestMeta = buildRequestLogMeta(request, 'admin.suppliers.create', requestId);

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
    unauthorizedEvent: 'admin.suppliers_create_unauthorized',
    forbiddenEvent: 'admin.suppliers_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const result = supplierFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const supplier = await prisma.supplier.create({
    data: {
      name: result.data.name,
      contactPerson: result.data.contactPerson || null,
      email: result.data.email || null,
      phone: result.data.phone || null,
      alternatePhone: result.data.alternatePhone || null,
      address: result.data.address || null,
      cityArea: result.data.cityArea || null,
      notes: result.data.notes || null,
      supplyCategories: splitTextList(result.data.supplyCategoriesText),
      status: result.data.status,
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'SUPPLIER_CREATED',
      entity: 'Supplier',
      entityId: supplier.id,
      actorAdminId: adminSession.userId,
    },
  });

  const redirectUrl = new URL('/admin/suppliers?created=1', request.url);
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
