import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { assertSameOrigin, formDataToObject, getRequestId, isRequestBodyWithinLimit, jsonError, safeRedirectPath } from '../../../../lib/api';
import { BODY_SIZE_LIMITS } from '../../../../lib/constants';
import { buildRequestLogMeta } from '../../../../lib/logger';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { OPERATIONS_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { portalDocumentFormSchema } from '../../../../lib/validators';

const CONTRACT_TYPES = new Set(['CONTRACT', 'AGREEMENT', 'SCOPE_DOCUMENT', 'TERMS_ATTACHMENT', 'OTHER']);

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.contracts.create', requestId);

  if (!assertSameOrigin(request)) return jsonError('Invalid request origin.', 403, undefined, { requestId });
  if (!isRequestBodyWithinLimit(request, BODY_SIZE_LIMITS.adminForm)) {
    return jsonError('Payload too large.', 413, undefined, { requestId });
  }

  const session = await requireAdminAuth();
  const roleError = enforceAdminApiRole({
    session,
    allowedRoles: OPERATIONS_ROLES,
    requestId,
    requestMeta,
    unauthorizedEvent: 'admin.contract_create_unauthorized',
    forbiddenEvent: 'admin.contract_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return jsonError('Unable to parse request.', 400, undefined, { requestId });
  }

  const payload = formDataToObject(formData);
  const baseReturnTo = safeRedirectPath(payload.returnTo, '/admin/contracts', ['/admin/contracts']);
  const result = portalDocumentFormSchema.safeParse(payload);
  if (!result.success) {
    return jsonError('Validation failed.', 422, result.error.flatten(), { requestId });
  }

  const type = (result.data.type || 'CONTRACT').toUpperCase();
  if (!CONTRACT_TYPES.has(type)) {
    return jsonError('Contract documents must use a contract-related document type.', 422, undefined, { requestId });
  }

  const [quote, deliveryProject, directLead] = await Promise.all([
    result.data.quoteRequestId
      ? prisma.quoteRequest.findFirst({
          where: { id: result.data.quoteRequestId, deletedAt: null },
          select: {
            id: true,
            leadId: true,
            convertedProject: { select: { id: true, leadId: true, deletedAt: true, portalVisible: true } },
          },
        })
      : Promise.resolve(null),
    result.data.deliveryProjectId
      ? prisma.deliveryProject.findFirst({
          where: { id: result.data.deliveryProjectId, deletedAt: null },
          select: { id: true, leadId: true, quoteRequestId: true, portalVisible: true },
        })
      : Promise.resolve(null),
    result.data.leadId
      ? prisma.lead.findFirst({
          where: { id: result.data.leadId, deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  if (result.data.quoteRequestId && !quote) {
    return jsonError('Quote request not found.', 404, undefined, { requestId });
  }

  if (result.data.deliveryProjectId && !deliveryProject) {
    return jsonError('Delivery project not found.', 404, undefined, { requestId });
  }

  if (result.data.leadId && !directLead) {
    return jsonError('Lead not found.', 404, undefined, { requestId });
  }

  const resolvedLeadId =
    result.data.leadId ||
    quote?.leadId ||
    deliveryProject?.leadId ||
    null;

  if (!resolvedLeadId) {
    return jsonError('A contract document must be linked to a client lead, quote, or project.', 422, undefined, { requestId });
  }

  if (result.data.leadId && quote && quote.leadId !== result.data.leadId) {
    return jsonError('Selected lead does not match the linked quote.', 422, undefined, { requestId });
  }

  if (result.data.leadId && deliveryProject && deliveryProject.leadId !== result.data.leadId) {
    return jsonError('Selected lead does not match the linked project.', 422, undefined, { requestId });
  }

  if (quote && deliveryProject && quote.convertedProject && quote.convertedProject.id !== deliveryProject.id) {
    return jsonError('The selected project does not match the linked quote.', 422, undefined, { requestId });
  }

  const approvalStatus = result.data.approvalStatus || 'DRAFT';
  const clientVisible =
    approvalStatus === 'DRAFT' || approvalStatus === 'ARCHIVED'
      ? false
      : result.data.clientVisible !== false;

  const contract = await prisma.$transaction(async (tx) => {
    const created = await tx.portalDocument.create({
      data: {
        title: result.data.title,
        description: result.data.description || null,
        type: type as 'CONTRACT' | 'AGREEMENT' | 'SCOPE_DOCUMENT' | 'TERMS_ATTACHMENT' | 'OTHER',
        url: result.data.url,
        fileName: result.data.fileName || null,
        mimeType: result.data.mimeType || null,
        bytes: result.data.bytes ?? null,
        clientVisible,
        approvalStatus: approvalStatus as 'DRAFT' | 'SENT' | 'VIEWED' | 'APPROVED' | 'REJECTED' | 'ARCHIVED',
        leadId: resolvedLeadId,
        quoteRequestId: quote?.id || result.data.quoteRequestId || null,
        deliveryProjectId: deliveryProject?.id || result.data.deliveryProjectId || quote?.convertedProject?.id || null,
        uploadedByAdminId: adminSession.userId,
        sortOrder: result.data.sortOrder,
      },
      select: { id: true },
    });

    await tx.auditLog.create({
      data: {
        actor: adminSession.email,
        action: 'CONTRACT_CREATED',
        entity: 'PortalDocument',
        entityId: created.id,
        actorAdminId: adminSession.userId,
        details: {
          type,
          approvalStatus,
          leadId: resolvedLeadId,
          quoteRequestId: quote?.id || result.data.quoteRequestId || null,
          deliveryProjectId: deliveryProject?.id || result.data.deliveryProjectId || quote?.convertedProject?.id || null,
        },
      },
    });

    return created;
  });

  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('created', '1');
  redirectUrl.pathname = `/admin/contracts/${contract.id}`;
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
