import Link from 'next/link';
import { requirePortalSession } from '../../../../lib/portal-auth';
import { getPortalInvoiceOwnershipFilter } from '../../../../lib/portal';
import { prisma } from '../../../../lib/prisma';
import { PortalContactActions } from '../components/PortalContactActions';
import { deriveInvoiceStatus, formatCurrency, getOutstandingBalance } from '../../../../lib/billing';

export const dynamic = 'force-dynamic';

function statusTone(status: string) {
  if (status === 'PAID') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'OVERDUE') return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  if (status === 'PARTIALLY_PAID') return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  if (status === 'ISSUED') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'VOID' || status === 'CANCELLED') return 'border-slate-700 bg-slate-900/80 text-slate-300';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function PortalInvoicesPage() {
  const session = await requirePortalSession();

  if (!session.leadId) {
    return (
      <section className="space-y-6">
        <article className="rounded-[2rem] border border-amber-300/25 bg-amber-400/10 p-6 text-sm text-amber-100">
          Invoices are not visible yet because your portal account is not linked to a client record.
        </article>
        <PortalContactActions title="Need your billing records linked?" />
      </section>
    );
  }

  const invoices = await prisma.invoice.findMany({
    where: {
      deletedAt: null,
      clientVisible: true,
      ...getPortalInvoiceOwnershipFilter(session.leadId),
    },
    orderBy: [{ issuedAt: 'desc' }, { createdAt: 'desc' }],
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
      projectMilestone: {
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
              deletedAt: true,
              portalVisible: true,
            },
          },
        },
      },
      payments: {
        where: { deletedAt: null },
        orderBy: { paymentDate: 'desc' },
        select: { amount: true, paymentDate: true },
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
      paidTotal,
      totalValue: total,
      balance: getOutstandingBalance({ total, paidTotal }),
      displayStatus,
    };
  });

  const totals = {
    count: invoiceSummaries.length,
    outstandingBalance: invoiceSummaries.reduce((sum, invoice) => sum + invoice.balance, 0),
    overdue: invoiceSummaries.filter((invoice) => invoice.displayStatus === 'OVERDUE').length,
    paid: invoiceSummaries.filter((invoice) => invoice.displayStatus === 'PAID').length,
  };

  return (
    <section className="space-y-6">
      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Billing center</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Your invoices</h1>
        <p className="mt-3 text-sm text-slate-400">
          View issued invoices, check balances, and open print-ready billing documents.
        </p>
      </article>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Invoices visible</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totals.count}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Outstanding balance</p>
          <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(totals.outstandingBalance)}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Overdue</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totals.overdue}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Paid</p>
          <p className="mt-2 text-3xl font-semibold text-white">{totals.paid}</p>
        </article>
      </section>

      <section className="grid gap-4">
        {invoiceSummaries.length ? invoiceSummaries.map((invoice) => {
          const relatedProject = invoice.deliveryProject &&
            !invoice.deliveryProject.deletedAt &&
            invoice.deliveryProject.portalVisible &&
            invoice.deliveryProject.leadId === session.leadId
            ? invoice.deliveryProject
            : null;

          const relatedMilestone = invoice.projectMilestone &&
            invoice.projectMilestone.deliveryProject &&
            !invoice.projectMilestone.deliveryProject.deletedAt &&
            invoice.projectMilestone.deliveryProject.portalVisible &&
            invoice.projectMilestone.deliveryProject.leadId === session.leadId
            ? invoice.projectMilestone
            : null;

          const relatedQuote = invoice.quoteRequest &&
            !invoice.quoteRequest.deletedAt &&
            invoice.quoteRequest.leadId === session.leadId
            ? invoice.quoteRequest
            : null;

          return (
            <Link
              key={invoice.id}
              href={`/portal/invoices/${invoice.id}`}
              className="interactive-card rounded-[2rem] p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{invoice.invoiceNumber}</p>
                  <p className="mt-1 text-sm text-slate-300">{invoice.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                    {invoice.billingType.replace('_', ' ')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.14em] ${statusTone(invoice.displayStatus)}`}>
                    {invoice.displayStatus.replace('_', ' ')}
                  </span>
                  {invoice.billingType !== 'OTHER' ? (
                    <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-300">
                      {invoice.billingType}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-2 xl:grid-cols-4">
                <p>Issue date: {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : 'Draft'}</p>
                <p>Due date: {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not set'}</p>
                <p>Total: {formatCurrency(invoice.totalValue)}</p>
                <p>Balance: {formatCurrency(invoice.balance)}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                {relatedQuote ? <span>Quote: {relatedQuote.referenceCode}</span> : null}
                {relatedProject ? <span>Project: {relatedProject.projectCode || relatedProject.title}</span> : null}
                {relatedMilestone ? <span>Milestone: {relatedMilestone.title}</span> : null}
              </div>
            </Link>
          );
        }) : (
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 text-sm text-slate-400 shadow-glow">
            No invoices are visible yet. Once a quotation is approved and billing is issued, records will appear here.
          </article>
        )}
      </section>

      <PortalContactActions title="Need help with an invoice?" />
    </section>
  );
}
