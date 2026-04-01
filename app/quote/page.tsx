import { SectionHeading } from '../components/SectionHeading';
import { QuoteForm } from '../components/QuoteForm';
import { createPageMetadata } from '../../lib/seo';

export const metadata = createPageMetadata({
  title: 'Quote | Elchanan Construction Company',
  description:
    'Submit a structured quote request with service type, budget range, and timeline preferences.',
  path: '/quote',
});

export default function QuotePage() {
  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <SectionHeading
          title="Request a quotation for your construction project"
          subtitle="Quotation request"
          description="Share project scope, timeline, and budget preferences to receive a tailored response from our team."
        />

        <div className="mt-14">
          <QuoteForm />
        </div>
      </div>
    </main>
  );
}
