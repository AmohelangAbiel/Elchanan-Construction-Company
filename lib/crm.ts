import type { Lead, LeadSourceType, LeadStatus, Prisma, QuoteStatus } from '@prisma/client';
import { prisma } from './prisma';
import { createDeliveryProjectCode } from './operations';
import { normalizeEmail, normalizePhone, sanitizeOptionalText, sanitizeText } from './sanitize';

type LeadUpsertInput = {
  fullName: string;
  email: string;
  phone: string;
  companyName?: string | null;
  location?: string | null;
  notes?: string | null;
  sourceType: LeadSourceType;
  sourcePath?: string | null;
  sourcePage?: string | null;
  sourceReferrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  statusHint: LeadStatus;
  assignedToAdminId?: string | null;
};

export type LeadUpsertResult = {
  lead: Lead;
  isNew: boolean;
  previousStatus: LeadStatus | null;
};

type ActivityInput = {
  type: 'ENQUIRY_SUBMITTED' | 'QUOTE_REQUESTED' | 'LEAD_CREATED' | 'LEAD_STATUS_CHANGED' | 'LEAD_ASSIGNED' | 'ENQUIRY_ASSIGNED' | 'QUOTE_ASSIGNED' | 'QUOTE_STATUS_CHANGED' | 'QUOTE_WON' | 'PROJECT_CONVERTED' | 'TASK_CREATED' | 'TASK_STATUS_CHANGED' | 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'NOTE_ADDED';
  title: string;
  description?: string | null;
  metadata?: Prisma.InputJsonValue;
  actorAdminId?: string | null;
  leadId?: string | null;
  enquiryId?: string | null;
  quoteRequestId?: string | null;
  taskId?: string | null;
  deliveryProjectId?: string | null;
};

const progressionRank: Record<LeadStatus, number> = {
  NEW: 1,
  CONTACTED: 2,
  QUALIFIED: 3,
  QUOTED: 4,
  WON: 5,
  LOST: 0,
  INACTIVE: -1,
};

function mergeLeadStatus(current: LeadStatus, hint: LeadStatus): LeadStatus {
  if (hint === 'WON') return 'WON';
  if (hint === 'LOST') {
    return current === 'WON' ? current : 'LOST';
  }
  if (current === 'WON') return current;
  if (current === 'LOST') return current;
  return progressionRank[hint] > progressionRank[current] ? hint : current;
}

export async function logActivity(input: ActivityInput) {
  await prisma.activityLog.create({
    data: {
      type: input.type,
      title: sanitizeText(input.title, 220),
      description: sanitizeOptionalText(input.description, 4000) || null,
      metadata: input.metadata ?? undefined,
      actorAdminId: input.actorAdminId || null,
      leadId: input.leadId || null,
      enquiryId: input.enquiryId || null,
      quoteRequestId: input.quoteRequestId || null,
      taskId: input.taskId || null,
      deliveryProjectId: input.deliveryProjectId || null,
    },
  });
}

