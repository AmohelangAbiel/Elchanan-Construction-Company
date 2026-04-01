import { notFound } from 'next/navigation';
import { prisma } from '../../../../lib/prisma';
import { requireAdminSession } from '../../../../lib/auth';
import { MODERATION_ROLES } from '../../../../lib/permissions';
import { AdminTopNav } from '../../components/AdminTopNav';
import { AdminFlash } from '../../components/AdminFlash';

export const dynamic = 'force-dynamic';

async function getThread(id: string) {
  return prisma.forumThread.findFirst({
    where: { id, deletedAt: null },
    include: { replies: { orderBy: { createdAt: 'asc' } } },
  });
}

export default async function AdminForumThreadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { updated?: string; replyUpdated?: string };
}) {
  const session = await requireAdminSession(MODERATION_ROLES);
  const thread = await getThread(params.id);
  if (!thread) return notFound();

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AdminTopNav role={session.role} />
        {searchParams?.updated === '1' ? (
          <AdminFlash message="Thread moderation saved successfully." />
        ) : null}
        {searchParams?.replyUpdated === '1' ? (
          <AdminFlash message="Reply moderation saved successfully." />
        ) : null}
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Forum thread</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{thread.title}</h1>
              <p className="mt-2 text-slate-400">Posted by {thread.authorName}</p>
            </div>
            <span className="rounded-full bg-slate-800/70 px-4 py-2 text-sm uppercase tracking-[0.3em] text-slate-300">{thread.status}</span>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_0.85fr]">
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Content</p>
                <p className="mt-4 text-slate-300 whitespace-pre-line">{thread.content}</p>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Replies</p>
                <div className="mt-4 space-y-4">
                  {thread.replies.length ? thread.replies.map((reply) => (
                    <div key={reply.id} className="rounded-3xl border border-slate-800/70 bg-slate-900/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-white">{reply.authorName}</p>
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{reply.status}</span>
                      </div>
                      <p className="mt-2 text-slate-300">{reply.content}</p>
                      <form action={`/api/admin/forum/replies/${reply.id}`} method="post" className="mt-3 flex flex-wrap items-center gap-2">
                        <input type="hidden" name="returnTo" value={`/admin/forum/${thread.id}`} />
                        <select name="status" defaultValue={reply.status} className="rounded-full border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-none focus:border-brand-sky">
                          {['PENDING', 'APPROVED', 'HIDDEN'].map((status) => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <button type="submit" className="rounded-full border border-brand-sky/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand-sky hover:bg-brand-sky/10">
                          Save Reply
                        </button>
                      </form>
                    </div>
                  )) : (
                    <p className="text-slate-400">No replies yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Moderation</p>
              <form action={`/api/admin/forum/${thread.id}`} method="post" className="mt-6 space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue={thread.status} className="interactive-input mt-3">
                    {['PENDING', 'OPEN', 'LOCKED', 'HIDDEN'].map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="btn-primary w-full">
                  Save moderation
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}





