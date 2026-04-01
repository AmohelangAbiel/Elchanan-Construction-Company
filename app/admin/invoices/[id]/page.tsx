import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminSession } from '../../../../lib/auth';
import { AdminFlash } from '../../components/AdminFlash';
import { AdminTopNav } from '../../components/AdminTopNav';
import { prisma } from '../../../../lib/prisma';
import { OPERATIONS_ROLES } from '../../../../lib/permissions';
import { BILLING_TYPE_VALUES, deriveInvoiceStatus, formatCurrency, getOutstandingBalance, INVOICE_STATUS_VALUES } from '../../../../lib/billing';
import { safeRedirectPath } from '../../../../lib/api';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toDateInputValue(value: Date | null | undefined) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function lineItemsToText(input: Array<{ description: string; quantity: number; unitPrice: Prisma.Decimal | number | null; amount: Prisma.Decimal | number }>) {
  return input
    .map((item) => {
      const amount = typeof item.amount === 'number' ? item.amount : Number(item.amount);
      if (item.unitPrice !== null && item.unitPrice !== undefined) {
        const unitPrice = typeof item.unitPrice === 'number' ? item.unitPrice : Number(item.unitPrice);
        return `${item.description} | ${item.quantity} | ${unitPrice}`;
      }
      return `${item.description} | ${amount}`;
    })
    .join('\n');
}

