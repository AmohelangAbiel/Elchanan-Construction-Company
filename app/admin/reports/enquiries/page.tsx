import Link from 'next/link';
import { Download, Filter } from 'lucide-react';
import { requireAdminSession } from '../../../../lib/auth';
import { REPORTING_ROLES } from '../../../../lib/permissions';
import {
  ENQUIRY_STATUSES,
  LEAD_SOURCE_TYPES,
  parseEnquiryReportFilters,
  getEnquiryReportData,
  type SearchParamValue,
} from '../../../../lib/analytics';
import { AdminTopNav } from '../../components/AdminTopNav';
import { ReportsNav } from '../components/ReportsNav';
import { DistributionBars, MiniTrendChart } from '../components/Charts';

export const dynamic = 'force-dynamic';

function buildFilterQueryString(params: URLSearchParams) {
  const query = params.toString();
  return query ? `?${query}` : '';
}

export default async function AdminEnquiryReportsPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(REPORTING_ROLES);
  const filters = parseEnquiryReportFilters(searchParams);
  const data = await getEnquiryReportData(filters, { limit: 200 });

  const filterParams = new URLSearchParams();
  if (filters.status) filterParams.set('status', filters.status);
  if (filters.serviceInterest) filterParams.set('serviceInterest', filters.serviceInterest);
  if (filters.location) filterParams.set('location', filters.location);
  if (filters.sourceType) filterParams.set('sourceType', filters.sourceType);
  if (filters.fromRaw) filterParams.set('from', filters.fromRaw);
  if (filters.toRaw) filterParams.set('to', filters.toRaw);

  const exportHref = `/api/admin/reports/enquiries/export${buildFilterQueryString(filterParams)}`;

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        <ReportsNav />

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Enquiry reporting</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">Lead intake and enquiry analytics</h1>
              <p className="mt-3 max-w-3xl text-slate-400">
                Analyze demand by service, source, location, and workflow status with export-ready data.
              </p>
            </div>
            <a href={exportHref} className="btn-ghost w-full justify-center gap-2 px-5 py-2.5 text-xs uppercase tracking-[0.16em] sm:w-auto">
              <Download size={14} />
              Export CSV
            </a>
          </div>
        </section>

        <section className="mb-6 rounded-2xl border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select
                name="status"
                defaultValue={filters.status || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All statuses</option>
                {ENQUIRY_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Service</span>
              <select
                name="serviceInterest"
                defaultValue={filters.serviceInterest || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All services</option>
                {data.options.serviceInterests.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Location</span>
              <input
                name="location"
                defaultValue={filters.location || ''}
                placeholder="Rustenburg"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Lead source</span>
              <select
                name="sourceType"
                defaultValue={filters.sourceType || ''}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">All sources</option>
                {LEAD_SOURCE_TYPES.map((source) => (
                  <option key={source} value={source}>{source.replace('_', ' ')}</option>
                ))}
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

            <div className="md:col-span-2 xl:col-span-6 flex flex-wrap gap-2">
              <button type="submit" className="btn-primary px-5 py-2.5 text-xs uppercase tracking-[0.16em]">
                <Filter size={14} />
                Apply filters
              </button>
              <Link href="/admin/reports/enquiries" className="btn-ghost px-5 py-2.5 text-xs uppercase tracking-[0.16em]">
                Reset
              </Link>
            </div>
          </form>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total enquiries</p>
            <p className="mt-3 text-4xl font-semibold text-white">{data.summary.total}</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Unresolved backlog</p>
            <p className="mt-3 text-4xl font-semibold text-white">{data.summary.unresolved}</p>
          </div>
          {data.summary.statusBreakdown.slice(0, 2).map((item) => (
            <div key={item.label} className="interactive-card rounded-2xl p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{item.label}</p>
              <p className="mt-3 text-4xl font-semibold text-white">{item.value}</p>
            </div>
          ))}
        </section>

        {data.summary.total === 0 ? (
          <section className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-950/75 p-4 text-sm text-slate-300">
            No enquiries were found for the selected filters. Adjust the date range or clear filters to see results.
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <MiniTrendChart title="Enquiries over time" subtitle="Filtered range" data={data.trends} accent="cyan" />
          <DistributionBars
            title="Status distribution"
            items={data.summary.statusBreakdown}
            emptyMessage="No status data found for this filter set."
          />
          <DistributionBars
            title="Lead sources"
            items={data.summary.leadSources}
            emptyMessage="No source attribution data found for this filter set."
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <DistributionBars
            title="Service demand"
            items={data.summary.serviceDemand}
            emptyMessage="No service demand records found for this filter set."
          />
          <DistributionBars
            title="Location demand"
            items={data.summary.locationDemand}
            emptyMessage="No location records found for this filter set."
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/70 shadow-glow">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/90 text-xs uppercase tracking-[0.16em] text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Service</th>
                  <th className="px-4 py-3 text-left">Location</th>
                  <th className="px-4 py-3 text-left">Source</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.length ? (
                  data.rows.map((row) => (
                    <tr key={row.id} className="border-t border-slate-800/70 text-slate-200">
                      <td className="px-4 py-3 text-xs text-slate-400">{row.createdAt.toLocaleDateString('en-ZA')}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/enquiries/${row.id}`} className="font-semibold text-white hover:text-brand-cyan">
                          {row.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-xs uppercase tracking-[0.14em] text-slate-300">{row.status}</td>
                      <td className="px-4 py-3">{row.serviceInterest || 'General'}</td>
                      <td className="px-4 py-3">{row.location || 'Not set'}</td>
                      <td className="px-4 py-3 text-xs uppercase tracking-[0.14em] text-slate-400">
                        {row.sourceType.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">{row.referenceCode}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No enquiries match the current filter selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}


