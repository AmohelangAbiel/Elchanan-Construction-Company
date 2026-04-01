import Link from 'next/link';
import { requirePortalSession } from '../../../../lib/portal-auth';
import { getMilestoneProgress, getProjectReference } from '../../../../lib/portal';
import { prisma } from '../../../../lib/prisma';
import { PortalContactActions } from '../components/PortalContactActions';

export const dynamic = 'force-dynamic';

export default async function PortalProjectsPage() {
  const session = await requirePortalSession();

  if (!session.leadId) {
    return (
      <section className="space-y-6">
        <article className="rounded-[2rem] border border-amber-300/25 bg-amber-400/10 p-6 text-sm text-amber-100">
          Projects are not visible yet because your portal account is not linked to a client project record.
        </article>
        <PortalContactActions title="Need your projects linked?" />
      </section>
    );
  }

  const projects = await prisma.deliveryProject.findMany({
    where: {
      deletedAt: null,
      portalVisible: true,
      leadId: session.leadId,
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
    include: {
      quoteRequest: {
        select: {
          id: true,
          referenceCode: true,
          status: true,
          leadId: true,
          deletedAt: true,
        },
      },
      milestones: {
        where: {
          deletedAt: null,
          clientVisible: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { targetDate: 'asc' }],
        select: {
          id: true,
          title: true,
          status: true,
          targetDate: true,
        },
      },
      updates: {
        where: {
          deletedAt: null,
          clientVisible: true,
        },
        orderBy: [{ publishedAt: 'desc' }],
        take: 1,
        select: {
          id: true,
          title: true,
          publishedAt: true,
        },
      },
    },
  });

  const activeProjects = projects.filter((project) => !['COMPLETED', 'CANCELLED'].includes(project.status));
  const completedProjects = projects.filter((project) => project.status === 'COMPLETED');

  return (
    <section className="space-y-6">
      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Project progress</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Your projects</h1>
        <p className="mt-3 text-sm text-slate-400">
          Track live milestone progress, latest updates, and project status from one calm client view.
        </p>
      </article>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total projects</p>
          <p className="mt-2 text-3xl font-semibold text-white">{projects.length}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Active projects</p>
          <p className="mt-2 text-3xl font-semibold text-white">{activeProjects.length}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Completed projects</p>
          <p className="mt-2 text-3xl font-semibold text-white">{completedProjects.length}</p>
        </article>
      </section>

      <section className="grid gap-4">
        {projects.length ? (
          projects.map((project) => {
            const progress = getMilestoneProgress(project.milestones);
            const latestUpdate = project.updates[0];
            const safeQuoteReference =
              project.quoteRequest &&
              !project.quoteRequest.deletedAt &&
              project.quoteRequest.leadId === session.leadId
                ? project.quoteRequest.referenceCode
                : null;

            return (
              <Link key={project.id} href={`/portal/projects/${project.id}`} className="interactive-card rounded-[2rem] p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">{project.title}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {getProjectReference({
                        id: project.id,
                        projectCode: project.projectCode,
                        quoteRequest: safeQuoteReference ? { referenceCode: safeQuoteReference } : null,
                      })}
                    </p>
                  </div>
                  <span className="rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-brand-cyan">
                    {project.status}
                  </span>
                </div>

                {project.clientSummary ? (
                  <p className="mt-3 line-clamp-2 text-sm text-slate-300">{project.clientSummary}</p>
                ) : null}

                <div className="mt-4">
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-brand-cyan transition-all" style={{ width: `${progress.percentage}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {progress.completed}/{progress.total} milestones completed ({progress.percentage}%)
                  </p>
                </div>

                <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2 lg:grid-cols-4">
                  <p>Start: {project.startTarget ? new Date(project.startTarget).toLocaleDateString() : 'Not set'}</p>
                  <p>Est. completion: {project.estimatedCompletion ? new Date(project.estimatedCompletion).toLocaleDateString() : 'Not set'}</p>
                  <p>Latest update: {latestUpdate ? new Date(latestUpdate.publishedAt).toLocaleDateString() : 'No updates yet'}</p>
                  <p>Quote: {safeQuoteReference || 'Not linked'}</p>
                </div>
              </Link>
            );
          })
        ) : (
          <article className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
            No projects are currently visible in your portal. Your project card will appear here once delivery is scheduled.
          </article>
        )}
      </section>

      <PortalContactActions title="Need clarity on project scheduling or milestones?" />
    </section>
  );
}
