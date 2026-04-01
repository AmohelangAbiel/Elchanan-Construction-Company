import Link from 'next/link';
import { ArrowUpRight, MessageSquareText, UserCircle2 } from 'lucide-react';

type DiscussionCardProps = {
  slug: string;
  title: string;
  meta: string;
  comments: number;
  lastUpdated: string;
};

export function DiscussionCard({ slug, title, meta, comments, lastUpdated }: DiscussionCardProps) {
  return (
    <Link
      href={`/forum/${slug}`}
      className="interactive-card group block p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="mt-2 inline-flex items-center gap-2 text-sm leading-6 text-slate-400">
            <UserCircle2 size={14} />
            {meta}
          </p>
        </div>
        <div className="rounded-3xl bg-slate-900 px-4 py-2 text-sm text-brand-sky">
          <span className="inline-flex items-center gap-2">
            <MessageSquareText size={14} />
            {comments} replies
          </span>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Updated {lastUpdated}</p>
        <ArrowUpRight size={16} className="text-brand-cyan transition duration-200 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
