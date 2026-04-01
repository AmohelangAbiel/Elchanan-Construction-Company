import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '../../components/Reveal';
import { BannerImage } from '../../components/media/BannerImage';
import { CardImage } from '../../components/media/CardImage';
import { getPublishedServiceBySlug } from '../../../lib/content';
import { createPageMetadata } from '../../../lib/seo';
import { resolveServiceImage, sectionVisuals } from '../../../lib/site-visuals';

export const dynamic = 'force-dynamic';

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const service = await getPublishedServiceBySlug(params.slug);
  if (!service) {
    return createPageMetadata({
      title: 'Service Not Found | Elchanan Construction Company',
      description: 'The requested service is not available.',
      path: `/services/${params.slug}`,
    });
  }

  const visual = resolveServiceImage(service);

  return createPageMetadata({
    title: service.seoTitle || `${service.title} | Construction Service`,
    description:
      service.seoDescription || service.summary || 'Construction service from Elchanan Construction Company.',
    path: `/services/${service.slug}`,
    image: visual.src,
  });
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const service = await getPublishedServiceBySlug(params.slug);
  if (!service) return notFound();

  const visual = resolveServiceImage(service);

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <Reveal>
          <BannerImage
            image={visual}
            eyebrow="Service"
            title={service.title}
            description={service.summary}
            ctaHref="/quote"
            ctaLabel="Request a quote"
            secondaryHref="/services"
            secondaryLabel="Back to services"
          />
        </Reveal>

        <Reveal>
          <div className="photo-card overflow-hidden rounded-[2rem] border border-slate-800/70 bg-slate-950/80 shadow-glow">
            <div className="grid gap-8 p-8 lg:grid-cols-[1fr_0.95fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Delivery overview</p>
                <h2 className="mt-4 text-4xl font-semibold text-white">Scope, sequencing, and finish quality</h2>
                <p className="mt-5 text-slate-300">{service.description}</p>

                {service.details.length ? (
                  <ul className="mt-6 space-y-3 text-slate-300">
                    {service.details.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-2 h-2 w-2 rounded-full bg-brand-cyan" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/quote" className="btn-primary">
                    Request a Quote
                  </Link>
                  <Link href="/projects" className="btn-ghost">
                    View project portfolio
                  </Link>
                </div>
              </div>

              <CardImage
                src={visual.src}
                alt={visual.alt}
                badge="Live service visual"
                aspectClassName="h-72 sm:h-80"
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="rounded-[1.75rem] border border-white/10"
              >
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-brand-cyan">Field-ready service</p>
                  <p className="mt-2 text-xl font-semibold text-white">{service.title}</p>
                </div>
              </CardImage>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <BannerImage
            image={sectionVisuals.about}
            eyebrow="Next step"
            title="Need tailored scope guidance?"
            description="Send your requirements and site details for a cleaner estimate, better sequencing advice, and a faster quote response."
            ctaHref="/quote"
            ctaLabel="Start a quote"
            secondaryHref="/contact"
            secondaryLabel="Contact our team"
          />
        </Reveal>
      </div>
    </main>
  );
}
