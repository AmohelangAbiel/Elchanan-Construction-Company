import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalSession } from '../../../../../lib/portal-auth';
import { prisma } from '../../../../../lib/prisma';
import { PortalContactActions } from '../../components/PortalContactActions';

type LineItem = {
  label?: string;
  amount?: string;
};

function parseLineItems(input: unknown) {
  if (!Array.isArray(input)) return [] as Array<{ label: string; amount: string }>;

  return input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as LineItem;
      if (!item.label) return null;
      return {
        label: item.label,
        amount: item.amount || '-',
      };
    })
    .filter((item): item is { label: string; amount: string } => Boolean(item));
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') return 'Not set';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(value);
}

export const dynamic = 'force-dynamic';

export default async function PortalQuoteDetailPage({ params }: { params: { id: string } }) {
  const session = await requirePortalSession();

  if (!session.leadId) return notFound();

  const quote = await prisma.quoteRequest.findFirst({
    where: {
      id: params.id,
      leadId: session.leadId,
      deletedAt: null,
    },
    include: {
      convertedProject: {
        select: {
          id: true,
          title: true,
          status: true,
          projectCode: true,
          deletedAt: true,
          portalVisible: true,
          leadId: true,
        },
      },
    },
  });

  if (!quote) return notFound();
  const linkedProject =
    quote.convertedProject &&
    !quote.convertedProject.deletedAt &&
    quote.convertedProject.portalVisible &&
    quote.convertedProject.leadId === session.leadId
      ? quote.convertedProject
      : null;

  const lineItems = parseLineItems(quote.lineItems);
  const validUntil = quote.quoteSentAt
    ? new Date(quote.quoteSentAt.getTime() + (quote.validityDays || 14) * 24 * 60 * 60 * 1000)
    : null;

  return (
    <section className="space-y-6">
      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Quotation detail</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">{quote.referenceCode}</h1>
            <p className="mt-2 text-sm text-slate-400">{quote.serviceType}</p>
          </div>
          <span className="rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-brand-cyan">
            {quote.status}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/portal/quotes" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
            Back to quotes
          </Link>
          <Link href={`/portal/quotes/${quote.id}/document`} className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
            Open printable quote
          </Link>
          {linkedProject ? (
            <Link href={`/portal/projects/${linkedProject.id}`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
              Open linked project
            </Link>
          ) : null}
        </div>
      </article>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="space-y-6">
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Project summary</p>
            <div className="mt-4 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
              <p><span className="text-slate-500">Service:</span> {quote.serviceType}</p>
              <p><span className="text-slate-500">Project type:</span> {quote.projectType || 'Not specified'}</p>
              <p><span className="text-slate-500">Location:</span> {quote.location || 'Not specified'}</p>
              <p><span className="text-slate-500">Budget range:</span> {quote.estimatedBudgetRange || 'Not specified'}</p>
              <p><span className="text-slate-500">Submitted:</span> {new Date(quote.createdAt).toLocaleDateString()}</p>
              <p><span className="text-slate-500">Valid until:</span> {validUntil ? validUntil.toLocaleDateString() : 'Pending issue date'}</p>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm text-slate-200">
              {quote.quoteSummary || quote.projectDescription}
            </p>
            {quote.scopeNotes ? (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Scope notes</p>
                <p className="mt-2 whitespace-pre-line">{quote.scopeNotes}</p>
              </div>
            ) : null}
          </article>

          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Estimate breakdown</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="py-2 pr-4">Line item</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length ? lineItems.map((item) => (
                    <tr key={`${item.label}-${item.amount}`} className="border-b border-slate-800/40">
                      <td className="py-2 pr-4">{item.label}</td>
                      <td className="py-2 text-right">{item.amount || '-'}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={2} className="py-3 text-slate-400">
                        Detailed line items will be finalized during scope confirmation.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="pt-4 pr-4 text-right font-semibold text-slate-300">Subtotal</td>
                    <td className="pt-4 text-right">{formatCurrency(quote.estimateSubtotal ? Number(quote.estimateSubtotal) : undefined)}</td>
                  </tr>
                  <tr>
                    <td className="pt-2 pr-4 text-right font-semibold text-slate-300">Tax</td>
                    <td className="pt-2 text-right">{formatCurrency(quote.estimateTax ? Number(quote.estimateTax) : undefined)}</td>
                  </tr>
                  <tr>
                    <td className="pt-2 pr-4 text-right text-base font-semibold text-white">Estimated total</td>
                    <td className="pt-2 text-right text-base font-semibold text-white">
                      {formatCurrency(quote.estimateTotal ? Number(quote.estimateTotal) : undefined)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </article>
        </div>

        <div className="space-y-6">
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Assumptions and terms</p>
            <div className="mt-4 space-y-4 text-sm text-slate-300">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Assumptions</p>
                <p className="mt-2 whitespace-pre-line">{quote.assumptions || 'Assumptions will be confirmed during final scope alignment.'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Exclusions</p>
                <p className="mt-2 whitespace-pre-line">{quote.exclusions || 'Exclusions are shared in the formal quotation document.'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Disclaimer</p>
                <p className="mt-2 whitespace-pre-line">{quote.termsDisclaimer || 'Final contract values are confirmed after site verification and signed acceptance.'}</p>
              </div>
            </div>
          </article>

          {linkedProject ? (
            <article className="rounded-[2rem] border border-emerald-300/30 bg-emerald-400/10 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-100">Linked project</p>
              <p className="mt-2 text-lg font-semibold text-white">{linkedProject.title}</p>
              <p className="mt-1 text-sm text-emerald-100/90">Status: {linkedProject.status}</p>
              <Link href={`/portal/projects/${linkedProject.id}`} className="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100 hover:text-white">
                View project progress
              </Link>
            </article>
          ) : null}

          <PortalContactActions title="Need clarification on this quote?" />
        </div>
      </section>
    </section>
  );
}
