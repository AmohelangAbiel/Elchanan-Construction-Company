import { BadgeCheck, ReceiptText } from 'lucide-react';

type PricingCardProps = {
  title: string;
  range: string;
  description: string;
  items: string[];
};

export function PricingCard({ title, range, description, items }: PricingCardProps) {
  return (
    <article className="interactive-card group overflow-hidden p-6">
      <div className="mb-5">
        <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-brand-sky">
          <ReceiptText size={14} />
          {title}
        </p>
        <p className="mt-3 text-3xl font-semibold text-white">{range}</p>
      </div>
      <p className="text-sm leading-7 text-slate-300">{description}</p>
      <ul className="mt-6 space-y-3 text-sm text-slate-400">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-3">
            <BadgeCheck size={14} className="mt-0.5 shrink-0 text-brand-sky" />
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}
