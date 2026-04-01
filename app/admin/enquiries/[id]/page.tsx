import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '../../../../lib/prisma';
import { requireAdminSession } from '../../../../lib/auth';
import { OPERATIONS_ROLES } from '../../../../lib/permissions';
import { safeRedirectPath } from '../../../../lib/api';
import { AdminTopNav } from '../../components/AdminTopNav';
import { AdminFlash } from '../../components/AdminFlash';

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

async function getEnquiry(id: string) {
  return prisma.contactEnquiry.findFirst({
    where: { id, deletedAt: null },
    include: {
      lead: {
        select: {
          id: true,
          fullName: true,
          status: true,
        },
      },
      assignedToAdmin: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      tasks: {
        where: { deletedAt: null },
        orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
        take: 8,
        select: {
          id: true,
          title: true,
          status: true,
          dueAt: true,
        },
      },
      communications: {
        orderBy: { occurredAt: 'desc' },
        take: 20,
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
}

export default async function AdminEnquiryDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(OPERATIONS_ROLES);
  const [enquiry, admins] = await Promise.all([
    getEnquiry(params.id),
    prisma.adminUser.findMany({
      where: { isActive: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true },
    }),
  ]);

  if (!enquiry) return notFound();

  const rawReturnTo = firstParam(searchParams?.returnTo);
  const returnTo = safeRedirectPath(rawReturnTo, '/admin/enquiries', ['/admin/enquiries']);
  const visibleActivities = enquiry.activities.filter(isVisibleWorkflowActivity);

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminTopNav role={session.role} />
        {firstParam(searchParams?.updated) === '1' ? (
          <AdminFlash message="Enquiry updated successfully." />
        ) : null}

        <Link
          href={returnTo}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan transition hover:text-white"
        >
          <span aria-hidden="true">&larr;</span>
          Back to enquiries
        </Link>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Enquiry detail</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{enquiry.subject}</h1>
              <p className="mt-2 text-slate-400">Reference {enquiry.referenceCode}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800/70 px-4 py-2 text-sm uppercase tracking-[0.3em] text-slate-300">{enquiry.status}</span>
              {enquiry.assignedToAdmin ? (
                <span className="rounded-full border border-brand-cyan/40 bg-brand-cyan/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-brand-cyan">
                  {enquiry.assignedToAdmin.name}
                </span>
              ) : (
                <span className="rounded-full border border-slate-700 px-4 py-2 text-xs uppercase tracking-[0.16em] text-slate-400">Unassigned</span>
              )}
            </div>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_0.85fr]">
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Contact and submission</p>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-400">Name:</span> {enquiry.fullName}</p>
                  <p><span className="text-slate-400">Phone:</span> {enquiry.phone}</p>
                  <p><span className="text-slate-400">Email:</span> {enquiry.email}</p>
                  <p><span className="text-slate-400">Service interest:</span> {enquiry.serviceInterest || 'General enquiry'}</p>
                  <p><span className="text-slate-400">Preferred contact:</span> {enquiry.preferredContactMethod || 'Not specified'}</p>
                  <p><span className="text-slate-400">Location:</span> {enquiry.location || 'Not specified'}</p>
                  <p><span className="text-slate-400">Consent given:</span> {enquiry.consentGiven ? 'Yes' : 'No'}</p>
                  <p><span className="text-slate-400">Submitted:</span> {new Date(enquiry.createdAt).toLocaleString()}</p>
                  <p><span className="text-slate-400">Last contacted:</span> {enquiry.lastContactedAt ? new Date(enquiry.lastContactedAt).toLocaleString() : 'Not logged yet'}</p>
                  <p>
                    <span className="text-slate-400">Linked lead:</span>{' '}
                    {enquiry.lead ? (
                      <Link href={`/admin/leads/${enquiry.lead.id}`} className="text-brand-cyan hover:text-white">
                        {enquiry.lead.fullName} ({enquiry.lead.status})
                      </Link>
                    ) : (
                      'Not linked'
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Message</p>
                <p className="mt-4 whitespace-pre-line text-slate-300">{enquiry.message}</p>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Follow-up tasks</p>
                  <Link href={`/admin/tasks?enquiryId=${enquiry.id}`} className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">
                    Create task
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {enquiry.tasks.length ? enquiry.tasks.map((task) => (
                    <Link key={task.id} href={`/admin/tasks/${task.id}`} className="block rounded-xl border border-slate-800 bg-slate-900/70 p-3 transition hover:border-brand-cyan/45">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{task.title}</p>
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{task.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Due {new Date(task.dueAt).toLocaleString()}</p>
                    </Link>
                  )) : (
                    <p className="text-sm text-slate-400">No follow-up tasks linked yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Communication timeline</p>
                <div className="mt-4 space-y-3">
                  {enquiry.communications.length ? enquiry.communications.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
                        <span>{item.channel}</span>
                        <span>{item.direction}</span>
                        <span>{new Date(item.occurredAt).toLocaleString()}</span>
                      </div>
                      {item.subject ? <p className="mt-2 text-sm font-semibold text-white">{item.subject}</p> : null}
                      <p className="mt-2 whitespace-pre-line text-sm text-slate-300">{item.message}</p>
                    </article>
                  )) : (
                    <p className="text-sm text-slate-400">No communication events logged yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Activity timeline</p>
                <div className="mt-4 space-y-3">
                  {visibleActivities.length ? visibleActivities.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/80 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{item.title}</p>
                        <span className="text-xs uppercase tracking-[0.16em] text-slate-400">{item.type}</span>
                      </div>
                      {item.description ? <p className="mt-2 text-sm text-slate-300">{item.description}</p> : null}
                      <p className="mt-2 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
                    </article>
                  )) : (
                    <p className="text-sm text-slate-400">No workflow activity entries recorded yet.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Update enquiry</p>
              <form action={`/api/admin/enquiries/${enquiry.id}`} method="post" className="mt-6 space-y-5">
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue={enquiry.status} className="interactive-input mt-3">
                    {['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'].map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Assign to</span>
                  <select name="assignedToAdminId" defaultValue={enquiry.assignedToAdminId || ''} className="interactive-input mt-3">
                    <option value="">Unassigned</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Internal notes</span>
                  <textarea name="notes" defaultValue={enquiry.notes ?? ''} rows={4} className="interactive-input mt-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Follow-up notes</span>
                  <textarea name="followUpNotes" defaultValue={enquiry.followUpNotes ?? ''} rows={4} className="interactive-input mt-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Last contacted</span>
                  <input type="datetime-local" name="lastContactedAt" defaultValue={toDateTimeLocalValue(enquiry.lastContactedAt)} className="interactive-input mt-3" />
                </label>

                <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-cyan">Log communication event (optional)</p>
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

                <button type="submit" className="btn-primary w-full">
                  Save update
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
