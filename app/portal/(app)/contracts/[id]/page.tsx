import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalSession } from '../../../../../lib/portal-auth';
import { getPortalDocumentOwnershipFilter } from '../../../../../lib/portal';
import { prisma } from '../../../../../lib/prisma';
import { PortalApprovalTracker } from '../../components/PortalApprovalTracker';
import { PortalContactActions } from '../../components/PortalContactActions';
import { canClientRespondToDocument, deriveDocumentApprovalStatus } from '../../../../../lib/billing';

export const dynamic = 'force-dynamic';

function approvalTone(status: string) {
  if (status === 'APPROVED') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'REJECTED') return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  if (status === 'VIEWED') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'SENT') return 'border-sky-400/35 bg-sky-500/10 text-sky-100';
  if (status === 'ARCHIVED') return 'border-slate-700 bg-slate-900/80 text-slate-300';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function PortalContractDetailPage({ params }: { params: { id: string } }) {
  const session = await requirePortalSession();

  if (!session.leadId) return notFound();

  const document = await prisma.portalDocument.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
      clientVisible: true,
      type: { in: ['CONTRACT', 'AGREEMENT', 'SCOPE_DOCUMENT', 'TERMS_ATTACHMENT', 'OTHER'] },
      ...getPortalDocumentOwnershipFilter(session.leadId),
    },
    include: {
      lead: {
        select: {
          id: true,
          fullName: true,
          companyName: true,
          email: true,
        },
      },
      quoteRequest: {
        select: {
          id: true,
          referenceCode: true,
          serviceType: true,
          status: true,
        },
      },
      deliveryProject: {
        select: {
          id: true,
          title: true,
          projectCode: true,
          status: true,
          leadId: true,
          deletedAt: true,
          portalVisible: true,
        },
      },
      clientRespondedByClientUser: {
        select: {
          id: true,
          fullName: true,
          displayName: true,
        },
      },
      uploadedByAdmin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!document) return notFound();

  const displayStatus = deriveDocumentApprovalStatus({
    approvalStatus: document.approvalStatus,
    clientViewedAt: document.clientViewedAt,
  });
  const canRespond = canClientRespondToDocument(displayStatus);

  const relatedProject = document.deliveryProject &&
    !document.deliveryProject.deletedAt &&
    document.deliveryProject.portalVisible &&
    document.deliveryProject.leadId === session.leadId
    ? document.deliveryProject
    : null;

  return (
    <section className="space-y-6">
      <PortalApprovalTracker endpoint={`/api/portal/contracts/${document.id}/approval`} returnTo={`/portal/contracts/${document.id}`} />

      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Contract detail</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">{document.title}</h1>
            <p className="mt-2 text-sm text-slate-400">{document.description || 'Contract or scope document prepared for review.'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.16em] ${approvalTone(displayStatus)}`}>
              {displayStatus.replace('_', ' ')}
            </span>
            <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.16em] text-slate-300">
              {document.type.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/portal/contracts" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
            Back to contracts
          </Link>
          <Link href={`/portal/contracts/${document.id}/document`} className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
            Printable document
          </Link>
          <a href={`/api/portal/documents/${document.id}`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
            Open source file
          </a>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Client visible</p>
            <p className="mt-2 text-xl font-semibold text-white">{document.clientVisible ? 'Yes' : 'No'}</p>
          </article>
          <article className="interactive-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Viewed at</p>
            <p className="mt-2 text-xl font-semibold text-white">{document.clientViewedAt ? new Date(document.clientViewedAt).toLocaleDateString() : 'Not yet'}</p>
          </article>
          <article className="interactive-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Responded at</p>
            <p className="mt-2 text-xl font-semibold text-white">{document.clientRespondedAt ? new Date(document.clientRespondedAt).toLocaleDateString() : 'Awaiting response'}</p>
          </article>
          <article className="interactive-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sort order</p>
            <p className="mt-2 text-xl font-semibold text-white">{document.sortOrder}</p>
          </article>
        </div>
      </article>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Document context</p>
            <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p><span className="text-slate-500">Client:</span> {document.lead ? `${document.lead.fullName}${document.lead.companyName ? ` (${document.lead.companyName})` : ''}` : 'Not linked'}</p>
              <p><span className="text-slate-500">Client email:</span> {document.lead?.email || 'Not linked'}</p>
              <p><span className="text-slate-500">Issued by:</span> {document.uploadedByAdmin?.name || document.uploadedByAdmin?.email || 'Not set'}</p>
              <p><span className="text-slate-500">Approval status:</span> {displayStatus.replace('_', ' ')}</p>
              <p><span className="text-slate-500">Viewed by:</span> {document.clientRespondedByClientUser ? document.clientRespondedByClientUser.displayName || document.clientRespondedByClientUser.fullName : 'N/A'}</p>
              <p><span className="text-slate-500">Source URL:</span> {document.url}</p>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Linked records</p>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p><span className="text-slate-500">Quote:</span> {document.quoteRequest ? document.quoteRequest.referenceCode : 'Not linked'}</p>
              <p><span className="text-slate-500">Project:</span> {relatedProject ? relatedProject.projectCode || relatedProject.title : 'Not linked'}</p>
              <p><span className="text-slate-500">Mime type:</span> {document.mimeType || 'Not set'}</p>
              <p><span className="text-slate-500">File name:</span> {document.fileName || 'Not set'}</p>
              <p><span className="text-slate-500">Bytes:</span> {document.bytes ? document.bytes.toLocaleString() : 'Not set'}</p>
            </div>
          </article>
        </div>

        <div className="space-y-6">
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Approval actions</p>
            <p className="mt-3 text-sm text-slate-300">
              {canRespond
                ? 'You can approve or reject this document so the team can keep the commercial workflow moving.'
                : displayStatus === 'APPROVED'
                  ? 'This document has already been approved.'
                  : displayStatus === 'REJECTED'
                    ? 'This document has already been rejected.'
                    : 'This document is no longer available for action.'}
            </p>
            {canRespond ? (
              <form action={`/api/portal/contracts/${document.id}/approval`} method="post" className="mt-6 space-y-4">
                <input type="hidden" name="returnTo" value={`/portal/contracts/${document.id}`} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Note for the team (optional)</span>
                  <textarea name="clientResponseNote" rows={4} className="interactive-input mt-3" placeholder="Add a clarification, approval note, or request for follow-up." />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button type="submit" name="approvalStatus" value="APPROVED" className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
                    Approve document
                  </button>
                  <button type="submit" name="approvalStatus" value="REJECTED" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
                    Reject document
                  </button>
                </div>
              </form>
            ) : null}
          </article>

          {document.clientResponseNote ? (
            <article className="rounded-[2rem] border border-emerald-300/25 bg-emerald-400/10 p-6 text-sm text-emerald-100">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100/80">Client note</p>
              <p className="mt-2 whitespace-pre-line">{document.clientResponseNote}</p>
            </article>
          ) : null}

          <PortalContactActions title="Need to discuss this contract?" />
        </div>
      </section>
    </section>
  );
}
