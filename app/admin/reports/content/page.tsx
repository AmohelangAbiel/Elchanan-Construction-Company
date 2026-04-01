import Link from 'next/link';
import { requireAdminSession } from '../../../../lib/auth';
import { REPORTING_ROLES } from '../../../../lib/permissions';
import { getContentReportData } from '../../../../lib/analytics';
import { AdminTopNav } from '../../components/AdminTopNav';
import { ReportsNav } from '../components/ReportsNav';
import { DistributionBars } from '../components/Charts';

export const dynamic = 'force-dynamic';

export default async function AdminContentReportsPage() {
  const session = await requireAdminSession(REPORTING_ROLES);
  const data = await getContentReportData();

  const serviceItems = [
    { label: 'Published', value: data.services.published },
    { label: 'Draft', value: data.services.draft },
    { label: 'Archived', value: data.services.archived },
  ];
  const projectItems = [
    { label: 'Published', value: data.projects.published },
    { label: 'Draft', value: data.projects.draft },
    { label: 'Archived', value: data.projects.archived },
  ];
  const pricingItems = [
    { label: 'Published', value: data.pricing.published },
    { label: 'Draft', value: data.pricing.draft },
    { label: 'Archived', value: data.pricing.archived },
  ];

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        <ReportsNav />

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Content reporting</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Publishing and content readiness</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Understand what is live, what is in draft, and which content items were recently updated.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Services</p>
            <p className="mt-3 text-4xl font-semibold text-white">{data.services.published + data.services.draft}</p>
            <p className="mt-2 text-sm text-slate-400">{data.services.published} published / {data.services.draft} draft</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Projects</p>
            <p className="mt-3 text-4xl font-semibold text-white">{data.projects.published + data.projects.draft + data.projects.archived}</p>
            <p className="mt-2 text-sm text-slate-400">{data.projects.published} published / {data.projects.draft} draft / {data.projects.archived} archived</p>
          </div>
          <div className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Pricing plans</p>
            <p className="mt-3 text-4xl font-semibold text-white">{data.pricing.published + data.pricing.draft}</p>
            <p className="mt-2 text-sm text-slate-400">{data.pricing.published} published / {data.pricing.draft} draft</p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <DistributionBars
            title="Service publishing status"
            items={serviceItems}
            emptyMessage="No service records found."
          />
          <DistributionBars
            title="Project publishing status"
            items={projectItems}
            emptyMessage="No project records found."
          />
          <DistributionBars
            title="Pricing publishing status"
            items={pricingItems}
            emptyMessage="No pricing records found."
          />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/80 bg-slate-950/70 p-6 shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Recent publishing activity</h2>
            <div className="flex flex-wrap gap-2">
              <Link href="/admin/services" className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">Services</Link>
              <Link href="/admin/projects" className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">Projects</Link>
              <Link href="/admin/pricing" className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">Pricing</Link>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {data.recentActivity.length ? (
              data.recentActivity.map((item) => (
                <Link
                  key={`${item.type}-${item.title}-${item.updatedAt.toISOString()}`}
                  href={item.href}
                  className="block rounded-xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-brand-cyan/45"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{item.type}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-400">Status: {item.status}</p>
                  <p className="mt-2 text-xs text-slate-500">Updated {item.updatedAt.toLocaleString('en-ZA')}</p>
                </Link>
              ))
            ) : (
              <p className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
                No recent content activity yet.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}



