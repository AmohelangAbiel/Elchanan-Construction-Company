import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminSession } from '../../../../lib/auth';
import { LEAD_STATUSES } from '../../../../lib/constants';
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

function isVisibleWorkflowActivity(activity: { type: string; metadata: unknown }) {
  if (activity.type !== 'NOTE_ADDED') return true;
  if (!activity.metadata || typeof activity.metadata !== 'object' || Array.isArray(activity.metadata)) {
    return true;
  }

  const metadata = activity.metadata as Record<string, unknown>;
  return !(typeof metadata.channel === 'string' && typeof metadata.direction === 'string');
}

async function getLead(id: string) {
  return prisma.lead.findFirst({
    where: { id, deletedAt: null },
    include: {
      assignedToAdmin: {
        select: { id: true, name: true, email: true },
      },
      enquiries: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          referenceCode: true,
          subject: true,
          status: true,
          createdAt: true,
        },
      },
      quotes: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          referenceCode: true,
          serviceType: true,
          status: true,
          createdAt: true,
        },
      },
      tasks: {
        where: { deletedAt: null },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        take: 12,
        include: {
          assignedToAdmin: {
            select: { id: true, name: true },
          },
        },
      },
      deliveryProjects: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      },
      communications: {
        orderBy: { occurredAt: 'desc' },
        take: 20,
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 30,
      },
    },
  });
}

