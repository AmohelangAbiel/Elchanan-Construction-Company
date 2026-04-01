import Link from 'next/link';
import { CalendarDays, NotebookPen, ShieldCheck } from 'lucide-react';
import { requireAdminSession } from '../../../lib/auth';
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

export default async function AdminSiteLogsPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(SITE_OPERATIONS_ROLES);

  const selectedProjectId = firstParam(searchParams?.projectId);

  const [projects, logs] = await Promise.all([
    prisma.deliveryProject.findMany({
      where: { deletedAt: null, status: { in: ['ACTIVE', 'PLANNED', 'ON_HOLD'] } },
      orderBy: [{ updatedAt: 'desc' }],
      select: { id: true, title: true, projectCode: true },
    }),
    prisma.siteLog.findMany({
      where: {
        ...(selectedProjectId ? { deliveryProjectId: selectedProjectId } : {}),
      },
      orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        deliveryProject: {
          select: { id: true, title: true, projectCode: true },
        },
        createdByAdmin: {
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  const returnTo = selectedProjectId ? `/admin/site-logs?projectId=${encodeURIComponent(selectedProjectId)}` : '/admin/site-logs';

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.siteLogCreated) === '1' ? <AdminFlash message="Site log created successfully." /> : null}
        {firstParam(searchParams?.siteLogUpdated) === '1' ? <AdminFlash message="Site log updated successfully." /> : null}

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Site logs</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Daily delivery visibility timeline</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Internal-first field reporting for completed work, issues, next steps, weather conditions, and attachment references.
          </p>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><NotebookPen size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Visible log entries</p>
                <p className="mt-2 text-3xl font-semibold text-white">{logs.length}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><CalendarDays size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Latest log</p>
                <p className="mt-2 text-sm font-semibold text-white">{logs[0] ? new Date(logs[0].logDate).toLocaleDateString() : 'None yet'}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><ShieldCheck size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Share-ready later</p>
                <p className="mt-2 text-3xl font-semibold text-white">{logs.filter((log) => log.clientVisible).length}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Internal-only</p>
            <p className="mt-2 text-3xl font-semibold text-white">{logs.filter((log) => !log.clientVisible).length}</p>
          </article>
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Project</span>
              <select name="projectId" defaultValue={selectedProjectId || ''} className="interactive-input mt-2">
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title} {project.projectCode ? `(${project.projectCode})` : ''}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary mt-7 px-5 py-3 text-xs uppercase tracking-[0.16em]">Apply</button>
            <Link href="/admin/site-logs" className="btn-ghost mt-7 px-5 py-3 text-xs uppercase tracking-[0.16em]">Reset</Link>
          </form>
        </section>

        <section className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <h2 className="text-xl font-semibold text-white">Create site log entry</h2>
          <form action="/api/admin/site-logs" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
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
            <label className="block">
              <span className="text-sm font-semibold text-white">Log date</span>
              <input name="logDate" type="date" defaultValue={toDateInputValue(new Date())} required className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Weather / conditions</span>
              <input name="weatherConditions" className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Summary</span>
              <textarea name="summary" rows={3} required className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Work completed</span>
              <textarea name="workCompleted" rows={3} className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Issues / risks</span>
              <textarea name="issuesRisks" rows={3} className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Next steps</span>
              <textarea name="nextSteps" rows={3} className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Attachment URLs (one per line)</span>
              <textarea name="attachmentUrlsText" rows={3} className="interactive-input mt-2" />
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300 lg:col-span-2">
              <input type="hidden" name="clientVisible" value="false" />
              <input type="checkbox" name="clientVisible" value="true" className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
              Mark as potentially client-shareable later (not exposed automatically)
            </label>
            <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
              Create site log
            </button>
          </form>
        </section>

        <section className="space-y-4">
          {logs.length ? logs.map((log) => (
            <details key={log.id} className="interactive-card rounded-[2rem] p-6">
              <summary className="list-none cursor-pointer">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{new Date(log.logDate).toLocaleDateString()}</p>
                    <p className="mt-1 text-sm text-slate-400">{log.deliveryProject.title} {log.deliveryProject.projectCode ? `· ${log.deliveryProject.projectCode}` : ''}</p>
                    <p className="mt-2 text-xs text-slate-500">{log.createdByAdmin ? `By ${log.createdByAdmin.name}` : 'Author not recorded'} {log.weatherConditions ? `· ${log.weatherConditions}` : ''}</p>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${log.clientVisible ? 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan' : 'border-slate-700 bg-slate-900/80 text-slate-300'}`}>
                    {log.clientVisible ? 'Share-ready' : 'Internal only'}
                  </span>
                </div>
              </summary>

              <form action={`/api/admin/site-logs/${log.id}`} method="post" className="mt-4 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="deliveryProjectId" value={log.deliveryProjectId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Log date</span>
                  <input name="logDate" type="date" defaultValue={toDateInputValue(log.logDate)} required className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Weather / conditions</span>
                  <input name="weatherConditions" defaultValue={log.weatherConditions || ''} className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Summary</span>
                  <textarea name="summary" defaultValue={log.summary} rows={3} required className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Work completed</span>
                  <textarea name="workCompleted" defaultValue={log.workCompleted || ''} rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Issues / risks</span>
                  <textarea name="issuesRisks" defaultValue={log.issuesRisks || ''} rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Next steps</span>
                  <textarea name="nextSteps" defaultValue={log.nextSteps || ''} rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Attachment URLs</span>
                  <textarea name="attachmentUrlsText" defaultValue={log.attachmentUrls.join('\n')} rows={3} className="interactive-input mt-2" />
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300 lg:col-span-2">
                  <input type="hidden" name="clientVisible" value="false" />
                  <input type="checkbox" name="clientVisible" value="true" defaultChecked={log.clientVisible} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                  Mark as potentially client-shareable later (not exposed automatically)
                </label>
                <div className="flex flex-wrap gap-3 lg:col-span-2">
                  <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em]">
                    Save site log
                  </button>
                  <Link href={`/admin/projects/${log.deliveryProjectId}/operations`} className="btn-ghost px-5 py-3 text-xs uppercase tracking-[0.16em]">
                    Open project operations
                  </Link>
                </div>
              </form>
            </details>
          )) : (
            <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
              <h2 className="text-xl font-semibold text-white">No site logs matched the current view</h2>
              <p className="mt-2 text-sm text-slate-400">Create the first internal update to start building a reliable execution timeline.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
