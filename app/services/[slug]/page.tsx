import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedServiceBySlug } from '../../../lib/content';
import { createPageMetadata } from '../../../lib/seo';

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

  return createPageMetadata({
    title: service.seoTitle || `${service.title} | Construction Service`,
    description:
      service.seoDescription || service.summary || 'Construction service from Elchanan Construction Company.',
    path: `/services/${service.slug}`,
    image: service.image || undefined,
  });
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const service = await getPublishedServiceBySlug(params.slug);
  if (!service) return notFound();
  const isLocalImage = Boolean(service.image?.startsWith('/'));

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/80 p-8 shadow-glow">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Service</p>
              <h1 className="mt-4 text-4xl font-semibold text-white">{service.title}</h1>
              <p className="mt-5 text-lg text-slate-200">{service.summary}</p>
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
                <Link href="/quote" className="inline-flex items-center justify-center rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-sky">
                  Request a Quote
                </Link>
                <Link href="/services" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-brand-cyan/60">
                  Back to Services
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90">
              {service.image ? (
                <div className="relative h-64 w-full">
                  <Image
                    src={service.image}
                    alt={service.title}
                    fill
                    className="object-cover"
                    unoptimized={!isLocalImage}
                  />
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center text-sm text-slate-500">Service image pending upload</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