function statusTone(status: string) {
  if (status === 'PAID') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'OVERDUE') return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  if (status === 'PARTIALLY_PAID') return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  if (status === 'ISSUED') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'VOID' || status === 'CANCELLED') return 'border-slate-700 bg-slate-900/80 text-slate-300';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function AdminInvoiceDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(OPERATIONS_ROLES);

  const [invoice, leads, quotes, projects, milestones] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        lead: {
          select: { id: true, fullName: true, companyName: true, email: true },
        },
        quoteRequest: {
          select: { id: true, referenceCode: true, fullName: true, serviceType: true, status: true, leadId: true },
        },
        deliveryProject: {
          select: { id: true, title: true, projectCode: true, status: true, leadId: true },
        },
        projectMilestone: {
          select: {
            id: true,
            title: true,
            deliveryProjectId: true,
            deliveryProject: {
              select: { id: true, title: true, projectCode: true, leadId: true },
            },
          },
        },
        issuedByAdmin: {
          select: { id: true, name: true, email: true },
        },
        payments: {
          where: { deletedAt: null },
          orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            paymentReference: true,
            notes: true,
            method: true,
            recordedByAdmin: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            amount: true,
          },
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
    prisma.projectMilestone.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
      take: 40,
      select: {
        id: true,
        title: true,
        deliveryProject: {
          select: { id: true, title: true, projectCode: true, leadId: true },
        },
      },
    }),
  ]);

  if (!invoice) return notFound();

  const rawReturnTo = firstParam(searchParams?.returnTo);
  const returnTo = safeRedirectPath(rawReturnTo, '/admin/invoices', ['/admin/invoices']);

  const paidTotal = invoice.payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const total = Number(invoice.total || invoice.subtotal || 0);
  const displayStatus = deriveInvoiceStatus({
    status: invoice.status,
    issueDate: invoice.issuedAt,
    dueDate: invoice.dueDate,
    total,
    paidTotal,
  });
  const balance = getOutstandingBalance({ total, paidTotal });
  const lineItemsText = lineItemsToText(invoice.lineItems);

  const selectedLeadId = invoice.leadId || invoice.quoteRequest?.leadId || invoice.deliveryProject?.leadId || invoice.projectMilestone?.deliveryProject?.leadId || '';

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Invoice updated successfully." /> : null}
        {firstParam(searchParams?.paymentRecorded) === '1' ? <AdminFlash message="Payment recorded successfully." /> : null}

        <Link href={returnTo} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan transition hover:text-white">
          <span aria-hidden="true">&larr;</span>
          Back to invoices
        </Link>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Invoice record</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{invoice.invoiceNumber}</h1>
              <p className="mt-2 text-slate-400">{invoice.title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] ${statusTone(displayStatus)}`}>{displayStatus.replace('_', ' ')}</span>
              <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-300">
                {invoice.billingType}
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/admin/invoices/${invoice.id}/document`} className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
              Printable invoice
            </Link>
            <Link href={`/admin/invoices/${invoice.id}/document?print=1`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
              Print / PDF-ready view
            </Link>
            {invoice.quoteRequest ? (
              <Link href={`/admin/quotes/${invoice.quoteRequest.id}`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
                Open linked quote
              </Link>
            ) : null}
            {invoice.deliveryProject ? (
              <Link href={`/admin/projects/${invoice.deliveryProject.id}`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
                Open linked project
              </Link>
            ) : null}
            <a href="#record-payment" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
              Record payment
            </a>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(total)}</p>
            </article>
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Paid</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(paidTotal)}</p>
            </article>
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Balance</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(balance)}</p>
            </article>
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Due date</p>
              <p className="mt-2 text-xl font-semibold text-white">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not set'}</p>
            </article>
          </div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-6">
            <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Invoice context</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
                <p><span className="text-slate-500">Client:</span> {invoice.lead ? `${invoice.lead.fullName}${invoice.lead.companyName ? ` (${invoice.lead.companyName})` : ''}` : 'Not linked'}</p>
                <p><span className="text-slate-500">Client email:</span> {invoice.lead?.email || 'Not linked'}</p>
                <p><span className="text-slate-500">Created by:</span> {invoice.issuedByAdmin?.name || invoice.issuedByAdmin?.email || 'Not set'}</p>
                <p><span className="text-slate-500">Client visible:</span> {invoice.clientVisible ? 'Yes' : 'No'}</p>
                <p><span className="text-slate-500">Issue date:</span> {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString() : 'Draft'}</p>
                <p><span className="text-slate-500">Created:</span> {new Date(invoice.createdAt).toLocaleString()}</p>
                <p><span className="text-slate-500">Paid at:</span> {invoice.paidAt ? new Date(invoice.paidAt).toLocaleString() : 'Not yet paid'}</p>
                <p><span className="text-slate-500">Billing type:</span> {invoice.billingType}</p>
              </div>
            </article>

            <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Line items</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-left text-slate-400">
                      <th className="py-2 pr-4">Description</th>
                      <th className="py-2 pr-4 text-right">Qty</th>
                      <th className="py-2 pr-4 text-right">Unit</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lineItems.length ? invoice.lineItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-800/40">
                        <td className="py-3 pr-4 text-slate-200">{item.description}</td>
                        <td className="py-3 pr-4 text-right text-slate-300">{item.quantity}</td>
                        <td className="py-3 pr-4 text-right text-slate-300">{item.unitPrice !== null ? formatCurrency(Number(item.unitPrice)) : '-'}</td>
                        <td className="py-3 text-right text-slate-200">{formatCurrency(Number(item.amount))}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="py-4 text-slate-400">No line items recorded yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Payment history</p>
              <div className="mt-4 space-y-3">
                {invoice.payments.length ? invoice.payments.map((payment) => (
                  <article key={payment.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{formatCurrency(Number(payment.amount))}</p>
                      <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-300">{payment.method}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
                      <p>Date: {new Date(payment.paymentDate).toLocaleString()}</p>
                      <p>Reference: {payment.paymentReference || 'None'}</p>
                      <p>Recorded by: {payment.recordedByAdmin?.name || payment.recordedByAdmin?.email || 'System'}</p>
                    </div>
                    {payment.notes ? <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{payment.notes}</p> : null}
                  </article>
                )) : (
                  <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">No payments recorded yet.</p>
                )}
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Update invoice</p>
              <form action={`/api/admin/invoices/${invoice.id}`} method="post" className="mt-6 space-y-5">
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Title</span>
                  <input name="title" defaultValue={invoice.title} required className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Description</span>
                  <textarea name="description" defaultValue={invoice.description || ''} rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue={invoice.status} className="interactive-input mt-2">
                    {INVOICE_STATUS_VALUES.map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Billing type</span>
                  <select name="billingType" defaultValue={invoice.billingType} className="interactive-input mt-2">
                    {BILLING_TYPE_VALUES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Lead</span>
                  <select name="leadId" defaultValue={selectedLeadId} className="interactive-input mt-2">
                    <option value="">Auto-detect from linked quote/project</option>
                    {leads.map((lead) => (
                      <option key={lead.id} value={lead.id}>{lead.fullName} {lead.companyName ? `(${lead.companyName})` : ''}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Quote</span>
                  <select name="quoteRequestId" defaultValue={invoice.quoteRequest?.id || ''} className="interactive-input mt-2">
                    <option value="">No quote link</option>
                    {quotes.map((quote) => (
                      <option key={quote.id} value={quote.id}>{quote.referenceCode} - {quote.fullName}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Project</span>
                  <select name="deliveryProjectId" defaultValue={invoice.deliveryProject?.id || ''} className="interactive-input mt-2">
                    <option value="">No project link</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.title} {project.projectCode ? `(${project.projectCode})` : ''}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Milestone</span>
                  <select name="projectMilestoneId" defaultValue={invoice.projectMilestone?.id || ''} className="interactive-input mt-2">
                    <option value="">No milestone link</option>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>{milestone.title} {milestone.deliveryProject ? `- ${milestone.deliveryProject.title}` : ''}</option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Issued date</span>
                    <input name="issuedAt" type="date" defaultValue={toDateInputValue(invoice.issuedAt)} className="interactive-input mt-2" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Due date</span>
                    <input name="dueDate" type="date" defaultValue={toDateInputValue(invoice.dueDate)} className="interactive-input mt-2" />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Subtotal</span>
                    <input name="subtotal" type="number" min={0} step="0.01" defaultValue={invoice.subtotal ? Number(invoice.subtotal) : ''} className="interactive-input mt-2" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Tax</span>
                    <input name="tax" type="number" min={0} step="0.01" defaultValue={invoice.tax ? Number(invoice.tax) : ''} className="interactive-input mt-2" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Total</span>
                    <input name="total" type="number" min={0} step="0.01" defaultValue={invoice.total ? Number(invoice.total) : ''} className="interactive-input mt-2" />
                  </label>
                </div>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Line items</span>
                  <textarea name="lineItemsText" rows={5} defaultValue={lineItemsText} className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Notes</span>
                  <textarea name="notes" rows={3} defaultValue={invoice.notes || ''} className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Payment instructions</span>
                  <textarea name="paymentInstructions" rows={3} defaultValue={invoice.paymentInstructions || ''} className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Footer note</span>
                  <textarea name="footerNote" rows={3} defaultValue={invoice.footerNote || ''} className="interactive-input mt-2" />
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="hidden" name="clientVisible" value="false" />
                  <input type="checkbox" name="clientVisible" value="true" defaultChecked={invoice.clientVisible} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                  Make visible in the client portal
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button type="submit" name="action" value="SAVE" className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
                    Save invoice
                  </button>
                  <button type="submit" name="action" value="ISSUE" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
                    Issue invoice
                  </button>
                  <button type="submit" name="action" value="VOID" className="rounded-full border border-rose-400/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-rose-200 transition hover:bg-rose-500/10">
                    Void invoice
                  </button>
                  <button type="submit" name="action" value="CANCEL" className="rounded-full border border-amber-400/40 px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200 transition hover:bg-amber-500/10">
                    Cancel invoice
                  </button>
                </div>
              </form>
            </article>

            <article id="record-payment" className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Record payment</p>
              <form action="/api/admin/payments" method="post" className="mt-6 space-y-5">
                <input type="hidden" name="invoiceId" value={invoice.id} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Amount</span>
                  <input name="amount" type="number" min={0.01} step="0.01" className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Payment date</span>
                  <input name="paymentDate" type="date" className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Method</span>
                  <select name="method" defaultValue="BANK_TRANSFER" className="interactive-input mt-2">
                    {['BANK_TRANSFER', 'CASH', 'CARD', 'OTHER'].map((method) => (
                      <option key={method} value={method}>{method.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Reference</span>
                  <input name="paymentReference" className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Payment notes</span>
                  <textarea name="notes" rows={3} className="interactive-input mt-2" />
                </label>
                <button type="submit" className="btn-primary w-full">
                  Record payment
                </button>
              </form>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
