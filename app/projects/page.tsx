import { ProjectCard } from '../components/ProjectCard';
import { SectionHeading } from '../components/SectionHeading';
import { getPublishedProjects } from '../../lib/content';
import { createPageMetadata } from '../../lib/seo';

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
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title="Projects that reflect precision and delivery discipline"
          subtitle="Portfolio"
          description="A selection of published build, renovation, and infrastructure projects showcasing quality execution."
        />

        <div className="mt-14 grid gap-8 lg:grid-cols-2">
          {projects.length ? (
            projects.map((project) => (
              <ProjectCard
                key={project.id}
                title={project.title}
                category={project.category}
                description={project.summary}
                image={project.image}
                slug={project.slug}
              />
            ))
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
