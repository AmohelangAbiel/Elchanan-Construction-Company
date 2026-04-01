import Link from 'next/link';
import { ArrowUpRight, Building2 } from 'lucide-react';
import { CardImage } from './media/CardImage';

type ProjectCardProps = {
  title: string;
  category: string;
  description: string;
  image: string;
  imageAlt?: string;
  slug?: string;
};

export function ProjectCard({ title, category, description, image, imageAlt, slug }: ProjectCardProps) {
  const content = (
    <>
      <CardImage
        src={image}
        alt={imageAlt || title}
        badge={category}
        className="rounded-b-[1.5rem]"
        sizes="(min-width: 1024px) 42vw, 100vw"
      >
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-[18rem]">
            <p className="text-sm font-semibold text-white/80">Delivered project</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
          </div>
          <ArrowUpRight size={18} className="shrink-0 text-brand-cyan transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </CardImage>
      <div className="space-y-3 p-6">
        <div className="flex items-center gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-brand-sky">
            <Building2 size={14} />
            {category}
          </p>
        </div>
        <p className="text-sm leading-7 text-slate-300">{description}</p>
      </div>
    </>
  );

  if (slug) {
    return (
      <Link
        href={`/projects/${slug}`}
        className="interactive-card photo-card group block overflow-hidden"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="interactive-card photo-card group overflow-hidden">
      {content}
    </article>
  );
}
