import Link from 'next/link';
import { SectionHeading } from '../components/SectionHeading';
import { getCompanyProfile } from '../../lib/content';
import { createPageMetadata } from '../../lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'About | Elchanan Construction Company',
  description: 'Learn about our construction delivery approach, mission, and service commitment in Rustenburg.',
  path: '/about',
});

export default async function AboutPage() {
  const profile = await getCompanyProfile();

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title={profile?.companyName || 'Elchanan Construction Company'}
          subtitle="About us"
          description={
            profile?.tagline ||
            'A South African construction business built on trust, precision, and modern delivery for residential and commercial clients.'
          }
        />

        <div className="mt-16 grid gap-12 lg:grid-cols-[0.95fr_0.9fr] lg:items-start">
          <div className="space-y-10">
            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 shadow-glow">
              <h2 className="text-2xl font-semibold text-white">Our story</h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                {profile?.description ||
                  'Elchanan Construction combines modern methods with trusted local experience. We support homeowners, businesses, and developers from concept to completion with clear budgets and dependable execution.'}
              </p>
            </section>

            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 shadow-glow">
              <h2 className="text-2xl font-semibold text-white">Mission, vision, and values</h2>
              <div className="mt-6 grid gap-6 sm:grid-cols-2">
                {[
                  { title: 'Mission', copy: 'Deliver construction and renovation projects with honesty, clarity, and quality workmanship.' },
                  { title: 'Vision', copy: 'Be the trusted first choice for clients seeking premium project delivery in Rustenburg and surrounding areas.' },
                  { title: 'Values', copy: 'Safety, quality, communication, and accountability in every build phase.' },
                  { title: 'Approach', copy: 'Practical planning, transparent quotations, and reliable site execution.' },
                ].map((item) => (
                  <div key={item.title} className="rounded-3xl bg-slate-900/80 p-6">
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-3 text-slate-300">{item.copy}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-brand-cyan/30 bg-brand-cyan/10 p-8 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Trust indicators</p>
              <ul className="mt-6 space-y-4 text-slate-100">
                <li>Quality workmanship and professional site discipline.</li>
                <li>Reliable timelines and proactive communication.</li>
                <li>Tailored quotations for residential and commercial scopes.</li>
                <li>Service coverage focused on Rustenburg and surrounding areas.</li>
              </ul>
            </div>

            <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow">
              <h3 className="text-lg font-semibold text-white">Contact details</h3>
              <p className="mt-4 text-slate-300">Discuss your scope with our team and get practical guidance before construction starts.</p>
              <div className="mt-6 space-y-3 text-sm text-slate-300">
                <p>Address: {profile?.address || 'Address available in company settings'}</p>
                <p>Phone: <a href={`tel:${(profile?.phone || '0747512226').replace(/\s+/g, '')}`} className="text-brand-sky hover:text-white">{profile?.phone || '074 751 2226'}</a></p>
                <p>Email: <a href={`mailto:${profile?.email || 'hello@elchananconstruction.co.za'}`} className="text-brand-sky hover:text-white">{profile?.email || 'hello@elchananconstruction.co.za'}</a></p>
              </div>
              <Link href="/quote" className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-brand-blue px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-sky">
                Book a consultation
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

