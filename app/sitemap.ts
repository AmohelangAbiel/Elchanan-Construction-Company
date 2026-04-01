import type { MetadataRoute } from 'next';
import { Prisma } from '@prisma/client';
import { BASE_URL } from '../lib/constants';
import { prisma } from '../lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = BASE_URL.replace(/\/$/, '');

  let services: Array<{ slug: string; updatedAt: Date }> = [];
  let projects: Array<{ slug: string; updatedAt: Date }> = [];
  let threads: Array<{ slug: string; updatedAt: Date }> = [];

  try {
    [services, projects, threads] = await Promise.all([
      prisma.service.findMany({ where: { published: true, deletedAt: null }, select: { slug: true, updatedAt: true } }),
      prisma.project.findMany({ where: { published: true, status: 'PUBLISHED', deletedAt: null }, select: { slug: true, updatedAt: true } }),
      prisma.forumThread.findMany({ where: { status: 'OPEN', deletedAt: null }, select: { slug: true, updatedAt: true } }),
    ]);
  } catch (error) {
    const canFallback =
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientRustPanicError ||
      error instanceof Prisma.PrismaClientUnknownRequestError;

    if (!canFallback) {
      throw error;
    }
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    '',
    '/about',
    '/services',
    '/projects',
    '/solutions',
    '/pricing',
    '/quote',
    '/contact',
    '/faq',
    '/forum',
    '/reviews',
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.8,
  }));

  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${base}/services/${service.slug}`,
    lastModified: service.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  const projectRoutes: MetadataRoute.Sitemap = projects.map((project) => ({
    url: `${base}/projects/${project.slug}`,
    lastModified: project.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.75,
  }));

  const forumRoutes: MetadataRoute.Sitemap = threads.map((thread) => ({
    url: `${base}/forum/${thread.slug}`,
    lastModified: thread.updatedAt,
    changeFrequency: 'daily',
    priority: 0.65,
  }));

  return [...staticRoutes, ...serviceRoutes, ...projectRoutes, ...forumRoutes];
}
