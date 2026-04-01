import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { requireAdminSession } from '../../../lib/auth';
import { LEAD_STATUSES } from '../../../lib/constants';
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

export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(CRM_ROLES);

  const selectedStatus = firstParam(searchParams?.status);
  const selectedAssignee = firstParam(searchParams?.assignee);
  const mine = firstParam(searchParams?.mine) === '1';
  const dateFromRaw = firstParam(searchParams?.from);
  const dateToRaw = firstParam(searchParams?.to);

  const dateFrom = parseDateInput(dateFromRaw);
  const dateTo = parseDateInput(dateToRaw, true);
  const admins = await prisma.adminUser.findMany({
    where: { isActive: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true, role: true },
  });

  const validatedAssignee = selectedAssignee && admins.some((admin) => admin.id === selectedAssignee)
    ? selectedAssignee
    : undefined;

  const where: Prisma.LeadWhereInput = {
    deletedAt: null,
  };

  if (selectedStatus && LEAD_STATUSES.includes(selectedStatus as (typeof LEAD_STATUSES)[number])) {
    where.status = selectedStatus as (typeof LEAD_STATUSES)[number];
  }

  if (mine) {
    where.assignedToAdminId = session.userId;
  } else if (validatedAssignee) {
    where.assignedToAdminId = validatedAssignee;
  }

  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    };
  }

  const [leads, statusCounts] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 60,
      include: {
        assignedToAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            enquiries: true,
            quotes: true,
            tasks: true,
            deliveryProjects: true,
          },
        },
      },
    }),
    Promise.all(
      LEAD_STATUSES.map((status) =>
        prisma.lead.count({
          where: { deletedAt: null, status },
        }),
      ),
    ),
  ]);

  const queryParams = new URLSearchParams();
  if (selectedStatus) queryParams.set('status', selectedStatus);
  if (!mine && validatedAssignee) queryParams.set('assignee', validatedAssignee);
  if (mine) queryParams.set('mine', '1');
  if (dateFromRaw) queryParams.set('from', dateFromRaw);
  if (dateToRaw) queryParams.set('to', dateToRaw);
  const returnTo = queryParams.toString()
    ? `/admin/leads?${queryParams.toString()}`
    : '/admin/leads';

  const pipeline = LEAD_STATUSES.map((status, index) => ({
    status,
    count: statusCounts[index] || 0,
  }));

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        {firstParam(searchParams?.created) === '1' ? (
          <AdminFlash message="Lead created successfully." />
        ) : null}
        {firstParam(searchParams?.updated) === '1' ? (
          <AdminFlash message="Lead updated successfully." />
        ) : null}

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">CRM leads</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Lead ownership and progression</h1>
          <p className="mt-3 text-slate-400">
            Track lead lifecycle, assignment ownership, and downstream activity from enquiry through quote outcomes.
          </p>
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select name="status" defaultValue={selectedStatus || ''} className="interactive-input mt-2">
                <option value="">All statuses</option>
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
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
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">From date</span>
              <input name="from" type="date" defaultValue={dateFromRaw || ''} className="interactive-input mt-2" />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">To date</span>
              <input name="to" type="date" defaultValue={dateToRaw || ''} className="interactive-input mt-2" />
            </label>

            <label className="mt-7 flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="mine" value="1" defaultChecked={mine} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
              My assigned leads only
            </label>

            <div className="flex items-end gap-2">
              <button type="submit" className="btn-primary flex-1 py-2 text-xs uppercase tracking-[0.16em]">Apply</button>
              <Link href="/admin/leads" className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">Reset</Link>
            </div>
          </form>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          {pipeline.map((item) => (
            <article key={item.status} className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.status.replace('_', ' ')}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.count}</p>
            </article>
          ))}
        </section>

        <section className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <h2 className="text-xl font-semibold text-white">Create lead</h2>
          <form action="/api/admin/leads" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
            <input type="hidden" name="returnTo" value={returnTo} />
            <label className="block">
              <span className="text-sm font-semibold text-white">Full name</span>
              <input name="fullName" required className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Email</span>
              <input name="email" type="email" required className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Phone</span>
              <input name="phone" required className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Company (optional)</span>
              <input name="companyName" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Location</span>
              <input name="location" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Status</span>
              <select name="status" defaultValue="NEW" className="interactive-input mt-2">
                {LEAD_STATUSES.map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
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
              <span className="text-sm font-semibold text-white">Tags (comma-separated)</span>
              <input name="tagsText" className="interactive-input mt-2" placeholder="residential, high-priority" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Internal notes</span>
              <textarea name="notes" rows={4} className="interactive-input mt-2" />
            </label>
            <button type="submit" className="btn-primary lg:col-span-2 lg:w-fit">Create lead</button>
          </form>
        </section>

        <div className="mb-4 text-sm text-slate-400">
          Showing <span className="font-semibold text-white">{leads.length}</span> lead{leads.length === 1 ? '' : 's'} based on current filters.
        </div>

        <section className="grid gap-4">
          {leads.length ? leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/admin/leads/${lead.id}?returnTo=${encodeURIComponent(returnTo)}`}
              className="interactive-card rounded-[2rem] p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{lead.fullName}</p>
                  <p className="mt-1 text-sm text-slate-400">{lead.email} · {lead.phone}</p>
                  <p className="mt-1 text-sm text-slate-500">{lead.location || 'Location not set'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-200">{lead.status}</span>
                  {lead.assignedToAdmin ? (
                    <span className="rounded-full border border-brand-cyan/40 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-brand-cyan">
                      {lead.assignedToAdmin.name}
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-400">Unassigned</span>
                  )}
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>Enquiries: {lead._count.enquiries}</span>
                <span>Quotes: {lead._count.quotes}</span>
                <span>Tasks: {lead._count.tasks}</span>
                <span>Projects: {lead._count.deliveryProjects}</span>
                <span>Updated: {new Date(lead.updatedAt).toLocaleDateString()}</span>
              </div>
            </Link>
          )) : (
            <AdminFlash tone="warning" message="No leads matched the active filters." />
          )}
        </section>
      </div>
    </main>
  );
}
