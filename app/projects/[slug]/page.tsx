import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublishedProjectBySlug } from '../../../lib/content';
import { createPageMetadata } from '../../../lib/seo';

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

  return createPageMetadata({
    title: project.seoTitle || `${project.title} | Project Case Study`,
    description:
      project.seoDescription || project.summary || 'Project case study from Elchanan Construction Company.',
    path: `/projects/${project.slug}`,
    image: project.image,
  });
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const project = await getPublishedProjectBySlug(params.slug);
  if (!project) return notFound();

  const gallery = project.galleryImages.length ? project.galleryImages : [project.image];

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="overflow-hidden rounded-[2rem] border border-slate-800/70 bg-slate-950/80 shadow-glow">
          <div className="relative h-72 w-full bg-slate-900 sm:h-96">
            <Image
              src={project.image}
              alt={project.title}
              fill
              className="object-cover"
              unoptimized={!project.image.startsWith('/')}
            />
          </div>
          <div className="space-y-8 p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">{project.category}</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">{project.title}</h1>
              {project.location ? <p className="mt-2 text-sm text-slate-400">Location: {project.location}</p> : null}
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
              <h2 className="text-2xl font-semibold text-white">Project gallery</h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {gallery.map((image) => (
                  <div key={image} className="relative h-52 overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900">
                    <Image src={image} alt={project.title} fill className="object-cover" unoptimized={!image.startsWith('/')} />
                  </div>
                ))}
              </div>
            </section>

            {project.beforeImage && project.afterImage ? (
              <section className="rounded-2xl border border-brand-cyan/25 bg-brand-cyan/5 p-6">
                <h2 className="text-xl font-semibold text-white">Before and after</h2>
                {project.beforeAfterCaption ? <p className="mt-2 text-sm text-slate-300">{project.beforeAfterCaption}</p> : null}
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900">
                    <div className="relative h-56 w-full">
                      <Image src={project.beforeImage} alt={`${project.title} before`} fill className="object-cover" unoptimized={!project.beforeImage.startsWith('/')} />
                    </div>
                    <p className="border-t border-slate-800/70 px-4 py-2 text-sm text-slate-300">Before</p>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-slate-900">
                    <div className="relative h-56 w-full">
                      <Image src={project.afterImage} alt={`${project.title} after`} fill className="object-cover" unoptimized={!project.afterImage.startsWith('/')} />
                    </div>
                    <p className="border-t border-slate-800/70 px-4 py-2 text-sm text-slate-300">After</p>
                  </div>
                </div>
              </section>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/quote" className="inline-flex items-center justify-center rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-sky">
                Request Similar Project Quote
              </Link>
              <Link href="/projects" className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-brand-cyan/60">
                Back to Projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

