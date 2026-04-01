import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalSession } from '../../../../../../lib/portal-auth';
import { getCompanyProfile } from '../../../../../../lib/content';
import { getPortalInvoiceOwnershipFilter } from '../../../../../../lib/portal';
import { prisma } from '../../../../../../lib/prisma';
import { PortalApprovalTracker } from '../../../components/PortalApprovalTracker';
import { deriveInvoiceStatus, formatCurrency, getOutstandingBalance } from '../../../../../../lib/billing';

type PageProps = {
  params: { id: string };
  searchParams?: { print?: string };
};

export const dynamic = 'force-dynamic';

function paymentMethodLabel(value: string) {
  return value.replace('_', ' ');
}

export default async function PortalInvoiceDocumentPage({ params, searchParams }: PageProps) {
  const session = await requirePortalSession();
  if (!session.leadId) return notFound();

  const [invoice, profile] = await Promise.all([
    prisma.invoice.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
        clientVisible: true,
        ...getPortalInvoiceOwnershipFilter(session.leadId),
      },
      include: {
        lead: {
          select: { id: true, fullName: true, companyName: true, email: true },
        },
        quoteRequest: {
          select: { id: true, referenceCode: true, serviceType: true, status: true },
        },
        deliveryProject: {
          select: { id: true, title: true, projectCode: true, status: true, leadId: true, deletedAt: true, portalVisible: true },
        },
        projectMilestone: {
          select: {
            id: true,
            title: true,
            deliveryProject: {
              select: { id: true, title: true, projectCode: true, leadId: true, deletedAt: true, portalVisible: true },
            },
          },
        },
        issuedByAdmin: {
          select: { id: true, name: true, email: true },
        },
        payments: {
          where: { deletedAt: null },
          orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
          select: { id: true, amount: true, paymentDate: true, paymentReference: true, notes: true, method: true },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
          select: { id: true, description: true, quantity: true, unitPrice: true, amount: true },
        },
      },
    }),
    getCompanyProfile(),
  ]);

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
  const companyName = profile?.displayName || profile?.companyName || 'Elchanan Construction Company';

  const relatedProject =
    invoice.deliveryProject &&
    !invoice.deliveryProject.deletedAt &&
    invoice.deliveryProject.portalVisible &&
    invoice.deliveryProject.leadId === session.leadId
      ? invoice.deliveryProject
      : null;

  const relatedMilestone =
    invoice.projectMilestone &&
    invoice.projectMilestone.deliveryProject &&
    !invoice.projectMilestone.deliveryProject.deletedAt &&
    invoice.projectMilestone.deliveryProject.portalVisible &&
    invoice.projectMilestone.deliveryProject.leadId === session.leadId
      ? invoice.projectMilestone
      : null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 print:bg-white print:px-0 print:py-0">
      <PortalApprovalTracker endpoint={`/api/portal/invoices/${invoice.id}/view`} returnTo={`/portal/invoices/${invoice.id}/document`} />

      <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-800/70 bg-slate-950/80 p-8 text-slate-100 shadow-glow print:rounded-none print:border-0 print:bg-white print:p-8 print:text-slate-900 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/portal/invoices/${invoice.id}`} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-cyan/60 hover:text-white">
            Back to invoice
          </Link>
          <Link href={`/portal/invoices/${invoice.id}/document?print=1`} className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-sky">
            Print / Save PDF
          </Link>
        </div>

        <header className="border-b border-slate-800/60 pb-6 print:border-slate-300">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image src="/logo-mark.svg" alt="Elchanan Construction" width={56} height={56} className="h-14 w-14 rounded-xl" />
              <div>
                <p className="text-2xl font-semibold text-white print:text-slate-900">{companyName}</p>
                <p className="mt-1 text-sm text-slate-400 print:text-slate-600">Client Invoice Document</p>
              </div>
            </div>
            <div className="text-right text-sm text-slate-300 print:text-slate-700">
              <p><span className="font-semibold">Phone:</span> {profile?.phone || 'Not set'}</p>
              <p><span className="font-semibold">Email:</span> {profile?.email || 'Not set'}</p>
              <p><span className="font-semibold">Address:</span> {profile?.address || 'Not set'}</p>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Invoice details</p>
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="font-semibold">Invoice number:</span> {invoice.invoiceNumber}</p>
              <p><span className="font-semibold">Status:</span> {displayStatus.replace('_', ' ')}</p>
              <p><span className="font-semibold">Issued:</span> {invoice.issuedAt ? new Date(invoice.issuedAt).toLocaleDateString() : 'Draft'}</p>
              <p><span className="font-semibold">Due date:</span> {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Not set'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Client details</p>
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="font-semibold">Name:</span> {invoice.lead?.fullName || 'Not set'}</p>
              <p><span className="font-semibold">Company:</span> {invoice.lead?.companyName || 'Not set'}</p>
              <p><span className="font-semibold">Email:</span> {invoice.lead?.email || 'Not set'}</p>
              <p><span className="font-semibold">Billing type:</span> {invoice.billingType.replace('_', ' ')}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Scope and reference</p>
          <p className="mt-3 text-sm"><span className="font-semibold">Title:</span> {invoice.title}</p>
          <p className="mt-1 text-sm"><span className="font-semibold">Description:</span> {invoice.description || 'No description provided.'}</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-200 print:text-slate-800 sm:grid-cols-2">
            <p>Quote: {invoice.quoteRequest?.referenceCode || 'Not linked'}</p>
            <p>Project: {relatedProject ? relatedProject.projectCode || relatedProject.title : 'Not linked'}</p>
            <p>Milestone: {relatedMilestone ? relatedMilestone.title : 'Not linked'}</p>
            <p>Issued by: {invoice.issuedByAdmin?.name || invoice.issuedByAdmin?.email || 'Not set'}</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Line items</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800/70 text-left text-slate-400 print:border-slate-300 print:text-slate-700">
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4 text-right">Unit</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lineItems.length ? (
                  invoice.lineItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-800/40 print:border-slate-200">
                      <td className="py-2 pr-4">{item.description}</td>
                      <td className="py-2 pr-4 text-right">{item.quantity}</td>
                      <td className="py-2 pr-4 text-right">{item.unitPrice !== null ? formatCurrency(Number(item.unitPrice)) : '-'}</td>
                      <td className="py-2 text-right">{formatCurrency(Number(item.amount))}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 pr-4 text-slate-300 print:text-slate-700" colSpan={4}>
                      Detailed line items are not currently recorded.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-4 pr-4 text-right font-semibold">Subtotal</td>
                  <td className="pt-4 text-right" colSpan={3}>{formatCurrency(invoice.subtotal ? Number(invoice.subtotal) : total - Number(invoice.tax || 0))}</td>
                </tr>
                <tr>
                  <td className="pt-2 pr-4 text-right font-semibold">Tax</td>
                  <td className="pt-2 text-right" colSpan={3}>{formatCurrency(invoice.tax ? Number(invoice.tax) : 0)}</td>
                </tr>
                <tr>
                  <td className="pt-2 pr-4 text-right text-base font-semibold">Total</td>
                  <td className="pt-2 text-right text-base font-semibold" colSpan={3}>{formatCurrency(total)}</td>
                </tr>
                <tr>
                  <td className="pt-2 pr-4 text-right font-semibold">Paid</td>
                  <td className="pt-2 text-right" colSpan={3}>{formatCurrency(paidTotal)}</td>
                </tr>
                <tr>
                  <td className="pt-2 pr-4 text-right text-base font-semibold">Balance due</td>
                  <td className="pt-2 text-right text-base font-semibold" colSpan={3}>{formatCurrency(balance)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Payment instructions</p>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-200 print:text-slate-800">
              {invoice.paymentInstructions || profile?.quotationFooter || 'Payment instructions will be provided by the team.'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Notes</p>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-200 print:text-slate-800">
              {invoice.footerNote || 'Thank you for your business and prompt payment.'}
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Payment history</p>
          <div className="mt-4 space-y-3">
            {invoice.payments.length ? invoice.payments.map((payment) => (
              <article key={payment.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/80 p-4 print:border-slate-300 print:bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-white print:text-slate-900">{formatCurrency(Number(payment.amount))}</p>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.14em] text-slate-300 print:border-slate-300 print:text-slate-700">
                    {paymentMethodLabel(payment.method)}
                  </span>
                </div>
                <div className="mt-2 grid gap-1 text-xs text-slate-400 print:text-slate-700 sm:grid-cols-2">
                  <p>Date: {new Date(payment.paymentDate).toLocaleString()}</p>
                  <p>Reference: {payment.paymentReference || 'None'}</p>
                </div>
                {payment.notes ? <p className="mt-2 whitespace-pre-line text-sm text-slate-300 print:text-slate-800">{payment.notes}</p> : null}
              </article>
            )) : (
              <p className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400 print:border-slate-300 print:bg-white print:text-slate-700">No payments recorded yet.</p>
            )}
          </div>
        </section>

        <footer className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Commercial note</p>
          <p className="mt-3 text-xs text-slate-400 print:text-slate-600">
            This document is generated for client billing and payment tracking. It should be used together with the invoice record in the portal for the latest status.
          </p>
        </footer>
      </div>

      {searchParams?.print === '1' ? (
        <script
          dangerouslySetInnerHTML={{
            __html: 'setTimeout(function(){window.print();}, 350);',
          }}
        />
      ) : null}
    </main>
  );
}
