import { SectionHeading } from '../components/SectionHeading';
import { ServiceCard } from '../components/ServiceCard';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, PhoneCall, ShieldCheck, TimerReset, Wrench } from 'lucide-react';
import { WhatsAppCTA } from '../components/WhatsAppCTA';
import { getCompanyProfile, getPublishedServices } from '../../lib/content';
import { getDisplayPhone, toTelHref } from '../../lib/contact';
import { createPageMetadata } from '../../lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'Services | Elchanan Construction Company',
  description:
    'Explore residential construction, renovation, paving, roofing, and project delivery services in Rustenburg.',
  path: '/services',
});

export default async function ServicesPage() {
  const [services, profile] = await Promise.all([
    getPublishedServices(),
    getCompanyProfile(),
  ]);

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title="Construction and renovation services"
          subtitle="Our services"
          description="A full-service construction offering for residential builds, renovations, hardscape delivery, and trusted project execution."
        />

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.length ? (
            services.map((service) => (
              <ServiceCard
                key={service.id}
                title={service.title}
                summary={service.summary}
                details={service.details}
                slug={service.slug}
                icon={service.title.slice(0, 2).toUpperCase()}
              />
            ))
          ) : (
            <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 text-slate-300 shadow-glow md:col-span-2 xl:col-span-3">
              Services are being prepared. Please request a quote for immediate project assistance.
            </div>
          )}
        </div>

        <section className="mt-20 rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 shadow-glow">
          <h2 className="text-3xl font-semibold text-white">Why clients choose this service model</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {[
              {
                title: 'Clear scope definition',
                body: 'We structure work upfront to reduce rework, timeline drift, and unclear deliverables.',
                icon: CheckCircle2,
              },
              {
                title: 'Reliable communication',
                body: 'Clients receive practical updates and responsive coordination through each phase.',
                icon: TimerReset,
              },
              {
                title: 'Quality workmanship',
                body: 'Material choices and finishing standards are aligned to long-term durability.',
                icon: ShieldCheck,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="interactive-card p-6">
                  <span className="icon-pill">
                    <Icon size={16} />
                  </span>
                  <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-4 text-slate-300">{item.body}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-10 rounded-3xl border border-brand-cyan/25 bg-brand-cyan/5 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Lead capture</p>
            <h3 className="mt-4 text-2xl font-semibold text-white">Need help selecting the right service package?</h3>
            <p className="mt-4 max-w-3xl text-slate-200">
              Share your scope and timeline, and we will recommend the right construction approach with a tailored quote.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/quote" className="btn-primary">
                <Wrench size={16} />
                Request a quote
                <ArrowRight size={16} />
              </Link>
              <Link href={toTelHref(profile?.phone)} className="btn-ghost">
                <PhoneCall size={16} />
                Call {getDisplayPhone(profile?.phone)}
              </Link>
              <WhatsAppCTA
                phone={profile?.whatsapp}
                label="WhatsApp"
                message="Hello, I need help choosing a service for my project."
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
