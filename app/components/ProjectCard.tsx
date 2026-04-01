import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Building2 } from 'lucide-react';

type ProjectCardProps = {
  title: string;
  category: string;
  description: string;
  image: string;
  slug?: string;
};

export function ProjectCard({ title, category, description, image, slug }: ProjectCardProps) {
  const isLocalImage = image.startsWith('/');

  const content = (
    <>
      <div className="relative h-56 overflow-hidden bg-slate-900/80">
        <Image
          src={image}
          alt={title}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
          priority={false}
          unoptimized={!isLocalImage}
        />
      </div>
      <div className="space-y-3 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-brand-sky">
            <Building2 size={14} />
            {category}
          </p>
          <ArrowUpRight size={16} className="text-brand-cyan transition duration-200 group-hover:translate-x-0.5" />
        </div>
        <h3 className="text-2xl font-semibold text-white">{title}</h3>
        <p className="text-sm leading-7 text-slate-300">{description}</p>
      </div>
    </>
  );

  if (slug) {
    return (
      <Link
        href={`/projects/${slug}`}
        className="interactive-card group block overflow-hidden"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="interactive-card group overflow-hidden">
      {content}
    </article>
  );
}
