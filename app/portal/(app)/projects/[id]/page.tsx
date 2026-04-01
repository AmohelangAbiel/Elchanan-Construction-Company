import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalSession } from '../../../../../lib/portal-auth';
import { formatCurrency, getOutstandingBalance } from '../../../../../lib/billing';
import { getMilestoneProgress, getProjectReference } from '../../../../../lib/portal';
import { prisma } from '../../../../../lib/prisma';
import { PortalContactActions } from '../../components/PortalContactActions';

type PageProps = {
  params: { id: string };
};

function milestoneStatusClasses(status: string) {
  if (status === 'COMPLETED') {
    return 'border-emerald-300/35 bg-emerald-500/10 text-emerald-100';
  }

  if (status === 'IN_PROGRESS') {
    return 'border-brand-cyan/40 bg-brand-cyan/12 text-brand-cyan';
  }

  if (status === 'DELAYED') {
    return 'border-amber-300/40 bg-amber-400/12 text-amber-100';
  }

  return 'border-slate-700 bg-slate-800/60 text-slate-200';
}

export const dynamic = 'force-dynamic';

export default async function PortalProjectDetailPage({ params }: PageProps) {
  const session = await requirePortalSession();
  if (!session.leadId) return notFound();

  const project = await prisma.deliveryProject.findFirst({
    where: {
      id: params.id,
      leadId: session.leadId,
      deletedAt: null,
      portalVisible: true,
    },
    include: {
      quoteRequest: {
        select: {
          id: true,
          referenceCode: true,
          status: true,
          serviceType: true,
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
      },
      updates: {
        where: {
          deletedAt: null,
          clientVisible: true,
        },
        orderBy: [{ publishedAt: 'desc' }],
        take: 8,
      },
      invoices: {
        where: {
          deletedAt: null,
          clientVisible: true,
        },
        orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          payments: {
            where: { deletedAt: null },
            select: { amount: true },
          },
        },
      },
      portalDocuments: {
        where: {
          deletedAt: null,
          clientVisible: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          type: true,
          fileName: true,
          createdAt: true,
        },
      },
    },
  });

  if (!project) return notFound();

  const progress = getMilestoneProgress(project.milestones);
  const linkedQuote =
    project.quoteRequest &&
    !project.quoteRequest.deletedAt &&
    project.quoteRequest.leadId === session.leadId
      ? project.quoteRequest
      : null;

  const projectReference = getProjectReference({
    id: project.id,
    projectCode: project.projectCode,
    quoteRequest: linkedQuote ? { referenceCode: linkedQuote.referenceCode } : null,
  });
  const invoiceSummary = project.invoices.reduce(
    (summary, invoice) => {
      const total = Number(invoice.total || invoice.subtotal || 0);
      const paidTotal = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

      return {
        visibleInvoices: summary.visibleInvoices + 1,
        totalBilled: summary.totalBilled + total,
        totalPaid: summary.totalPaid + paidTotal,
        outstanding: summary.outstanding + getOutstandingBalance({ total, paidTotal }),
      };
    },
    {
      visibleInvoices: 0,
      totalBilled: 0,
      totalPaid: 0,
      outstanding: 0,
    },
  );
  const latestUpdate = project.updates[0] || null;

  return (
    <section className="space-y-6">
      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Project detail</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">{project.title}</h1>
            <p className="mt-2 text-sm text-slate-400">{projectReference}</p>
          </div>
          <span className="rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-brand-cyan">
            {project.status}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/portal/projects" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
            Back to projects
          </Link>
          {linkedQuote ? (
            <Link href={`/portal/quotes/${linkedQuote.id}`} className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
              Open linked quote
            </Link>
          ) : null}
        </div>
      </article>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Milestone progress</p>
          <p className="mt-2 text-3xl font-semibold text-white">{progress.percentage}%</p>
          <p className="mt-2 text-sm text-slate-400">{progress.completed}/{progress.total} milestones completed</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Billing snapshot</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(invoiceSummary.totalPaid)}</p>
          <p className="mt-2 text-sm text-slate-400">
            {invoiceSummary.visibleInvoices} invoices · Outstanding {formatCurrency(invoiceSummary.outstanding)}
          </p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Latest update</p>
          <p className="mt-2 text-sm font-semibold text-white">
            {latestUpdate ? latestUpdate.title : 'No published updates yet'}
          </p>
          <p className="mt-2 text-sm text-slate-400">
            {latestUpdate ? new Date(latestUpdate.publishedAt).toLocaleString() : 'Your team will publish updates here as work progresses.'}
          </p>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Status and timeline</p>
            <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p>
                <span className="text-slate-500">Project reference:</span> {projectReference}
              </p>
              <p>
                <span className="text-slate-500">Current status:</span> {project.status}
              </p>
              <p>
                <span className="text-slate-500">Planned start:</span>{' '}
                {project.startTarget ? new Date(project.startTarget).toLocaleDateString() : 'Not set'}
              </p>
              <p>
                <span className="text-slate-500">Estimated completion:</span>{' '}
                {project.estimatedCompletion ? new Date(project.estimatedCompletion).toLocaleDateString() : 'Not set'}
              </p>
              <p>
                <span className="text-slate-500">Last update:</span>{' '}
                {project.lastClientUpdateAt ? new Date(project.lastClientUpdateAt).toLocaleString() : 'No updates yet'}
              </p>
              <p>
                <span className="text-slate-500">Linked quote:</span> {linkedQuote?.referenceCode || 'Not linked'}
              </p>
            </div>
            {project.clientSummary ? (
              <p className="mt-4 whitespace-pre-line text-sm text-slate-200">{project.clientSummary}</p>
            ) : null}
          </article>

          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Milestone progress</p>
              <p className="text-xs text-slate-400">
                {progress.completed}/{progress.total} completed
              </p>
            </div>

            <div className="mt-4">
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div className="h-full rounded-full bg-brand-cyan transition-all" style={{ width: `${progress.percentage}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-400">{progress.percentage}% complete</p>
            </div>

            <div className="mt-4 space-y-3">
              {project.milestones.length ? (
                project.milestones.map((milestone) => (
                  <article key={milestone.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-white">{milestone.title}</p>
                      <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${milestoneStatusClasses(milestone.status)}`}>
                        {milestone.status}
                      </span>
                    </div>
                    {milestone.description ? (
                      <p className="mt-2 text-sm text-slate-300">{milestone.description}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>Target: {milestone.targetDate ? new Date(milestone.targetDate).toLocaleDateString() : 'Not set'}</span>
                      {milestone.completedDate ? <span>Completed: {new Date(milestone.completedDate).toLocaleDateString()}</span> : null}
                    </div>
                  </article>
                ))
              ) : (
                <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                  Milestones have not been published for this project yet.
                </article>
              )}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Client updates</p>
            <p className="mt-2 text-xs text-slate-500">Showing the latest published updates for your project.</p>
            <div className="mt-4 space-y-3">
              {project.updates.length ? (
                project.updates.map((update) => (
                  <article key={update.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-semibold text-white">{update.title}</p>
                      <p className="text-xs text-slate-500">{new Date(update.publishedAt).toLocaleString()}</p>
                    </div>
                    {update.summary ? <p className="mt-2 text-sm text-slate-200">{update.summary}</p> : null}
                    <p className="mt-2 whitespace-pre-line text-sm text-slate-300">
                      {update.body.length > 520 ? `${update.body.slice(0, 520)}...` : update.body}
                    </p>
                    {update.imageUrl ? (
                      <a
                        href={update.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex text-xs font-semibold uppercase tracking-[0.14em] text-brand-cyan hover:text-white"
                      >
                        View update image
                      </a>
                    ) : null}
                    {update.attachmentUrl ? (
                      <a
                        href={update.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-xs font-semibold uppercase tracking-[0.14em] text-brand-cyan hover:text-white"
                      >
                        Open attachment
                      </a>
                    ) : null}
                  </article>
                ))
              ) : (
                <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                  Client-visible updates have not been posted yet.
                </article>
              )}
            </div>
          </article>
        </div>

        <div className="space-y-6">
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Project documents</p>
            <div className="mt-4 space-y-3">
              {project.portalDocuments.length ? (
                project.portalDocuments.map((document) => (
                  <a key={document.id} href={`/api/portal/documents/${document.id}`} className="interactive-card block rounded-2xl p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{document.title}</p>
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                        {document.type}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {document.fileName || 'Document'} - Added {new Date(document.createdAt).toLocaleDateString()}
                    </p>
                  </a>
                ))
              ) : (
                <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
                  No documents have been shared for this project yet.
                </article>
              )}
            </div>
          </article>

          {linkedQuote ? (
            <article className="rounded-[2rem] border border-brand-cyan/25 bg-brand-cyan/5 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan">Linked quotation</p>
              <p className="mt-2 text-lg font-semibold text-white">{linkedQuote.referenceCode}</p>
              <p className="mt-1 text-sm text-slate-300">{linkedQuote.serviceType}</p>
              <p className="mt-1 text-xs text-slate-500">Status: {linkedQuote.status}</p>
              <Link href={`/portal/quotes/${linkedQuote.id}`} className="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">
                Open quotation
              </Link>
            </article>
          ) : null}

          <PortalContactActions title="Questions about your project timeline?" />
        </div>
      </section>
    </section>
  );
}
