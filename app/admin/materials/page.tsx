import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { Blocks, Building2, Boxes, PackageOpen, Warehouse } from 'lucide-react';
import { requireAdminSession } from '../../../lib/auth';
import { MATERIAL_ITEM_STATUSES } from '../../../lib/constants';
import { PROCUREMENT_ROLES } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
import { formatCurrency } from '../../../lib/billing';
import { formatStatusLabel } from '../../../lib/operations';
import { AdminFlash } from '../components/AdminFlash';
import { AdminTopNav } from '../components/AdminTopNav';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function statusTone(status: string) {
  if (status === 'ACTIVE') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'INACTIVE') return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function AdminMaterialsPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(PROCUREMENT_ROLES);

  const selectedStatus = firstParam(searchParams?.status);
  const selectedSupplierId = firstParam(searchParams?.supplierId);
  const search = firstParam(searchParams?.q)?.trim() || '';

  const [suppliers, materials, statusGroups] = await Promise.all([
    prisma.supplier.findMany({
      where: { status: { not: 'ARCHIVED' } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.materialItem.findMany({
      where: {
        ...(selectedStatus && MATERIAL_ITEM_STATUSES.includes(selectedStatus as (typeof MATERIAL_ITEM_STATUSES)[number])
          ? { status: selectedStatus as (typeof MATERIAL_ITEM_STATUSES)[number] }
          : {}),
        ...(selectedSupplierId ? { defaultSupplierId: selectedSupplierId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        defaultSupplier: {
          select: { id: true, name: true, status: true },
        },
        _count: {
          select: {
            projectProcurementItems: true,
            purchaseLineItems: true,
          },
        },
      },
    }),
    prisma.materialItem.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const statusMap = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const referencedInProjects = materials.reduce((sum, item) => sum + item._count.projectProcurementItems, 0);

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.created) === '1' ? <AdminFlash message="Material item created successfully." /> : null}
        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Material item updated successfully." /> : null}
        {firstParam(searchParams?.archived) === '1' ? <AdminFlash tone="warning" message="Material item archived successfully." /> : null}
        {firstParam(searchParams?.restored) === '1' ? <AdminFlash message="Material item restored successfully." /> : null}

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Material catalog</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Planning items and unit-cost baseline</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Maintain the planning catalog that feeds project requirements, purchase records, and cost visibility across active delivery work.
          </p>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Catalog items</p>
            <p className="mt-2 text-3xl font-semibold text-white">{statusGroups.reduce((sum, item) => sum + item._count._all, 0)}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Active</p>
            <p className="mt-2 text-3xl font-semibold text-white">{statusMap.get('ACTIVE') || 0}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Archived</p>
            <p className="mt-2 text-3xl font-semibold text-white">{statusMap.get('ARCHIVED') || 0}</p>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Project requirement links</p>
            <p className="mt-2 text-3xl font-semibold text-white">{referencedInProjects}</p>
          </article>
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr_0.9fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Search</span>
              <input
                name="q"
                defaultValue={search}
                placeholder="Item name, code, or category"
                className="interactive-input mt-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select name="status" defaultValue={selectedStatus || ''} className="interactive-input mt-2">
                <option value="">All statuses</option>
                {MATERIAL_ITEM_STATUSES.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Default supplier</span>
              <select name="supplierId" defaultValue={selectedSupplierId || ''} className="interactive-input mt-2">
                <option value="">All suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary mt-7 px-5 py-3 text-xs uppercase tracking-[0.16em]">
              Apply
            </button>
            <Link href="/admin/materials" className="btn-ghost mt-7 px-5 py-3 text-xs uppercase tracking-[0.16em]">
              Reset
            </Link>
          </form>
        </section>

        <section className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <div className="flex items-center gap-3">
            <span className="icon-pill-lg">
              <Boxes size={22} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">Add material item</h2>
              <p className="text-sm text-slate-400">Create a planning item that can be reused across project requirements and purchase workflows.</p>
            </div>
          </div>

          <form action="/api/admin/materials" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white">Name</span>
              <input name="name" required className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">SKU / code</span>
              <input name="code" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Category</span>
              <input name="category" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Unit</span>
              <input name="unit" required className="interactive-input mt-2" placeholder="m2, m3, bag, length, unit" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Reference unit cost (ZAR)</span>
              <input name="estimatedUnitCost" type="number" min={0} step="0.01" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Default supplier</span>
              <select name="defaultSupplierId" defaultValue="" className="interactive-input mt-2">
                <option value="">No default supplier</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Description / specifications</span>
              <textarea name="description" rows={4} className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Notes</span>
              <textarea name="notes" rows={3} className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Status</span>
              <select name="status" defaultValue="ACTIVE" className="interactive-input mt-2">
                {MATERIAL_ITEM_STATUSES.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:self-end lg:w-fit">
              Create material item
            </button>
          </form>
        </section>

        <section className="grid gap-4">
          {materials.length ? materials.map((material) => (
            <details key={material.id} className="interactive-card rounded-[2rem] p-6">
              <summary className="list-none cursor-pointer">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="icon-pill">
                        <Warehouse size={16} />
                      </span>
                      <div>
                        <p className="text-lg font-semibold text-white">{material.name}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          {material.category || 'Uncategorised'} {material.code ? `· ${material.code}` : ''} {material.unit ? `· ${material.unit}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                      {material.defaultSupplier ? <span>Supplier: {material.defaultSupplier.name}</span> : null}
                      <span>Project requirements: {material._count.projectProcurementItems}</span>
                      <span>Purchase lines: {material._count.purchaseLineItems}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(material.status)}`}>
                      {formatStatusLabel(material.status)}
                    </span>
                    <span className="rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-brand-cyan">
                      {formatCurrency(material.estimatedUnitCost ? Number(material.estimatedUnitCost) : null)}
                    </span>
                  </div>
                </div>
              </summary>

              <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <article className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
                  <div className="flex items-center gap-2">
                    <span className="icon-pill">
                      <Blocks size={16} />
                    </span>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan">Catalog profile</p>
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-slate-300">
                    <p><span className="text-slate-500">Unit:</span> {material.unit}</p>
                    <p><span className="text-slate-500">Default supplier:</span> {material.defaultSupplier?.name || 'Not assigned'}</p>
                    <p><span className="text-slate-500">Reference cost:</span> {formatCurrency(material.estimatedUnitCost ? Number(material.estimatedUnitCost) : null)}</p>
                    <p><span className="text-slate-500">Updated:</span> {new Date(material.updatedAt).toLocaleString()}</p>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm text-slate-300">{material.description || 'No specification notes recorded.'}</p>
                  {material.notes ? <p className="mt-4 whitespace-pre-line text-sm text-slate-400">{material.notes}</p> : null}
                </article>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {material.status === 'ARCHIVED' ? (
                      <form action={`/api/admin/materials/${material.id}`} method="post">
                        <input type="hidden" name="action" value="RESTORE" />
                        <button type="submit" className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">Restore item</button>
                      </form>
                    ) : (
                      <form action={`/api/admin/materials/${material.id}`} method="post">
                        <input type="hidden" name="action" value="ARCHIVE" />
                        <button type="submit" className="rounded-full border border-amber-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200 transition hover:bg-amber-500/10">
                          Archive item
                        </button>
                      </form>
                    )}
                    <Link href={`/admin/procurement?materialId=${material.id}`} className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">
                      View procurement usage
                    </Link>
                  </div>

                  <form action={`/api/admin/materials/${material.id}`} method="post" className="grid gap-4 lg:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Name</span>
                      <input name="name" defaultValue={material.name} required className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">SKU / code</span>
                      <input name="code" defaultValue={material.code || ''} className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Category</span>
                      <input name="category" defaultValue={material.category || ''} className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Unit</span>
                      <input name="unit" defaultValue={material.unit} required className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Reference unit cost (ZAR)</span>
                      <input
                        name="estimatedUnitCost"
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={material.estimatedUnitCost ? Number(material.estimatedUnitCost) : ''}
                        className="interactive-input mt-2"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Default supplier</span>
                      <select name="defaultSupplierId" defaultValue={material.defaultSupplierId || ''} className="interactive-input mt-2">
                        <option value="">No default supplier</option>
                        {suppliers.map((supplier) => (
                          <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block lg:col-span-2">
                      <span className="text-sm font-semibold text-white">Description / specifications</span>
                      <textarea name="description" defaultValue={material.description || ''} rows={4} className="interactive-input mt-2" />
                    </label>
                    <label className="block lg:col-span-2">
                      <span className="text-sm font-semibold text-white">Notes</span>
                      <textarea name="notes" defaultValue={material.notes || ''} rows={3} className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Status</span>
                      <select name="status" defaultValue={material.status} className="interactive-input mt-2">
                        {MATERIAL_ITEM_STATUSES.map((status) => (
                          <option key={status} value={status}>{formatStatusLabel(status)}</option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:self-end lg:w-fit">
                      Save material item
                    </button>
                  </form>
                </div>
              </div>
            </details>
          )) : (
            <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan">
                <PackageOpen size={22} />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white">No material items matched the current view</h2>
              <p className="mt-2 text-sm text-slate-400">
                Add the first planning item to start tying project requirements and purchase records to a reusable catalog.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
