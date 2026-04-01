import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requirePortalSession } from '../../../../../../lib/portal-auth';
import { getCompanyProfile } from '../../../../../../lib/content';
import { prisma } from '../../../../../../lib/prisma';
import { PortalContactActions } from '../../../components/PortalContactActions';

type PageProps = {
  params: { id: string };
  searchParams?: { print?: string };
};

type LineItem = { label?: string; amount?: string };

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';

  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(value);
}

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

export const dynamic = 'force-dynamic';

export default async function PortalQuoteDocumentPage({ params, searchParams }: PageProps) {
  const session = await requirePortalSession();
  if (!session.leadId) return notFound();

  const [quote, profile] = await Promise.all([
    prisma.quoteRequest.findFirst({
      where: {
        id: params.id,
        leadId: session.leadId,
        deletedAt: null,
      },
    }),
    getCompanyProfile(),
  ]);

  if (!quote) return notFound();

  const lineItems = parseLineItems(quote.lineItems);
  const companyName = profile?.displayName || profile?.companyName || 'Elchanan Construction Company';
  const validityDays = quote.validityDays || 14;
  const validUntil = quote.quoteSentAt
    ? new Date(quote.quoteSentAt.getTime() + validityDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

  const exclusions =
    quote.exclusions || profile?.quotationFooter || 'Any items not explicitly listed in this quotation are excluded.';
  const assumptions =
    quote.assumptions || 'Pricing assumes reasonable site access and agreed material specifications.';
  const terms =
    quote.termsDisclaimer ||
    profile?.quotationDisclaimer ||
    'This quotation remains subject to final site verification and signed acceptance.';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-800/70 bg-slate-950/80 p-8 text-slate-100 shadow-glow print:rounded-none print:border-0 print:bg-white print:p-8 print:text-slate-900 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href={`/portal/quotes/${quote.id}`}
            className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-cyan/60 hover:text-white"
          >
            Back to quote
          </Link>
          <Link
            href={`/portal/quotes/${quote.id}/document?print=1`}
            className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-sky"
          >
            Print / Save PDF
          </Link>
        </div>

        <header className="border-b border-slate-800/60 pb-6 print:border-slate-300">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image src="/logo-mark.svg" alt="Elchanan Construction" width={56} height={56} className="h-14 w-14 rounded-xl" />
              <div>
                <p className="text-2xl font-semibold text-white print:text-slate-900">{companyName}</p>
                <p className="mt-1 text-sm text-slate-400 print:text-slate-600">Client Quotation Document</p>
              </div>
            </div>
            <div className="text-right text-sm text-slate-300 print:text-slate-700">
              <p>
                <span className="font-semibold">Phone:</span> {profile?.phone || 'Not set'}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {profile?.email || 'Not set'}
              </p>
              <p>
                <span className="font-semibold">Address:</span> {profile?.address || 'Not set'}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Quotation details</p>
            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="font-semibold">Reference:</span> {quote.referenceCode}
              </p>
              <p>
                <span className="font-semibold">Status:</span> {quote.status}
              </p>
              <p>
                <span className="font-semibold">Issued:</span>{' '}
                {quote.quoteSentAt ? new Date(quote.quoteSentAt).toLocaleDateString() : new Date().toLocaleDateString()}
              </p>
              <p>
                <span className="font-semibold">Valid until:</span> {validUntil.toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Client details</p>
            <div className="mt-3 space-y-1 text-sm">
              <p>
                <span className="font-semibold">Name:</span> {quote.fullName}
              </p>
              <p>
                <span className="font-semibold">Email:</span> {quote.email}
              </p>
              <p>
                <span className="font-semibold">Phone:</span> {quote.phone}
              </p>
              <p>
                <span className="font-semibold">Location:</span> {quote.location || 'Not specified'}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Project and service summary</p>
          <p className="mt-3 text-sm">
            <span className="font-semibold">Service type:</span> {quote.serviceType}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">Project type:</span> {quote.projectType || 'Not specified'}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-semibold">Budget guidance:</span> {quote.estimatedBudgetRange || 'Not specified'}
          </p>
          <p className="mt-4 whitespace-pre-line text-sm text-slate-200 print:text-slate-800">
            {quote.quoteSummary || quote.projectDescription}
          </p>
          {quote.scopeNotes ? (
            <div className="mt-4 rounded-xl border border-slate-800/70 bg-slate-950/80 p-4 print:border-slate-300 print:bg-white">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 print:text-slate-600">Scope notes</p>
              <p className="mt-2 whitespace-pre-line text-sm text-slate-200 print:text-slate-800">{quote.scopeNotes}</p>
            </div>
          ) : null}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Estimate and pricing</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800/70 text-left text-slate-400 print:border-slate-300 print:text-slate-700">
                  <th className="py-2 pr-4">Line item</th>
                  <th className="py-2 text-right">Amount (ZAR)</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.length ? (
                  lineItems.map((item) => (
                    <tr key={`${item.label}-${item.amount}`} className="border-b border-slate-800/40 print:border-slate-200">
                      <td className="py-2 pr-4">{item.label}</td>
                      <td className="py-2 text-right">{item.amount || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="py-3 pr-4 text-slate-300 print:text-slate-700" colSpan={2}>
                      Detailed line items will be finalized after scope confirmation.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-4 pr-4 text-right font-semibold">Subtotal</td>
                  <td className="pt-4 text-right">{formatCurrency(quote.estimateSubtotal ? Number(quote.estimateSubtotal) : null)}</td>
                </tr>
                <tr>
                  <td className="pt-2 pr-4 text-right font-semibold">Tax</td>
                  <td className="pt-2 text-right">{formatCurrency(quote.estimateTax ? Number(quote.estimateTax) : null)}</td>
                </tr>
                <tr>
                  <td className="pt-2 pr-4 text-right text-base font-semibold">Estimated total</td>
                  <td className="pt-2 text-right text-base font-semibold">{formatCurrency(quote.estimateTotal ? Number(quote.estimateTotal) : null)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Exclusions</p>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-200 print:text-slate-800">{exclusions}</p>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Assumptions</p>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-200 print:text-slate-800">{assumptions}</p>
          </div>
        </section>

        <footer className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Terms and disclaimer</p>
          <p className="mt-3 whitespace-pre-line text-sm text-slate-200 print:text-slate-800">{terms}</p>
          <p className="mt-4 text-xs text-slate-400 print:text-slate-600">
            This quotation is provided for client planning and communication. Final contract values are confirmed after site verification and signed acceptance.
          </p>
        </footer>
      </div>

      <div className="mx-auto mt-6 max-w-5xl print:hidden">
        <PortalContactActions title="Need to discuss this quotation?" />
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
