import Link from 'next/link';
import { requirePortalSession } from '../../../lib/portal-auth';
import { prisma } from '../../../lib/prisma';
import {
  getMilestoneProgress,
  getPortalDocumentOwnershipFilter,
  getProjectReference,
} from '../../../lib/portal';
import { PortalContactActions } from './components/PortalContactActions';

export const dynamic = 'force-dynamic';

export default async function PortalDashboardPage() {
  const session = await requirePortalSession();

  if (!session.leadId) {
    return (
      <section className="space-y-6">
        <article className="rounded-[2rem] border border-amber-300/25 bg-amber-400/10 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">Portal setup pending</p>
          <h1 className="mt-3 text-2xl font-semibold text-white">Your account is active but not yet linked</h1>
          <p className="mt-3 text-sm text-amber-100/85">
            Our team still needs to complete your client linkage before project and quote records become visible.
          </p>
        </article>
        <PortalContactActions title="Need help activating your portal access?" />
      </section>
    );
  }

  const [quotes, projects, recentUpdates, recentDocuments] = await Promise.all([
    prisma.quoteRequest.findMany({
      where: {
        deletedAt: null,
        leadId: session.leadId,
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 8,
      select: {
        id: true,
        referenceCode: true,
        serviceType: true,
        status: true,
        quoteSentAt: true,
        validityDays: true,
        createdAt: true,
      },
    }),
    prisma.deliveryProject.findMany({
      where: {
        deletedAt: null,
        portalVisible: true,
        leadId: session.leadId,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 6,
      include: {
        quoteRequest: {
          select: {
            referenceCode: true,
            leadId: true,
            deletedAt: true,
          },
        },
        milestones: {
          where: { deletedAt: null, clientVisible: true },
          orderBy: [{ sortOrder: 'asc' }, { targetDate: 'asc' }],
          select: {
            id: true,
            status: true,
            title: true,
          },
        },
      },
    }),
    prisma.projectUpdate.findMany({
      where: {
        deletedAt: null,
        clientVisible: true,
        deliveryProject: {
          deletedAt: null,
          portalVisible: true,
          leadId: session.leadId,
        },
      },
      orderBy: [{ publishedAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        title: true,
        summary: true,
        publishedAt: true,
        deliveryProject: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    }),
    prisma.portalDocument.findMany({
      where: {
        deletedAt: null,
        clientVisible: true,
        ...getPortalDocumentOwnershipFilter(session.leadId),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
      },
    }),
  ]);

  const activeQuotes = quotes.filter((quote) => !['ARCHIVED', 'LOST'].includes(quote.status));
  const openProjects = projects.filter((project) => !['COMPLETED', 'CANCELLED'].includes(project.status));
  const upcomingMilestones = projects.reduce((total, project) => (
    total + project.milestones.filter((milestone) => milestone.status !== 'COMPLETED').length
  ), 0);

  return (
    <section className="space-y-6">
      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Client dashboard</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Project and quotation overview</h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          Track your active projects, latest updates, and approved documents from one secure workspace.
        </p>
      </article>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total quotes</p>
          <p className="mt-2 text-3xl font-semibold text-white">{quotes.length}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Active quotes</p>
          <p className="mt-2 text-3xl font-semibold text-white">{activeQuotes.length}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Active projects</p>
          <p className="mt-2 text-3xl font-semibold text-white">{openProjects.length}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Upcoming milestones</p>
          <p className="mt-2 text-3xl font-semibold text-white">{upcomingMilestones}</p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Active project visibility</h2>
            <Link href="/portal/projects" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">
              View all projects
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {projects.length ? projects.map((project) => {
              const progress = getMilestoneProgress(project.milestones);
              const safeQuoteReference =
                project.quoteRequest &&
                !project.quoteRequest.deletedAt &&
                project.quoteRequest.leadId === session.leadId
                  ? project.quoteRequest.referenceCode
                  : null;

              return (
                <Link key={project.id} href={`/portal/projects/${project.id}`} className="interactive-card block rounded-2xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{project.title}</p>
                    <span className="rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-brand-cyan">
                      {project.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {getProjectReference({
                      id: project.id,
                      projectCode: project.projectCode,
                      quoteRequest: safeQuoteReference ? { referenceCode: safeQuoteReference } : null,
                    })}
                  </p>
                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div className="h-full rounded-full bg-brand-cyan transition-all" style={{ width: `${progress.percentage}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {progress.completed}/{progress.total} milestones completed ({progress.percentage}%)
                    </p>
                  </div>
                </Link>
              );
            }) : (
              <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                No active projects are currently visible in your portal.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Recent updates</h2>
            <Link href="/portal/projects" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">
              Projects
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentUpdates.length ? recentUpdates.map((update) => (
              <article key={update.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="font-semibold text-white">{update.title}</p>
                <p className="mt-1 text-xs text-slate-500">{update.deliveryProject.title}</p>
                {update.summary ? <p className="mt-2 text-sm text-slate-300">{update.summary}</p> : null}
                <p className="mt-2 text-xs text-slate-500">{new Date(update.publishedAt).toLocaleString()}</p>
              </article>
            )) : (
              <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                Project updates will appear here as soon as your project team publishes them.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Recent documents</h2>
            <Link href="/portal/documents" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">
              Document center
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {recentDocuments.length ? recentDocuments.map((document) => (
              <a key={document.id} href={`/api/portal/documents/${document.id}`} className="interactive-card block rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{document.title}</p>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                    {document.type}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">Added {new Date(document.createdAt).toLocaleDateString()}</p>
              </a>
            )) : (
              <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                No documents have been shared yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Quote status snapshot</h2>
            <Link href="/portal/quotes" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">
              Open quotes
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {quotes.length ? quotes.slice(0, 4).map((quote) => (
              <Link key={quote.id} href={`/portal/quotes/${quote.id}`} className="interactive-card block rounded-2xl p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white">{quote.referenceCode}</p>
                  <span className="rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-brand-cyan">
                    {quote.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{quote.serviceType}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Submitted {new Date(quote.createdAt).toLocaleDateString()}
                </p>
              </Link>
            )) : (
              <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                You have no quote records visible yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <PortalContactActions />
    </section>
  );
}
