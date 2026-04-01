import Link from 'next/link';
import { ProjectCard } from './components/ProjectCard';
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  PhoneCall,
  ShieldCheck,
  TimerReset,
  Wrench,
} from 'lucide-react';
import { SectionHeading } from './components/SectionHeading';
import { ServiceCard } from './components/ServiceCard';
import { TestimonialCard } from './components/TestimonialCard';
import { WhatsAppCTA } from './components/WhatsAppCTA';
import {
  getApprovedReviews,
  getCompanyProfile,
  getPublishedPricingPlans,
  getPublishedProjects,
  getPublishedServices,
} from '../lib/content';
import { getDisplayPhone, toTelHref } from '../lib/contact';
import { createPageMetadata } from '../lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'Elchanan Construction Company | Rustenburg Construction Experts',
  description:
    'Premium residential and commercial construction services in Rustenburg with transparent quoting and reliable project delivery.',
  path: '/',
});

export default async function HomePage() {
  const [services, projects, reviews, pricingPlans, profile] = await Promise.all([
    getPublishedServices(),
    getPublishedProjects(),
    getApprovedReviews(6),
    getPublishedPricingPlans(),
    getCompanyProfile(),
  ]);

  const stats = [
    { label: 'Published services', value: `${services.length}` },
    { label: 'Featured projects', value: `${projects.length}` },
    { label: 'Approved reviews', value: `${reviews.length}` },
  ];
  const trustSignals = [
    { icon: CheckCircle2, text: 'Tailored quotations with practical scope clarity' },
    { icon: TimerReset, text: 'Reliable timeline communication from kickoff to handover' },
    { icon: ShieldCheck, text: 'Residential and commercial capability with quality workmanship' },
  ];

  return (
    <main className="relative overflow-hidden">
      <section className="relative overflow-hidden px-4 py-24 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-hero-glow opacity-80" />
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="max-w-2xl">
              <p className="mb-4 inline-flex rounded-full border border-brand-cyan/40 bg-brand-cyan/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">
                Modern construction in Rustenburg
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Build with confidence. Renovate with clarity. Quote with certainty.
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                {profile?.description ||
                  'Elchanan Construction Company delivers premium residential and commercial project execution with strong planning and transparent pricing.'}
              </p>
              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <Link href="/quote" className="btn-primary">
                  Request a quote
                  <ArrowRight size={16} />
                </Link>
                <Link href="/projects" className="btn-ghost">
                  View projects
                  <ArrowRight size={16} />
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-slate-300">
                <Link href={toTelHref(profile?.phone)} className="contact-action-card inline-flex items-center gap-3 rounded-2xl px-4 py-2 text-white">
                  <span className="icon-pill">
                    <PhoneCall size={16} />
                  </span>
                  <span>Call {getDisplayPhone(profile?.phone)}</span>
                </Link>
                <Link href={`mailto:${profile?.email || 'hello@elchananconstruction.co.za'}`} className="contact-action-card inline-flex items-center gap-3 rounded-2xl px-4 py-2 text-white">
                  <span className="icon-pill">
                    <Mail size={16} />
                  </span>
                  <span>{profile?.email || 'hello@elchananconstruction.co.za'}</span>
                </Link>
              </div>
              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className="interactive-card p-5 text-center">
                    <p className="text-3xl font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-glow backdrop-blur-xl sm:p-12">
              <div className="space-y-6">
                <div className="rounded-3xl bg-slate-900/85 p-6 text-slate-200">
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-cyan">Trusted by local clients</p>
                  <p className="mt-4 text-3xl font-semibold text-white">Fast quote response. Practical timelines. Professional communication.</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-3xl border border-slate-800/70 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-400">Residential and renovation builds</p>
                    <p className="mt-3 text-xl font-semibold text-white">Tailored construction delivery</p>
                  </div>
                  <div className="rounded-3xl border border-slate-800/70 bg-slate-900/80 p-5">
                    <p className="text-sm text-slate-400">Commercial and infrastructure support</p>
                    <p className="mt-3 text-xl font-semibold text-white">Reliable site execution</p>
                  </div>
                </div>
                <div className="rounded-3xl border border-brand-cyan/30 bg-brand-cyan/10 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Service area confidence</p>
                  <p className="mt-3 text-slate-100">
                    Based in Rustenburg and serving surrounding areas with dependable construction, renovation, and fitout support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-800/80 bg-slate-950/70 p-6 shadow-glow">
          <div className="grid gap-4 md:grid-cols-3">
            {trustSignals.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="interactive-card flex items-start gap-3 rounded-2xl px-4 py-3 text-sm text-slate-200">
                  <span className="icon-pill mt-0.5 shrink-0">
                    <Icon size={14} />
                  </span>
                  <span>{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            title="Services built for every stage of your project"
            subtitle="What we do"
            description="A full-service construction partner for residential, renovation, hardscape, and project management delivery."
          />
          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {services.slice(0, 6).map((service) => (
              <ServiceCard
                key={service.id}
                title={service.title}
                summary={service.summary}
                details={service.details}
                slug={service.slug}
                icon={service.title.slice(0, 2).toUpperCase()}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            title="A portfolio of trusted construction projects"
            subtitle="Featured work"
            description="Our project showcase highlights build quality, timeline discipline, and dependable finishing standards."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {projects.slice(0, 4).map((project) => (
              <ProjectCard
                key={project.id}
                title={project.title}
                category={project.category}
                description={project.summary}
                image={project.image}
                slug={project.slug}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            title="Pricing guidance that improves planning confidence"
            subtitle="Estimate packages"
            description="Use planning ranges to scope your budget, then move to a detailed project quote with our team."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {pricingPlans.slice(0, 3).map((plan) => (
              <div key={plan.id} className="interactive-card p-6">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">
                  <Wrench size={14} />
                  {plan.title}
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{plan.range}</p>
                <p className="mt-4 text-sm text-slate-300">{plan.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            title="Client feedback from approved project reviews"
            subtitle="Testimonials"
            description="Public testimonials are displayed only after moderation and quality checks."
          />
          <div className="mt-12 grid gap-6 xl:grid-cols-3">
            {reviews.slice(0, 6).map((review) => (
              <TestimonialCard
                key={review.id}
                name={review.name}
                role={review.projectContext || 'Construction client'}
                quote={review.message}
                rating={review.rating}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-[2rem] border border-brand-cyan/30 bg-slate-900/90 p-10 text-center shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Ready to start?</p>
            <h2 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">Get a tailored quotation and clear next steps.</h2>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-300">
              We combine quality workmanship, reliable timelines, and proactive communication for residential and commercial clients.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/quote" className="btn-accent px-8">
                Request a quote
                <ArrowRight size={16} />
              </Link>
              <Link href="/contact" className="btn-ghost px-8">
                Contact our team
                <ArrowRight size={16} />
              </Link>
              <WhatsAppCTA
                phone={profile?.whatsapp}
                label="WhatsApp us"
                message="Hello, I need a tailored construction quote."
                className="interactive-button border border-brand-cyan/40 bg-brand-cyan/10 px-8 text-sm font-semibold text-brand-cyan hover:bg-brand-cyan/20"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

