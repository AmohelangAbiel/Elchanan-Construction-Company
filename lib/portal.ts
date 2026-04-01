import type { ProjectMilestoneStatus, Prisma } from '@prisma/client';

type MilestoneLike = {
  status: ProjectMilestoneStatus;
};

const openMilestoneStatuses: ProjectMilestoneStatus[] = ['PENDING', 'IN_PROGRESS', 'DELAYED'];

export function getPortalDisplayName(input: {
  displayName: string | null | undefined;
  fullName: string | null | undefined;
  email: string;
}) {
  return input.displayName || input.fullName || input.email;
}

export function getMilestoneProgress(milestones: MilestoneLike[]) {
  if (!milestones.length) {
    return {
      total: 0,
      completed: 0,
      open: 0,
      percentage: 0,
    };
  }

  const completed = milestones.filter((milestone) => milestone.status === 'COMPLETED').length;
  const open = milestones.filter((milestone) => openMilestoneStatuses.includes(milestone.status)).length;

  return {
    total: milestones.length,
    completed,
    open,
    percentage: Math.round((completed / milestones.length) * 100),
  };
}

export function getProjectReference(project: {
  id: string;
  projectCode: string | null;
  quoteRequest?: { referenceCode: string } | null;
}) {
  if (project.projectCode) return project.projectCode;
  if (project.quoteRequest?.referenceCode) return `PRJ-${project.quoteRequest.referenceCode}`;
  return `PRJ-${project.id.slice(-8).toUpperCase()}`;
}

export function getPortalDocumentOwnershipFilter(leadId: string): Prisma.PortalDocumentWhereInput {
  return {
    OR: [
      { leadId },
      {
        quoteRequest: {
          leadId,
          deletedAt: null,
        },
      },
      {
        deliveryProject: {
          leadId,
          deletedAt: null,
          portalVisible: true,
        },
      },
    ],
  };
}
