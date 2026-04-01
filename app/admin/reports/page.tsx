import Link from 'next/link';
import { Download, FileSpreadsheet, Filter, TrendingUp } from 'lucide-react';
import { requireAdminSession } from '../../../lib/auth';
import { REPORTING_ROLES } from '../../../lib/permissions';
import { getDashboardAnalytics } from '../../../lib/analytics';
import { AdminTopNav } from '../components/AdminTopNav';
import { ReportsNav } from './components/ReportsNav';
import { DistributionBars, MiniTrendChart } from './components/Charts';

export const dynamic = 'force-dynamic';

export default async function AdminReportsOverviewPage() {
  const session = await requireAdminSession(REPORTING_ROLES);
  const analytics = await getDashboardAnalytics(30);

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        <ReportsNav />

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-brand-cyan">Reporting center</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Operational reporting and business insights</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Analyze lead quality, quote outcomes, moderation volume, and content readiness with export-ready reports.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link href="/admin/reports/enquiries" className="interactive-card rounded-2xl p-4">
              <span className="icon-pill mb-3"><Filter size={16} /></span>
              <p className="text-sm font-semibold text-white">Enquiry analytics</p>
              <p className="mt-1 text-xs text-slate-400">Status, service, source, and location breakdown.</p>
            </Link>
            <Link href="/admin/reports/quotes" className="interactive-card rounded-2xl p-4">
              <span className="icon-pill mb-3"><TrendingUp size={16} /></span>
              <p className="text-sm font-semibold text-white">Quote pipeline</p>
              <p className="mt-1 text-xs text-slate-400">Win/loss and budget distribution analysis.</p>
            </Link>
            <Link href="/admin/reports/content" className="interactive-card rounded-2xl p-4">
              <span className="icon-pill mb-3"><FileSpreadsheet size={16} /></span>
              <p className="text-sm font-semibold text-white">Content publishing</p>
              <p className="mt-1 text-xs text-slate-400">Published vs draft visibility and updates.</p>
            </Link>
            <Link href="/admin/reports/moderation" className="interactive-card rounded-2xl p-4">
              <span className="icon-pill mb-3"><Download size={16} /></span>
              <p className="text-sm font-semibold text-white">Moderation queue</p>
              <p className="mt-1 text-xs text-slate-400">Review and forum moderation workload.</p>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <MiniTrendChart title="Enquiries trend" subtitle="Last 30 days" data={analytics.trends.enquiries} accent="cyan" />
          <MiniTrendChart title="Quotes trend" subtitle="Last 30 days" data={analytics.trends.quotes} accent="sky" />
          <MiniTrendChart title="Reviews trend" subtitle="Last 30 days" data={analytics.trends.reviews} accent="blue" />
          <MiniTrendChart title="Forum trend" subtitle="Last 30 days" data={analytics.trends.forumActivity} accent="cyan" />
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Lead conversion</p>
            <p className="mt-3 text-3xl font-semibold text-white">{analytics.kpis.enquiryToQuoteRate}%</p>
            <p className="mt-2 text-sm text-slate-400">Enquiry to quote conversion.</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Quote win rate</p>
            <p className="mt-3 text-3xl font-semibold text-white">{analytics.kpis.quoteWinRate}%</p>
            <p className="mt-2 text-sm text-slate-400">Won quote share across submissions.</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Backlog</p>
            <p className="mt-3 text-3xl font-semibold text-white">{analytics.kpis.unresolvedLeadBacklog}</p>
            <p className="mt-2 text-sm text-slate-400">Open leads older than 7 days.</p>
          </div>
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <DistributionBars
            title="Service demand distribution"
            items={analytics.distributions.serviceDemand}
            emptyMessage="No service demand data is available."
          />
          <DistributionBars
            title="Quote budget distribution"
            items={analytics.distributions.budgetDemand}
            emptyMessage="No budget distribution data is available."
          />
        </section>
      </div>
    </main>
  );
}



