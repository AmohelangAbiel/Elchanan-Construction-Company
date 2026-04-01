import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch (error) {
    const canFallback =
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientUnknownRequestError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2021', 'P2022'].includes(error.code));

    if (canFallback) {
      return fallback;
    }

    throw error;
  }
}

export async function getCompanyProfile() {
  return safeQuery(
    () => prisma.companyProfile.findFirst({ orderBy: { createdAt: 'asc' } }),
    null,
  );
}

export async function getPublishedServices() {
  return safeQuery(
    () =>
      prisma.service.findMany({
        where: { published: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    [],
  );
}

export async function getPublishedServiceBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.service.findFirst({
        where: { slug, published: true, deletedAt: null },
      }),
    null,
  );
}

export async function getPublishedProjects() {
  return safeQuery(
    () =>
      prisma.project.findMany({
        where: { published: true, status: 'PUBLISHED', deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    [],
  );
}

export async function getPublishedProjectBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.project.findFirst({
        where: { slug, published: true, status: 'PUBLISHED', deletedAt: null },
      }),
    null,
  );
}

export async function getPublishedPricingPlans() {
  return safeQuery(
    () =>
      prisma.pricingPlan.findMany({
        where: { published: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
    [],
  );
}

export async function getApprovedReviews(limit = 12) {
  return safeQuery(
    () =>
      prisma.review.findMany({
        where: { status: 'APPROVED', deletedAt: null },
        orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
        take: limit,
      }),
    [],
  );
}

export async function getForumCategories() {
  return safeQuery(
    () =>
      prisma.forumCategory.findMany({
        where: { published: true, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      }),
    [],
  );
}

export async function getOpenForumThreads(limit = 12) {
  return safeQuery(
    () =>
      prisma.forumThread.findMany({
        where: { status: 'OPEN', deletedAt: null },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
        take: limit,
        include: {
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
          replies: {
            where: { status: 'APPROVED', deletedAt: null },
            select: { id: true },
          },
        },
      }),
    [],
  );
}

export async function getOpenForumThreadBySlug(slug: string) {
  return safeQuery(
    () =>
      prisma.forumThread.findFirst({
        where: { slug, status: 'OPEN', deletedAt: null },
        include: {
          category: true,
          replies: {
            where: { status: 'APPROVED', deletedAt: null },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
    null,
  );
}

export const defaultSolutions = [
  {
    title: 'Essential Build Package',
    highlight: 'Ideal for new homes and small residential projects.',
    features: ['Full project planning', 'Quality structural work', 'Transparent materials sourcing'],
    cta: 'Request estimate',
  },
  {
    title: 'Residential Renovation Suite',
    highlight: 'Complete renovation support from concept to handover.',
    features: ['Interior remodeling', 'Roof and ceiling refresh', 'Paint and finishing'],
    cta: 'Discuss your project',
  },
  {
    title: 'Infrastructure and Civil Support',
    highlight: 'Trusted support for paving, retaining, and site infrastructure work.',
    features: ['Paving and hardscape', 'Site drainage planning', 'Quality compliance support'],
    cta: 'Get a quote',
  },
];
