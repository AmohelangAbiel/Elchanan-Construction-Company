import Link from 'next/link';
import { requirePortalSession } from '../../../../lib/portal-auth';
import { prisma } from '../../../../lib/prisma';
import { PortalContactActions } from '../components/PortalContactActions';

export const dynamic = 'force-dynamic';

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') return 'Not set';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(value);
}

export default async function PortalQuotesPage() {
  const session = await requirePortalSession();

  if (!session.leadId) {
    return (
      <section className="space-y-6">
        <article className="rounded-[2rem] border border-amber-300/25 bg-amber-400/10 p-6 text-sm text-amber-100">
          Quotes are not available yet because your portal account is not linked to a client record.
        </article>
        <PortalContactActions title="Need your quotes linked?" />
      </section>
    );
  }

  const quotes = await prisma.quoteRequest.findMany({
    where: {
      deletedAt: null,
      leadId: session.leadId,
    },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      referenceCode: true,
      serviceType: true,
      projectType: true,
      status: true,
      quoteSentAt: true,
      validityDays: true,
      estimateTotal: true,
      createdAt: true,
    },
  });

  return (
    <section className="space-y-6">
      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Quote visibility</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Your quotations</h1>
        <p className="mt-3 text-sm text-slate-400">
          Review status, estimate totals, and quotation validity windows from your client portal.
        </p>
      </article>

      <section className="grid gap-4">
        {quotes.length ? quotes.map((quote) => {
          const validUntil = quote.quoteSentAt
            ? new Date(quote.quoteSentAt.getTime() + quote.validityDays * 24 * 60 * 60 * 1000)
            : null;

          return (
            <Link key={quote.id} href={`/portal/quotes/${quote.id}`} className="interactive-card rounded-[2rem] p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{quote.referenceCode}</p>
                  <p className="mt-1 text-sm text-slate-300">{quote.serviceType}</p>
                  <p className="mt-1 text-xs text-slate-500">{quote.projectType || 'Project type not specified'}</p>
                </div>
                <span className="rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.14em] text-brand-cyan">
                  {quote.status}
                </span>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                <p>Submitted: {new Date(quote.createdAt).toLocaleDateString()}</p>
                <p>Estimated total: {formatCurrency(quote.estimateTotal ? Number(quote.estimateTotal) : undefined)}</p>
                <p>Valid until: {validUntil ? validUntil.toLocaleDateString() : 'Pending issue date'}</p>
              </div>
            </Link>
          );
        }) : (
          <article className="rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-400">
            No quote records are visible yet. Once your request is prepared, your quotation will appear here.
          </article>
        )}
      </section>

      <PortalContactActions title="Questions about your quotation?" />
    </section>
  );
}
