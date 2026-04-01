import Link from 'next/link';
import { requirePortalSession } from '../../../../lib/portal-auth';
import { getPortalDocumentOwnershipFilter } from '../../../../lib/portal';
import { prisma } from '../../../../lib/prisma';
import { PortalContactActions } from '../components/PortalContactActions';
import { deriveDocumentApprovalStatus } from '../../../../lib/billing';

export const dynamic = 'force-dynamic';

const CONTRACT_TYPES = ['CONTRACT', 'AGREEMENT', 'SCOPE_DOCUMENT', 'TERMS_ATTACHMENT', 'OTHER'] as const;

function statusTone(status: string) {
  if (status === 'APPROVED') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'REJECTED') return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  if (status === 'VIEWED') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'SENT') return 'border-sky-400/35 bg-sky-500/10 text-sky-100';
  if (status === 'ARCHIVED') return 'border-slate-700 bg-slate-900/80 text-slate-300';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function PortalContractsPage() {
  const session = await requirePortalSession();

  if (!session.leadId) {
    return (
      <section className="space-y-6">
        <article className="rounded-[2rem] border border-amber-300/25 bg-amber-400/10 p-6 text-sm text-amber-100">
          Contracts are not visible yet because your portal account is not linked to a client record.
        </article>
        <PortalContactActions title="Need your contract records linked?" />
      </section>
    );
  }

  const documents = await prisma.portalDocument.findMany({
    where: {
      deletedAt: null,
      clientVisible: true,
      type: { in: [...CONTRACT_TYPES] },
      ...getPortalDocumentOwnershipFilter(session.leadId),
    },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      quoteRequest: {
        select: {
          id: true,
          referenceCode: true,
          leadId: true,
          deletedAt: true,
        },
      },
      deliveryProject: {
        select: {
          id: true,
          title: true,
          projectCode: true,
          leadId: true,
          deletedAt: true,
          portalVisible: true,
        },
      },
    },
  });

  const summaries = documents.map((document) => ({
    ...document,
    displayStatus: deriveDocumentApprovalStatus({
      approvalStatus: document.approvalStatus,
      clientViewedAt: document.clientViewedAt,
    }),
  }));

  const totals = {
    total: summaries.length,
    approved: summaries.filter((document) => document.displayStatus === 'APPROVED').length,
    pending: summaries.filter((document) => ['DRAFT', 'SENT', 'VIEWED'].includes(document.displayStatus)).length,
    rejected: summaries.filter((document) => document.displayStatus === 'REJECTED').length,
  };

  return (
    <section className="space-y-6">
      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Contract center</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Your contracts</h1>
        <p className="mt-3 text-sm text-slate-400">
          Review agreements, scope documents, and approval-ready files linked to your projects.
        </p>
      </article>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Documents visible</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totals.total}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pending review</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totals.pending}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Approved</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totals.approved}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Rejected</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totals.rejected}</p>
        </article>
      </section>

      <section className="grid gap-4">
        {summaries.length ? summaries.map((document) => {
          const relatedProject = document.deliveryProject &&
            !document.deliveryProject.deletedAt &&
            document.deliveryProject.portalVisible &&
            document.deliveryProject.leadId === session.leadId
            ? document.deliveryProject
            : null;
          const relatedQuote = document.quoteRequest &&
            !document.quoteRequest.deletedAt &&
            document.quoteRequest.leadId === session.leadId
            ? document.quoteRequest
            : null;

          return (
            <Link
              key={document.id}
              href={`/portal/contracts/${document.id}`}
              className="interactive-card rounded-[2rem] p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{document.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{document.description || 'Contract document record'}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {document.type.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${statusTone(document.displayStatus)}`}>
                    {document.displayStatus.replace('_', ' ')}
                  </span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-300">
                    {document.type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2 xl:grid-cols-4">
                <p>Created: {new Date(document.createdAt).toLocaleDateString()}</p>
                <p>Viewed: {document.clientViewedAt ? new Date(document.clientViewedAt).toLocaleDateString() : 'Not yet'}</p>
                <p>Status: {document.clientVisible ? 'Visible' : 'Hidden'}</p>
                <p>Sort order: {document.sortOrder}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                {relatedQuote ? <span>Quote: {relatedQuote.referenceCode}</span> : null}
                {relatedProject ? <span>Project: {relatedProject.projectCode || relatedProject.title}</span> : null}
              </div>
            </Link>
          );
        }) : (
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 text-sm text-slate-400 shadow-glow">
            No contract documents are visible yet. Once the team shares an agreement, it will appear here.
          </article>
        )}
      </section>

      <PortalContactActions title="Need help with a contract?" />
    </section>
  );
}
