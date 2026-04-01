import Link from 'next/link';
import { ArrowUpRight, CheckCircle2, Wrench } from 'lucide-react';

type ServiceCardProps = {
  title: string;
  summary: string;
  details: string[];
  icon?: string;
  slug?: string;
};

export function ServiceCard({ title, summary, details, icon = 'SC', slug }: ServiceCardProps) {
  const content = (
    <>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="icon-pill-lg group-hover:border-brand-cyan/70 group-hover:bg-brand-cyan/20">
          <Wrench size={22} strokeWidth={2} />
        </div>
        <span className="rounded-full border border-brand-cyan/25 bg-brand-cyan/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand-cyan">
          {icon}
        </span>
      </div>
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-300">{summary}</p>
      <ul className="mt-4 space-y-2 text-sm text-slate-400">
        {details.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-brand-sky" />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-cyan">
        Learn more
        <ArrowUpRight size={14} className="transition duration-200 group-hover:translate-x-0.5" />
      </div>
    </>
  );

  if (slug) {
    return (
      <Link
        href={`/services/${slug}`}
        className="interactive-card group block overflow-hidden rounded-3xl p-6"
      >
        {content}
      </Link>
    );
  }

  return (
    <article className="interactive-card group overflow-hidden rounded-3xl p-6">
      {content}
    </article>
  );
}