export async function upsertLeadRecord(input: LeadUpsertInput): Promise<LeadUpsertResult> {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  const existing = await prisma.lead.findUnique({
    where: {
      email_phone: {
        email,
        phone,
      },
    },
  });

  if (existing) {
    const nextStatus = mergeLeadStatus(existing.status, input.statusHint);
    const nextAssigned = input.assignedToAdminId || existing.assignedToAdminId || null;

    const updated = await prisma.lead.update({
      where: { id: existing.id },
      data: {
        fullName: sanitizeText(input.fullName, 160) || existing.fullName,
        companyName: sanitizeOptionalText(input.companyName, 160) || existing.companyName,
        location: sanitizeOptionalText(input.location, 180) || existing.location,
        notes: sanitizeOptionalText(input.notes, 4000) || existing.notes,
        sourceType: input.sourceType || existing.sourceType,
        sourcePath: sanitizeOptionalText(input.sourcePath, 2048) || existing.sourcePath,
        sourcePage: sanitizeOptionalText(input.sourcePage, 2048) || existing.sourcePage,
        sourceReferrer: sanitizeOptionalText(input.sourceReferrer, 2048) || existing.sourceReferrer,
        utmSource: sanitizeOptionalText(input.utmSource, 120) || existing.utmSource,
        utmMedium: sanitizeOptionalText(input.utmMedium, 120) || existing.utmMedium,
        utmCampaign: sanitizeOptionalText(input.utmCampaign, 160) || existing.utmCampaign,
        status: nextStatus,
        assignedToAdminId: nextAssigned,
      },
    });

    return {
      lead: updated,
      isNew: false,
      previousStatus: existing.status,
    };
  }

  const created = await prisma.lead.create({
    data: {
      fullName: sanitizeText(input.fullName, 160),
      email,
      phone,
      companyName: sanitizeOptionalText(input.companyName, 160) || null,
      location: sanitizeOptionalText(input.location, 180) || null,
      notes: sanitizeOptionalText(input.notes, 4000) || null,
      status: input.statusHint,
      sourceType: input.sourceType,
      sourcePath: sanitizeOptionalText(input.sourcePath, 2048) || null,
      sourcePage: sanitizeOptionalText(input.sourcePage, 2048) || null,
      sourceReferrer: sanitizeOptionalText(input.sourceReferrer, 2048) || null,
      utmSource: sanitizeOptionalText(input.utmSource, 120) || null,
      utmMedium: sanitizeOptionalText(input.utmMedium, 120) || null,
      utmCampaign: sanitizeOptionalText(input.utmCampaign, 160) || null,
      assignedToAdminId: input.assignedToAdminId || null,
    },
  });

  return {
    lead: created,
    isNew: true,
    previousStatus: null,
  };
}

export function quoteStatusToLeadStatus(status: QuoteStatus): LeadStatus | null {
  if (status === 'WON') return 'WON';
  if (status === 'LOST') return 'LOST';
  if (status === 'NEW' || status === 'REVIEWING' || status === 'RESPONDED') {
    return 'QUOTED';
  }
  return null;
}

export async function syncLeadStatusFromQuote(quoteId: string, status: QuoteStatus) {
  const quote = await prisma.quoteRequest.findUnique({
    where: { id: quoteId },
    select: { id: true, leadId: true },
  });

  if (!quote?.leadId) return null;

  const hint = quoteStatusToLeadStatus(status);
  if (!hint) return null;

  const lead = await prisma.lead.findUnique({
    where: { id: quote.leadId },
    select: { id: true, status: true },
  });

  if (!lead) return null;

  const nextStatus = mergeLeadStatus(lead.status, hint);
  if (nextStatus === lead.status) {
    return lead;
  }

  return prisma.lead.update({
    where: { id: lead.id },
    data: { status: nextStatus },
  });
}

export async function syncLeadAssignment(leadId: string | null | undefined, assignedToAdminId: string | null | undefined) {
  if (!leadId) return null;

  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    select: { id: true, assignedToAdminId: true },
  });

  if (!lead) return null;

  const nextAssigned = assignedToAdminId || null;
  if (lead.assignedToAdminId === nextAssigned) {
    return lead;
  }

  return prisma.lead.update({
    where: { id: lead.id },
    data: { assignedToAdminId: nextAssigned },
  });
}

export async function convertWonQuoteToDeliveryProject(input: {
  quoteId: string;
  actorAdminId?: string | null;
  title?: string | null;
  startTarget?: Date | null;
  notes?: string | null;
}) {
  const quote = await prisma.quoteRequest.findFirst({
    where: { id: input.quoteId, deletedAt: null },
    select: {
      id: true,
      status: true,
      serviceType: true,
      fullName: true,
      leadId: true,
      convertedProject: {
        select: { id: true },
      },
    },
  });

  if (!quote) {
    throw new Error('Quote request not found.');
  }

  if (quote.status !== 'WON') {
    throw new Error('Only won quotes can be converted to delivery projects.');
  }

  if (quote.convertedProject) {
    return {
      id: quote.convertedProject.id,
      created: false,
    };
  }

  const created = await prisma.deliveryProject.create({
    data: {
      title:
        sanitizeOptionalText(input.title, 180) ||
        `${quote.serviceType} - ${quote.fullName}`,
      status: 'ACTIVE',
      projectCode: createDeliveryProjectCode(),
      startTarget: input.startTarget || null,
      notes: sanitizeOptionalText(input.notes, 4000) || null,
      quoteRequestId: quote.id,
      leadId: quote.leadId,
      createdByAdminId: input.actorAdminId || null,
    },
    select: { id: true },
  });

  return {
    id: created.id,
    created: true,
  };
}
