import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { Mail, MapPin, PackageSearch, Phone, Truck, UserCircle2 } from 'lucide-react';
import { requireAdminSession } from '../../../lib/auth';
import { SUPPLIER_STATUSES } from '../../../lib/constants';
import { PROCUREMENT_ROLES } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
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

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(PROCUREMENT_ROLES);

  const selectedStatus = firstParam(searchParams?.status);
  const search = firstParam(searchParams?.q)?.trim() || '';

  const where: Prisma.SupplierWhereInput = {};

  if (selectedStatus && SUPPLIER_STATUSES.includes(selectedStatus as (typeof SUPPLIER_STATUSES)[number])) {
    where.status = selectedStatus as (typeof SUPPLIER_STATUSES)[number];
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactPerson: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { cityArea: { contains: search, mode: 'insensitive' } },
      { supplyCategories: { has: search } },
    ];
  }

  const [suppliers, statusGroups] = await Promise.all([
    prisma.supplier.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            materials: true,
            purchaseRequests: true,
            preferredProcurementItems: true,
          },
        },
      },
    }),
    prisma.supplier.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  const statusMap = new Map(statusGroups.map((group) => [group.status, group._count._all]));
  const linkedPurchaseRecords = suppliers.reduce((sum, supplier) => sum + supplier._count.purchaseRequests, 0);

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.created) === '1' ? <AdminFlash message="Supplier created successfully." /> : null}
        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Supplier updated successfully." /> : null}
        {firstParam(searchParams?.archived) === '1' ? <AdminFlash tone="warning" message="Supplier archived successfully." /> : null}
        {firstParam(searchParams?.restored) === '1' ? <AdminFlash message="Supplier restored successfully." /> : null}

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Suppliers</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Supplier network management</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Build a reliable supplier base for procurement planning, delivery coordination, and future supplier performance analytics.
          </p>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total suppliers</p>
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
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Linked purchase records</p>
            <p className="mt-2 text-3xl font-semibold text-white">{linkedPurchaseRecords}</p>
          </article>
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.4fr_0.8fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Search</span>
              <input
                name="q"
                defaultValue={search}
                placeholder="Supplier, contact, email, or area"
                className="interactive-input mt-2"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select name="status" defaultValue={selectedStatus || ''} className="interactive-input mt-2">
                <option value="">All statuses</option>
                {SUPPLIER_STATUSES.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary mt-7 px-5 py-3 text-xs uppercase tracking-[0.16em]">
              Apply
            </button>
            <Link href="/admin/suppliers" className="btn-ghost mt-7 px-5 py-3 text-xs uppercase tracking-[0.16em]">
              Reset
            </Link>
          </form>
        </section>

        <section className="mb-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <div className="flex items-center gap-3">
            <span className="icon-pill-lg">
              <Truck size={22} />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-white">Add supplier</h2>
              <p className="text-sm text-slate-400">Create a supplier record for procurement planning and purchase workflows.</p>
            </div>
          </div>

          <form action="/api/admin/suppliers" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white">Name</span>
              <input name="name" required className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Contact person</span>
              <input name="contactPerson" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Email</span>
              <input name="email" type="email" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Phone</span>
              <input name="phone" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Alternate phone</span>
              <input name="alternatePhone" className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">City / area</span>
              <input name="cityArea" className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Address</span>
              <input name="address" className="interactive-input mt-2" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Materials / services supplied</span>
              <textarea
                name="supplyCategoriesText"
                rows={3}
                className="interactive-input mt-2"
                placeholder="Concrete&#10;Roofing materials&#10;Equipment hire"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Notes</span>
              <textarea name="notes" rows={4} className="interactive-input mt-2" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Status</span>
              <select name="status" defaultValue="ACTIVE" className="interactive-input mt-2">
                {SUPPLIER_STATUSES.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:self-end lg:w-fit">
              Create supplier
            </button>
          </form>
        </section>

        <section className="grid gap-4">
          {suppliers.length ? suppliers.map((supplier) => (
            <details key={supplier.id} className="interactive-card rounded-[2rem] p-6">
              <summary className="list-none cursor-pointer">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="icon-pill">
                        <Truck size={16} />
                      </span>
                      <div>
                        <p className="text-lg font-semibold text-white">{supplier.name}</p>
                        <p className="mt-1 text-sm text-slate-400">{supplier.contactPerson || 'No primary contact set'}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-400">
                      {supplier.email ? <span className="inline-flex items-center gap-1"><Mail size={14} /> {supplier.email}</span> : null}
                      {supplier.phone ? <span className="inline-flex items-center gap-1"><Phone size={14} /> {supplier.phone}</span> : null}
                      {supplier.cityArea ? <span className="inline-flex items-center gap-1"><MapPin size={14} /> {supplier.cityArea}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(supplier.status)}`}>
                      {formatStatusLabel(supplier.status)}
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                      {supplier._count.materials} materials
                    </span>
                    <span className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                      {supplier._count.purchaseRequests} purchase records
                    </span>
                  </div>
                </div>
              </summary>

              <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <article className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5">
                    <div className="flex items-center gap-2">
                      <span className="icon-pill">
                        <PackageSearch size={16} />
                      </span>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-cyan">Supply profile</p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {supplier.supplyCategories.length ? supplier.supplyCategories.map((category) => (
                        <span key={category} className="rounded-full border border-brand-cyan/30 bg-brand-cyan/10 px-3 py-1 text-xs text-brand-cyan">
                          {category}
                        </span>
                      )) : (
                        <span className="text-sm text-slate-400">No supply categories recorded yet.</span>
                      )}
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-slate-300">
                      <p><span className="text-slate-500">Preferred procurement links:</span> {supplier._count.preferredProcurementItems}</p>
                      <p><span className="text-slate-500">Created:</span> {new Date(supplier.createdAt).toLocaleString()}</p>
                      <p><span className="text-slate-500">Updated:</span> {new Date(supplier.updatedAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-4 whitespace-pre-line text-sm text-slate-300">{supplier.notes || 'No internal supplier notes yet.'}</p>
                  </article>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    {supplier.status === 'ARCHIVED' ? (
                      <form action={`/api/admin/suppliers/${supplier.id}`} method="post">
                        <input type="hidden" name="action" value="RESTORE" />
                        <button type="submit" className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">Restore supplier</button>
                      </form>
                    ) : (
                      <form action={`/api/admin/suppliers/${supplier.id}`} method="post">
                        <input type="hidden" name="action" value="ARCHIVE" />
                        <button type="submit" className="rounded-full border border-amber-400/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200 transition hover:bg-amber-500/10">
                          Archive supplier
                        </button>
                      </form>
                    )}
                    <Link href={`/admin/procurement?supplierId=${supplier.id}`} className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">
                      View purchase records
                    </Link>
                  </div>

                  <form action={`/api/admin/suppliers/${supplier.id}`} method="post" className="grid gap-4 lg:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Name</span>
                      <input name="name" defaultValue={supplier.name} required className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Contact person</span>
                      <input name="contactPerson" defaultValue={supplier.contactPerson || ''} className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Email</span>
                      <input name="email" type="email" defaultValue={supplier.email || ''} className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Phone</span>
                      <input name="phone" defaultValue={supplier.phone || ''} className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Alternate phone</span>
                      <input name="alternatePhone" defaultValue={supplier.alternatePhone || ''} className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">City / area</span>
                      <input name="cityArea" defaultValue={supplier.cityArea || ''} className="interactive-input mt-2" />
                    </label>
                    <label className="block lg:col-span-2">
                      <span className="text-sm font-semibold text-white">Address</span>
                      <input name="address" defaultValue={supplier.address || ''} className="interactive-input mt-2" />
                    </label>
                    <label className="block lg:col-span-2">
                      <span className="text-sm font-semibold text-white">Materials / services supplied</span>
                      <textarea
                        name="supplyCategoriesText"
                        defaultValue={supplier.supplyCategories.join('\n')}
                        rows={3}
                        className="interactive-input mt-2"
                      />
                    </label>
                    <label className="block lg:col-span-2">
                      <span className="text-sm font-semibold text-white">Notes</span>
                      <textarea name="notes" defaultValue={supplier.notes || ''} rows={4} className="interactive-input mt-2" />
                    </label>
                    <label className="block">
                      <span className="text-sm font-semibold text-white">Status</span>
                      <select name="status" defaultValue={supplier.status} className="interactive-input mt-2">
                        {SUPPLIER_STATUSES.map((status) => (
                          <option key={status} value={status}>{formatStatusLabel(status)}</option>
                        ))}
                      </select>
                    </label>
                    <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:self-end lg:w-fit">
                      Save supplier
                    </button>
                  </form>
                </div>
              </div>
            </details>
          )) : (
            <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-cyan/25 bg-brand-cyan/10 text-brand-cyan">
                <UserCircle2 size={22} />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white">No suppliers matched the current view</h2>
              <p className="mt-2 text-sm text-slate-400">
                Adjust the filter, or create the first supplier record to start structuring procurement data.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
