import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { CRM_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { leadCreateSchema, splitTags } from '../../../../lib/validators';
import { logActivity } from '../../../../lib/crm';
import {
  assertSameOrigin,
  formDataToObject,
  getRequestId,
  isRequestBodyWithinLimit,
  jsonError,
  safeRedirectPath,
} from '../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { buildRequestLogMeta } from '../../../../lib/logger';

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.leads.create', requestId);

  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403, undefined, { requestId });
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: CRM_ROLES,
    requestId,
    requestMeta,
    unauthorizedEvent: 'admin.lead_create_unauthorized',
    forbiddenEvent: 'admin.lead_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const result = leadCreateSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const assignedToAdminId = result.data.assignedToAdminId || null;
  if (assignedToAdminId) {
    const assignee = await prisma.adminUser.findFirst({
      where: { id: assignedToAdminId, isActive: true },
      select: { id: true },
    });

    if (!assignee) {
      return jsonError('Assigned user is invalid or inactive.', 422, undefined, { requestId });
    }
  }

  const duplicate = await prisma.lead.findUnique({
    where: {
      email_phone: {
        email: result.data.email,
        phone: result.data.phone,
      },
    },
    select: { id: true },
  });

  if (duplicate) {
    return jsonError('A lead with this email and phone already exists.', 409, undefined, { requestId });
  }

  const lead = await prisma.lead.create({
    data: {
      fullName: result.data.fullName,
      email: result.data.email,
      phone: result.data.phone,
      companyName: result.data.companyName || null,
      location: result.data.location || null,
      notes: result.data.notes || null,
      status: result.data.status,
      tags: splitTags(result.data.tagsText),
      assignedToAdminId,
      sourceType: 'DIRECT',
    },
    select: {
      id: true,
      fullName: true,
      status: true,
    },
  });

  await logActivity({
    type: 'LEAD_CREATED',
    title: 'Lead created manually',
    description: `${lead.fullName} added to CRM pipeline with status ${lead.status}.`,
    actorAdminId: adminSession.userId,
    leadId: lead.id,
  });

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'LEAD_CREATED',
      entity: 'Lead',
      entityId: lead.id,
      actorAdminId: adminSession.userId,
      details: {
        status: lead.status,
        assignedToAdminId,
      },
    },
  });

  const baseReturnTo = safeRedirectPath(payload.returnTo, `/admin/leads/${lead.id}`, ['/admin/leads']);
  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('created', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
