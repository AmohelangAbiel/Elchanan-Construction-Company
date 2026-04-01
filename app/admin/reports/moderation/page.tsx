import Link from 'next/link';
import { Filter } from 'lucide-react';
import {
  getModerationReportData,
  parseModerationReportFilters,
  type SearchParamValue,
} from '../../../../lib/analytics';
import { requireAdminSession } from '../../../../lib/auth';
import { REPORTING_ROLES } from '../../../../lib/permissions';
import { AdminTopNav } from '../../components/AdminTopNav';
import { ReportsNav } from '../components/ReportsNav';
import { DistributionBars, MiniTrendChart } from '../components/Charts';

export const dynamic = 'force-dynamic';

export default async function AdminModerationReportsPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(REPORTING_ROLES);
  const filters = parseModerationReportFilters(searchParams);
  const data = await getModerationReportData(filters);

  const reviewStatusItems = [
    { label: 'Pending', value: data.summary.pendingReviews },
    { label: 'Approved', value: data.summary.approvedReviews },
    { label: 'Rejected', value: data.summary.rejectedReviews },
  ];

  const threadStatusItems = [
    { label: 'Pending', value: data.summary.pendingThreads },
    { label: 'Open', value: data.summary.openThreads },
  ];

  const replyStatusItems = [
    { label: 'Pending', value: data.summary.pendingReplies },
    { label: 'Approved', value: data.summary.approvedReplies },
    { label: 'Hidden', value: data.summary.hiddenReplies },
  ];

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        <ReportsNav />

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Moderation reporting</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Review and forum workload visibility</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Monitor moderation queues, approval ratios, and recent community submissions requiring action.
          </p>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Review status</span>
              <select
                name="reviewStatus"
                defaultValue={filters.reviewStatus || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Thread status</span>
              <select
                name="threadStatus"
                defaultValue={filters.threadStatus || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="OPEN">Open</option>
                <option value="LOCKED">Locked</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reply status</span>
              <select
                name="replyStatus"
                defaultValue={filters.replyStatus || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="HIDDEN">Hidden</option>
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">From</span>
              <input
                name="from"
                type="date"
                defaultValue={filters.fromRaw || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">To</span>
              <input
                name="to"
                type="date"
                defaultValue={filters.toRaw || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <div className="md:col-span-2 xl:col-span-5 flex flex-wrap gap-2">
              <button type="submit" className="btn-primary px-5 py-2.5 text-xs uppercase tracking-[0.16em]">
                <Filter size={14} />
                Apply filters
              </button>
              <Link href="/admin/reports/moderation" className="btn-ghost px-5 py-2.5 text-xs uppercase tracking-[0.16em]">
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pending reviews</p>
            <p className="mt-3 text-4xl font-semibold text-white">{data.summary.pendingReviews}</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pending threads</p>
            <p className="mt-3 text-4xl font-semibold text-white">{data.summary.pendingThreads}</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pending replies</p>
            <p className="mt-3 text-4xl font-semibold text-white">{data.summary.pendingReplies}</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Approved replies</p>
            <p className="mt-3 text-4xl font-semibold text-white">{data.summary.approvedReplies}</p>
          </div>
        </section>

        {data.recentQueue.length === 0 ? (
          <section className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-950/75 p-4 text-sm text-slate-300">
            No moderation activity matches the selected range and status filters.
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <MiniTrendChart title="Review submissions" subtitle="Filtered range" data={data.trends.reviews} accent="blue" />
          <MiniTrendChart title="Forum threads" subtitle="Filtered range" data={data.trends.forumThreads} accent="cyan" />
          <MiniTrendChart title="Forum replies" subtitle="Filtered range" data={data.trends.forumReplies} accent="sky" />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <DistributionBars
            title="Review status mix"
            items={reviewStatusItems}
            emptyMessage="No review moderation data found."
          />
          <DistributionBars
            title="Thread status mix"
            items={threadStatusItems}
            emptyMessage="No thread moderation data found."
          />
          <DistributionBars
            title="Reply status mix"
            items={replyStatusItems}
            emptyMessage="No reply moderation data found."
          />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-6 shadow-glow">
          <h2 className="text-xl font-semibold text-white">Recent moderation queue</h2>
          <div className="mt-4 space-y-3">
            {data.recentQueue.length ? (
              data.recentQueue.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="block rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-brand-cyan/45"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{item.type}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">Status: {item.status}</p>
                  <p className="mt-2 text-xs text-slate-500">Submitted {item.createdAt.toLocaleString('en-ZA')}</p>
                </Link>
              ))
            ) : (
              <p className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                No moderation records match the current filters.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}


