import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { requireAdminSession } from '../../../lib/auth';
import { TASK_PRIORITIES, TASK_STATUSES } from '../../../lib/constants';
import { CRM_ROLES } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
import { AdminFlash } from '../components/AdminFlash';
import { AdminTopNav } from '../components/AdminTopNav';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseDateInput(value?: string, isEndOfDay = false) {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;

  if (isEndOfDay) {
    parsed.setHours(23, 59, 59, 999);
  } else {
    parsed.setHours(0, 0, 0, 0);
  }

  return parsed;
}

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(CRM_ROLES);

  const selectedStatus = firstParam(searchParams?.status);
  const selectedPriority = firstParam(searchParams?.priority);
  const selectedAssignee = firstParam(searchParams?.assignee);
  const mine = firstParam(searchParams?.mine) === '1';
  const leadIdPrefill = firstParam(searchParams?.leadId);
  const enquiryIdPrefill = firstParam(searchParams?.enquiryId);
  const quoteIdPrefill = firstParam(searchParams?.quoteRequestId) || firstParam(searchParams?.quoteId);

  const dueFromRaw = firstParam(searchParams?.dueFrom);
  const dueToRaw = firstParam(searchParams?.dueTo);
  let dueFrom = parseDateInput(dueFromRaw);
  let dueTo = parseDateInput(dueToRaw, true);
  if (dueFrom && dueTo && dueFrom.getTime() > dueTo.getTime()) {
    [dueFrom, dueTo] = [dueTo, dueFrom];
  }

  const admins = await prisma.adminUser.findMany({
    where: { isActive: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, role: true },
  });

  const validatedAssignee = selectedAssignee && admins.some((admin) => admin.id === selectedAssignee)
    ? selectedAssignee
    : undefined;

  const where: Prisma.FollowUpTaskWhereInput = {
    deletedAt: null,
  };

  if (selectedStatus && TASK_STATUSES.includes(selectedStatus as (typeof TASK_STATUSES)[number])) {
    where.status = selectedStatus as (typeof TASK_STATUSES)[number];
  }

  if (selectedPriority && TASK_PRIORITIES.includes(selectedPriority as (typeof TASK_PRIORITIES)[number])) {
    where.priority = selectedPriority as (typeof TASK_PRIORITIES)[number];
  }

  if (mine) {
    where.assignedToAdminId = session.userId;
  } else if (validatedAssignee) {
    where.assignedToAdminId = validatedAssignee;
  }

  if (dueFrom || dueTo) {
    where.dueAt = {
      ...(dueFrom ? { gte: dueFrom } : {}),
      ...(dueTo ? { lte: dueTo } : {}),
    };
  }

  const [tasks, leads, enquiries, quotes, deliveryProjects, statusCounts, overdueCount] = await Promise.all([
    prisma.followUpTask.findMany({
      where,
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 80,
      include: {
        assignedToAdmin: {
          select: { id: true, name: true, role: true },
        },
        lead: {
          select: { id: true, fullName: true },
        },
        enquiry: {
          select: { id: true, referenceCode: true, subject: true },
        },
        quoteRequest: {
          select: { id: true, referenceCode: true, serviceType: true },
        },
        deliveryProject: {
          select: { id: true, title: true },
        },
      },
    }),
    prisma.lead.findMany({
      where: { deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 30,
      select: { id: true, fullName: true, status: true },
    }),
    prisma.contactEnquiry.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, referenceCode: true, subject: true, status: true },
    }),
    prisma.quoteRequest.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, referenceCode: true, serviceType: true, status: true },
    }),
    prisma.deliveryProject.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, title: true, status: true },
    }),
    Promise.all(
      TASK_STATUSES.map((status) =>
        prisma.followUpTask.count({ where: { deletedAt: null, status } }),
      ),
    ),
    prisma.followUpTask.count({
      where: {
        deletedAt: null,
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        dueAt: { lt: new Date() },
      },
    }),
  ]);

  const queryParams = new URLSearchParams();
  if (selectedStatus) queryParams.set('status', selectedStatus);
  if (selectedPriority) queryParams.set('priority', selectedPriority);
  if (!mine && validatedAssignee) queryParams.set('assignee', validatedAssignee);
  if (mine) queryParams.set('mine', '1');
  if (dueFromRaw) queryParams.set('dueFrom', dueFromRaw);
  if (dueToRaw) queryParams.set('dueTo', dueToRaw);
  const returnTo = queryParams.toString() ? `/admin/tasks?${queryParams.toString()}` : '/admin/tasks';

  const pipeline = TASK_STATUSES.map((status, index) => ({
    status,
    count: statusCounts[index] || 0,
  }));

  const now = Date.now();

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        {firstParam(searchParams?.created) === '1' ? <AdminFlash message="Task created successfully." /> : null}
        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Task updated successfully." /> : null}

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Follow-up tasks</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Task ownership and reminders</h1>
          <p className="mt-3 text-slate-400">Manage due-date tasks linked to leads, enquiries, quotes, and converted projects.</p>
        </section>

        {overdueCount > 0 ? (
          <section className="mb-6 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm text-amber-100">
            {overdueCount} task{overdueCount === 1 ? '' : 's'} are overdue and need attention.
          </section>
        ) : null}

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select name="status" defaultValue={selectedStatus || ''} className="interactive-input mt-2">
                <option value="">All statuses</option>
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Priority</span>
              <select name="priority" defaultValue={selectedPriority || ''} className="interactive-input mt-2">
                <option value="">All priorities</option>
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assignee</span>
              <select name="assignee" defaultValue={validatedAssignee || ''} className="interactive-input mt-2">
                <option value="">All assignees</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Due from</span>
              <input type="date" name="dueFrom" defaultValue={dueFromRaw || ''} className="interactive-input mt-2" />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Due to</span>
              <input type="date" name="dueTo" defaultValue={dueToRaw || ''} className="interactive-input mt-2" />
            </label>

            <div className="space-y-2">
              <label className="mt-7 flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="mine" value="1" defaultChecked={mine} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                My tasks only
              </label>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-xs uppercase tracking-[0.16em]">Apply</button>
                <Link href="/admin/tasks" className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">Reset</Link>
              </div>
            </div>
          </form>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {pipeline.map((item) => (
            <article key={item.status} className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.status.replace('_', ' ')}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.count}</p>
            </article>
          ))}
        </section>

        <section className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <h2 className="text-xl font-semibold text-white">Create task</h2>
          <form action="/api/admin/tasks" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Title</span>
              <input name="title" required className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Description</span>
              <textarea name="description" rows={3} className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Status</span>
              <select name="status" defaultValue="OPEN" className="interactive-input mt-2">
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Priority</span>
              <select name="priority" defaultValue="MEDIUM" className="interactive-input mt-2">
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{priority}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Due date and time</span>
              <input type="datetime-local" name="dueAt" required className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Assign to</span>
              <select name="assignedToAdminId" defaultValue="" className="interactive-input mt-2">
                <option value="">Unassigned</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Lead (optional)</span>
              <select name="leadId" defaultValue={leadIdPrefill || ''} className="interactive-input mt-2">
                <option value="">None</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>{lead.fullName} ({lead.status})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Enquiry (optional)</span>
              <select name="enquiryId" defaultValue={enquiryIdPrefill || ''} className="interactive-input mt-2">
                <option value="">None</option>
                {enquiries.map((enquiry) => (
                  <option key={enquiry.id} value={enquiry.id}>{enquiry.referenceCode} - {enquiry.subject}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Quote (optional)</span>
              <select name="quoteRequestId" defaultValue={quoteIdPrefill || ''} className="interactive-input mt-2">
                <option value="">None</option>
                {quotes.map((quote) => (
                  <option key={quote.id} value={quote.id}>{quote.referenceCode} - {quote.serviceType} ({quote.status})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Delivery project (optional)</span>
              <select name="deliveryProjectId" defaultValue="" className="interactive-input mt-2">
                <option value="">None</option>
                {deliveryProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title} ({project.status})</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary lg:col-span-2 lg:w-fit">Create task</button>
          </form>
        </section>

        <section className="grid gap-4">
          {tasks.length ? tasks.map((task) => {
            const isOverdue = task.status !== 'DONE' && task.status !== 'CANCELLED' && new Date(task.dueAt).getTime() < now;
            return (
              <Link
                key={task.id}
                href={`/admin/tasks/${task.id}?returnTo=${encodeURIComponent(returnTo)}`}
                className="interactive-card rounded-[2rem] p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-400">Due {new Date(task.dueAt).toLocaleString()}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      {task.lead ? <span>Lead: {task.lead.fullName}</span> : null}
                      {task.enquiry ? <span>Enquiry: {task.enquiry.referenceCode}</span> : null}
                      {task.quoteRequest ? <span>Quote: {task.quoteRequest.referenceCode}</span> : null}
                      {task.deliveryProject ? <span>Project: {task.deliveryProject.title}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-200">{task.status}</span>
                    <span className="rounded-full border border-brand-cyan/40 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-brand-cyan">{task.priority}</span>
                    {isOverdue ? <span className="rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-200">Overdue</span> : null}
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-400">Owner: {task.assignedToAdmin?.name || 'Unassigned'}</p>
              </Link>
            );
          }) : (
            <AdminFlash tone="warning" message="No tasks matched the active filters." />
          )}
        </section>
      </div>
    </main>
  );
}
