import { Quote, Star } from 'lucide-react';
import { CardImage } from './media/CardImage';
import { resolveReviewImage } from '../../lib/site-visuals';

type TestimonialCardProps = {
  name: string;
  role: string;
  quote: string;
  rating: number;
};

export function TestimonialCard({ name, role, quote, rating }: TestimonialCardProps) {
  const visual = resolveReviewImage(role);

  return (
    <article className="interactive-card photo-card group overflow-hidden p-6">
      <CardImage src={visual.src} alt={visual.alt} badge="Client voice" aspectClassName="h-36" className="-m-6 mb-6 rounded-b-[1.5rem]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/70">{role}</p>
          </div>
          <div className="icon-pill-lg border-white/15 bg-slate-950/75 text-brand-cyan backdrop-blur-sm group-hover:border-brand-cyan/70 group-hover:bg-brand-cyan/20">
            <Quote size={22} />
          </div>
        </div>
      </CardImage>
      <p className="text-sm leading-7 text-slate-300">{quote}</p>
      <div className="mt-5 flex gap-1 text-brand-sky" aria-label={`${rating} out of 5`}>
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} size={15} className={index < rating ? 'fill-brand-sky text-brand-sky' : 'text-slate-700'} />
        ))}
      </div>
    </article>
  );
}
