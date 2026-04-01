import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { requireAdminSession } from '../../../lib/auth';
import { AdminFlash } from '../components/AdminFlash';
import { AdminTopNav } from '../components/AdminTopNav';
import { prisma } from '../../../lib/prisma';
import { OPERATIONS_ROLES } from '../../../lib/permissions';
import { DOCUMENT_APPROVAL_STATUS_VALUES } from '../../../lib/billing';
import { DOCUMENT_APPROVAL_STATUSES } from '../../../lib/constants';
import { deriveDocumentApprovalStatus } from '../../../lib/billing';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;

const CONTRACT_TYPES = ['CONTRACT', 'AGREEMENT', 'SCOPE_DOCUMENT', 'TERMS_ATTACHMENT', 'OTHER'] as const;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseDateInput(value?: string, isEndOfDay = false) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;

  if (isEndOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

function approvalTone(status: string) {
  if (status === 'APPROVED') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'REJECTED') return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  if (status === 'VIEWED') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'SENT') return 'border-sky-400/35 bg-sky-500/10 text-sky-100';
  if (status === 'ARCHIVED') return 'border-slate-700 bg-slate-900/80 text-slate-300';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function AdminContractsPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(OPERATIONS_ROLES);

  const selectedStatus = firstParam(searchParams?.status);
  const selectedType = firstParam(searchParams?.type);
  const selectedLeadId = firstParam(searchParams?.leadId);
  const selectedProjectId = firstParam(searchParams?.projectId);
  const selectedQuoteId = firstParam(searchParams?.quoteId);
  const dateFromRaw = firstParam(searchParams?.from);
  const dateToRaw = firstParam(searchParams?.to);

  const dateFrom = parseDateInput(dateFromRaw);
  const dateTo = parseDateInput(dateToRaw, true);

  const [leads, quotes, projects] = await Promise.all([
    prisma.lead.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
      take: 40,
      select: { id: true, fullName: true, companyName: true, email: true },
    }),
    prisma.quoteRequest.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
      take: 40,
      select: { id: true, referenceCode: true, fullName: true, serviceType: true, leadId: true },
    }),
    prisma.deliveryProject.findMany({
      where: { deletedAt: null },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 40,
      select: {
        id: true,
        title: true,
        projectCode: true,
        status: true,
        leadId: true,
      },
    }),
  ]);

  const validLeadId = selectedLeadId && leads.some((lead) => lead.id === selectedLeadId) ? selectedLeadId : undefined;
  const validProjectId = selectedProjectId && projects.some((project) => project.id === selectedProjectId) ? selectedProjectId : undefined;
  const validQuoteId = selectedQuoteId && quotes.some((quote) => quote.id === selectedQuoteId) ? selectedQuoteId : undefined;

  const where: Prisma.PortalDocumentWhereInput = {
    deletedAt: null,
    type: {
      in: [...CONTRACT_TYPES],
    },
  };

  if (selectedStatus && DOCUMENT_APPROVAL_STATUSES.includes(selectedStatus as (typeof DOCUMENT_APPROVAL_STATUSES)[number])) {
    where.approvalStatus = selectedStatus as (typeof DOCUMENT_APPROVAL_STATUSES)[number];
  }

  if (selectedType && CONTRACT_TYPES.includes(selectedType as (typeof CONTRACT_TYPES)[number])) {
    where.type = selectedType as (typeof CONTRACT_TYPES)[number];
  }

  if (validLeadId) {
    where.leadId = validLeadId;
  }

  if (validProjectId) {
    where.deliveryProjectId = validProjectId;
  }

  if (validQuoteId) {
    where.quoteRequestId = validQuoteId;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const documents = await prisma.portalDocument.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }],
    take: 60,
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
    },
  });

  const docSummaries = documents.map((document) => ({
    ...document,
    displayStatus: deriveDocumentApprovalStatus({
      approvalStatus: document.approvalStatus,
      clientViewedAt: document.clientViewedAt,
    }),
  }));

  const queryParams = new URLSearchParams();
  if (selectedStatus) queryParams.set('status', selectedStatus);
  if (selectedType) queryParams.set('type', selectedType);
  if (validLeadId) queryParams.set('leadId', validLeadId);
  if (validProjectId) queryParams.set('projectId', validProjectId);
  if (validQuoteId) queryParams.set('quoteId', validQuoteId);
  if (dateFromRaw) queryParams.set('from', dateFromRaw);
  if (dateToRaw) queryParams.set('to', dateToRaw);
  const returnTo = queryParams.toString() ? `/admin/contracts?${queryParams.toString()}` : '/admin/contracts';

  const totals = {
    total: docSummaries.length,
    approved: docSummaries.filter((document) => document.displayStatus === 'APPROVED').length,
    pending: docSummaries.filter((document) => ['DRAFT', 'SENT', 'VIEWED'].includes(document.displayStatus)).length,
    archived: docSummaries.filter((document) => document.displayStatus === 'ARCHIVED').length,
  };

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.created) === '1' ? <AdminFlash message="Contract document created successfully." /> : null}
        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Contract document updated successfully." /> : null}

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Contracts</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Contract and agreement management</h1>
          <p className="mt-3 text-slate-400">
            Prepare client-facing contract documents, review approval states, and keep scope records tied to the right client.
          </p>
        </div>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total documents</p>
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
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Archived</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totals.archived}</p>
          </article>
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select name="status" defaultValue={selectedStatus || ''} className="interactive-input mt-2">
                <option value="">All statuses</option>
                {DOCUMENT_APPROVAL_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Type</span>
              <select name="type" defaultValue={selectedType || ''} className="interactive-input mt-2">
                <option value="">All types</option>
                {CONTRACT_TYPES.map((type) => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Client</span>
              <select name="leadId" defaultValue={validLeadId || ''} className="interactive-input mt-2">
                <option value="">All clients</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>{lead.fullName} {lead.companyName ? `(${lead.companyName})` : ''}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Project</span>
              <select name="projectId" defaultValue={validProjectId || ''} className="interactive-input mt-2">
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title} {project.projectCode ? `(${project.projectCode})` : ''}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">From</span>
              <input name="from" type="date" defaultValue={dateFromRaw || ''} className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">To</span>
              <input name="to" type="date" defaultValue={dateToRaw || ''} className="interactive-input mt-2" />
            </label>
            <div className="flex flex-wrap items-end gap-3 xl:col-span-6">
              <button type="submit" className="btn-primary px-5 py-2.5 text-xs uppercase tracking-[0.16em]">Apply</button>
              <Link href="/admin/contracts" className="btn-ghost px-5 py-2.5 text-xs uppercase tracking-[0.16em]">Reset</Link>
            </div>
          </form>
        </section>

        <details className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <summary className="cursor-pointer list-none text-xl font-semibold text-white">Create contract document</summary>
          <form action="/api/admin/contracts" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="block">
              <span className="text-sm font-semibold text-white">Title</span>
              <input name="title" required className="interactive-input mt-2" placeholder="Client agreement or scope document" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Document type</span>
              <select name="type" defaultValue="CONTRACT" className="interactive-input mt-2">
                {CONTRACT_TYPES.map((type) => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Description</span>
              <textarea name="description" rows={3} className="interactive-input mt-2" placeholder="Short summary for the client-facing contract record." />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Document URL</span>
              <input name="url" required className="interactive-input mt-2" placeholder="https://... or /media/..." />
              <p className="mt-2 text-xs text-slate-400">Use the uploaded file URL or a generated document path that the client can open securely.</p>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">File name</span>
              <input name="fileName" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Mime type</span>
              <input name="mimeType" className="interactive-input mt-2" placeholder="application/pdf" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Bytes</span>
              <input name="bytes" type="number" min={0} step="1" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Client</span>
              <select name="leadId" defaultValue="" className="interactive-input mt-2">
                <option value="">Select client</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>{lead.fullName} {lead.companyName ? `(${lead.companyName})` : ''}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Quote</span>
              <select name="quoteRequestId" defaultValue="" className="interactive-input mt-2">
                <option value="">No quote link</option>
                {quotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>{quote.referenceCode} - {quote.fullName}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Project</span>
              <select name="deliveryProjectId" defaultValue="" className="interactive-input mt-2">
                <option value="">No project link</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title} {project.projectCode ? `(${project.projectCode})` : ''}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Approval status</span>
              <select name="approvalStatus" defaultValue="DRAFT" className="interactive-input mt-2">
                {DOCUMENT_APPROVAL_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Sort order</span>
              <input name="sortOrder" type="number" min={0} defaultValue={0} className="interactive-input mt-2" />
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300 lg:col-span-2">
              <input type="hidden" name="clientVisible" value="false" />
              <input type="checkbox" name="clientVisible" value="true" className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
              Make visible to client portal
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Client response note</span>
              <textarea name="clientResponseNote" rows={3} className="interactive-input mt-2" placeholder="Optional note to carry into the approval workflow." />
            </label>
            <button type="submit" className="btn-primary px-5 py-2.5 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
              Create contract document
            </button>
          </form>
        </details>

        <div className="grid gap-4">
          {docSummaries.length ? docSummaries.map((document) => {
            const relatedLead = document.lead;
            const relatedProject = document.deliveryProject;
            const relatedQuote = document.quoteRequest;

            return (
              <Link
                key={document.id}
                href={`/admin/contracts/${document.id}?returnTo=${encodeURIComponent(returnTo)}`}
                className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 shadow-glow transition hover:-translate-y-0.5 hover:border-brand-cyan/50"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{document.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{document.description || 'Contract document record'}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {relatedLead ? `${relatedLead.fullName}${relatedLead.companyName ? ` (${relatedLead.companyName})` : ''}` : 'No client linked'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${approvalTone(document.displayStatus)}`}>
                      {document.displayStatus.replace('_', ' ')}
                    </span>
                    <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                      {document.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                  <p>Client visible: {document.clientVisible ? 'Yes' : 'No'}</p>
                  <p>Viewed: {document.clientViewedAt ? new Date(document.clientViewedAt).toLocaleDateString() : 'Not yet'}</p>
                  <p>Created: {new Date(document.createdAt).toLocaleDateString()}</p>
                  <p>Uploaded by: {document.uploadedByAdmin?.name || document.uploadedByAdmin?.email || 'Not set'}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                  {relatedQuote ? <span>Quote: {relatedQuote.referenceCode}</span> : null}
                  {relatedProject ? <span>Project: {relatedProject.projectCode || relatedProject.title}</span> : null}
                  <span>URL: {document.url}</span>
                </div>
              </Link>
            );
          }) : (
            <AdminFlash tone="warning" message="No contract documents matched the current filters yet." />
          )}
        </div>
      </div>
    </main>
  );
}