export default async function AdminLeadDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(CRM_ROLES);
  const [lead, admins] = await Promise.all([
    getLead(params.id),
    prisma.adminUser.findMany({
      where: { isActive: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true },
    }),
  ]);

  if (!lead) return notFound();

  const rawReturnTo = firstParam(searchParams?.returnTo);
  const returnTo = safeRedirectPath(rawReturnTo, '/admin/leads', ['/admin/leads']);
  const visibleActivities = lead.activities.filter(isVisibleWorkflowActivity);

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        {firstParam(searchParams?.created) === '1' ? <AdminFlash message="Lead created successfully." /> : null}
        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Lead updated successfully." /> : null}

        <Link
          href={returnTo}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan transition hover:text-white"
        >
          <span aria-hidden="true">&larr;</span>
          Back to leads
        </Link>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Lead detail</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{lead.fullName}</h1>
              <p className="mt-2 text-slate-400">{lead.email} · {lead.phone}</p>
              <p className="mt-1 text-slate-500">{lead.location || 'Location not captured'}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800/70 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-200">{lead.status}</span>
              {lead.assignedToAdmin ? (
                <span className="rounded-full border border-brand-cyan/40 bg-brand-cyan/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-brand-cyan">
                  {lead.assignedToAdmin.name}
                </span>
              ) : (
                <span className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.16em] text-slate-400">Unassigned</span>
              )}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Enquiries</p>
              <p className="mt-2 text-2xl font-semibold text-white">{lead.enquiries.length}</p>
            </article>
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Quotes</p>
              <p className="mt-2 text-2xl font-semibold text-white">{lead.quotes.length}</p>
            </article>
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Open tasks</p>
              <p className="mt-2 text-2xl font-semibold text-white">{lead.tasks.filter((task) => task.status !== 'DONE' && task.status !== 'CANCELLED').length}</p>
            </article>
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Converted projects</p>
              <p className="mt-2 text-2xl font-semibold text-white">{lead.deliveryProjects.length}</p>
            </article>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_0.85fr]">
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Linked enquiries</p>
                  <Link href="/admin/enquiries" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">Open enquiries</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {lead.enquiries.length ? lead.enquiries.map((enquiry) => (
                    <Link key={enquiry.id} href={`/admin/enquiries/${enquiry.id}`} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition hover:border-brand-cyan/45">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{enquiry.subject}</p>
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{enquiry.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{enquiry.referenceCode} · {new Date(enquiry.createdAt).toLocaleDateString()}</p>
                    </Link>
                  )) : (
                    <p className="text-sm text-slate-400">No enquiries linked to this lead yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Linked quotes</p>
                  <Link href="/admin/quotes" className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">Open quotes</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {lead.quotes.length ? lead.quotes.map((quote) => (
                    <Link key={quote.id} href={`/admin/quotes/${quote.id}`} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition hover:border-brand-cyan/45">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{quote.serviceType}</p>
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{quote.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{quote.referenceCode} · {new Date(quote.createdAt).toLocaleDateString()}</p>
                    </Link>
                  )) : (
                    <p className="text-sm text-slate-400">No quotes linked to this lead yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Follow-up tasks</p>
                  <Link href={`/admin/tasks?leadId=${lead.id}`} className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">Create task</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {lead.tasks.length ? lead.tasks.map((task) => (
                    <Link key={task.id} href={`/admin/tasks/${task.id}`} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition hover:border-brand-cyan/45">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{task.title}</p>
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{task.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Priority: {task.priority} · Due {new Date(task.dueAt).toLocaleString()}</p>
                      <p className="mt-1 text-xs text-slate-500">Owner: {task.assignedToAdmin?.name || 'Unassigned'}</p>
                    </Link>
                  )) : (
                    <p className="text-sm text-slate-400">No tasks linked yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Activity timeline</p>
                <div className="mt-4 space-y-3">
                  {visibleActivities.length ? visibleActivities.map((activity) => (
                    <article key={activity.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{activity.title}</p>
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{activity.type}</span>
                      </div>
                      {activity.description ? <p className="mt-2 text-sm text-slate-300">{activity.description}</p> : null}
                      <p className="mt-2 text-xs text-slate-500">{new Date(activity.createdAt).toLocaleString()}</p>
                    </article>
                  )) : (
                    <p className="text-sm text-slate-400">No workflow timeline events recorded for this lead yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Update lead</p>
                <form action={`/api/admin/leads/${lead.id}`} method="post" className="mt-6 space-y-4">
                  <input type="hidden" name="returnTo" value={returnTo} />

                  <label className="block">
                    <span className="text-sm font-semibold text-white">Status</span>
                    <select name="status" defaultValue={lead.status} className="interactive-input mt-2">
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>{status.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-white">Assign to</span>
                    <select name="assignedToAdminId" defaultValue={lead.assignedToAdminId || ''} className="interactive-input mt-2">
                      <option value="">Unassigned</option>
                      {admins.map((admin) => (
                        <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-white">Company</span>
                    <input name="companyName" defaultValue={lead.companyName || ''} className="interactive-input mt-2" />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-white">Location</span>
                    <input name="location" defaultValue={lead.location || ''} className="interactive-input mt-2" />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-white">Last contacted</span>
                    <input type="datetime-local" name="lastContactedAt" defaultValue={toDateTimeLocalValue(lead.lastContactedAt)} className="interactive-input mt-2" />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-white">Tags (comma-separated)</span>
                    <input name="tagsText" defaultValue={lead.tags.join(', ')} className="interactive-input mt-2" />
                  </label>

                  <label className="block">
                    <span className="text-sm font-semibold text-white">Notes</span>
                    <textarea name="notes" rows={4} defaultValue={lead.notes || ''} className="interactive-input mt-2" />
                  </label>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan">Log communication (optional)</p>
                    <label className="mt-3 block">
                      <span className="text-sm font-semibold text-white">Channel</span>
                      <select name="communicationChannel" defaultValue="NOTE" className="interactive-input mt-2">
                        {['NOTE', 'EMAIL', 'PHONE', 'WHATSAPP', 'CALL', 'MEETING', 'GENERAL', 'SYSTEM'].map((channel) => (
                          <option key={channel} value={channel}>{channel}</option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-3 block">
                      <span className="text-sm font-semibold text-white">Direction</span>
                      <select name="communicationDirection" defaultValue="INTERNAL" className="interactive-input mt-2">
                        {['INBOUND', 'OUTBOUND', 'INTERNAL'].map((direction) => (
                          <option key={direction} value={direction}>{direction}</option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-3 block">
                      <span className="text-sm font-semibold text-white">Subject</span>
                      <input name="communicationSubject" className="interactive-input mt-2" />
                    </label>
                    <label className="mt-3 block">
                      <span className="text-sm font-semibold text-white">Message</span>
                      <textarea name="communicationMessage" rows={4} className="interactive-input mt-2" />
                    </label>
                  </div>

                  <button type="submit" className="btn-primary w-full">Save lead</button>
                </form>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Communication history</p>
                <div className="mt-4 space-y-3">
                  {lead.communications.length ? lead.communications.map((item) => (
                    <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <span>{item.channel}</span>
                        <span>{item.direction}</span>
                        <span>{new Date(item.occurredAt).toLocaleString()}</span>
                      </div>
                      {item.subject ? <p className="mt-2 font-semibold text-white">{item.subject}</p> : null}
                      <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{item.message}</p>
                    </article>
                  )) : (
                    <p className="text-sm text-slate-400">No communication notes logged yet.</p>
                  )}
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
