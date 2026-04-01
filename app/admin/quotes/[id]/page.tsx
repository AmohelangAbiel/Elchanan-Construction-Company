import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LEAD_STATUSES } from '../../../../lib/constants';
import { prisma } from '../../../../lib/prisma';
import { requireAdminSession } from '../../../../lib/auth';
import { safeRedirectPath } from '../../../../lib/api';
import { buildQuoteResponseDraft } from '../../../../lib/quote-response';
import { OPERATIONS_ROLES } from '../../../../lib/permissions';
import { AdminTopNav } from '../../components/AdminTopNav';
import { AdminFlash } from '../../components/AdminFlash';

type SearchParamValue = string | string[] | undefined;

type LineItem = {
  label?: string;
  amount?: string;
};

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

function lineItemsToText(input: unknown) {
  if (!Array.isArray(input)) return '';

  return input
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const typed = item as LineItem;
      if (!typed.label) return null;
      return `${typed.label}${typed.amount ? ` | ${typed.amount}` : ''}`;
    })
    .filter((item): item is string => Boolean(item))
    .join('\n');
}

function formatCurrency(value: unknown) {
  if (typeof value !== 'number') return 'Not set';
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(value);
}

async function getQuote(id: string) {
  return prisma.quoteRequest.findFirst({
    where: { id, deletedAt: null },
    include: {
      lead: {
        select: { id: true, fullName: true, status: true },
      },
      assignedToAdmin: {
        select: { id: true, name: true, role: true },
      },
      convertedProject: {
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
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
        take: 25,
      },
      activities: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
}

export default async function AdminQuoteDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(OPERATIONS_ROLES);
  const [quote, admins] = await Promise.all([
    getQuote(params.id),
    prisma.adminUser.findMany({
      where: { isActive: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true },
    }),
  ]);

  if (!quote) return notFound();

  const rawReturnTo = firstParam(searchParams?.returnTo);
  const returnTo = safeRedirectPath(rawReturnTo, '/admin/quotes', ['/admin/quotes']);
  const visibleActivities = quote.activities.filter(isVisibleWorkflowActivity);

  const lineItemsText = lineItemsToText(quote.lineItems);

  const responseDraft = buildQuoteResponseDraft({
    fullName: quote.fullName,
    serviceType: quote.serviceType,
    projectType: quote.projectType,
    location: quote.location,
    estimatedBudgetRange: quote.estimatedBudgetRange,
    preferredStartDate: quote.preferredStartDate,
    siteVisitRequired: quote.siteVisitRequired,
    referenceCode: quote.referenceCode,
    projectDescription: quote.projectDescription,
  });

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminTopNav role={session.role} />
        {firstParam(searchParams?.updated) === '1' ? (
          <AdminFlash message="Quote request updated successfully." />
        ) : null}

        <Link
          href={returnTo}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan transition hover:text-white"
        >
          <span aria-hidden="true">&larr;</span>
          Back to quotes
        </Link>

        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Quote request</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{quote.fullName}</h1>
              <p className="mt-2 text-slate-400">Reference {quote.referenceCode}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-800/70 px-4 py-2 text-sm uppercase tracking-[0.3em] text-slate-300">{quote.status}</span>
              {quote.quoteSentAt ? (
                <span className="rounded-full bg-emerald-500/20 px-4 py-2 text-sm uppercase tracking-[0.2em] text-emerald-200">Quote sent</span>
              ) : null}
              {quote.assignedToAdmin ? (
                <span className="rounded-full border border-brand-cyan/40 bg-brand-cyan/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-brand-cyan">{quote.assignedToAdmin.name}</span>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/admin/quotes/${quote.id}/document`} className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
              Open branded quotation view
            </Link>
            <Link href={`/admin/quotes/${quote.id}/document?print=1`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
              Print / PDF-ready view
            </Link>
            {quote.lead ? (
              <Link href={`/admin/leads/${quote.lead.id}`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
                Open linked lead
              </Link>
            ) : null}
            <Link href={`/admin/tasks?quoteRequestId=${quote.id}`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
              Create follow-up task
            </Link>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[0.95fr_0.85fr]">
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Project and contact details</p>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-400">Name:</span> {quote.fullName}</p>
                  <p><span className="text-slate-400">Phone:</span> {quote.phone}</p>
                  <p><span className="text-slate-400">Email:</span> {quote.email}</p>
                  <p><span className="text-slate-400">Service:</span> {quote.serviceType}</p>
                  <p><span className="text-slate-400">Project type:</span> {quote.projectType || 'Not specified'}</p>
                  <p><span className="text-slate-400">Location:</span> {quote.location || 'Not specified'}</p>
                  <p><span className="text-slate-400">Budget:</span> {quote.estimatedBudgetRange || 'Not specified'}</p>
                  <p><span className="text-slate-400">Preferred start:</span> {quote.preferredStartDate ? new Date(quote.preferredStartDate).toLocaleDateString() : 'Flexible'}</p>
                  <p><span className="text-slate-400">Site visit required:</span> {quote.siteVisitRequired ? 'Yes' : 'No'}</p>
                  <p><span className="text-slate-400">Consent given:</span> {quote.consentGiven ? 'Yes' : 'No'}</p>
                  <p><span className="text-slate-400">Submitted:</span> {new Date(quote.createdAt).toLocaleString()}</p>
                  <p><span className="text-slate-400">Last contacted:</span> {quote.lastContactedAt ? new Date(quote.lastContactedAt).toLocaleString() : 'Not logged yet'}</p>
                  <p><span className="text-slate-400">Quote sent:</span> {quote.quoteSentAt ? new Date(quote.quoteSentAt).toLocaleString() : 'Not yet sent'}</p>
                  <p>
                    <span className="text-slate-400">Attachment:</span>{' '}
                    {quote.attachmentUrl ? (
                      <a href={quote.attachmentUrl} target="_blank" rel="noreferrer" className="text-brand-cyan hover:text-white">
                        View attached link
                      </a>
                    ) : (
                      'None provided'
                    )}
                  </p>
                  <p>
                    <span className="text-slate-400">Linked lead:</span>{' '}
                    {quote.lead ? (
                      <Link href={`/admin/leads/${quote.lead.id}`} className="text-brand-cyan hover:text-white">
                        {quote.lead.fullName} ({quote.lead.status})
                      </Link>
                    ) : 'Not linked'}
                  </p>
                </div>
              </div>

              {quote.convertedProject ? (
                <div className="rounded-[2rem] border border-emerald-400/30 bg-emerald-500/10 p-6">
                  <p className="text-sm uppercase tracking-[0.3em] text-emerald-200">Converted delivery project</p>
                  <p className="mt-3 text-lg font-semibold text-white">{quote.convertedProject.title}</p>
                  <p className="mt-1 text-sm text-emerald-100/90">Status: {quote.convertedProject.status}</p>
                  <p className="mt-1 text-xs text-emerald-100/70">Created {new Date(quote.convertedProject.createdAt).toLocaleString()}</p>
                </div>
              ) : null}

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Project description</p>
                <p className="mt-4 whitespace-pre-line text-slate-300">{quote.projectDescription}</p>
              </div>

              <div className="rounded-[2rem] border border-brand-cyan/25 bg-brand-cyan/5 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-cyan">Quote summary (print-ready)</p>
                <div className="mt-4 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
                  <p>Client: {quote.fullName}</p>
                  <p>Reference: {quote.referenceCode}</p>
                  <p>Service: {quote.serviceType}</p>
                  <p>Status: {quote.status}</p>
                  <p>Subtotal: {formatCurrency(quote.estimateSubtotal ? Number(quote.estimateSubtotal) : undefined)}</p>
                  <p>Total: {formatCurrency(quote.estimateTotal ? Number(quote.estimateTotal) : undefined)}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Follow-up tasks</p>
                  <Link href={`/admin/tasks?quoteRequestId=${quote.id}`} className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-cyan hover:text-white">Create task</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {quote.tasks.length ? quote.tasks.map((task) => (
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
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Email response preparation (future send workflow)</p>
                <p className="mt-3 text-sm text-slate-400">This draft block prepares response context for upcoming email-send integration.</p>
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-200">
                  <p className="font-semibold text-white">Subject: {responseDraft.subject}</p>
                  <p className="mt-3">{responseDraft.greeting}</p>
                  <ul className="mt-3 list-disc space-y-1 pl-5 text-slate-300">
                    {responseDraft.contextLines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-slate-300">{responseDraft.closing}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Communication timeline</p>
                <div className="mt-4 space-y-3">
                  {quote.communications.length ? quote.communications.map((item) => (
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
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Update quote workflow</p>
              <form action={`/api/admin/quotes/${quote.id}`} method="post" className="mt-6 space-y-5">
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue={quote.status} className="interactive-input mt-3">
                    {['NEW', 'REVIEWING', 'RESPONDED', 'WON', 'LOST', 'ARCHIVED'].map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-white">Assign to</span>
                  <select name="assignedToAdminId" defaultValue={quote.assignedToAdminId || ''} className="interactive-input mt-3">
                    <option value="">Unassigned</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-white">Lead status override (optional)</span>
                  <select name="leadStatus" defaultValue="" className="interactive-input mt-3">
                    <option value="">Auto-sync from quote status</option>
                    {LEAD_STATUSES.map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-white">Estimator / admin notes</span>
                  <textarea name="internalNotes" defaultValue={quote.internalNotes ?? ''} rows={4} className="interactive-input mt-3" />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-white">Follow-up notes</span>
                  <textarea name="followUpNotes" defaultValue={quote.followUpNotes ?? ''} rows={4} className="interactive-input mt-3" />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Last contacted</span>
                    <input type="datetime-local" name="lastContactedAt" defaultValue={toDateTimeLocalValue(quote.lastContactedAt)} className="interactive-input mt-3" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Quote sent at</span>
                    <input type="datetime-local" name="quoteSentAt" defaultValue={toDateTimeLocalValue(quote.quoteSentAt)} className="interactive-input mt-3" />
                  </label>
                </div>

                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input type="hidden" name="quoteSentNow" value="false" />
                  <input type="checkbox" name="quoteSentNow" value="true" className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                  Mark quote as sent now
                </label>

                {!quote.convertedProject ? (
                  <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/10 p-4">
                    <label className="flex items-center gap-3 text-sm text-emerald-100">
                      <input type="hidden" name="convertToProject" value="false" />
                      <input type="checkbox" name="convertToProject" value="true" className="h-4 w-4 rounded border-emerald-400/50 bg-slate-900 text-emerald-300" />
                      Convert to delivery project when saving (requires status WON)
                    </label>
                    <label className="mt-3 block">
                      <span className="text-sm font-semibold text-emerald-100">Project title (optional override)</span>
                      <input name="deliveryProjectTitle" className="interactive-input mt-2" />
                    </label>
                    <label className="mt-3 block">
                      <span className="text-sm font-semibold text-emerald-100">Target start date</span>
                      <input type="datetime-local" name="deliveryProjectStartTarget" className="interactive-input mt-2" />
                    </label>
                    <label className="mt-3 block">
                      <span className="text-sm font-semibold text-emerald-100">Project notes</span>
                      <textarea name="deliveryProjectNotes" rows={3} className="interactive-input mt-2" />
                    </label>
                  </div>
                ) : null}

                <label className="block">
                  <span className="text-sm font-semibold text-white">Quote summary (client-facing)</span>
                  <textarea name="quoteSummary" defaultValue={quote.quoteSummary ?? ''} rows={3} className="interactive-input mt-3" />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-white">Attachment URL</span>
                  <input name="attachmentUrl" defaultValue={quote.attachmentUrl ?? ''} className="interactive-input mt-3" />
                  <p className="mt-2 text-xs text-slate-400">
                    Upload attachments from <Link href="/admin/media" className="text-brand-cyan hover:text-white">Media manager</Link> with type <span className="font-semibold">quote</span>.
                  </p>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-white">Scope notes</span>
                  <textarea name="scopeNotes" defaultValue={quote.scopeNotes ?? ''} rows={4} className="interactive-input mt-3" />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-white">Line items (one per line: Item | Amount)</span>
                  <textarea name="lineItemsText" defaultValue={lineItemsText} rows={5} className="interactive-input mt-3" />
                </label>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Subtotal (ZAR)</span>
                    <input name="estimateSubtotal" type="number" min={0} step="0.01" defaultValue={quote.estimateSubtotal ? Number(quote.estimateSubtotal) : ''} className="interactive-input mt-3" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Tax (ZAR)</span>
                    <input name="estimateTax" type="number" min={0} step="0.01" defaultValue={quote.estimateTax ? Number(quote.estimateTax) : ''} className="interactive-input mt-3" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Total (ZAR)</span>
                    <input name="estimateTotal" type="number" min={0} step="0.01" defaultValue={quote.estimateTotal ? Number(quote.estimateTotal) : ''} className="interactive-input mt-3" />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-white">Validity period (days)</span>
                  <input name="validityDays" type="number" min={1} max={365} defaultValue={quote.validityDays || 14} className="interactive-input mt-3" />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-white">Exclusions</span>
                  <textarea name="exclusions" defaultValue={quote.exclusions ?? ''} rows={3} className="interactive-input mt-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Assumptions</span>
                  <textarea name="assumptions" defaultValue={quote.assumptions ?? ''} rows={3} className="interactive-input mt-3" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Terms / disclaimer</span>
                  <textarea name="termsDisclaimer" defaultValue={quote.termsDisclaimer ?? ''} rows={4} className="interactive-input mt-3" />
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
                  Save quote
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
