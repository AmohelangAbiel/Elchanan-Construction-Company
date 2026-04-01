import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getOpenForumThreadBySlug } from '../../../lib/content';
import { createPageMetadata } from '../../../lib/seo';

export const dynamic = 'force-dynamic';

type PageProps = { params: { slug: string }; searchParams?: { reply?: string } };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const thread = await getOpenForumThreadBySlug(params.slug);

  if (!thread) {
    return createPageMetadata({
      title: 'Discussion Not Found | Elchanan Construction Company',
      description: 'The requested forum discussion is not available.',
      path: `/forum/${params.slug}`,
    });
  }

  return createPageMetadata({
    title: `${thread.title} | Construction Forum`,
    description: thread.excerpt || thread.content.slice(0, 160),
    path: `/forum/${thread.slug}`,
  });
}

export default async function ThreadPage({ params, searchParams }: PageProps) {
  const thread = await getOpenForumThreadBySlug(params.slug);
  if (!thread) return notFound();

  const replyStatus = searchParams?.reply;
  const replyMessageMap: Record<string, string> = {
    pending: 'Reply submitted and awaiting moderation.',
    invalid: 'Please complete all reply fields correctly.',
    blocked: 'Reply rejected due to blocked terms.',
    closed: 'This thread is currently closed for replies.',
    'rate-limited': 'Too many attempts. Please wait before posting again.',
    spam: 'Spam check failed. Please try again.',
    error: 'Unable to submit your reply right now.',
  };
  const replyMessage = replyStatus ? replyMessageMap[replyStatus] : undefined;

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Forum thread</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{thread.title}</h1>
              <p className="mt-2 text-sm text-slate-400">
                Posted by {thread.authorName}
                {thread.category ? ` - ${thread.category.name}` : ''}
              </p>
            </div>
            <Link href="/forum" className="inline-flex items-center rounded-full border border-white/10 bg-slate-900/80 px-4 py-2 text-sm text-slate-200 transition hover:border-brand-sky hover:text-white">
              Back to forum
            </Link>
          </div>
          <div className="mt-8 space-y-6 text-slate-300">
            <p>{thread.content}</p>
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Thread status</p>
              <p className="mt-2 text-white">Open for approved replies</p>
            </div>
          </div>
        </div>

        <section className="mt-10 space-y-6">
          {replyMessage ? (
            <div className="rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 px-5 py-4 text-sm text-slate-100">
              {replyMessage}
            </div>
          ) : null}

          <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow">
            <h2 className="text-2xl font-semibold text-white">Replies</h2>
            <div className="mt-6 space-y-4">
              {thread.replies.length ? (
                thread.replies.map((reply) => (
                  <div key={reply.id} className="rounded-3xl border border-slate-800/70 bg-slate-900/80 p-5">
                    <p className="text-sm font-semibold text-white">{reply.authorName}</p>
                    <p className="mt-2 text-slate-300">{reply.content}</p>
                    <p className="mt-3 text-xs text-slate-500">Posted on {reply.createdAt.toLocaleDateString()}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">No approved replies yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow">
            <h2 className="text-2xl font-semibold text-white">Add a reply</h2>
            <p className="mt-3 text-sm text-slate-400">Replies are moderated before they appear publicly.</p>
            <form action={`/api/forum/${thread.slug}/replies`} method="post" className="mt-6 grid gap-5">
              <input type="hidden" name="honeypot" value="" />
              <label className="block">
                <span className="text-sm font-semibold text-white">Your name</span>
                <input name="authorName" required className="interactive-input mt-3" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white">Email</span>
                <input name="authorEmail" type="email" className="interactive-input mt-3" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white">Reply</span>
                <textarea name="content" required rows={4} className="interactive-input mt-3" />
              </label>
              <button type="submit" className="btn-primary w-full">
                Submit reply for moderation
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

