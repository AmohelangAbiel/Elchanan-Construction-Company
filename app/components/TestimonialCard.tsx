import { Quote, Star } from 'lucide-react';

type TestimonialCardProps = {
  name: string;
  role: string;
  quote: string;
  rating: number;
};

export function TestimonialCard({ name, role, quote, rating }: TestimonialCardProps) {
  return (
    <article className="interactive-card group p-6">
      <div className="flex items-center gap-4">
        <div className="icon-pill-lg group-hover:border-brand-cyan/70 group-hover:bg-brand-cyan/20">
          <Quote size={22} />
        </div>
        <div>
          <p className="text-lg font-semibold text-white">{name}</p>
          <p className="text-sm text-slate-400">{role}</p>
        </div>
      </div>
      <p className="mt-5 text-sm leading-7 text-slate-300">{quote}</p>
      <div className="mt-5 flex gap-1 text-brand-sky" aria-label={`${rating} out of 5`}>
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} size={15} className={index < rating ? 'fill-brand-sky text-brand-sky' : 'text-slate-700'} />
        ))}
      </div>
    </article>
  );
}
