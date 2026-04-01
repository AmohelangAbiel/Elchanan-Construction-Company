import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { requireAdminSession } from '../../../lib/auth';
import { CONTENT_ROLES } from '../../../lib/permissions';
import { AdminTopNav } from '../components/AdminTopNav';
import { AdminFlash } from '../components/AdminFlash';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;
type ProjectView = 'active' | 'archived' | 'all';

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseProjectView(value?: string): ProjectView {
  if (value === 'archived' || value === 'all') return value;
  return 'active';
}

export default async function AdminProjectsPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(CONTENT_ROLES);

  const view = parseProjectView(firstParam(searchParams?.view));

  const where: Prisma.ProjectWhereInput =
    view === 'archived'
      ? { deletedAt: null, status: 'ARCHIVED' }
      : view === 'all'
        ? { deletedAt: null }
        : { deletedAt: null, status: { not: 'ARCHIVED' } };

  const projects = await prisma.project.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  const viewQuery = view === 'active' ? '' : `?view=${view}`;
  const returnTo = `/admin/projects${viewQuery}`;

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        {firstParam(searchParams?.created) === '1' ? (
          <AdminFlash message="Project created successfully." />
        ) : null}
        {firstParam(searchParams?.updated) === '1' ? (
          <AdminFlash message="Project updated successfully." />
        ) : null}
        {firstParam(searchParams?.archived) === '1' ? (
          <AdminFlash tone="warning" message="Project archived successfully." />
        ) : null}
        {firstParam(searchParams?.restored) === '1' ? (
          <AdminFlash message="Project restored to draft successfully." />
        ) : null}

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Projects</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Project gallery management</h1>
          <p className="mt-3 text-slate-400">Manage project portfolio content with draft, publish, and archive controls.</p>
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
              href="/admin/projects"
              className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-cyan/60 hover:text-white"
            >
              Reset
            </Link>
          </form>
        </section>

        <section className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <h2 className="text-xl font-semibold text-white">Create project</h2>
          <p className="mt-2 text-sm text-slate-400">
            Upload assets from <Link href="/admin/media" className="text-brand-cyan hover:text-white">Media manager</Link> and paste URLs below.
          </p>
          <form action="/api/admin/projects" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white">Title</span>
              <input name="title" required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Slug (optional)</span>
              <input name="slug" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Category</span>
              <input name="category" required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Location</span>
              <input name="location" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
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
              <span className="text-sm font-semibold text-white">Image URL</span>
              <input name="image" required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Gallery image URLs (one per line)</span>
              <textarea name="galleryImagesText" rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Before image URL (optional)</span>
              <input name="beforeImage" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">After image URL (optional)</span>
              <input name="afterImage" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Before/after caption (optional)</span>
              <input name="beforeAfterCaption" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Scope notes (optional)</span>
              <textarea name="scopeNotes" rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Status</span>
              <select name="status" defaultValue="DRAFT" className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
                {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
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
              <input type="checkbox" name="published" value="true" className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
              Show on website
            </label>
            <button type="submit" className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-sky lg:col-span-2 lg:w-fit">
              Create Project
            </button>
          </form>
        </section>

        <div className="space-y-4">
          {projects.length ? projects.map((project) => (
            <details key={project.id} className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-5 shadow-glow">
              <summary className="cursor-pointer list-none text-lg font-semibold text-white">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>{project.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                      {project.status}
                    </span>
                    {project.published ? (
                      <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-emerald-200">
                        Published
                      </span>
                    ) : null}
                  </div>
                </div>
              </summary>

              <div className="mt-5 flex flex-wrap gap-3">
                {project.status === 'ARCHIVED' ? (
                  <form action={`/api/admin/projects/${project.id}`} method="post">
                    <input type="hidden" name="action" value="RESTORE" />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button type="submit" className="rounded-full border border-emerald-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200 transition hover:bg-emerald-500/10">
                      Restore as draft
                    </button>
                  </form>
                ) : (
                  <form action={`/api/admin/projects/${project.id}`} method="post">
                    <input type="hidden" name="action" value="ARCHIVE" />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <button type="submit" className="rounded-full border border-amber-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200 transition hover:bg-amber-500/10">
                      Archive project
                    </button>
                  </form>
                )}
              </div>

              <form action={`/api/admin/projects/${project.id}`} method="post" className="mt-5 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="returnTo" value={returnTo} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Title</span>
                  <input name="title" defaultValue={project.title} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Slug</span>
                  <input name="slug" defaultValue={project.slug} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Category</span>
                  <input name="category" defaultValue={project.category} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Location</span>
                  <input name="location" defaultValue={project.location || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Summary</span>
                  <input name="summary" defaultValue={project.summary} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Description</span>
                  <textarea name="description" defaultValue={project.description} required rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Image URL</span>
                  <input name="image" defaultValue={project.image} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Gallery image URLs (one per line)</span>
                  <textarea name="galleryImagesText" defaultValue={project.galleryImages.join('\n')} rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Before image URL</span>
                  <input name="beforeImage" defaultValue={project.beforeImage || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">After image URL</span>
                  <input name="afterImage" defaultValue={project.afterImage || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Before/after caption</span>
                  <input name="beforeAfterCaption" defaultValue={project.beforeAfterCaption || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Scope notes</span>
                  <textarea name="scopeNotes" defaultValue={project.scopeNotes || ''} rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue={project.status} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100">
                    {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Sort order</span>
                  <input name="sortOrder" type="number" min={0} defaultValue={project.sortOrder} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">SEO title</span>
                  <input name="seoTitle" defaultValue={project.seoTitle || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">SEO description</span>
                  <input name="seoDescription" defaultValue={project.seoDescription || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300 lg:col-span-2">
                  <input type="hidden" name="published" value="false" />
                  <input type="checkbox" name="published" value="true" defaultChecked={project.published} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                  Show on website
                </label>
                <button type="submit" className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-sky lg:col-span-2 lg:w-fit">
                  Save Project
                </button>
              </form>
            </details>
          )) : (
            <div className="rounded-2xl border border-slate-800/70 bg-slate-950/70 p-6 text-sm text-slate-300 shadow-glow">
              No projects found for this lifecycle filter.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


