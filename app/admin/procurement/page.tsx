import Link from 'next/link';
import { Prisma } from '@prisma/client';
import { CalendarClock, CircleDollarSign, PackageSearch, ShoppingCart, Truck } from 'lucide-react';
import { requireAdminSession } from '../../../lib/auth';
import { formatCurrency } from '../../../lib/billing';
import { PROCUREMENT_STATUSES, PURCHASE_REQUEST_STATUSES } from '../../../lib/constants';
import { calculatePurchaseRequestTotals, formatStatusLabel, getPurchaseDocumentLabel } from '../../../lib/operations';
import { PROCUREMENT_ROLES } from '../../../lib/permissions';
import { prisma } from '../../../lib/prisma';
import { AdminFlash } from '../components/AdminFlash';
import { PurchaseLineItemRows } from '../components/PurchaseLineItemRows';
import { AdminTopNav } from '../components/AdminTopNav';

export const dynamic = 'force-dynamic';

type SearchParamValue = string | string[] | undefined;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function statusTone(status: string) {
  if (status === 'RECEIVED') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'PARTIALLY_RECEIVED' || status === 'ORDERED') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'SUBMITTED' || status === 'APPROVED') return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'border-slate-700 bg-slate-900/80 text-slate-300';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function AdminProcurementPage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requireAdminSession(PROCUREMENT_ROLES);

  const selectedStatus = firstParam(searchParams?.status);
  const selectedProjectId = firstParam(searchParams?.projectId);
  const selectedSupplierId = firstParam(searchParams?.supplierId);
  const selectedMaterialId = firstParam(searchParams?.materialId);

  const [projects, suppliers, materials, records, projectsNeedingProcurement, upcomingRequirements, pendingCount] = await Promise.all([
    prisma.deliveryProject.findMany({
      where: { deletedAt: null, status: { in: ['ACTIVE', 'PLANNED', 'ON_HOLD'] } },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        projectCode: true,
        status: true,
      },
    }),
    prisma.supplier.findMany({
      where: { status: { in: ['ACTIVE', 'INACTIVE'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.materialItem.findMany({
      where: { status: { in: ['ACTIVE', 'INACTIVE'] } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, unit: true, category: true },
    }),
    prisma.purchaseRequest.findMany({
      where: {
        ...(selectedStatus && PURCHASE_REQUEST_STATUSES.includes(selectedStatus as (typeof PURCHASE_REQUEST_STATUSES)[number])
          ? { status: selectedStatus as (typeof PURCHASE_REQUEST_STATUSES)[number] }
          : {}),
        ...(selectedProjectId ? { deliveryProjectId: selectedProjectId } : {}),
        ...(selectedSupplierId ? { supplierId: selectedSupplierId } : {}),
        ...(selectedMaterialId ? { lineItems: { some: { materialItemId: selectedMaterialId } } } : {}),
      },
      orderBy: [{ requestDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        supplier: {
          select: { id: true, name: true },
        },
        deliveryProject: {
          select: { id: true, title: true, projectCode: true, status: true },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            description: true,
            quantity: true,
            unit: true,
            estimatedUnitCost: true,
            actualUnitCost: true,
            receivedQuantity: true,
            materialItemId: true,
          },
        },
      },
    }),
    prisma.deliveryProject.findMany({
      where: {
        deletedAt: null,
        status: { in: ['ACTIVE', 'PLANNED', 'ON_HOLD'] },
        procurementItems: {
          some: {
            status: { in: ['PLANNED', 'REQUESTED'] },
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: 6,
      select: {
        id: true,
        title: true,
        projectCode: true,
        status: true,
        procurementItems: {
          where: { status: { in: ['PLANNED', 'REQUESTED'] } },
          select: { id: true },
        },
      },
    }),
    prisma.projectProcurementItem.findMany({
      where: {
        status: { in: ['PLANNED', 'REQUESTED', 'ORDERED'] },
        requiredBy: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        deliveryProject: {
          deletedAt: null,
        },
      },
      orderBy: [{ requiredBy: 'asc' }],
      take: 8,
      select: {
        id: true,
        name: true,
        status: true,
        requiredBy: true,
        deliveryProject: {
          select: { id: true, title: true, projectCode: true },
        },
      },
    }),
    prisma.purchaseRequest.count({
      where: {
        status: { in: ['DRAFT', 'SUBMITTED', 'APPROVED'] },
      },
    }),
  ]);

  const queryParams = new URLSearchParams();
  if (selectedStatus) queryParams.set('status', selectedStatus);
  if (selectedProjectId) queryParams.set('projectId', selectedProjectId);
  if (selectedSupplierId) queryParams.set('supplierId', selectedSupplierId);
  if (selectedMaterialId) queryParams.set('materialId', selectedMaterialId);
  const returnTo = queryParams.toString() ? `/admin/procurement?${queryParams.toString()}` : '/admin/procurement';

  const projectOptions = new Map(projects.map((project) => [project.id, project]));
  const selectedProject = selectedProjectId ? projectOptions.get(selectedProjectId) || null : null;

  const procurementItemsForSelectedProject = selectedProjectId
    ? await prisma.projectProcurementItem.findMany({
        where: {
          deliveryProjectId: selectedProjectId,
          status: { in: [...PROCUREMENT_STATUSES] },
        },
        orderBy: [{ requiredBy: 'asc' }, { createdAt: 'desc' }],
        select: { id: true, name: true, unit: true },
      })
    : [];

  const valueSummary = records.reduce(
    (totals, record) => {
      const values = calculatePurchaseRequestTotals(record.lineItems);
      return {
        estimated: totals.estimated + values.estimated,
        actual: totals.actual + (values.actual || values.estimated),
        received: totals.received + (values.received || 0),
      };
    },
    { estimated: 0, actual: 0, received: 0 },
  );

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.created) === '1' ? <AdminFlash message="Purchase record created successfully." /> : null}
        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Purchase record updated successfully." /> : null}

        <section className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Procurement</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Purchase planning and supplier coordination</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Monitor active projects that need buying attention, create purchase records, and track value from request through receipt.
          </p>
        </section>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><ShoppingCart size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Pending purchase records</p>
                <p className="mt-2 text-3xl font-semibold text-white">{pendingCount}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><Truck size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Projects needing procurement</p>
                <p className="mt-2 text-3xl font-semibold text-white">{projectsNeedingProcurement.length}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><CircleDollarSign size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ordered value</p>
                <p className="mt-2 text-3xl font-semibold text-white">{formatCurrency(valueSummary.actual)}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><CalendarClock size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Upcoming required-by items</p>
                <p className="mt-2 text-3xl font-semibold text-white">{upcomingRequirements.length}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mb-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form method="get" className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.9fr_0.9fr_0.9fr_0.9fr_auto_auto]">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Project</span>
              <select name="projectId" defaultValue={selectedProjectId || ''} className="interactive-input mt-2">
                <option value="">All projects</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title} {project.projectCode ? `(${project.projectCode})` : ''}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Supplier</span>
              <select name="supplierId" defaultValue={selectedSupplierId || ''} className="interactive-input mt-2">
                <option value="">All suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status</span>
              <select name="status" defaultValue={selectedStatus || ''} className="interactive-input mt-2">
                <option value="">All statuses</option>
                {PURCHASE_REQUEST_STATUSES.map((status) => (
                  <option key={status} value={status}>{formatStatusLabel(status)}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Material item</span>
              <select name="materialId" defaultValue={selectedMaterialId || ''} className="interactive-input mt-2">
                <option value="">All materials</option>
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>{material.name} {material.category ? `(${material.category})` : ''}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn-primary mt-7 px-5 py-3 text-xs uppercase tracking-[0.16em]">Apply</button>
            <Link href="/admin/procurement" className="btn-ghost mt-7 px-5 py-3 text-xs uppercase tracking-[0.16em]">Reset</Link>
          </form>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <div className="flex items-center gap-3">
              <span className="icon-pill-lg"><ShoppingCart size={22} /></span>
              <div>
                <h2 className="text-xl font-semibold text-white">Create purchase record</h2>
                <p className="text-sm text-slate-400">Pick a project first if you want requirement-link options in the line items below.</p>
              </div>
            </div>

            <form action="/api/admin/procurement" method="post" className="mt-6 space-y-4">
              <input type="hidden" name="returnTo" value={returnTo} />
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="block">
                  <span className="text-sm font-semibold text-white">Project</span>
                  <select name="deliveryProjectId" defaultValue={selectedProject?.id || ''} className="interactive-input mt-2">
                    <option value="">Select project</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.title} {project.projectCode ? `(${project.projectCode})` : ''}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Supplier</span>
                  <select name="supplierId" defaultValue={selectedSupplierId || ''} className="interactive-input mt-2">
                    <option value="">No supplier yet</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue={selectedStatus || 'DRAFT'} className="interactive-input mt-2">
                    {PURCHASE_REQUEST_STATUSES.map((status) => (
                      <option key={status} value={status}>{formatStatusLabel(status)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Request date</span>
                  <input name="requestDate" type="date" className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Issue date</span>
                  <input name="issueDate" type="date" className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Expected delivery</span>
                  <input name="expectedDeliveryDate" type="date" className="interactive-input mt-2" />
                </label>
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-white">Notes</span>
                <textarea name="notes" rows={3} className="interactive-input mt-2" />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-white">Internal review notes</span>
                <textarea name="internalNotes" rows={3} className="interactive-input mt-2" />
              </label>

              <PurchaseLineItemRows
                materials={materials}
                procurementItems={procurementItemsForSelectedProject}
                minRows={4}
              />

              <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em]">
                Create purchase record
              </button>
            </form>
          </article>

          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <div className="flex items-center gap-3">
              <span className="icon-pill-lg"><PackageSearch size={22} /></span>
              <div>
                <h2 className="text-xl font-semibold text-white">Projects needing procurement</h2>
                <p className="text-sm text-slate-400">Open requirement counts help surface which active jobs need buying attention next.</p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {projectsNeedingProcurement.length ? projectsNeedingProcurement.map((project) => (
                <Link key={project.id} href={`/admin/projects/${project.id}/operations`} className="block rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 transition hover:border-brand-cyan/45">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{project.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{project.projectCode || 'Project code pending'} · {formatStatusLabel(project.status)}</p>
                    </div>
                    <span className="rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-amber-100">
                      {project.procurementItems.length} open requirement{project.procurementItems.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </Link>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
                  No active projects are currently waiting on procurement planning.
                </div>
              )}
            </div>

            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-cyan">Upcoming required-by dates</h3>
              {upcomingRequirements.length ? upcomingRequirements.map((item) => (
                <Link key={item.id} href={`/admin/projects/${item.deliveryProject.id}/operations`} className="block rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 transition hover:border-brand-cyan/45">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-white">{item.name}</p>
                    <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(item.status)}`}>
                      {formatStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {item.deliveryProject.title} · Due {item.requiredBy ? new Date(item.requiredBy).toLocaleDateString() : 'Date not set'}
                  </p>
                </Link>
              )) : (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
                  No requirement deadlines are approaching in the next 7 days.
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="grid gap-4">
          {records.length ? records.map((record) => {
            const totals = calculatePurchaseRequestTotals(record.lineItems);

            return (
              <Link key={record.id} href={`/admin/procurement/${record.id}?returnTo=${encodeURIComponent(returnTo)}`} className="interactive-card rounded-[2rem] p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-white">{record.referenceCode}</p>
                    <p className="mt-1 text-sm text-slate-400">{record.deliveryProject.title} · {record.supplier?.name || 'Supplier pending'}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                      <span>{getPurchaseDocumentLabel(record.status)}</span>
                      <span>{record.lineItems.length} line items</span>
                      <span>Request date {new Date(record.requestDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(record.status)}`}>
                    {formatStatusLabel(record.status)}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-slate-300 sm:grid-cols-2 xl:grid-cols-4">
                  <p>Estimated: {formatCurrency(totals.estimated)}</p>
                  <p>Actual: {formatCurrency(totals.actual || totals.estimated)}</p>
                  <p>Received: {formatCurrency(totals.received)}</p>
                  <p>Expected delivery: {record.expectedDeliveryDate ? new Date(record.expectedDeliveryDate).toLocaleDateString() : 'Not set'}</p>
                </div>
              </Link>
            );
          }) : (
            <div className="rounded-[2rem] border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
              <h2 className="text-xl font-semibold text-white">No purchase records matched the current view</h2>
              <p className="mt-2 text-sm text-slate-400">Create the first procurement record or adjust the filters to widen the operations view.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
