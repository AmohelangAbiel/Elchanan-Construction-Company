import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { requireAdminSession } from '../../../lib/auth';
import { CONTENT_ROLES } from '../../../lib/permissions';
import { AdminTopNav } from '../components/AdminTopNav';
import { AdminFlash } from '../components/AdminFlash';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;
type LifecycleView = 'active' | 'archived' | 'all';

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseLifecycleView(value?: string): LifecycleView {
  if (value === 'archived' || value === 'all') return value;
  return 'active';
}

export default async function AdminServicesPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(CONTENT_ROLES);

  const view = parseLifecycleView(firstParam(searchParams?.view));

  const where: Prisma.ServiceWhereInput =
    view === 'archived'
      ? { deletedAt: { not: null } }
      : view === 'all'
        ? {}
        : { deletedAt: null };

  const services = await prisma.service.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  const viewQuery = view === 'active' ? '' : `?view=${view}`;
  const returnTo = `/admin/services${viewQuery}`;

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        {firstParam(searchParams?.created) === '1' ? (
          <AdminFlash message="Service created successfully." />
        ) : null}
        {firstParam(searchParams?.updated) === '1' ? (
          <AdminFlash message="Service updated successfully." />
        ) : null}
        {firstParam(searchParams?.archived) === '1' ? (
          <AdminFlash tone="warning" message="Service archived successfully." />
        ) : null}
        {firstParam(searchParams?.restored) === '1' ? (
          <AdminFlash message="Service restored successfully." />
        ) : null}

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Services</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Service content management</h1>
          <p className="mt-3 text-slate-400">Create, edit, publish, and archive service content used across public and quote flows.</p>
        </div>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Lifecycle view</span>
              <select
                name="view"
                defaultValue={view}
                className="mt-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All records</option>
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-sky"
            >
              Apply
            </button>
            <Link
              href="/admin/services"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-cyan/60 hover:text-white"
            >
              Reset
            </Link>
          </form>
        </section>

        <section className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <h2 className="text-xl font-semibold text-white">Create service</h2>
          <p className="mt-2 text-sm text-slate-400">
            Use <Link href="/admin/media" className="text-brand-cyan hover:text-white">Media manager</Link> for validated service image uploads.
          </p>
          <form action="/api/admin/services" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="block lg:col-span-1">
              <span className="text-sm font-semibold text-white">Title</span>
              <input name="title" required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-1">
              <span className="text-sm font-semibold text-white">Slug (optional)</span>
              <input name="slug" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Summary</span>
              <input name="summary" required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Description</span>
              <textarea name="description" required rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Details (one per line)</span>
              <textarea name="detailsText" rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Image URL</span>
              <input name="image" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Sort order</span>
              <input name="sortOrder" type="number" min={0} defaultValue={0} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">SEO title</span>
              <input name="seoTitle" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">SEO description</span>
              <input name="seoDescription" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300 lg:col-span-2">
              <input type="hidden" name="published" value="false" />
              <input type="checkbox" name="published" value="true" defaultChecked className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
              Publish immediately
            </label>
            <button type="submit" className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-sky lg:col-span-2 lg:w-fit">
              Create Service
            </button>
          </form>
        </section>

        <div className="space-y-4">
          {services.length ? services.map((service) => (
            <details key={service.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-5 shadow-glow">
              <summary className="cursor-pointer list-none text-lg font-semibold text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{service.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                      {service.published ? 'Published' : 'Draft'}
                    </span>
                    {service.deletedAt ? (
                      <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-200">
                        Archived
                      </span>
                    ) : null}
                  </div>
                </div>
              </summary>

              <div className="mt-5 flex flex-wrap gap-3">
                {service.deletedAt ? (
                  <form action={`/api/admin/services/${service.id}`} method="post">
                    <input type="hidden" name="action" value="RESTORE" />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button type="submit" className="rounded-full border border-emerald-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200 transition hover:bg-emerald-500/10">
                      Restore service
                    </button>
                  </form>
                ) : (
                  <form action={`/api/admin/services/${service.id}`} method="post">
                    <input type="hidden" name="action" value="ARCHIVE" />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button type="submit" className="rounded-full border border-amber-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200 transition hover:bg-amber-500/10">
                      Archive service
                    </button>
                  </form>
                )}
              </div>

              <form action={`/api/admin/services/${service.id}`} method="post" className="mt-5 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Title</span>
                  <input name="title" defaultValue={service.title} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Slug</span>
                  <input name="slug" defaultValue={service.slug} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Summary</span>
                  <input name="summary" defaultValue={service.summary} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Description</span>
                  <textarea name="description" defaultValue={service.description} required rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Details (one per line)</span>
                  <textarea name="detailsText" defaultValue={service.details.join('\n')} rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Image URL</span>
                  <input name="image" defaultValue={service.image || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Sort order</span>
                  <input name="sortOrder" type="number" min={0} defaultValue={service.sortOrder} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">SEO title</span>
                  <input name="seoTitle" defaultValue={service.seoTitle || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">SEO description</span>
                  <input name="seoDescription" defaultValue={service.seoDescription || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300 lg:col-span-2">
                  <input type="hidden" name="published" value="false" />
                  <input type="checkbox" name="published" value="true" defaultChecked={service.published} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                  Publish on website
                </label>
                <button type="submit" className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-sky lg:col-span-2 lg:w-fit" disabled={Boolean(service.deletedAt)}>
                  Save Service
                </button>
              </form>
            </details>
          )) : (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-6 text-sm text-slate-300 shadow-glow">
              No services found for this lifecycle filter.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


