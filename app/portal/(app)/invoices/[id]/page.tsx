import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalSession } from '../../../../../lib/portal-auth';
import { getPortalInvoiceOwnershipFilter } from '../../../../../lib/portal';
import { prisma } from '../../../../../lib/prisma';
import { PortalContactActions } from '../../components/PortalContactActions';
import { PortalApprovalTracker } from '../../components/PortalApprovalTracker';
import { deriveInvoiceStatus, formatCurrency, getOutstandingBalance } from '../../../../../lib/billing';

export const dynamic = 'force-dynamic';

function statusTone(status: string) {
  if (status === 'PAID') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'OVERDUE') return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  if (status === 'PARTIALLY_PAID') return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  if (status === 'ISSUED') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'VOID' || status === 'CANCELLED') return 'border-slate-700 bg-slate-900/80 text-slate-300';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function PortalInvoiceDetailPage({ params }: { params: { id: string } }) {
  const session = await requirePortalSession();

  if (!session.leadId) return notFound();

  const invoice = await prisma.invoice.findFirst({
    where: {
      id: params.id,
      deletedAt: null,
      clientVisible: true,
      ...getPortalInvoiceOwnershipFilter(session.leadId),
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
      clientViewedByClientUser: {
        select: {
          id: true,
          fullName: true,
          displayName: true,
        },
      },
      issuedByAdmin: {
        select: {
          id: true,
          name: true,
          email: true,
        },
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
  });

  if (!invoice) return notFound();

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

  return (
    <section className="space-y-6">
      <PortalApprovalTracker endpoint={`/api/portal/invoices/${invoice.id}/view`} returnTo={`/portal/invoices/${invoice.id}`} />

      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Invoice detail</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">{invoice.invoiceNumber}</h1>
            <p className="mt-2 text-sm text-slate-400">{invoice.title}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.16em] ${statusTone(displayStatus)}`}>
              {displayStatus.replace('_', ' ')}
            </span>
            <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-4 py-2 text-xs uppercase tracking-[0.16em] text-slate-300">
              {invoice.billingType.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/portal/invoices" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
            Back to invoices
          </Link>
          <Link href={`/portal/invoices/${invoice.id}/document`} className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
            Printable invoice
          </Link>
          <Link href={`/portal/invoices/${invoice.id}/document?print=1`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
            Print / Save PDF
          </Link>
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
      </article>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-6">
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Billing context</p>
            <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p><span className="text-slate-500">Client:</span> {invoice.lead ? `${invoice.lead.fullName}${invoice.lead.companyName ? ` (${invoice.lead.companyName})` : ''}` : 'Not linked'}</p>
              <p><span className="text-slate-500">Client email:</span> {invoice.lead?.email || 'Not linked'}</p>
              <p><span className="text-slate-500">Issue date:</span> {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleString() : 'Draft'}</p>
              <p><span className="text-slate-500">Created:</span> {new Date(invoice.createdAt).toLocaleString()}</p>
              <p><span className="text-slate-500">Created by:</span> {invoice.issuedByAdmin?.name || invoice.issuedByAdmin?.email || 'Not set'}</p>
              <p><span className="text-slate-500">Client visible:</span> {invoice.clientVisible ? 'Yes' : 'No'}</p>
              <p><span className="text-slate-500">Viewed at:</span> {invoice.clientViewedAt ? new Date(invoice.clientViewedAt).toLocaleString() : 'Not yet viewed'}</p>
              <p><span className="text-slate-500">Viewed by:</span> {invoice.clientViewedByClientUser ? invoice.clientViewedByClientUser.displayName || invoice.clientViewedByClientUser.fullName : 'N/A'}</p>
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
        </div>

        <div className="space-y-6">
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Payment history</p>
            <div className="mt-4 space-y-3">
              {invoice.payments.length ? invoice.payments.map((payment) => (
                <article key={payment.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{formatCurrency(Number(payment.amount))}</p>
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-300">
                      {payment.method.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs text-slate-400 sm:grid-cols-2">
                    <p>Date: {new Date(payment.paymentDate).toLocaleString()}</p>
                    <p>Reference: {payment.paymentReference || 'None'}</p>
                  </div>
                  {payment.notes ? <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{payment.notes}</p> : null}
                </article>
              )) : (
                <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">No payments recorded yet.</p>
              )}
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Scope links</p>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p><span className="text-slate-500">Quote:</span> {invoice.quoteRequest ? invoice.quoteRequest.referenceCode : 'Not linked'}</p>
              <p><span className="text-slate-500">Project:</span> {relatedProject ? relatedProject.projectCode || relatedProject.title : 'Not linked'}</p>
              <p><span className="text-slate-500">Milestone:</span> {relatedMilestone ? relatedMilestone.title : 'Not linked'}</p>
              <p><span className="text-slate-500">Billing type:</span> {invoice.billingType.replace('_', ' ')}</p>
            </div>
          </article>

          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Invoice notes</p>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Description</p>
                <p className="mt-2 whitespace-pre-line">{invoice.description || 'No description provided.'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Payment instructions</p>
                <p className="mt-2 whitespace-pre-line">{invoice.paymentInstructions || 'Payment instructions will be shared by the team.'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Footer note</p>
                <p className="mt-2 whitespace-pre-line">{invoice.footerNote || 'Thank you for your business.'}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <PortalContactActions title="Need to discuss this invoice?" />
    </section>
  );
}
