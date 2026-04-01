import { ProjectCard } from '../components/ProjectCard';
import { Reveal } from '../components/Reveal';
import { BannerImage } from '../components/media/BannerImage';
import { getPublishedProjects } from '../../lib/content';
import { createPageMetadata } from '../../lib/seo';
import { resolveProjectImageSet, sectionVisuals } from '../../lib/site-visuals';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'Projects | Elchanan Construction Company',
  description:
    'Review featured residential, renovation, and commercial projects delivered by Elchanan Construction Company.',
  path: '/projects',
});

export default async function ProjectsPage() {
  const projects = await getPublishedProjects();

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-14">
        <Reveal>
          <BannerImage
            image={sectionVisuals.projects}
            eyebrow="Portfolio"
            title="Projects that reflect precision and delivery discipline"
            description="A selection of published build, renovation, and infrastructure projects showcasing quality execution through real-world construction imagery."
            ctaHref="/quote"
            ctaLabel="Request a quote"
            secondaryHref="/services"
            secondaryLabel="Explore services"
          />
        </Reveal>

        <div className="flex flex-wrap gap-3">
          {['Residential', 'Commercial', 'Renovation'].map((category) => (
            <span key={category} className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">
              {category}
            </span>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {projects.length ? (
            projects.map((project, index) => {
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
            })
          ) : (
            <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 text-slate-300 shadow-glow lg:col-span-2">
              Project highlights will appear here once published.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
