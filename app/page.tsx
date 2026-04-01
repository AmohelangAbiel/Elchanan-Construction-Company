import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Mail,
  PhoneCall,
  ShieldCheck,
  TimerReset,
  Wrench,
} from 'lucide-react';
import { ProjectCard } from './components/ProjectCard';
import { Reveal } from './components/Reveal';
import { SectionHeading } from './components/SectionHeading';
import { ServiceCard } from './components/ServiceCard';
import { TestimonialCard } from './components/TestimonialCard';
import { WhatsAppCTA } from './components/WhatsAppCTA';
import { BannerImage } from './components/media/BannerImage';
import { HeroImage } from './components/media/HeroImage';
import { SectionBackground } from './components/media/SectionBackground';
import {
  getApprovedReviews,
  getCompanyProfile,
  getPublishedPricingPlans,
  getPublishedProjects,
  getPublishedServices,
} from '../lib/content';
import { getDisplayPhone, toTelHref } from '../lib/contact';
import { createPageMetadata } from '../lib/seo';
import { resolveProjectImageSet, sectionVisuals } from '../lib/site-visuals';

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
      <HeroImage image={sectionVisuals.hero}>
        <div className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <Reveal className="max-w-2xl">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-brand-cyan/40 bg-brand-cyan/10 px-4 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">
                Modern construction in Rustenburg
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
                Build with confidence. Deliver with real-world construction clarity.
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
                <Link
                  href={toTelHref(profile?.phone)}
                  className="contact-action-card inline-flex items-center gap-3 rounded-2xl px-4 py-2 text-white"
                >
                  <span className="icon-pill">
                    <PhoneCall size={16} />
                  </span>
                  <span>Call {getDisplayPhone(profile?.phone)}</span>
                </Link>
                <Link
                  href={`mailto:${profile?.email || 'hello@elchananconstruction.co.za'}`}
                  className="contact-action-card inline-flex items-center gap-3 rounded-2xl px-4 py-2 text-white"
                >
                  <span className="icon-pill">
                    <Mail size={16} />
                  </span>
                  <span>{profile?.email || 'hello@elchananconstruction.co.za'}</span>
                </Link>
              </div>
              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {stats.map((item) => (
                  <div key={item.label} className="interactive-card photo-card p-5 text-center">
                    <p className="text-3xl font-semibold text-white">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-400">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={120} className="photo-card rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-glow backdrop-blur-xl sm:p-12">
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 text-slate-200">
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-cyan">Trusted by local clients</p>
                  <p className="mt-4 text-3xl font-semibold text-white">
                    Site-ready planning. Cleaner execution. Better handover quality.
                  </p>
                </div>
                <div className="rounded-3xl border border-brand-cyan/30 bg-brand-cyan/10 p-6">
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-cyan">Built for speed</p>
                  <p className="mt-4 text-slate-100">
                    Residential, renovation, commercial, and infrastructure scopes coordinated with practical field discipline.
                  </p>
                </div>
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
          </Reveal>
        </div>
      </HeroImage>

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
          <Reveal>
            <SectionBackground image={sectionVisuals.services} contentClassName="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">What we do</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Services built for every stage of your project
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-200">
                  A full-service construction partner for residential builds, renovations, hardscape delivery, and trusted site execution.
                </p>
              </div>
              <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {services.slice(0, 6).map((service, index) => (
                  <Reveal key={service.id} delayMs={index * 70}>
                    <ServiceCard
                      title={service.title}
                      summary={service.summary}
                      details={service.details}
                      image={service.image}
                      slug={service.slug}
                      icon={service.title.slice(0, 2).toUpperCase()}
                    />
                  </Reveal>
                ))}
              </div>
            </SectionBackground>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <BannerImage
              image={sectionVisuals.projects}
              eyebrow="Featured work"
              title="A portfolio of trusted construction projects"
              description="Our project showcase highlights build quality, timeline discipline, and dependable finishing standards with photographic detail that now feels grounded in real delivery."
              ctaHref="/projects"
              ctaLabel="View projects"
              secondaryHref="/quote"
              secondaryLabel="Request a quote"
            />
          </Reveal>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {projects.slice(0, 4).map((project, index) => {
              const visuals = resolveProjectImageSet(project);
              return (
                <Reveal key={project.id} delayMs={index * 90}>
                  <ProjectCard
                    title={project.title}
                    category={project.category}
                    description={project.summary}
                    image={visuals.cover.src}
                    imageAlt={visuals.cover.alt}
                    slug={project.slug}
                  />
                </Reveal>
              );
            })}
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
              <div key={plan.id} className="interactive-card photo-card p-6">
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
          <Reveal>
            <SectionBackground image={sectionVisuals.testimonials} contentClassName="px-6 py-10 sm:px-10 sm:py-12 lg:px-14 lg:py-16">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Testimonials</p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Client feedback from approved project reviews
                </h2>
                <p className="mt-4 text-base leading-8 text-slate-200">
                  Public testimonials are displayed only after moderation and quality checks, now presented with visuals that match the premium construction brand.
                </p>
              </div>
              <div className="mt-12 grid gap-6 xl:grid-cols-3">
                {reviews.slice(0, 6).map((review, index) => (
                  <Reveal key={review.id} delayMs={index * 70}>
                    <TestimonialCard
                      name={review.name}
                      role={review.projectContext || 'Construction client'}
                      quote={review.message}
                      rating={review.rating}
                    />
                  </Reveal>
                ))}
              </div>
            </SectionBackground>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Reveal>
            <SectionBackground image={sectionVisuals.cta} contentClassName="px-6 py-10 text-center sm:px-10 sm:py-14">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Ready to start?</p>
              <h2 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">Get a tailored quotation and clear next steps.</h2>
              <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-slate-200">
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
            </SectionBackground>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
