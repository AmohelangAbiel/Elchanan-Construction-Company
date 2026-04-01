import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Hammer } from 'lucide-react';
import { CardImage } from './media/CardImage';
import { resolveServiceImage } from '../../lib/site-visuals';

type ServiceCardProps = {
  title: string;
  summary: string;
  details: string[];
  image?: string | null;
  icon?: string;
  slug?: string;
};

export function ServiceCard({ title, summary, details, image, icon = 'SC', slug }: ServiceCardProps) {
  const visual = resolveServiceImage({ slug, title, image });

  const content = (
    <>
      <CardImage src={visual.src} alt={visual.alt} badge={icon} className="-m-6 mb-6 rounded-b-[1.5rem]">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-[15rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-cyan/90">Field delivery</p>
            <p className="mt-2 text-lg font-semibold text-white">{title}</p>
          </div>
          <div className="icon-pill-lg border-white/15 bg-slate-950/75 text-brand-cyan backdrop-blur-sm group-hover:border-brand-cyan/70 group-hover:bg-brand-cyan/20">
            <Hammer size={22} strokeWidth={2} />
          </div>
        </div>
      </CardImage>
      <p className="text-sm leading-7 text-slate-300">{summary}</p>
      <ul className="mt-5 space-y-2.5 text-sm text-slate-300">
        {details.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-sky" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">
        Explore service
        <ArrowUpRight size={14} className="transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
    </>
  );

  if (slug) {
    return (
      <Link
        href={`/services/${slug}`}
        className="interactive-card photo-card group block overflow-hidden rounded-3xl p-6"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="interactive-card photo-card group overflow-hidden rounded-3xl p-6">
      {content}
    </article>
  );
}
