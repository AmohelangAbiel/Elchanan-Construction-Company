import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminSession } from '../../../../lib/auth';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../../../lib/constants';
import { CRM_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { safeRedirectPath } from '../../../../lib/api';
import { AdminFlash } from '../../components/AdminFlash';
import { AdminTopNav } from '../../components/AdminTopNav';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toDateTimeLocalValue(value: Date | null | undefined) {
  if (!value) return '';
  const date = new Date(value.getTime() - value.getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
}

async function getTask(id: string) {
  return prisma.followUpTask.findFirst({
    where: { id, deletedAt: null },
    include: {
      assignedToAdmin: {
        select: { id: true, name: true, email: true },
      },
      createdByAdmin: {
        select: { id: true, name: true },
      },
      lead: {
        select: { id: true, fullName: true, status: true },
      },
      enquiry: {
        select: { id: true, referenceCode: true, subject: true, status: true },
      },
      quoteRequest: {
        select: { id: true, referenceCode: true, serviceType: true, status: true },
      },
      deliveryProject: {
        select: { id: true, title: true, status: true },
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
}

export default async function AdminTaskDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(CRM_ROLES);

  const [task, admins] = await Promise.all([
    getTask(params.id),
    prisma.adminUser.findMany({
      where: { isActive: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true },
    }),
  ]);

  if (!task) return notFound();

  const rawReturnTo = firstParam(searchParams?.returnTo);
  const returnTo = safeRedirectPath(rawReturnTo, '/admin/tasks', ['/admin/tasks']);

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminTopNav role={session.role} />
        {firstParam(searchParams?.created) === '1' ? <AdminFlash message="Task created successfully." /> : null}
        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Task updated successfully." /> : null}

        <Link
          href={returnTo}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan transition hover:text-white"
        >
          <span aria-hidden="true">&larr;</span>
          Back to tasks
        </Link>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Task detail</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{task.title}</h1>
              <p className="mt-2 text-slate-400">Created by {task.createdByAdmin?.name || 'System'} · Due {new Date(task.dueAt).toLocaleString()}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800/70 px-4 py-2 text-xs uppercase tracking-[0.16em] text-slate-200">{task.status}</span>
              <span className="rounded-full border border-brand-cyan/40 bg-brand-cyan/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-brand-cyan">{task.priority}</span>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.95fr_0.85fr]">
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Task context</p>
                <p className="mt-4 whitespace-pre-line text-sm text-slate-300">{task.description || 'No description provided.'}</p>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-400">Owner:</span> {task.assignedToAdmin?.name || 'Unassigned'}</p>
                  <p><span className="text-slate-400">Created:</span> {new Date(task.createdAt).toLocaleString()}</p>
                  <p><span className="text-slate-400">Started:</span> {task.startedAt ? new Date(task.startedAt).toLocaleString() : 'Not started'}</p>
                  <p><span className="text-slate-400">Completed:</span> {task.completedAt ? new Date(task.completedAt).toLocaleString() : 'Not completed'}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Linked records</p>
                <div className="mt-4 space-y-3 text-sm">
                  {task.lead ? (
                    <Link href={`/admin/leads/${task.lead.id}`} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-slate-200 transition hover:border-brand-cyan/45">
                      Lead: {task.lead.fullName} ({task.lead.status})
                    </Link>
                  ) : null}
                  {task.enquiry ? (
                    <Link href={`/admin/enquiries/${task.enquiry.id}`} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-slate-200 transition hover:border-brand-cyan/45">
                      Enquiry: {task.enquiry.referenceCode} - {task.enquiry.subject}
                    </Link>
                  ) : null}
                  {task.quoteRequest ? (
                    <Link href={`/admin/quotes/${task.quoteRequest.id}`} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-slate-200 transition hover:border-brand-cyan/45">
                      Quote: {task.quoteRequest.referenceCode} - {task.quoteRequest.serviceType}
                    </Link>
                  ) : null}
                  {task.deliveryProject ? (
                    <article className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-slate-200">
                      Delivery project: {task.deliveryProject.title} ({task.deliveryProject.status})
                    </article>
                  ) : null}
                  {!task.lead && !task.enquiry && !task.quoteRequest && !task.deliveryProject ? (
                    <p className="text-slate-400">No linked records for this task.</p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Task timeline</p>
                <div className="mt-4 space-y-3">
                  {task.activities.length ? task.activities.map((activity) => (
                    <article key={activity.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{activity.title}</p>
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{activity.type}</span>
                      </div>
                      {activity.description ? <p className="mt-2 text-sm text-slate-300">{activity.description}</p> : null}
                      <p className="mt-2 text-xs text-slate-500">{new Date(activity.createdAt).toLocaleString()}</p>
                    </article>
                  )) : (
                    <p className="text-sm text-slate-400">No timeline events recorded yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Update task</p>
              <form action={`/api/admin/tasks/${task.id}`} method="post" className="mt-6 space-y-4">
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Title</span>
                  <input name="title" defaultValue={task.title} required className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Description</span>
                  <textarea name="description" rows={4} defaultValue={task.description || ''} className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue={task.status} className="interactive-input mt-2">
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Priority</span>
                  <select name="priority" defaultValue={task.priority} className="interactive-input mt-2">
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Due date and time</span>
                  <input type="datetime-local" name="dueAt" defaultValue={toDateTimeLocalValue(task.dueAt)} required className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Assign to</span>
                  <select name="assignedToAdminId" defaultValue={task.assignedToAdminId || ''} className="interactive-input mt-2">
                    <option value="">Unassigned</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="btn-primary w-full">Save task</button>
              </form>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
