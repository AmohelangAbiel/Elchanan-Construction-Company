import Link from 'next/link';
import { SectionHeading } from '../components/SectionHeading';
import { faqs } from '../data/faqs';
import { createPageMetadata } from '../../lib/seo';

export const metadata = createPageMetadata({
  title: 'FAQ | Elchanan Construction Company',
  description: 'Frequently asked questions about timelines, estimates, and construction process expectations.',
  path: '/faq',
});

export default function FAQPage() {
  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title="Frequently asked questions"
          subtitle="FAQ"
          description="Answers to common questions about quoting, service areas, timelines, and project delivery."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          {faqs.map((item) => (
            <div key={item.question} className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow">
              <h3 className="text-xl font-semibold text-white">{item.question}</h3>
              <p className="mt-4 text-slate-300">{item.answer}</p>
            </div>
          ))}
        </div>

        <section className="mt-20 rounded-[2rem] border border-brand-cyan/30 bg-brand-cyan/10 p-10 shadow-glow">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Still have a question?</p>
            <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">Speak directly with our team to clarify project scope.</h2>
            <Link href="/contact" className="mt-8 inline-flex items-center justify-center rounded-full bg-brand-blue px-8 py-3 text-sm font-semibold text-white transition hover:bg-brand-sky">
              Contact us now
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
