import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { ClipboardList, TriangleAlert, Wrench } from 'lucide-react';
import { requireAdminSession } from '../../../lib/auth';
import { SITE_TASK_STATUSES, TASK_PRIORITIES } from '../../../lib/constants';
import { formatStatusLabel } from '../../../lib/operations';
import { SITE_OPERATIONS_ROLES } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
import { AdminFlash } from '../components/AdminFlash';
import { AdminTopNav } from '../components/AdminTopNav';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toDateInputValue(value: Date | null | undefined) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function statusTone(status: string) {
  if (status === 'DONE') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'BLOCKED' || status === 'URGENT') return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  if (status === 'IN_PROGRESS') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'TODO') return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function AdminSiteTasksPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(SITE_OPERATIONS_ROLES);

  const selectedStatus = firstParam(searchParams?.status);
  const selectedProjectId = firstParam(searchParams?.projectId);
  const selectedAssigneeId = firstParam(searchParams?.assigneeId);
  const selectedPriority = firstParam(searchParams?.priority);

  const [projects, admins, tasks, overdueCount, blockedCount] = await Promise.all([
    prisma.deliveryProject.findMany({
      where: { deletedAt: null, status: { in: ['ACTIVE', 'PLANNED', 'ON_HOLD'] } },
      orderBy: [{ updatedAt: 'desc' }],
      select: { id: true, title: true, projectCode: true },
    }),
    prisma.adminUser.findMany({
      where: { isActive: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true },
    }),
    prisma.siteTask.findMany({
      where: {
        ...(selectedStatus && SITE_TASK_STATUSES.includes(selectedStatus as (typeof SITE_TASK_STATUSES)[number])
          ? { status: selectedStatus as (typeof SITE_TASK_STATUSES)[number] }
          : {}),
        ...(selectedProjectId ? { deliveryProjectId: selectedProjectId } : {}),
        ...(selectedAssigneeId ? { assignedToAdminId: selectedAssigneeId } : {}),
        ...(selectedPriority && TASK_PRIORITIES.includes(selectedPriority as (typeof TASK_PRIORITIES)[number])
          ? { priority: selectedPriority as (typeof TASK_PRIORITIES)[number] }
          : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        deliveryProject: {
          select: { id: true, title: true, projectCode: true, status: true },
        },
        assignedToAdmin: {
          select: { id: true, name: true, role: true },
        },
        projectMilestone: {
          select: { id: true, title: true },
        },
      },
    }),
    prisma.siteTask.count({
      where: {
        status: { in: ['TODO', 'IN_PROGRESS', 'BLOCKED'] },
        dueDate: { lt: new Date() },
      },
    }),
    prisma.siteTask.count({
      where: { status: 'BLOCKED' },
    }),
  ]);

  const queryParams = new URLSearchParams();
  if (selectedStatus) queryParams.set('status', selectedStatus);
  if (selectedProjectId) queryParams.set('projectId', selectedProjectId);
  if (selectedAssigneeId) queryParams.set('assigneeId', selectedAssigneeId);
  if (selectedPriority) queryParams.set('priority', selectedPriority);
  const returnTo = queryParams.toString() ? `/admin/site-tasks?${queryParams.toString()}` : '/admin/site-tasks';

  const selectedProject = selectedProjectId ? projects.find((project) => project.id === selectedProjectId) || null : null;
  const milestones = selectedProjectId
    ? await prisma.projectMilestone.findMany({
        where: { deliveryProjectId: selectedProjectId, deletedAt: null },
        orderBy: [{ sortOrder: 'asc' }, { targetDate: 'asc' }],
        select: { id: true, title: true },
      })
    : [];

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.siteTaskCreated) === '1' ? <AdminFlash message="Site task created successfully." /> : null}
        {firstParam(searchParams?.siteTaskUpdated) === '1' ? <AdminFlash message="Site task updated successfully." /> : null}

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Site tasks</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Cross-project execution workboard</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Track overdue, blocked, and in-progress work packages across active delivery projects without mixing them into the CRM follow-up queue.
          </p>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><ClipboardList size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Visible site tasks</p>
                <p className="mt-2 text-3xl font-semibold text-white">{tasks.length}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><TriangleAlert size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Blocked</p>
                <p className="mt-2 text-3xl font-semibold text-white">{blockedCount}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><Wrench size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Overdue</p>
                <p className="mt-2 text-3xl font-semibold text-white">{overdueCount}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">In progress</p>
            <p className="mt-2 text-3xl font-semibold text-white">{tasks.filter((task) => task.status === 'IN_PROGRESS').length}</p>
          </article>
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Project</span>
              <select name="projectId" defaultValue={selectedProjectId || ''} className="interactive-input mt-2">
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title} {project.projectCode ? `(${project.projectCode})` : ''}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select name="status" defaultValue={selectedStatus || ''} className="interactive-input mt-2">
                <option value="">All statuses</option>
                {SITE_TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Priority</span>
              <select name="priority" defaultValue={selectedPriority || ''} className="interactive-input mt-2">
                <option value="">All priorities</option>
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{formatStatusLabel(priority)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assignee</span>
              <select name="assigneeId" defaultValue={selectedAssigneeId || ''} className="interactive-input mt-2">
                <option value="">All assignees</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary mt-7 px-5 py-3 text-xs uppercase tracking-[0.16em]">Apply</button>
            <Link href="/admin/site-tasks" className="btn-ghost mt-7 px-5 py-3 text-xs uppercase tracking-[0.16em]">Reset</Link>
          </form>
        </section>

        <section className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <h2 className="text-xl font-semibold text-white">Create site task</h2>
          <p className="mt-2 text-sm text-slate-400">Choose a project first if you want milestone linking in the create form.</p>
          <form action="/api/admin/site-tasks" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Project</span>
              <select name="deliveryProjectId" defaultValue={selectedProjectId || ''} className="interactive-input mt-2">
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title} {project.projectCode ? `(${project.projectCode})` : ''}</option>
                ))}
              </select>
            </label>
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
              <select name="status" defaultValue="TODO" className="interactive-input mt-2">
                {SITE_TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Priority</span>
              <select name="priority" defaultValue="MEDIUM" className="interactive-input mt-2">
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>{formatStatusLabel(priority)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Assignee</span>
              <select name="assignedToAdminId" defaultValue="" className="interactive-input mt-2">
                <option value="">Unassigned</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Linked milestone</span>
              <select name="projectMilestoneId" defaultValue="" className="interactive-input mt-2">
                <option value="">No linked milestone</option>
                {milestones.map((milestone) => (
                  <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Due date</span>
              <input name="dueDate" type="date" className="interactive-input mt-2" />
            </label>
            <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
              Create site task
            </button>
          </form>
        </section>

        <section className="grid gap-4">
          {tasks.length ? tasks.map((task) => (
            <details key={task.id} className="interactive-card rounded-[2rem] p-6">
              <summary className="list-none cursor-pointer">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{task.title}</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {task.deliveryProject.title}
                      {task.deliveryProject.projectCode ? ` · ${task.deliveryProject.projectCode}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{task.assignedToAdmin ? `Owner: ${task.assignedToAdmin.name}` : 'Unassigned'}</span>
                      {task.projectMilestone ? <span>Milestone: {task.projectMilestone.title}</span> : null}
                      {task.dueDate ? <span>Due {new Date(task.dueDate).toLocaleDateString()}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(task.status)}`}>
                      {formatStatusLabel(task.status)}
                    </span>
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(task.priority)}`}>
                      {formatStatusLabel(task.priority)}
                    </span>
                  </div>
                </div>
              </summary>

              <form action={`/api/admin/site-tasks/${task.id}`} method="post" className="mt-4 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="deliveryProjectId" value={task.deliveryProjectId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Title</span>
                  <input name="title" defaultValue={task.title} required className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Description</span>
                  <textarea name="description" defaultValue={task.description || ''} rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue={task.status} className="interactive-input mt-2">
                    {SITE_TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>{formatStatusLabel(status)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Priority</span>
                  <select name="priority" defaultValue={task.priority} className="interactive-input mt-2">
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{formatStatusLabel(priority)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Assignee</span>
                  <select name="assignedToAdminId" defaultValue={task.assignedToAdminId || ''} className="interactive-input mt-2">
                    <option value="">Unassigned</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Linked milestone</span>
                  <select name="projectMilestoneId" defaultValue={task.projectMilestoneId || ''} className="interactive-input mt-2">
                    <option value="">No linked milestone</option>
                    {task.deliveryProjectId === selectedProjectId && milestones.length
                      ? milestones.map((milestone) => (
                          <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                        ))
                      : (
                        <option value={task.projectMilestoneId || ''}>
                          {task.projectMilestone?.title || 'Select on project-specific view'}
                        </option>
                      )}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Due date</span>
                  <input name="dueDate" type="date" defaultValue={toDateInputValue(task.dueDate)} className="interactive-input mt-2" />
                </label>
                <div className="flex flex-wrap gap-3 lg:col-span-2">
                  <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em]">
                    Save site task
                  </button>
                  <Link href={`/admin/projects/${task.deliveryProjectId}/operations`} className="btn-ghost px-5 py-3 text-xs uppercase tracking-[0.16em]">
                    Open project operations
                  </Link>
                </div>
              </form>
            </details>
          )) : (
            <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
              <h2 className="text-xl font-semibold text-white">No site tasks matched the current view</h2>
              <p className="mt-2 text-sm text-slate-400">Create the first work package or widen the filters to see more project execution tasks.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
