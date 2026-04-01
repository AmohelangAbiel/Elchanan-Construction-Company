import Link from 'next/link';
import { requireAdminSession } from '../../../lib/auth';
import {
  canAccessContent,
  canAccessCrm,
  canAccessModeration,
} from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
import { AdminTopNav } from '../components/AdminTopNav';

export const dynamic = 'force-dynamic';

export default async function AdminMyWorkPage() {
  const session = await requireAdminSession();

  const hasCrmAccess = canAccessCrm(session.role);
  const hasModerationAccess = canAccessModeration(session.role);
  const hasContentAccess = canAccessContent(session.role);

  const [
    myOpenTasks,
    myAssignedLeads,
    myAssignedEnquiries,
    myAssignedQuotes,
    pendingReviews,
    pendingThreads,
    pendingReplies,
    draftServices,
    draftProjects,
  ] = await Promise.all([
    hasCrmAccess
      ? prisma.followUpTask.findMany({
        where: {
          deletedAt: null,
          assignedToAdminId: session.userId,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        take: 12,
      })
      : Promise.resolve([]),
    hasCrmAccess
      ? prisma.lead.findMany({
        where: {
          deletedAt: null,
          assignedToAdminId: session.userId,
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 8,
      })
      : Promise.resolve([]),
    hasCrmAccess
      ? prisma.contactEnquiry.findMany({
        where: {
          deletedAt: null,
          assignedToAdminId: session.userId,
          status: { in: ['NEW', 'IN_PROGRESS'] },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 8,
      })
      : Promise.resolve([]),
    hasCrmAccess
      ? prisma.quoteRequest.findMany({
        where: {
          deletedAt: null,
          assignedToAdminId: session.userId,
          status: { in: ['NEW', 'REVIEWING', 'RESPONDED'] },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 8,
      })
      : Promise.resolve([]),
    hasModerationAccess
      ? prisma.review.count({ where: { deletedAt: null, status: 'PENDING' } })
      : Promise.resolve(0),
    hasModerationAccess
      ? prisma.forumThread.count({ where: { deletedAt: null, status: 'PENDING' } })
      : Promise.resolve(0),
    hasModerationAccess
      ? prisma.forumReply.count({ where: { deletedAt: null, status: 'PENDING' } })
      : Promise.resolve(0),
    hasContentAccess
      ? prisma.service.count({ where: { deletedAt: null, published: false } })
      : Promise.resolve(0),
    hasContentAccess
      ? prisma.project.count({ where: { deletedAt: null, status: 'DRAFT' } })
      : Promise.resolve(0),
  ]);

  const overdueTasks = myOpenTasks.filter((task) => new Date(task.dueAt).getTime() < Date.now());

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">My work</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">{session.email}</h1>
          <p className="mt-3 text-slate-400">
            Personal workload snapshot for assigned operations, moderation queues, and content follow-through.
          </p>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">My open tasks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{myOpenTasks.length}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Overdue tasks</p>
            <p className="mt-2 text-3xl font-semibold text-white">{overdueTasks.length}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">My leads</p>
            <p className="mt-2 text-3xl font-semibold text-white">{myAssignedLeads.length}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pending moderation</p>
            <p className="mt-2 text-3xl font-semibold text-white">{pendingReviews + pendingThreads + pendingReplies}</p>
          </article>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">My tasks</h2>
              <Link href="/admin/tasks?mine=1" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">Open tasks page</Link>
            </div>
            <div className="mt-4 space-y-3">
              {myOpenTasks.length ? myOpenTasks.map((task) => (
                <Link key={task.id} href={`/admin/tasks/${task.id}?returnTo=/admin/my-work`} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition hover:border-brand-cyan/45">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{task.title}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{task.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">Due {new Date(task.dueAt).toLocaleString()} · {task.priority}</p>
                </Link>
              )) : (
                <p className="text-sm text-slate-400">No open tasks assigned to you.</p>
              )}
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <h2 className="text-xl font-semibold text-white">My pipeline</h2>
            <div className="mt-4 space-y-3">
              {myAssignedLeads.length ? myAssignedLeads.map((lead) => (
                <Link key={lead.id} href={`/admin/leads/${lead.id}?returnTo=/admin/my-work`} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition hover:border-brand-cyan/45">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{lead.fullName}</p>
                    <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{lead.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{lead.email}</p>
                </Link>
              )) : (
                <p className="text-sm text-slate-400">No leads are currently assigned to you.</p>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Assigned enquiries</p>
                <p className="mt-2 text-2xl font-semibold text-white">{myAssignedEnquiries.length}</p>
              </article>
              <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Assigned quotes</p>
                <p className="mt-2 text-2xl font-semibold text-white">{myAssignedQuotes.length}</p>
              </article>
            </div>
          </section>
        </div>

        {(hasModerationAccess || hasContentAccess) ? (
          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            {hasModerationAccess ? (
              <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
                <h3 className="text-lg font-semibold text-white">Moderation queue</h3>
                <p className="mt-3 text-sm text-slate-300">Pending reviews: {pendingReviews}</p>
                <p className="mt-1 text-sm text-slate-300">Pending threads: {pendingThreads}</p>
                <p className="mt-1 text-sm text-slate-300">Pending replies: {pendingReplies}</p>
                <Link href="/admin/forum" className="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">Open moderation</Link>
              </article>
            ) : null}

            {hasContentAccess ? (
              <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
                <h3 className="text-lg font-semibold text-white">Content backlog</h3>
                <p className="mt-3 text-sm text-slate-300">Draft services: {draftServices}</p>
                <p className="mt-1 text-sm text-slate-300">Draft projects: {draftProjects}</p>
                <Link href="/admin/projects" className="mt-4 inline-flex text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">Open content</Link>
              </article>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
