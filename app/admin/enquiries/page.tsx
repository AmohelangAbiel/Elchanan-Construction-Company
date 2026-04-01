import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { requireAdminSession } from '../../../lib/auth';
import { OPERATIONS_ROLES } from '../../../lib/permissions';
import { AdminTopNav } from '../components/AdminTopNav';
import { AdminFlash } from '../components/AdminFlash';

export const dynamic = 'force-dynamic';

const enquiryStatuses = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED'] as const;

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

export default async function AdminEnquiriesPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(OPERATIONS_ROLES);

  const selectedStatus = firstParam(searchParams?.status);
  const selectedServiceInterest = firstParam(searchParams?.serviceInterest);
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

  const where: Prisma.ContactEnquiryWhereInput = {
    deletedAt: null,
  };

  if (selectedStatus && enquiryStatuses.includes(selectedStatus as (typeof enquiryStatuses)[number])) {
    where.status = selectedStatus as (typeof enquiryStatuses)[number];
  }

  if (selectedServiceInterest) {
    where.serviceInterest = selectedServiceInterest;
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

  const [enquiries, serviceInterestOptions, workflowSnapshot] = await Promise.all([
    prisma.contactEnquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        assignedToAdmin: {
          select: { id: true, name: true, role: true },
        },
      },
    }),
    prisma.contactEnquiry.findMany({
      where: {
        deletedAt: null,
        serviceInterest: { not: null },
      },
      select: { serviceInterest: true },
      distinct: ['serviceInterest'],
      orderBy: { serviceInterest: 'asc' },
    }),
    Promise.all(
      enquiryStatuses.map((status) =>
        prisma.contactEnquiry.count({
          where: { deletedAt: null, status },
        }),
      ),
    ),
  ]);

  const queryParams = new URLSearchParams();
  if (selectedStatus) queryParams.set('status', selectedStatus);
  if (selectedServiceInterest) queryParams.set('serviceInterest', selectedServiceInterest);
  if (!mine && validatedAssignee) queryParams.set('assignee', validatedAssignee);
  if (mine) queryParams.set('mine', '1');
  if (dateFromRaw) queryParams.set('from', dateFromRaw);
  if (dateToRaw) queryParams.set('to', dateToRaw);
  const returnTo = queryParams.toString()
    ? `/admin/enquiries?${queryParams.toString()}`
    : '/admin/enquiries';

  const snapshotMap = enquiryStatuses.map((status, index) => ({
    status,
    count: workflowSnapshot[index] || 0,
  }));

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Enquiries</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Customer enquiry management</h1>
          <p className="mt-3 text-slate-400">Review, triage, and resolve incoming enquiries with full context.</p>
        </div>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select
                name="status"
                defaultValue={selectedStatus || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All statuses</option>
                {enquiryStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Assignee</span>
              <select
                name="assignee"
                defaultValue={validatedAssignee || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All assignees</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.name} ({admin.role})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Service</span>
              <select
                name="serviceInterest"
                defaultValue={selectedServiceInterest || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All services</option>
                {serviceInterestOptions
                  .map((item) => item.serviceInterest)
                  .filter((item): item is string => Boolean(item))
                  .map((serviceInterest) => (
                    <option key={serviceInterest} value={serviceInterest}>
                      {serviceInterest}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">From date</span>
              <input
                name="from"
                type="date"
                defaultValue={dateFromRaw || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">To date</span>
              <input
                name="to"
                type="date"
                defaultValue={dateToRaw || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <div className="space-y-2">
              <label className="mt-7 flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" name="mine" value="1" defaultChecked={mine} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                My assigned enquiries
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-sky"
                >
                  Apply filters
                </button>
                <Link
                  href="/admin/enquiries"
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-cyan/60 hover:text-white"
                >
                  Reset
                </Link>
              </div>
            </div>
          </form>
        </section>

        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshotMap.map((item) => (
            <div key={item.status} className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-4 shadow-glow">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.status.replace('_', ' ')}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{item.count}</p>
            </div>
          ))}
        </section>

        <div className="mb-4 text-sm text-slate-400">
          Showing <span className="font-semibold text-white">{enquiries.length}</span> enquiry
          {enquiries.length === 1 ? '' : 'ies'} based on current filters.
        </div>

        <div className="grid gap-4">
          {enquiries.length ? enquiries.map((enquiry) => (
            <Link
              key={enquiry.id}
              href={`/admin/enquiries/${enquiry.id}?returnTo=${encodeURIComponent(returnTo)}`}
              className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 shadow-glow transition hover:-translate-y-0.5 hover:border-brand-sky/50"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{enquiry.fullName}</p>
                  <p className="mt-1 text-sm text-slate-400">{enquiry.email} - {enquiry.phone}</p>
                </div>
                <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">{enquiry.status}</span>
              </div>
              <p className="mt-4 text-sm text-slate-300">{enquiry.subject}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                <span>Reference: {enquiry.referenceCode}</span>
                <span>Service: {enquiry.serviceInterest || 'General'}</span>
                <span>Submitted: {new Date(enquiry.createdAt).toLocaleDateString()}</span>
                <span>Last contacted: {enquiry.lastContactedAt ? new Date(enquiry.lastContactedAt).toLocaleDateString() : 'Not logged'}</span>
                <span>Assignee: {enquiry.assignedToAdmin?.name || 'Unassigned'}</span>
              </div>
            </Link>
          )) : (
            <AdminFlash
              tone="warning"
              message="No enquiries matched the current filters. Try broadening the date range or clearing filters."
            />
          )}
        </div>
      </div>
    </main>
  );
}


