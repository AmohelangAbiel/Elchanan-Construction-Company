import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminSession } from '../../../../lib/auth';
import { safeRedirectPath } from '../../../../lib/api';
import { prisma } from '../../../../lib/prisma';
import { OPERATIONS_ROLES } from '../../../../lib/permissions';
import { AdminFlash } from '../../components/AdminFlash';
import { AdminTopNav } from '../../components/AdminTopNav';
import { deriveDocumentApprovalStatus, DOCUMENT_APPROVAL_STATUS_VALUES } from '../../../../lib/billing';

type SearchParamValue = string | string[] | undefined;

const CONTRACT_TYPES = ['CONTRACT', 'AGREEMENT', 'SCOPE_DOCUMENT', 'TERMS_ATTACHMENT', 'OTHER'] as const;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function approvalTone(status: string) {
  if (status === 'APPROVED') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'REJECTED') return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  if (status === 'VIEWED') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'SENT') return 'border-sky-400/35 bg-sky-500/10 text-sky-100';
  if (status === 'ARCHIVED') return 'border-slate-700 bg-slate-900/80 text-slate-300';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function AdminContractDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(OPERATIONS_ROLES);

  const [document, leads, quotes, projects] = await Promise.all([
    prisma.portalDocument.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        lead: {
          select: { id: true, fullName: true, companyName: true, email: true },
        },
        quoteRequest: {
          select: { id: true, referenceCode: true, fullName: true, serviceType: true, leadId: true },
        },
        deliveryProject: {
          select: { id: true, title: true, projectCode: true, status: true, leadId: true },
        },
        uploadedByAdmin: {
          select: { id: true, name: true, email: true },
        },
        clientRespondedByClientUser: {
          select: { id: true, fullName: true, displayName: true },
        },
      },
    }),
    prisma.lead.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
      take: 40,
      select: { id: true, fullName: true, companyName: true },
    }),
    prisma.quoteRequest.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
      take: 40,
      select: { id: true, referenceCode: true, fullName: true, leadId: true },
    }),
    prisma.deliveryProject.findMany({
      where: { deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 40,
      select: { id: true, title: true, projectCode: true, leadId: true },
    }),
  ]);

  if (!document) return notFound();

  const rawReturnTo = firstParam(searchParams?.returnTo);
  const returnTo = safeRedirectPath(rawReturnTo, '/admin/contracts', ['/admin/contracts']);
  const displayStatus = deriveDocumentApprovalStatus({
    approvalStatus: document.approvalStatus,
    clientViewedAt: document.clientViewedAt,
  });

  const selectedLeadId = document.leadId || document.quoteRequest?.leadId || document.deliveryProject?.leadId || '';

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Contract document updated successfully." /> : null}

        <Link href={returnTo} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan transition hover:text-white">
          <span aria-hidden="true">&larr;</span>
          Back to contracts
        </Link>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Contract document</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{document.title}</h1>
              <p className="mt-2 text-slate-400">{document.description || 'Document record for client review and approval.'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] ${approvalTone(displayStatus)}`}>{displayStatus.replace('_', ' ')}</span>
              <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                {document.type.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/admin/contracts/${document.id}/document`} className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
              Printable document
            </Link>
            <Link href={`/admin/contracts/${document.id}/document?print=1`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
              Print / Save PDF
            </Link>
            {document.url ? (
              <a href={document.url} target="_blank" rel="noreferrer" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
                Open source file
              </a>
            ) : null}
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
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Created</p>
              <p className="mt-2 text-xl font-semibold text-white">{new Date(document.createdAt).toLocaleDateString()}</p>
            </article>
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sort order</p>
              <p className="mt-2 text-xl font-semibold text-white">{document.sortOrder}</p>
            </article>
          </div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <div className="space-y-6">
            <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Document context</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                <p><span className="text-slate-500">Client:</span> {document.lead ? `${document.lead.fullName}${document.lead.companyName ? ` (${document.lead.companyName})` : ''}` : 'Not linked'}</p>
                <p><span className="text-slate-500">Client email:</span> {document.lead?.email || 'Not linked'}</p>
                <p><span className="text-slate-500">Uploaded by:</span> {document.uploadedByAdmin?.name || document.uploadedByAdmin?.email || 'Not set'}</p>
                <p><span className="text-slate-500">Approval status:</span> {displayStatus.replace('_', ' ')}</p>
                <p><span className="text-slate-500">Viewed by:</span> {document.clientRespondedByClientUser ? document.clientRespondedByClientUser.displayName || document.clientRespondedByClientUser.fullName : 'N/A'}</p>
                <p><span className="text-slate-500">Approved / rejected at:</span> {document.clientRespondedAt ? new Date(document.clientRespondedAt).toLocaleString() : 'Not yet'}</p>
              </div>
            </article>

            <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Linkage</p>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                <p><span className="text-slate-500">Quote:</span> {document.quoteRequest ? document.quoteRequest.referenceCode : 'Not linked'}</p>
                <p><span className="text-slate-500">Project:</span> {document.deliveryProject ? document.deliveryProject.projectCode || document.deliveryProject.title : 'Not linked'}</p>
                <p><span className="text-slate-500">URL:</span> {document.url}</p>
                <p><span className="text-slate-500">File name:</span> {document.fileName || 'Not set'}</p>
                <p><span className="text-slate-500">Mime type:</span> {document.mimeType || 'Not set'}</p>
                <p><span className="text-slate-500">Bytes:</span> {document.bytes ? document.bytes.toLocaleString() : 'Not set'}</p>
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Update contract</p>
              <form action={`/api/admin/contracts/${document.id}`} method="post" className="mt-6 space-y-5">
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Title</span>
                  <input name="title" defaultValue={document.title} required className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Description</span>
                  <textarea name="description" defaultValue={document.description || ''} rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Document type</span>
                  <select name="type" defaultValue={document.type} className="interactive-input mt-2">
                    {CONTRACT_TYPES.map((type) => (
                      <option key={type} value={type}>{type.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Approval status</span>
                  <select name="approvalStatus" defaultValue={document.approvalStatus} className="interactive-input mt-2">
                    {DOCUMENT_APPROVAL_STATUS_VALUES.map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Document URL</span>
                  <input name="url" defaultValue={document.url} required className="interactive-input mt-2" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-white">File name</span>
                    <input name="fileName" defaultValue={document.fileName || ''} className="interactive-input mt-2" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Mime type</span>
                    <input name="mimeType" defaultValue={document.mimeType || ''} className="interactive-input mt-2" />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Bytes</span>
                    <input name="bytes" type="number" min={0} step="1" defaultValue={document.bytes ? Number(document.bytes) : ''} className="interactive-input mt-2" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Sort order</span>
                    <input name="sortOrder" type="number" min={0} step="1" defaultValue={document.sortOrder} className="interactive-input mt-2" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Client</span>
                  <select name="leadId" defaultValue={selectedLeadId} className="interactive-input mt-2">
                    <option value="">Auto-detect from quote/project</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>{lead.fullName} {lead.companyName ? `(${lead.companyName})` : ''}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Quote</span>
                  <select name="quoteRequestId" defaultValue={document.quoteRequest?.id || ''} className="interactive-input mt-2">
                    <option value="">No quote link</option>
                    {quotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>{quote.referenceCode} - {quote.fullName}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Project</span>
                  <select name="deliveryProjectId" defaultValue={document.deliveryProject?.id || ''} className="interactive-input mt-2">
                    <option value="">No project link</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.title} {project.projectCode ? `(${project.projectCode})` : ''}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="hidden" name="clientVisible" value="false" />
                  <input type="checkbox" name="clientVisible" value="true" defaultChecked={document.clientVisible} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                  Make visible in the client portal
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Client response note</span>
                  <textarea name="clientResponseNote" defaultValue={document.clientResponseNote || ''} rows={3} className="interactive-input mt-2" />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="submit" name="action" value="SAVE" className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
                    Save contract
                  </button>
                  <button type="submit" name="action" value="ARCHIVE" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
                    Archive
                  </button>
                  <button type="submit" name="action" value="RESTORE" className="rounded-full border border-emerald-400/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200 transition hover:bg-emerald-500/10">
                    Restore draft
                  </button>
                </div>
              </form>
            </article>

            {document.clientResponseNote ? (
              <article className="rounded-[2rem] border border-brand-cyan/25 bg-brand-cyan/10 p-6 text-sm text-slate-100">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan">Client note</p>
                <p className="mt-2 whitespace-pre-line">{document.clientResponseNote}</p>
              </article>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
