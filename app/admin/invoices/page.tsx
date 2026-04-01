import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { requireAdminSession } from '../../../lib/auth';
import { AdminFlash } from '../components/AdminFlash';
import { AdminTopNav } from '../components/AdminTopNav';
import { prisma } from '../../../lib/prisma';
import { OPERATIONS_ROLES } from '../../../lib/permissions';
import { BILLING_TYPE_VALUES, deriveInvoiceStatus, formatCurrency, getOutstandingBalance, INVOICE_STATUS_VALUES } from '../../../lib/billing';
import { INVOICE_STATUSES, BILLING_TYPES } from '../../../lib/constants';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;

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

function statusTone(status: string) {
  if (status === 'PAID') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'OVERDUE') return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  if (status === 'PARTIALLY_PAID') return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  if (status === 'ISSUED') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'VOID' || status === 'CANCELLED') return 'border-slate-700 bg-slate-900/80 text-slate-300';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(OPERATIONS_ROLES);

  const selectedStatus = firstParam(searchParams?.status);
  const selectedBillingType = firstParam(searchParams?.billingType);
  const selectedLeadId = firstParam(searchParams?.leadId);
  const selectedProjectId = firstParam(searchParams?.projectId);
  const selectedQuoteId = firstParam(searchParams?.quoteId);
  const selectedMilestoneId = firstParam(searchParams?.milestoneId);
  const dateFromRaw = firstParam(searchParams?.from);
  const dateToRaw = firstParam(searchParams?.to);

  const dateFrom = parseDateInput(dateFromRaw);
  const dateTo = parseDateInput(dateToRaw, true);

  const [leads, quotes, projects, milestones] = await Promise.all([
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
      select: { id: true, referenceCode: true, fullName: true, serviceType: true, status: true, leadId: true },
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
    prisma.projectMilestone.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
      take: 40,
      select: {
        id: true,
        title: true,
        deliveryProjectId: true,
        deliveryProject: {
          select: {
            id: true,
            title: true,
            projectCode: true,
            leadId: true,
          },
        },
      },
    }),
  ]);

  const validLeadId = selectedLeadId && leads.some((lead) => lead.id === selectedLeadId) ? selectedLeadId : undefined;
  const validProjectId = selectedProjectId && projects.some((project) => project.id === selectedProjectId) ? selectedProjectId : undefined;
  const validQuoteId = selectedQuoteId && quotes.some((quote) => quote.id === selectedQuoteId) ? selectedQuoteId : undefined;
  const validMilestoneId = selectedMilestoneId && milestones.some((milestone) => milestone.id === selectedMilestoneId) ? selectedMilestoneId : undefined;

  const where: Prisma.InvoiceWhereInput = {
    deletedAt: null,
  };

  if (selectedStatus && INVOICE_STATUSES.includes(selectedStatus as (typeof INVOICE_STATUSES)[number])) {
    where.status = selectedStatus as (typeof INVOICE_STATUSES)[number];
  }

  if (selectedBillingType && BILLING_TYPES.includes(selectedBillingType as (typeof BILLING_TYPES)[number])) {
    where.billingType = selectedBillingType as (typeof BILLING_TYPES)[number];
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

  if (validMilestoneId) {
    where.projectMilestoneId = validMilestoneId;
  }

  if (dateFrom || dateTo) {
    where.issuedAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const invoices = await prisma.invoice.findMany({
    where,
    orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
    take: 40,
    include: {
      lead: {
        select: { id: true, fullName: true, companyName: true, email: true },
      },
      quoteRequest: {
        select: { id: true, referenceCode: true, serviceType: true, status: true },
      },
      deliveryProject: {
        select: { id: true, title: true, projectCode: true, status: true },
      },
      projectMilestone: {
        select: { id: true, title: true },
      },
      payments: {
        where: { deletedAt: null },
        orderBy: { paymentDate: 'desc' },
        select: { amount: true, paymentDate: true, paymentReference: true, method: true },
      },
      lineItems: {
        orderBy: { sortOrder: 'asc' },
        select: { id: true, description: true, quantity: true, unitPrice: true, amount: true },
      },
    },
  });

  const invoiceSummaries = invoices.map((invoice) => {
    const paidTotal = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const total = Number(invoice.total || invoice.subtotal || 0);
    const displayStatus = deriveInvoiceStatus({
      status: invoice.status,
      issueDate: invoice.issuedAt,
      dueDate: invoice.dueDate,
      total,
      paidTotal,
    });

    return {
      ...invoice,
      displayStatus,
      paidTotal,
      balance: getOutstandingBalance({ total, paidTotal }),
      totalValue: total,
    };
  });

  const totals = {
    total: invoiceSummaries.length,
    paid: invoiceSummaries.filter((invoice) => invoice.displayStatus === 'PAID').length,
    overdue: invoiceSummaries.filter((invoice) => invoice.displayStatus === 'OVERDUE').length,
    outstanding: invoiceSummaries.filter((invoice) => invoice.displayStatus === 'ISSUED' || invoice.displayStatus === 'PARTIALLY_PAID' || invoice.displayStatus === 'OVERDUE').length,
  };

  const queryParams = new URLSearchParams();
  if (selectedStatus) queryParams.set('status', selectedStatus);
  if (selectedBillingType) queryParams.set('billingType', selectedBillingType);
  if (validLeadId) queryParams.set('leadId', validLeadId);
  if (validProjectId) queryParams.set('projectId', validProjectId);
  if (validQuoteId) queryParams.set('quoteId', validQuoteId);
  if (validMilestoneId) queryParams.set('milestoneId', validMilestoneId);
  if (dateFromRaw) queryParams.set('from', dateFromRaw);
  if (dateToRaw) queryParams.set('to', dateToRaw);
  const returnTo = queryParams.toString() ? `/admin/invoices?${queryParams.toString()}` : '/admin/invoices';

  const selectedQuote = validQuoteId ? quotes.find((quote) => quote.id === validQuoteId) || null : null;
  const selectedProject = validProjectId ? projects.find((project) => project.id === validProjectId) || null : null;
  const selectedMilestone = validMilestoneId ? (milestones.find((milestone) => milestone.id === validMilestoneId) || null) : null;
  const selectedLead = validLeadId ? leads.find((lead) => lead.id === validLeadId) || null : null;

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.created) === '1' ? <AdminFlash message="Invoice created successfully." /> : null}
        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Invoice updated successfully." /> : null}
        {firstParam(searchParams?.paymentRecorded) === '1' ? <AdminFlash message="Payment recorded successfully." /> : null}

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Invoices</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Billing and payment management</h1>
          <p className="mt-3 text-slate-400">
            Issue invoices, record payments, and keep deposit, milestone, and final billing tied to the right client record.
          </p>
        </div>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total invoices</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totals.total}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Outstanding</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totals.outstanding}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Overdue</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totals.overdue}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Paid</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totals.paid}</p>
          </article>
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select name="status" defaultValue={selectedStatus || ''} className="interactive-input mt-2">
                <option value="">All statuses</option>
                {INVOICE_STATUS_VALUES.map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Billing type</span>
              <select name="billingType" defaultValue={selectedBillingType || ''} className="interactive-input mt-2">
                <option value="">All billing types</option>
                {BILLING_TYPE_VALUES.map((type) => (
                  <option key={type} value={type}>{type}</option>
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
              <Link href="/admin/invoices" className="btn-ghost px-5 py-2.5 text-xs uppercase tracking-[0.16em]">Reset</Link>
            </div>
          </form>
        </section>

        <details className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <summary className="cursor-pointer list-none text-xl font-semibold text-white">Create invoice</summary>
          <form action="/api/admin/invoices" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="block">
              <span className="text-sm font-semibold text-white">Title</span>
              <input name="title" required defaultValue={selectedQuote ? `${selectedQuote.referenceCode} invoice` : ''} className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Billing type</span>
              <select name="billingType" defaultValue="DEPOSIT" className="interactive-input mt-2">
                {BILLING_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Description</span>
              <textarea name="description" rows={3} className="interactive-input mt-2" placeholder="Short summary for the client-facing invoice title block." />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Lead</span>
              <select name="leadId" defaultValue={validLeadId || selectedQuote?.leadId || selectedProject?.leadId || ''} className="interactive-input mt-2">
                <option value="">Auto-detect from linked quote/project</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>{lead.fullName} {lead.companyName ? `(${lead.companyName})` : ''}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Quote</span>
              <select name="quoteRequestId" defaultValue={validQuoteId || selectedQuote?.id || ''} className="interactive-input mt-2">
                <option value="">No quote link</option>
                {quotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>{quote.referenceCode} - {quote.fullName}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Project</span>
              <select name="deliveryProjectId" defaultValue={validProjectId || selectedProject?.id || ''} className="interactive-input mt-2">
                <option value="">No project link</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title} {project.projectCode ? `(${project.projectCode})` : ''}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Milestone</span>
              <select name="projectMilestoneId" defaultValue={validMilestoneId || selectedMilestone?.id || ''} className="interactive-input mt-2">
                <option value="">No milestone link</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>{milestone.title} {milestone.deliveryProject ? `- ${milestone.deliveryProject.title}` : ''}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Status</span>
              <select name="status" defaultValue="DRAFT" className="interactive-input mt-2">
                {['DRAFT', 'ISSUED', 'VOID', 'CANCELLED'].map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Issued date</span>
              <input name="issuedAt" type="date" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Due date</span>
              <input name="dueDate" type="date" className="interactive-input mt-2" />
            </label>
            <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
              <label className="block">
                <span className="text-sm font-semibold text-white">Subtotal</span>
                <input name="subtotal" type="number" min={0} step="0.01" className="interactive-input mt-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white">Tax</span>
                <input name="tax" type="number" min={0} step="0.01" className="interactive-input mt-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white">Total</span>
                <input name="total" type="number" min={0} step="0.01" className="interactive-input mt-2" />
              </label>
            </div>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Line items</span>
              <textarea
                name="lineItemsText"
                rows={5}
                className="interactive-input mt-2"
                placeholder="Excavation works | 1 | 5000&#10;Materials | 1 | 10000"
              />
              <p className="mt-2 text-xs text-slate-400">Use `Description | Amount` or `Description | Qty | Unit Price` per line.</p>
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Notes</span>
              <textarea name="notes" rows={3} className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Payment instructions</span>
              <textarea name="paymentInstructions" rows={3} className="interactive-input mt-2" placeholder="Banking details, EFT reference instructions, or payment due note." />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Footer note</span>
              <textarea name="footerNote" rows={3} className="interactive-input mt-2" />
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300 lg:col-span-2">
              <input type="hidden" name="clientVisible" value="false" />
              <input type="checkbox" name="clientVisible" value="true" className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
              Make visible to client portal once issued
            </label>
            <button type="submit" className="btn-primary px-5 py-2.5 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
              Create invoice
            </button>
          </form>
        </details>

        <div className="grid gap-4">
          {invoiceSummaries.length ? invoiceSummaries.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/admin/invoices/${invoice.id}?returnTo=${encodeURIComponent(returnTo)}`}
              className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 shadow-glow transition hover:-translate-y-0.5 hover:border-brand-cyan/50"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{invoice.invoiceNumber}</p>
                  <p className="mt-1 text-sm text-slate-400">{invoice.title}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {invoice.lead ? `${invoice.lead.fullName}${invoice.lead.companyName ? ` (${invoice.lead.companyName})` : ''}` : 'No client'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(invoice.displayStatus)}`}>
                    {invoice.displayStatus.replace('_', ' ')}
                  </span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                    {invoice.billingType}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                <p>Issue date: {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : 'Draft'}</p>
                <p>Due date: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not set'}</p>
                <p>Total: {formatCurrency(invoice.totalValue)}</p>
                <p>Balance: {formatCurrency(invoice.balance)}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                {invoice.quoteRequest ? <span>Quote: {invoice.quoteRequest.referenceCode}</span> : null}
                {invoice.deliveryProject ? <span>Project: {invoice.deliveryProject.projectCode || invoice.deliveryProject.title}</span> : null}
                {invoice.projectMilestone ? <span>Milestone: {invoice.projectMilestone.title}</span> : null}
                <span>Payments: {invoice.payments.length}</span>
              </div>
            </Link>
          )) : (
            <AdminFlash tone="warning" message="No invoices matched the current filters yet." />
          )}
        </div>
      </div>
    </main>
  );
}
