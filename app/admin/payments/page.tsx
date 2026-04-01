import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { requireAdminSession } from '../../../lib/auth';
import { AdminFlash } from '../components/AdminFlash';
import { AdminTopNav } from '../components/AdminTopNav';
import { prisma } from '../../../lib/prisma';
import { OPERATIONS_ROLES } from '../../../lib/permissions';
import { formatCurrency, getOutstandingBalance, deriveInvoiceStatus, PAYMENT_METHOD_VALUES } from '../../../lib/billing';

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

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(OPERATIONS_ROLES);

  const selectedMethod = firstParam(searchParams?.method);
  const selectedLeadId = firstParam(searchParams?.leadId);
  const selectedInvoiceId = firstParam(searchParams?.invoiceId);
  const dateFromRaw = firstParam(searchParams?.from);
  const dateToRaw = firstParam(searchParams?.to);

  const dateFrom = parseDateInput(dateFromRaw);
  const dateTo = parseDateInput(dateToRaw, true);

  const [leads, invoicesForFilters] = await Promise.all([
    prisma.lead.findMany({
      where: { deletedAt: null },
      orderBy: [{ createdAt: 'desc' }],
      take: 40,
      select: { id: true, fullName: true, companyName: true },
    }),
    prisma.invoice.findMany({
      where: { deletedAt: null },
      orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
      take: 80,
      select: {
        id: true,
        invoiceNumber: true,
        title: true,
        leadId: true,
      },
    }),
  ]);

  const validLeadId = selectedLeadId && leads.some((lead) => lead.id === selectedLeadId) ? selectedLeadId : undefined;
  const validInvoiceId = selectedInvoiceId && invoicesForFilters.some((invoice) => invoice.id === selectedInvoiceId) ? selectedInvoiceId : undefined;

  const where: Prisma.PaymentWhereInput = {
    deletedAt: null,
  };

  if (selectedMethod && PAYMENT_METHOD_VALUES.includes(selectedMethod as (typeof PAYMENT_METHOD_VALUES)[number])) {
    where.method = selectedMethod as (typeof PAYMENT_METHOD_VALUES)[number];
  }

  if (validInvoiceId) {
    where.invoiceId = validInvoiceId;
  }

  if (validLeadId) {
    where.invoice = {
      leadId: validLeadId,
    };
  }

  if (dateFrom || dateTo) {
    where.paymentDate = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
    take: 60,
    include: {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          title: true,
          status: true,
          dueDate: true,
          issuedAt: true,
          total: true,
          subtotal: true,
          lead: {
            select: { id: true, fullName: true, companyName: true, email: true },
          },
          payments: {
            where: { deletedAt: null },
            select: { amount: true },
          },
        },
      },
      recordedByAdmin: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const paymentSummaries = payments.map((payment) => {
    const invoiceTotal = Number(payment.invoice.total || payment.invoice.subtotal || 0);
    const paidTotal = payment.invoice.payments.reduce((sum, item) => sum + Number(item.amount), 0);
    const displayStatus = deriveInvoiceStatus({
      status: payment.invoice.status,
      issueDate: payment.invoice.issuedAt,
      dueDate: payment.invoice.dueDate,
      total: invoiceTotal,
      paidTotal,
      now: payment.paymentDate,
    });

    return {
      ...payment,
      invoiceTotal,
      paidTotal,
      balance: getOutstandingBalance({ total: invoiceTotal, paidTotal }),
      displayStatus,
    };
  });

  const totals = {
    count: paymentSummaries.length,
    received: paymentSummaries.reduce((sum, payment) => sum + Number(payment.amount), 0),
    invoicesWithPayments: new Set(paymentSummaries.map((payment) => payment.invoice.id)).size,
    overdueInvoices: await prisma.invoice.count({
      where: {
        deletedAt: null,
        status: 'OVERDUE',
      },
    }),
  };

  const queryParams = new URLSearchParams();
  if (selectedMethod) queryParams.set('method', selectedMethod);
  if (validLeadId) queryParams.set('leadId', validLeadId);
  if (validInvoiceId) queryParams.set('invoiceId', validInvoiceId);
  if (dateFromRaw) queryParams.set('from', dateFromRaw);
  if (dateToRaw) queryParams.set('to', dateToRaw);
  const returnTo = queryParams.toString() ? `/admin/payments?${queryParams.toString()}` : '/admin/payments';

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.paymentRecorded) === '1' ? <AdminFlash message="Payment recorded successfully." /> : null}

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Payments</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Payment tracking and receipts</h1>
          <p className="mt-3 text-slate-400">
            Review recent receipts, filter by client or invoice, and record manual payments against issued invoices.
          </p>
        </div>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Recorded payments</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totals.count}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Received</p>
            <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(totals.received)}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Invoices touched</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totals.invoicesWithPayments}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Overdue invoices</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totals.overdueInvoices}</p>
          </article>
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Method</span>
              <select name="method" defaultValue={selectedMethod || ''} className="interactive-input mt-2">
                <option value="">All methods</option>
                {PAYMENT_METHOD_VALUES.map((method) => (
                  <option key={method} value={method}>{method.replace('_', ' ')}</option>
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
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Invoice</span>
              <select name="invoiceId" defaultValue={validInvoiceId || ''} className="interactive-input mt-2">
                <option value="">All invoices</option>
                {invoicesForFilters.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} - {invoice.title}</option>
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
              <Link href="/admin/payments" className="btn-ghost px-5 py-2.5 text-xs uppercase tracking-[0.16em]">Reset</Link>
            </div>
          </form>
        </section>

        <details className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <summary className="cursor-pointer list-none text-xl font-semibold text-white">Record payment</summary>
          <form action="/api/admin/payments" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Invoice</span>
              <select name="invoiceId" required className="interactive-input mt-2">
                <option value="">Select invoice</option>
                {invoicesForFilters.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} - {invoice.title}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Amount</span>
              <input name="amount" type="number" min={0.01} step="0.01" required className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Payment date</span>
              <input name="paymentDate" type="date" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Method</span>
              <select name="method" defaultValue="BANK_TRANSFER" className="interactive-input mt-2">
                {PAYMENT_METHOD_VALUES.map((method) => (
                  <option key={method} value={method}>{method.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Reference</span>
              <input name="paymentReference" className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Notes</span>
              <textarea name="notes" rows={3} className="interactive-input mt-2" />
            </label>
            <button type="submit" className="btn-primary px-5 py-2.5 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
              Record payment
            </button>
          </form>
        </details>

        <div className="grid gap-4">
          {paymentSummaries.length ? paymentSummaries.map((payment) => (
            <Link
              key={payment.id}
              href={`/admin/invoices/${payment.invoice.id}?returnTo=${encodeURIComponent(returnTo)}`}
              className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 shadow-glow transition hover:-translate-y-0.5 hover:border-brand-cyan/50"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{formatCurrency(Number(payment.amount))}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    {payment.invoice.invoiceNumber} - {payment.invoice.title}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {payment.invoice.lead ? `${payment.invoice.lead.fullName}${payment.invoice.lead.companyName ? ` (${payment.invoice.lead.companyName})` : ''}` : 'No client linked'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(payment.displayStatus)}`}>
                    {payment.displayStatus.replace('_', ' ')}
                  </span>
                  <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                    {payment.method.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                <p>Date: {new Date(payment.paymentDate).toLocaleString()}</p>
                <p>Reference: {payment.paymentReference || 'None'}</p>
                <p>Balance after: {formatCurrency(payment.balance)}</p>
                <p>Recorded by: {payment.recordedByAdmin?.name || payment.recordedByAdmin?.email || 'System'}</p>
              </div>
            </Link>
          )) : (
            <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 text-sm text-slate-400 shadow-glow">
              No payments matched the current filters yet. Record a payment or widen the filters to review older receipts.
            </article>
          )}
        </div>
      </div>
    </main>
  );
}
