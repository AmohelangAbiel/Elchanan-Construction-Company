import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { requireAdminSession } from '../../../lib/auth';
import { MODERATION_ROLES } from '../../../lib/permissions';
import { AdminTopNav } from '../components/AdminTopNav';
import { AdminFlash } from '../components/AdminFlash';

export const dynamic = 'force-dynamic';

const threadStatuses = ['PENDING', 'OPEN', 'LOCKED', 'HIDDEN'] as const;

type SearchParamValue = string | string[] | undefined;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function AdminForumPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(MODERATION_ROLES);

  const selectedStatus = firstParam(searchParams?.status);

  const where: Prisma.ForumThreadWhereInput = {
    deletedAt: null,
  };

  if (selectedStatus && threadStatuses.includes(selectedStatus as (typeof threadStatuses)[number])) {
    where.status = selectedStatus as (typeof threadStatuses)[number];
  }

  const [threads, snapshot, pendingReplyCount] = await Promise.all([
    prisma.forumThread.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 30,
      include: {
        _count: {
          select: {
            replies: true,
          },
        },
      },
    }),
    Promise.all(
      threadStatuses.map((status) =>
        prisma.forumThread.count({
          where: { deletedAt: null, status },
        }),
      ),
    ),
    prisma.forumReply.count({ where: { deletedAt: null, status: 'PENDING' } }),
  ]);

  const snapshotMap = threadStatuses.map((status, index) => ({
    status,
    count: snapshot[index] || 0,
  }));

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Forum</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Discussion moderation</h1>
          <p className="mt-3 text-slate-400">Review and manage forum threads before they appear to the public.</p>
          <p className="mt-2 text-sm text-brand-cyan">Pending replies awaiting moderation: {pendingReplyCount}</p>
        </div>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Thread status</span>
              <select
                name="status"
                defaultValue={selectedStatus || ''}
                className="mt-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All statuses</option>
                {threadStatuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-sky"
            >
              Apply
            </button>
            <Link
              href="/admin/forum"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-cyan/60 hover:text-white"
            >
              Reset
            </Link>
          </form>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshotMap.map((item) => (
            <div key={item.status} className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 shadow-glow">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.status}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{item.count}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-4">
          {threads.length ? threads.map((thread) => (
            <Link
              key={thread.id}
              href={`/admin/forum/${thread.id}`}
              className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 shadow-glow transition hover:-translate-y-0.5 hover:border-brand-sky/50"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{thread.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{thread.authorName}</p>
                </div>
                <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">{thread.status}</span>
              </div>
              <p className="mt-3 text-xs uppercase tracking-[0.16em] text-slate-400">Replies: {thread._count.replies}</p>
            </Link>
          )) : (
            <AdminFlash tone="warning" message="No forum threads found for this filter." />
          )}
        </div>
      </div>
    </main>
  );
}




