import Link from 'next/link';
import { SectionHeading } from '../components/SectionHeading';
import { defaultSolutions } from '../../lib/content';
import { createPageMetadata } from '../../lib/seo';

export const metadata = createPageMetadata({
  title: 'Solutions | Elchanan Construction Company',
  description:
    'Flexible construction service packages tailored for residential and commercial project needs.',
  path: '/solutions',
});

export default function SolutionsPage() {
  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title="Solutions and service packages"
          subtitle="Service packages"
          description="Flexible construction solutions that simplify project scoping and accelerate confident decision-making."
        />

        <div className="mt-14 grid gap-6 xl:grid-cols-3">
          {defaultSolutions.map((solution) => (
            <div key={solution.title} className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow transition hover:-translate-y-0.5 hover:border-brand-sky/60 hover:bg-slate-900/90">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">{solution.title}</p>
              <p className="mt-5 text-2xl font-semibold text-white">{solution.highlight}</p>
              <ul className="mt-6 space-y-3 text-slate-300">
                {solution.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-1 inline-block h-2 w-2 rounded-full bg-brand-cyan" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/quote" className="mt-8 inline-flex items-center justify-center rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-sky">
                {solution.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

