import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { requireAdminSession } from '../../../lib/auth';
import { BUDGET_RANGES, SERVICE_TYPES } from '../../../lib/constants';
import { OPERATIONS_ROLES } from '../../../lib/permissions';
import { AdminTopNav } from '../components/AdminTopNav';
import { AdminFlash } from '../components/AdminFlash';

export const dynamic = 'force-dynamic';

const quoteStatuses = ['NEW', 'REVIEWING', 'RESPONDED', 'WON', 'LOST', 'ARCHIVED'] as const;

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

export default async function AdminQuotesPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(OPERATIONS_ROLES);

  const selectedStatus = firstParam(searchParams?.status);
  const selectedServiceType = firstParam(searchParams?.serviceType);
  const selectedBudgetRange = firstParam(searchParams?.budgetRange);
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

  const where: Prisma.QuoteRequestWhereInput = {
    deletedAt: null,
  };

  if (selectedStatus && quoteStatuses.includes(selectedStatus as (typeof quoteStatuses)[number])) {
    where.status = selectedStatus as (typeof quoteStatuses)[number];
  }

  if (selectedServiceType && SERVICE_TYPES.includes(selectedServiceType as (typeof SERVICE_TYPES)[number])) {
    where.serviceType = selectedServiceType;
  }

  if (selectedBudgetRange && BUDGET_RANGES.includes(selectedBudgetRange as (typeof BUDGET_RANGES)[number])) {
    where.estimatedBudgetRange = selectedBudgetRange;
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

  const [quotes, workflowSnapshot] = await Promise.all([
    prisma.quoteRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        assignedToAdmin: {
          select: { id: true, name: true, role: true },
        },
        lead: {
          select: { id: true },
        },
      },
    }),
    Promise.all(
      quoteStatuses.map((status) =>
        prisma.quoteRequest.count({
          where: { deletedAt: null, status },
        }),
      ),
    ),
  ]);

  const queryParams = new URLSearchParams();
  if (selectedStatus) queryParams.set('status', selectedStatus);
  if (selectedServiceType) queryParams.set('serviceType', selectedServiceType);
  if (selectedBudgetRange) queryParams.set('budgetRange', selectedBudgetRange);
  if (!mine && validatedAssignee) queryParams.set('assignee', validatedAssignee);
  if (mine) queryParams.set('mine', '1');
  if (dateFromRaw) queryParams.set('from', dateFromRaw);
  if (dateToRaw) queryParams.set('to', dateToRaw);
  const returnTo = queryParams.toString()
    ? `/admin/quotes?${queryParams.toString()}`
    : '/admin/quotes';

  const snapshotMap = quoteStatuses.map((status, index) => ({
    status,
    count: workflowSnapshot[index] || 0,
  }));

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Quotes</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Quote request management</h1>
          <p className="mt-3 text-slate-400">Track estimator workloads, status transitions, and conversion outcomes.</p>
        </div>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select name="status" defaultValue={selectedStatus || ''} className="interactive-input mt-2">
                <option value="">All statuses</option>
                {quoteStatuses.map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Service type</span>
              <select name="serviceType" defaultValue={selectedServiceType || ''} className="interactive-input mt-2">
                <option value="">All services</option>
                {SERVICE_TYPES.map((serviceType) => (
                  <option key={serviceType} value={serviceType}>{serviceType}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Budget range</span>
              <select name="budgetRange" defaultValue={selectedBudgetRange || ''} className="interactive-input mt-2">
                <option value="">All budgets</option>
                {BUDGET_RANGES.map((range) => (
                  <option key={range} value={range}>{range}</option>
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

            <div className="space-y-2">
              <label className="mt-7 flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="mine" value="1" defaultChecked={mine} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                My assigned quotes
              </label>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 py-2 text-xs uppercase tracking-[0.16em]">Apply</button>
                <Link href="/admin/quotes" className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">Reset</Link>
              </div>
            </div>
          </form>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {snapshotMap.map((item) => (
            <div key={item.status} className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 shadow-glow">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.status.replace('_', ' ')}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{item.count}</p>
            </div>
          ))}
        </section>

        <div className="mb-4 text-sm text-slate-400">
          Showing <span className="font-semibold text-white">{quotes.length}</span> quote request{quotes.length === 1 ? '' : 's'} based on current filters.
        </div>

        <div className="grid gap-4">
          {quotes.length ? quotes.map((quote) => (
            <Link
              key={quote.id}
              href={`/admin/quotes/${quote.id}?returnTo=${encodeURIComponent(returnTo)}`}
              className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 shadow-glow transition hover:-translate-y-0.5 hover:border-brand-sky/50"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{quote.fullName}</p>
                  <p className="mt-1 text-sm text-slate-400">{quote.email} · {quote.phone}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">{quote.status}</span>
                  {quote.assignedToAdmin ? (
                    <span className="rounded-full border border-brand-cyan/40 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-brand-cyan">
                      {quote.assignedToAdmin.name}
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-400">Unassigned</span>
                  )}
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-300">Service: {quote.serviceType}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>Budget: {quote.estimatedBudgetRange || 'Not specified'}</span>
                <span>Ref: {quote.referenceCode}</span>
                <span>Submitted: {new Date(quote.createdAt).toLocaleDateString()}</span>
                <span>Quote sent: {quote.quoteSentAt ? new Date(quote.quoteSentAt).toLocaleDateString() : 'Not yet'}</span>
                <span>Lead linked: {quote.leadId ? 'Yes' : 'No'}</span>
              </div>
            </Link>
          )) : (
            <AdminFlash tone="warning" message="No quote requests matched the current filters. Try broadening the criteria." />
          )}
        </div>
      </div>
    </main>
  );
}
