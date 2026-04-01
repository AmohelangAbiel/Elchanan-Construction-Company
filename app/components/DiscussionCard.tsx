import Link from 'next/link';
import { ArrowUpRight, MessageSquareText, UserCircle2 } from 'lucide-react';
import { CardImage } from './media/CardImage';
import { resolveForumImage } from '../../lib/site-visuals';

type DiscussionCardProps = {
  slug: string;
  title: string;
  meta: string;
  comments: number;
  lastUpdated: string;
};

export function DiscussionCard({ slug, title, meta, comments, lastUpdated }: DiscussionCardProps) {
  const visual = resolveForumImage(meta);

  return (
    <Link
      href={`/forum/${slug}`}
      className="interactive-card photo-card group block overflow-hidden p-6"
    >
      <CardImage src={visual.src} alt={visual.alt} badge="Discussion" aspectClassName="h-36" className="-m-6 mb-6 rounded-b-[1.5rem]">
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-[18rem]">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="mt-2 inline-flex items-center gap-2 text-sm leading-6 text-white/75">
              <UserCircle2 size={14} />
              {meta}
            </p>
          </div>
          <ArrowUpRight size={18} className="text-brand-cyan transition duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </CardImage>
      <div className="flex items-center justify-between gap-4">
        <div className="rounded-3xl bg-slate-900/80 px-4 py-2 text-sm text-brand-sky">
          <span className="inline-flex items-center gap-2">
            <MessageSquareText size={14} />
            {comments} replies
          </span>
        </div>
        <p className="text-sm text-slate-500">Updated {lastUpdated}</p>
      </div>
    </Link>
  );
}
