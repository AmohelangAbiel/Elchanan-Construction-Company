import Link from 'next/link';
import { ArrowRight, CheckCircle2, FileText, PhoneCall } from 'lucide-react';
import { PricingCard } from '../components/PricingCard';
import { SectionHeading } from '../components/SectionHeading';
import { WhatsAppCTA } from '../components/WhatsAppCTA';
import { getCompanyProfile, getPublishedPricingPlans } from '../../lib/content';
import { getDisplayPhone, toTelHref } from '../../lib/contact';
import { createPageMetadata } from '../../lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'Pricing | Elchanan Construction Company',
  description:
    'Estimate ranges and transparent pricing guidance for construction and renovation projects in Rustenburg.',
  path: '/pricing',
});

export default async function PricingPage() {
  const [pricingPlans, profile] = await Promise.all([
    getPublishedPricingPlans(),
    getCompanyProfile(),
  ]);

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title="Transparent pricing for confident project planning"
          subtitle="Pricing"
          description="Estimate ranges support early planning. Every project receives a tailored final quote after scope review."
        />

        <div className="mt-14 grid gap-6 xl:grid-cols-3">
          {pricingPlans.length ? (
            pricingPlans.map((plan) => (
              <PricingCard
                key={plan.id}
                title={plan.title}
                range={plan.range}
                description={plan.summary || plan.description}
                items={plan.items}
              />
            ))
          ) : (
            <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 text-slate-300 shadow-glow xl:col-span-3">
              Pricing packages are being updated. Please request a quote for detailed pricing.
            </div>
          )}
        </div>

        <section className="mt-20 rounded-[2rem] border border-brand-sky/20 bg-brand-sky/5 p-10 shadow-glow">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Quote guidance</p>
              <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">Get a tailored quote with scope clarity.</h2>
              <p className="mt-6 text-slate-200">
                Final pricing depends on site condition, material specification, and build complexity. Start with a package,
                then move to a project-specific quote.
              </p>
            </div>
            <div className="interactive-card p-8">
              <p className="text-sm text-slate-400">Planning notes:</p>
              <ul className="mt-5 space-y-4 text-slate-300">
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-cyan" />
                  Range pricing is for early budgeting, not a fixed contract value.
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-cyan" />
                  Site visits improve accuracy and reduce scope surprises.
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-cyan" />
                  Material and timeline choices affect final pricing.
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              'Tailored quotations aligned to your exact scope',
              'Professional communication during planning and build',
              'Timeline commitments with practical milestone updates',
            ].map((item) => (
              <div key={item} className="interactive-card rounded-2xl p-4 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link href="/quote" className="btn-primary px-8">
              <FileText size={16} />
              Request detailed quote
              <ArrowRight size={16} />
            </Link>
            <Link href="/contact" className="btn-ghost px-8">
              Contact our team
            </Link>
            <WhatsAppCTA
              phone={profile?.whatsapp}
              label={`WhatsApp (${getDisplayPhone(profile?.phone)})`}
              message="Hello, I need help with pricing options for a project."
              className="interactive-button border border-brand-cyan/40 bg-brand-cyan/10 px-8 text-sm font-semibold text-brand-cyan hover:bg-brand-cyan/20"
            />
            <Link href={toTelHref(profile?.phone)} className="btn-ghost px-8">
              <PhoneCall size={16} />
              Call now
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
