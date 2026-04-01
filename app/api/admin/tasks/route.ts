import type { TaskStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { requireAdminAuth } from '../../../../lib/auth';
import { enforceAdminApiRole } from '../../../../lib/admin-access';
import { CRM_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { taskCreateSchema } from '../../../../lib/validators';
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

type TaskRelationInput = {
  leadId?: string;
  enquiryId?: string;
  quoteRequestId?: string;
  deliveryProjectId?: string;
};

type TaskRelationValidationResult = {
  error: string | null;
  resolvedLeadId: string | null;
  resolvedEnquiryId: string | null;
  resolvedQuoteRequestId: string | null;
  resolvedDeliveryProjectId: string | null;
};

async function validateTaskRelations(input: TaskRelationInput) {
  const [lead, enquiry, quote, project] = await Promise.all([
    input.leadId
      ? prisma.lead.findFirst({ where: { id: input.leadId, deletedAt: null }, select: { id: true } })
      : Promise.resolve(null),
    input.enquiryId
      ? prisma.contactEnquiry.findFirst({
        where: { id: input.enquiryId, deletedAt: null },
        select: { id: true, leadId: true },
      })
      : Promise.resolve(null),
    input.quoteRequestId
      ? prisma.quoteRequest.findFirst({
        where: { id: input.quoteRequestId, deletedAt: null },
        select: { id: true, leadId: true },
      })
      : Promise.resolve(null),
    input.deliveryProjectId
      ? prisma.deliveryProject.findFirst({
        where: { id: input.deliveryProjectId, deletedAt: null },
        select: { id: true, leadId: true },
      })
      : Promise.resolve(null),
  ]);

  if (input.leadId && !lead) {
    return {
      error: 'Linked lead was not found.',
      resolvedLeadId: null,
      resolvedEnquiryId: null,
      resolvedQuoteRequestId: null,
      resolvedDeliveryProjectId: null,
    } satisfies TaskRelationValidationResult;
  }

  if (input.enquiryId && !enquiry) {
    return {
      error: 'Linked enquiry was not found.',
      resolvedLeadId: null,
      resolvedEnquiryId: null,
      resolvedQuoteRequestId: null,
      resolvedDeliveryProjectId: null,
    } satisfies TaskRelationValidationResult;
  }

  if (input.quoteRequestId && !quote) {
    return {
      error: 'Linked quote was not found.',
      resolvedLeadId: null,
      resolvedEnquiryId: null,
      resolvedQuoteRequestId: null,
      resolvedDeliveryProjectId: null,
    } satisfies TaskRelationValidationResult;
  }

  if (input.deliveryProjectId && !project) {
    return {
      error: 'Linked delivery project was not found.',
      resolvedLeadId: null,
      resolvedEnquiryId: null,
      resolvedQuoteRequestId: null,
      resolvedDeliveryProjectId: null,
    } satisfies TaskRelationValidationResult;
  }

  const linkedLeadIds = [
    lead?.id || null,
    enquiry?.leadId || null,
    quote?.leadId || null,
    project?.leadId || null,
  ].filter((value): value is string => Boolean(value));

  const uniqueLinkedLeadIds = [...new Set(linkedLeadIds)];
  if (uniqueLinkedLeadIds.length > 1) {
    return {
      error: 'Linked records belong to different leads. Select records from the same lead context.',
      resolvedLeadId: null,
      resolvedEnquiryId: null,
      resolvedQuoteRequestId: null,
      resolvedDeliveryProjectId: null,
    } satisfies TaskRelationValidationResult;
  }

  return {
    error: null,
    resolvedLeadId: uniqueLinkedLeadIds[0] || null,
    resolvedEnquiryId: enquiry?.id || null,
    resolvedQuoteRequestId: quote?.id || null,
    resolvedDeliveryProjectId: project?.id || null,
  } satisfies TaskRelationValidationResult;
}

function buildStatusDates(status: TaskStatus) {
  const now = new Date();

  if (status === 'DONE') {
    return {
      startedAt: now,
      completedAt: now,
    };
  }

  if (status === 'IN_PROGRESS') {
    return {
      startedAt: now,
      completedAt: null,
    };
  }

  return {
    startedAt: null,
    completedAt: null,
  };
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const requestMeta = buildRequestLogMeta(request, 'admin.tasks.create', requestId);

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
    unauthorizedEvent: 'admin.task_create_unauthorized',
    forbiddenEvent: 'admin.task_create_forbidden',
  });
  if (roleError) return roleError;
  const adminSession = session!;

  const formData = await request.formData().catch(() => null);
  if (!formData) return jsonError('Unable to parse request.', 400, undefined, { requestId });

  const payload = formDataToObject(formData);
  const result = taskCreateSchema.safeParse(payload);
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

  const relationValidation = await validateTaskRelations({
    leadId: result.data.leadId || undefined,
    enquiryId: result.data.enquiryId || undefined,
    quoteRequestId: result.data.quoteRequestId || undefined,
    deliveryProjectId: result.data.deliveryProjectId || undefined,
  });
  if (relationValidation.error) {
    return jsonError(relationValidation.error, 422, undefined, { requestId });
  }

  const dueAt = new Date(result.data.dueAt);
  const statusDates = buildStatusDates(result.data.status);

  const task = await prisma.followUpTask.create({
    data: {
      title: result.data.title,
      description: result.data.description || null,
      status: result.data.status,
      priority: result.data.priority,
      dueAt,
      assignedToAdminId,
      createdByAdminId: adminSession.userId,
      leadId: relationValidation.resolvedLeadId,
      enquiryId: relationValidation.resolvedEnquiryId,
      quoteRequestId: relationValidation.resolvedQuoteRequestId,
      deliveryProjectId: relationValidation.resolvedDeliveryProjectId,
      startedAt: statusDates.startedAt,
      completedAt: statusDates.completedAt,
    },
    select: {
      id: true,
      status: true,
      assignedToAdminId: true,
      leadId: true,
      enquiryId: true,
      quoteRequestId: true,
      deliveryProjectId: true,
    },
  });

  await logActivity({
    type: 'TASK_CREATED',
    title: 'Follow-up task created',
    description: result.data.title,
    actorAdminId: adminSession.userId,
    taskId: task.id,
    leadId: task.leadId,
    enquiryId: task.enquiryId,
    quoteRequestId: task.quoteRequestId,
    deliveryProjectId: task.deliveryProjectId,
  });

  if (task.assignedToAdminId) {
    await logActivity({
      type: 'TASK_ASSIGNED',
      title: 'Task assignment recorded',
      description: 'Task assigned to a team member.',
      actorAdminId: adminSession.userId,
      taskId: task.id,
      leadId: task.leadId,
      enquiryId: task.enquiryId,
      quoteRequestId: task.quoteRequestId,
      deliveryProjectId: task.deliveryProjectId,
    });
  }

  await prisma.auditLog.create({
    data: {
      actor: adminSession.email,
      action: 'FOLLOW_UP_TASK_CREATED',
      entity: 'FollowUpTask',
      entityId: task.id,
      actorAdminId: adminSession.userId,
      details: {
        status: task.status,
        assignedToAdminId: task.assignedToAdminId,
      },
    },
  });

  const baseReturnTo = safeRedirectPath(payload.returnTo, `/admin/tasks/${task.id}`, ['/admin/tasks']);
  const redirectUrl = new URL(baseReturnTo, request.url);
  redirectUrl.searchParams.set('created', '1');
  const response = NextResponse.redirect(redirectUrl);
  response.headers.set('x-request-id', requestId);
  return response;
}
