import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Reveal } from '../../components/Reveal';
import { BannerImage } from '../../components/media/BannerImage';
import { CardImage } from '../../components/media/CardImage';
import { getPublishedProjectBySlug } from '../../../lib/content';
import { createPageMetadata } from '../../../lib/seo';
import { resolveProjectImageSet } from '../../../lib/site-visuals';

export const dynamic = 'force-dynamic';

type PageProps = { params: { slug: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const project = await getPublishedProjectBySlug(params.slug);
  if (!project) {
    return createPageMetadata({
      title: 'Project Not Found | Elchanan Construction Company',
      description: 'The requested project is not available.',
      path: `/projects/${params.slug}`,
    });
  }

  const visuals = resolveProjectImageSet(project);

  return createPageMetadata({
    title: project.seoTitle || `${project.title} | Project Case Study`,
    description:
      project.seoDescription || project.summary || 'Project case study from Elchanan Construction Company.',
    path: `/projects/${project.slug}`,
    image: visuals.cover.src,
  });
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const project = await getPublishedProjectBySlug(params.slug);
  if (!project) return notFound();

  const visuals = resolveProjectImageSet(project);

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-12">
        <Reveal>
          <BannerImage
            image={visuals.cover}
            eyebrow={project.category}
            title={project.title}
            description={project.summary}
            ctaHref="/quote"
            ctaLabel="Request similar project quote"
            secondaryHref="/projects"
            secondaryLabel="Back to projects"
          >
            {project.location ? <p className="text-sm uppercase tracking-[0.18em] text-white/75">Location: {project.location}</p> : null}
          </BannerImage>
        </Reveal>

        <Reveal>
          <div className="photo-card overflow-hidden rounded-[2rem] border border-slate-800/70 bg-slate-950/80 shadow-glow">
            <div className="space-y-8 p-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Project overview</p>
                <h2 className="mt-3 text-4xl font-semibold text-white">Execution summary</h2>
                <p className="mt-5 text-lg text-slate-200">{project.summary}</p>
                <p className="mt-4 text-slate-300">{project.description}</p>
              </div>

              {project.scopeNotes ? (
                <section className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-6">
                  <h2 className="text-xl font-semibold text-white">Project scope notes</h2>
                  <p className="mt-4 whitespace-pre-line text-slate-300">{project.scopeNotes}</p>
                </section>
              ) : null}

              <section>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-white">Project gallery</h2>
                    <p className="mt-2 text-sm text-slate-400">A light portfolio grid built around real project-style imagery.</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {visuals.gallery.map((image, index) => (
                    <Reveal key={`${image.src}-${index}`} delayMs={index * 60}>
                      <CardImage
                        src={image.src}
                        alt={image.alt}
                        badge={`Gallery ${index + 1}`}
                        aspectClassName="h-56"
                        sizes="(min-width: 1280px) 22rem, (min-width: 640px) 45vw, 100vw"
                        className="rounded-[1.5rem] border border-white/10"
                      />
                    </Reveal>
                  ))}
                </div>
              </section>

              {visuals.before && visuals.after ? (
                <section className="rounded-2xl border border-brand-cyan/25 bg-brand-cyan/5 p-6">
                  <h2 className="text-xl font-semibold text-white">Before and after</h2>
                  {project.beforeAfterCaption ? <p className="mt-2 text-sm text-slate-300">{project.beforeAfterCaption}</p> : null}
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <CardImage
                      src={visuals.before.src}
                      alt={visuals.before.alt}
                      badge="Before"
                      aspectClassName="h-64"
                      sizes="(min-width: 640px) 45vw, 100vw"
                      className="rounded-[1.5rem] border border-white/10"
                    />
                    <CardImage
                      src={visuals.after.src}
                      alt={visuals.after.alt}
                      badge="After"
                      aspectClassName="h-64"
                      sizes="(min-width: 640px) 45vw, 100vw"
                      className="rounded-[1.5rem] border border-white/10"
                    />
                  </div>
                </section>
              ) : null}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/quote" className="btn-primary">
                  Request Similar Project Quote
                </Link>
                <Link href="/projects" className="btn-ghost">
                  Back to Projects
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </main>
  );
}
