import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardList,
  NotebookPen,
  PackageSearch,
  ShoppingCart,
  TriangleAlert,
  UserCog,
  Wrench,
} from 'lucide-react';
import { requireAdminSession } from '../../../../../lib/auth';
import { formatCurrency } from '../../../../../lib/billing';
import {
  MATERIAL_ITEM_STATUSES,
  PROCUREMENT_STATUSES,
  PROJECT_ASSIGNMENT_ROLES,
  PURCHASE_REQUEST_STATUSES,
  SITE_TASK_STATUSES,
  SUPPLIER_STATUSES,
  TASK_PRIORITIES,
} from '../../../../../lib/constants';
import {
  buildProjectOperationsSnapshot,
  getReceivedProgressPercent,
  sumRequirementEstimate,
} from '../../../../../lib/operations-data';
import { formatStatusLabel, getPurchaseDocumentLabel } from '../../../../../lib/operations';
import { SITE_OPERATIONS_ROLES } from '../../../../../lib/permissions';
import { getProjectReference } from '../../../../../lib/portal';
import { prisma } from '../../../../../lib/prisma';
import { AdminFlash } from '../../../components/AdminFlash';
import { AdminTopNav } from '../../../components/AdminTopNav';
import { PurchaseLineItemRows } from '../../../components/PurchaseLineItemRows';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: { id: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function toDateInputValue(value: Date | null | undefined) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function statusTone(status: string) {
  if (status === 'ACTIVE' || status === 'DONE' || status === 'RECEIVED' || status === 'APPROVED') {
    return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  }
  if (status === 'BLOCKED' || status === 'URGENT') {
    return 'border-rose-400/35 bg-rose-500/10 text-rose-100';
  }
  if (status === 'ORDERED' || status === 'PARTIALLY_RECEIVED' || status === 'IN_PROGRESS' || status === 'REQUESTED') {
    return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  }
  if (status === 'SUBMITTED' || status === 'TODO' || status === 'PLANNED' || status === 'PROJECT_MANAGER') {
    return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  }
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function AdminProjectOperationsPage({ params, searchParams }: PageProps) {
  const session = await requireAdminSession(SITE_OPERATIONS_ROLES);

  const [project, admins, suppliers, materials] = await Promise.all([
    prisma.deliveryProject.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        lead: {
          select: { id: true, fullName: true, companyName: true, email: true, phone: true },
        },
        quoteRequest: {
          select: { id: true, referenceCode: true, status: true, serviceType: true },
        },
        procurementItems: {
          orderBy: [{ requiredBy: 'asc' }, { createdAt: 'desc' }],
          include: {
            materialItem: {
              select: { id: true, name: true },
            },
            preferredSupplier: {
              select: { id: true, name: true },
            },
          },
        },
        purchaseRequests: {
          orderBy: [{ requestDate: 'desc' }, { createdAt: 'desc' }],
          include: {
            supplier: {
              select: { id: true, name: true },
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
              },
            },
          },
        },
        assignments: {
          orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
          include: {
            adminUser: {
              select: { id: true, name: true, role: true, email: true },
            },
          },
        },
        siteTasks: {
          orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
          include: {
            assignedToAdmin: {
              select: { id: true, name: true, role: true },
            },
            projectMilestone: {
              select: { id: true, title: true },
            },
          },
        },
        siteLogs: {
          orderBy: [{ logDate: 'desc' }, { createdAt: 'desc' }],
          include: {
            createdByAdmin: {
              select: { id: true, name: true },
            },
          },
        },
        milestones: {
          where: { deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { targetDate: 'asc' }],
          select: { id: true, title: true, status: true },
        },
      },
    }),
    prisma.adminUser.findMany({
      where: { isActive: true },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, role: true },
    }),
    prisma.supplier.findMany({
      where: { status: { in: SUPPLIER_STATUSES.filter((status) => status !== 'ARCHIVED') } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, status: true },
    }),
    prisma.materialItem.findMany({
      where: { status: { in: MATERIAL_ITEM_STATUSES.filter((status) => status !== 'ARCHIVED') } },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, unit: true, category: true },
    }),
  ]);

  if (!project) return notFound();

  const projectReference = getProjectReference({
    id: project.id,
    projectCode: project.projectCode,
    quoteRequest: project.quoteRequest ? { referenceCode: project.quoteRequest.referenceCode } : null,
  });

  const snapshot = buildProjectOperationsSnapshot({
    procurementItems: project.procurementItems,
    purchaseRequests: project.purchaseRequests,
    siteTasks: project.siteTasks,
    siteLogs: project.siteLogs,
  });
  const receivedProgress = getReceivedProgressPercent({
    receivedValue: snapshot.receivedValue,
    estimatedProcurementCost: snapshot.estimatedProcurementCost,
  });
  const openRequirementCount = project.procurementItems.filter((item) => item.status !== 'RECEIVED' && item.status !== 'CANCELLED').length;
  const openPurchaseRecords = project.purchaseRequests.filter((record) => record.status !== 'RECEIVED' && record.status !== 'CANCELLED').length;

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.procurementCreated) === '1' ? <AdminFlash message="Procurement requirement created successfully." /> : null}
        {firstParam(searchParams?.procurementUpdated) === '1' ? <AdminFlash message="Procurement requirement updated successfully." /> : null}
        {firstParam(searchParams?.assignmentCreated) === '1' ? <AdminFlash message="Project assignment created successfully." /> : null}
        {firstParam(searchParams?.assignmentUpdated) === '1' ? <AdminFlash message="Project assignment updated successfully." /> : null}
        {firstParam(searchParams?.siteTaskCreated) === '1' ? <AdminFlash message="Site task created successfully." /> : null}
        {firstParam(searchParams?.siteTaskUpdated) === '1' ? <AdminFlash message="Site task updated successfully." /> : null}
        {firstParam(searchParams?.siteLogCreated) === '1' ? <AdminFlash message="Site log created successfully." /> : null}
        {firstParam(searchParams?.siteLogUpdated) === '1' ? <AdminFlash message="Site log updated successfully." /> : null}
        {firstParam(searchParams?.created) === '1' ? <AdminFlash message="Purchase record created successfully." /> : null}

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Project operations</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{project.title}</h1>
              <p className="mt-2 text-sm text-slate-400">{projectReference}</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                <span>Project status: <span className="font-semibold text-white">{formatStatusLabel(project.status)}</span></span>
                {project.lead ? <span>Client: <span className="font-semibold text-white">{project.lead.fullName}</span></span> : null}
                {project.quoteRequest ? <span>Quote: <span className="font-semibold text-white">{project.quoteRequest.referenceCode}</span></span> : null}
              </div>
              {project.notes ? <p className="mt-4 max-w-3xl whitespace-pre-line text-sm text-slate-400">{project.notes}</p> : null}
            </div>

            <div className="flex flex-wrap gap-3">
              {project.quoteRequest ? (
                <Link href={`/admin/quotes/${project.quoteRequest.id}`} className="btn-ghost px-5 py-2.5 text-xs uppercase tracking-[0.16em]">
                  Open quote
                </Link>
              ) : null}
              <Link href={`/admin/procurement?projectId=${project.id}`} className="btn-primary px-5 py-2.5 text-xs uppercase tracking-[0.16em]">
                Procurement board
              </Link>
              <Link href={`/admin/site-tasks?projectId=${project.id}`} className="btn-ghost px-5 py-2.5 text-xs uppercase tracking-[0.16em]">
                Site tasks
              </Link>
              <Link href={`/admin/site-logs?projectId=${project.id}`} className="btn-ghost px-5 py-2.5 text-xs uppercase tracking-[0.16em]">
                Site logs
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><CircleDollarSign size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Estimated procurement cost</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(snapshot.estimatedProcurementCost)}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><ShoppingCart size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Ordered / received value</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(snapshot.orderedValue)}</p>
                <p className="mt-1 text-xs text-slate-500">Received {formatCurrency(snapshot.receivedValue)}</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><Wrench size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Open / blocked site tasks</p>
                <p className="mt-2 text-2xl font-semibold text-white">{snapshot.openTasks}</p>
                <p className="mt-1 text-xs text-slate-500">{snapshot.blockedTasks} blocked · {snapshot.overdueTasks} overdue</p>
              </div>
            </div>
          </article>
          <article className="interactive-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <span className="icon-pill"><NotebookPen size={16} /></span>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Latest internal log</p>
                <p className="mt-2 text-sm font-semibold text-white">{snapshot.latestSiteLogAt ? new Date(snapshot.latestSiteLogAt).toLocaleDateString() : 'No entries yet'}</p>
                <p className="mt-1 text-xs text-slate-500">{snapshot.nextRequiredBy ? `Next requirement due ${new Date(snapshot.nextRequiredBy).toLocaleDateString()}` : 'No active required-by dates'}</p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-white">Execution delivery pulse</h2>
              <p className="mt-2 text-sm text-slate-400">
                Internal operations data stays here only. Client portal updates remain separate and explicitly curated.
              </p>
            </div>
            <span className="rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-4 py-1.5 text-xs uppercase tracking-[0.16em] text-brand-cyan">
              {receivedProgress}% cost progress captured
            </span>
          </div>

          <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-brand-cyan transition-all" style={{ width: `${receivedProgress}%` }} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Open requirements</p>
              <p className="mt-2 text-2xl font-semibold text-white">{openRequirementCount}</p>
            </article>
            <article className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Open purchase records</p>
              <p className="mt-2 text-2xl font-semibold text-white">{openPurchaseRecords}</p>
            </article>
            <article className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Assigned resources</p>
              <p className="mt-2 text-2xl font-semibold text-white">{project.assignments.length}</p>
            </article>
            <article className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Site log entries</p>
              <p className="mt-2 text-2xl font-semibold text-white">{project.siteLogs.length}</p>
            </article>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <div className="flex items-center gap-3">
                <span className="icon-pill-lg"><PackageSearch size={22} /></span>
                <div>
                  <h2 className="text-xl font-semibold text-white">Procurement requirements</h2>
                  <p className="text-sm text-slate-400">Plan materials and resources needed to move this project through delivery.</p>
                </div>
              </div>

              <form action="/api/admin/project-procurement" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="deliveryProjectId" value={project.id} />
                <input type="hidden" name="returnTo" value={`/admin/projects/${project.id}/operations`} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Item name</span>
                  <input name="name" required className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Catalog item</span>
                  <select name="materialItemId" defaultValue="" className="interactive-input mt-2">
                    <option value="">No catalog link</option>
                    {materials.map((material) => (
                      <option key={material.id} value={material.id}>{material.name} {material.category ? `(${material.category})` : ''}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Category</span>
                  <input name="category" className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Preferred supplier</span>
                  <select name="preferredSupplierId" defaultValue="" className="interactive-input mt-2">
                    <option value="">No preferred supplier</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Description / notes</span>
                  <textarea name="description" rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Unit</span>
                  <input name="unit" required className="interactive-input mt-2" placeholder="m2, m3, bag, day, unit" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Estimated quantity</span>
                  <input name="estimatedQuantity" type="number" min={0.01} step="0.01" required className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Estimated unit cost (ZAR)</span>
                  <input name="estimatedUnitCost" type="number" min={0} step="0.01" className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Required by</span>
                  <input name="requiredBy" type="date" className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue="PLANNED" className="interactive-input mt-2">
                    {PROCUREMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>{formatStatusLabel(status)}</option>
                    ))}
                  </select>
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Internal notes</span>
                  <textarea name="notes" rows={3} className="interactive-input mt-2" />
                </label>
                <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
                  Add requirement
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {project.procurementItems.length ? project.procurementItems.map((item) => {
                  const estimate = sumRequirementEstimate([{ estimatedQuantity: item.estimatedQuantity, estimatedUnitCost: item.estimatedUnitCost }]);

                  return (
                    <details key={item.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                      <summary className="list-none cursor-pointer">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-semibold text-white">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {item.estimatedQuantity.toString()} {item.unit}
                              {item.materialItem ? ` · Catalog: ${item.materialItem.name}` : ''}
                              {item.preferredSupplier ? ` · Supplier: ${item.preferredSupplier.name}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(item.status)}`}>
                              {formatStatusLabel(item.status)}
                            </span>
                            <span className="rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-300">
                              {formatCurrency(estimate)}
                            </span>
                          </div>
                        </div>
                      </summary>

                      <form action={`/api/admin/project-procurement/${item.id}`} method="post" className="mt-4 grid gap-4 lg:grid-cols-2">
                        <input type="hidden" name="deliveryProjectId" value={project.id} />
                        <input type="hidden" name="returnTo" value={`/admin/projects/${project.id}/operations`} />
                        <label className="block">
                          <span className="text-sm font-semibold text-white">Item name</span>
                          <input name="name" defaultValue={item.name} required className="interactive-input mt-2" />
                        </label>
                        <label className="block">
                          <span className="text-sm font-semibold text-white">Catalog item</span>
                          <select name="materialItemId" defaultValue={item.materialItemId || ''} className="interactive-input mt-2">
                            <option value="">No catalog link</option>
                            {materials.map((material) => (
                              <option key={material.id} value={material.id}>{material.name} {material.category ? `(${material.category})` : ''}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-sm font-semibold text-white">Category</span>
                          <input name="category" defaultValue={item.category || ''} className="interactive-input mt-2" />
                        </label>
                        <label className="block">
                          <span className="text-sm font-semibold text-white">Preferred supplier</span>
                          <select name="preferredSupplierId" defaultValue={item.preferredSupplierId || ''} className="interactive-input mt-2">
                            <option value="">No preferred supplier</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block lg:col-span-2">
                          <span className="text-sm font-semibold text-white">Description</span>
                          <textarea name="description" defaultValue={item.description || ''} rows={3} className="interactive-input mt-2" />
                        </label>
                        <label className="block">
                          <span className="text-sm font-semibold text-white">Unit</span>
                          <input name="unit" defaultValue={item.unit} required className="interactive-input mt-2" />
                        </label>
                        <label className="block">
                          <span className="text-sm font-semibold text-white">Estimated quantity</span>
                          <input name="estimatedQuantity" type="number" min={0.01} step="0.01" defaultValue={Number(item.estimatedQuantity)} required className="interactive-input mt-2" />
                        </label>
                        <label className="block">
                          <span className="text-sm font-semibold text-white">Estimated unit cost</span>
                          <input name="estimatedUnitCost" type="number" min={0} step="0.01" defaultValue={item.estimatedUnitCost ? Number(item.estimatedUnitCost) : ''} className="interactive-input mt-2" />
                        </label>
                        <label className="block">
                          <span className="text-sm font-semibold text-white">Required by</span>
                          <input name="requiredBy" type="date" defaultValue={toDateInputValue(item.requiredBy)} className="interactive-input mt-2" />
                        </label>
                        <label className="block">
                          <span className="text-sm font-semibold text-white">Status</span>
                          <select name="status" defaultValue={item.status} className="interactive-input mt-2">
                            {PROCUREMENT_STATUSES.map((status) => (
                              <option key={status} value={status}>{formatStatusLabel(status)}</option>
                            ))}
                          </select>
                        </label>
                        <label className="block lg:col-span-2">
                          <span className="text-sm font-semibold text-white">Notes</span>
                          <textarea name="notes" defaultValue={item.notes || ''} rows={3} className="interactive-input mt-2" />
                        </label>
                        <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
                          Save requirement
                        </button>
                      </form>
                    </details>
                  );
                }) : (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
                    No procurement requirements have been planned for this project yet.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <div className="flex items-center gap-3">
                <span className="icon-pill-lg"><ShoppingCart size={22} /></span>
                <div>
                  <h2 className="text-xl font-semibold text-white">Purchase request / order foundation</h2>
                  <p className="text-sm text-slate-400">Create internal purchase records linked to this project and its planned requirements.</p>
                </div>
              </div>

              <form action="/api/admin/procurement" method="post" className="mt-6 space-y-4">
                <input type="hidden" name="deliveryProjectId" value={project.id} />
                <input type="hidden" name="returnTo" value={`/admin/projects/${project.id}/operations`} />
                <div className="grid gap-4 lg:grid-cols-3">
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Supplier</span>
                    <select name="supplierId" defaultValue="" className="interactive-input mt-2">
                      <option value="">No supplier yet</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Status</span>
                    <select name="status" defaultValue="DRAFT" className="interactive-input mt-2">
                      {PURCHASE_REQUEST_STATUSES.map((status) => (
                        <option key={status} value={status}>{formatStatusLabel(status)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Request date</span>
                    <input name="requestDate" type="date" defaultValue={toDateInputValue(new Date())} className="interactive-input mt-2" />
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
                  procurementItems={project.procurementItems.map((item) => ({ id: item.id, name: item.name, unit: item.unit }))}
                  minRows={3}
                />

                <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em]">
                  Create purchase record
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {project.purchaseRequests.length ? project.purchaseRequests.slice(0, 6).map((record) => (
                  <Link key={record.id} href={`/admin/procurement/${record.id}`} className="block rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4 transition hover:border-brand-cyan/45">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">{record.referenceCode}</p>
                        <p className="mt-1 text-sm text-slate-400">{getPurchaseDocumentLabel(record.status)} · {record.supplier?.name || 'Supplier pending'}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          {record.lineItems.length} line items · Request {new Date(record.requestDate).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(record.status)}`}>
                        {formatStatusLabel(record.status)}
                      </span>
                    </div>
                  </Link>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
                    No purchase records have been created for this project yet.
                  </div>
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <div className="flex items-center gap-3">
                <span className="icon-pill-lg"><UserCog size={22} /></span>
                <div>
                  <h2 className="text-xl font-semibold text-white">Project assignments</h2>
                  <p className="text-sm text-slate-400">Track who is responsible for delivery, supervision, support, and contractor coordination.</p>
                </div>
              </div>

              <form action="/api/admin/project-assignments" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="deliveryProjectId" value={project.id} />
                <input type="hidden" name="returnTo" value={`/admin/projects/${project.id}/operations`} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Internal staff member</span>
                  <select name="adminUserId" defaultValue="" className="interactive-input mt-2">
                    <option value="">No internal user</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Assignment role</span>
                  <select name="role" defaultValue="PROJECT_MANAGER" className="interactive-input mt-2">
                    {PROJECT_ASSIGNMENT_ROLES.map((role) => (
                      <option key={role} value={role}>{formatStatusLabel(role)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">External name</span>
                  <input name="externalName" className="interactive-input mt-2" placeholder="Optional contractor or subcontractor contact" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">External company</span>
                  <input name="externalCompany" className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Start date</span>
                  <input name="startDate" type="date" className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">End date</span>
                  <input name="endDate" type="date" className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Notes</span>
                  <textarea name="notes" rows={3} className="interactive-input mt-2" />
                </label>
                <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
                  Assign resource
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {project.assignments.length ? project.assignments.map((assignment) => (
                  <details key={assignment.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                    <summary className="list-none cursor-pointer">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">{assignment.adminUser?.name || assignment.externalName || 'Unspecified resource'}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {assignment.adminUser ? assignment.adminUser.role : assignment.externalCompany || 'External resource'}
                          </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(assignment.role)}`}>
                          {formatStatusLabel(assignment.role)}
                        </span>
                      </div>
                    </summary>

                    <form action={`/api/admin/project-assignments/${assignment.id}`} method="post" className="mt-4 grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="deliveryProjectId" value={project.id} />
                      <input type="hidden" name="returnTo" value={`/admin/projects/${project.id}/operations`} />
                      <label className="block">
                        <span className="text-sm font-semibold text-white">Internal staff member</span>
                        <select name="adminUserId" defaultValue={assignment.adminUserId || ''} className="interactive-input mt-2">
                          <option value="">No internal user</option>
                          {admins.map((admin) => (
                            <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">Assignment role</span>
                        <select name="role" defaultValue={assignment.role} className="interactive-input mt-2">
                          {PROJECT_ASSIGNMENT_ROLES.map((role) => (
                            <option key={role} value={role}>{formatStatusLabel(role)}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">External name</span>
                        <input name="externalName" defaultValue={assignment.externalName || ''} className="interactive-input mt-2" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">External company</span>
                        <input name="externalCompany" defaultValue={assignment.externalCompany || ''} className="interactive-input mt-2" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">Start date</span>
                        <input name="startDate" type="date" defaultValue={toDateInputValue(assignment.startDate)} className="interactive-input mt-2" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">End date</span>
                        <input name="endDate" type="date" defaultValue={toDateInputValue(assignment.endDate)} className="interactive-input mt-2" />
                      </label>
                      <label className="block lg:col-span-2">
                        <span className="text-sm font-semibold text-white">Notes</span>
                        <textarea name="notes" defaultValue={assignment.notes || ''} rows={3} className="interactive-input mt-2" />
                      </label>
                      <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
                        Save assignment
                      </button>
                    </form>
                  </details>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
                    No people or contractors have been assigned to this project yet.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <div className="flex items-center gap-3">
                <span className="icon-pill-lg"><ClipboardList size={22} /></span>
                <div>
                  <h2 className="text-xl font-semibold text-white">Site tasks</h2>
                  <p className="text-sm text-slate-400">Operational work packages for execution, coordination, and issue follow-through.</p>
                </div>
              </div>

              {snapshot.blockedTasks > 0 ? (
                <div className="mt-4 rounded-2xl border border-rose-400/25 bg-rose-500/10 p-4 text-sm text-rose-100">
                  <div className="flex items-start gap-3">
                    <TriangleAlert size={16} className="mt-0.5" />
                    <p>{snapshot.blockedTasks} blocked task{snapshot.blockedTasks === 1 ? '' : 's'} need attention on this project.</p>
                  </div>
                </div>
              ) : null}

              <form action="/api/admin/site-tasks" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="deliveryProjectId" value={project.id} />
                <input type="hidden" name="returnTo" value={`/admin/projects/${project.id}/operations`} />
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Title</span>
                  <input name="title" required className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Description</span>
                  <textarea name="description" rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue="TODO" className="interactive-input mt-2">
                    {SITE_TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>{formatStatusLabel(status)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Priority</span>
                  <select name="priority" defaultValue="MEDIUM" className="interactive-input mt-2">
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>{formatStatusLabel(priority)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Assignee</span>
                  <select name="assignedToAdminId" defaultValue="" className="interactive-input mt-2">
                    <option value="">Unassigned</option>
                    {admins.map((admin) => (
                      <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Linked milestone</span>
                  <select name="projectMilestoneId" defaultValue="" className="interactive-input mt-2">
                    <option value="">No linked milestone</option>
                    {project.milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Due date</span>
                  <input name="dueDate" type="date" className="interactive-input mt-2" />
                </label>
                <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
                  Create site task
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {project.siteTasks.length ? project.siteTasks.map((task) => (
                  <details key={task.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                    <summary className="list-none cursor-pointer">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">{task.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {task.assignedToAdmin ? `Assigned to ${task.assignedToAdmin.name}` : 'Unassigned'}
                            {task.projectMilestone ? ` · Milestone: ${task.projectMilestone.title}` : ''}
                            {task.dueDate ? ` · Due ${new Date(task.dueDate).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(task.status)}`}>
                            {formatStatusLabel(task.status)}
                          </span>
                          <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${statusTone(task.priority)}`}>
                            {formatStatusLabel(task.priority)}
                          </span>
                        </div>
                      </div>
                    </summary>

                    <form action={`/api/admin/site-tasks/${task.id}`} method="post" className="mt-4 grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="deliveryProjectId" value={project.id} />
                      <input type="hidden" name="returnTo" value={`/admin/projects/${project.id}/operations`} />
                      <label className="block lg:col-span-2">
                        <span className="text-sm font-semibold text-white">Title</span>
                        <input name="title" defaultValue={task.title} required className="interactive-input mt-2" />
                      </label>
                      <label className="block lg:col-span-2">
                        <span className="text-sm font-semibold text-white">Description</span>
                        <textarea name="description" defaultValue={task.description || ''} rows={3} className="interactive-input mt-2" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">Status</span>
                        <select name="status" defaultValue={task.status} className="interactive-input mt-2">
                          {SITE_TASK_STATUSES.map((status) => (
                            <option key={status} value={status}>{formatStatusLabel(status)}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">Priority</span>
                        <select name="priority" defaultValue={task.priority} className="interactive-input mt-2">
                          {TASK_PRIORITIES.map((priority) => (
                            <option key={priority} value={priority}>{formatStatusLabel(priority)}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">Assignee</span>
                        <select name="assignedToAdminId" defaultValue={task.assignedToAdminId || ''} className="interactive-input mt-2">
                          <option value="">Unassigned</option>
                          {admins.map((admin) => (
                            <option key={admin.id} value={admin.id}>{admin.name} ({admin.role})</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">Linked milestone</span>
                        <select name="projectMilestoneId" defaultValue={task.projectMilestoneId || ''} className="interactive-input mt-2">
                          <option value="">No linked milestone</option>
                          {project.milestones.map((milestone) => (
                            <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">Due date</span>
                        <input name="dueDate" type="date" defaultValue={toDateInputValue(task.dueDate)} className="interactive-input mt-2" />
                      </label>
                      <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
                        Save site task
                      </button>
                    </form>
                  </details>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
                    No operational site tasks have been logged for this project yet.
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
              <div className="flex items-center gap-3">
                <span className="icon-pill-lg"><NotebookPen size={22} /></span>
                <div>
                  <h2 className="text-xl font-semibold text-white">Daily / site logs</h2>
                  <p className="text-sm text-slate-400">Capture internal field updates, risks, completed work, and next steps in a readable timeline.</p>
                </div>
              </div>

              <form action="/api/admin/site-logs" method="post" className="mt-6 grid gap-4 lg:grid-cols-2">
                <input type="hidden" name="deliveryProjectId" value={project.id} />
                <input type="hidden" name="returnTo" value={`/admin/projects/${project.id}/operations`} />
                <label className="block">
                  <span className="text-sm font-semibold text-white">Log date</span>
                  <input name="logDate" type="date" defaultValue={toDateInputValue(new Date())} required className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Weather / conditions</span>
                  <input name="weatherConditions" className="interactive-input mt-2" placeholder="Clear skies, wet ground, wind delays, etc." />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Summary</span>
                  <textarea name="summary" rows={3} required className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Work completed</span>
                  <textarea name="workCompleted" rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Issues / risks</span>
                  <textarea name="issuesRisks" rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Next steps</span>
                  <textarea name="nextSteps" rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="text-sm font-semibold text-white">Attachment URLs (one per line)</span>
                  <textarea name="attachmentUrlsText" rows={3} className="interactive-input mt-2" />
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300 lg:col-span-2">
                  <input type="hidden" name="clientVisible" value="false" />
                  <input type="checkbox" name="clientVisible" value="true" className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                  Mark as potentially client-shareable later (not exposed automatically)
                </label>
                <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
                  Add site log
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {project.siteLogs.length ? project.siteLogs.map((log) => (
                  <details key={log.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                    <summary className="list-none cursor-pointer">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-white">{new Date(log.logDate).toLocaleDateString()}</p>
                          <p className="mt-1 text-sm text-slate-400">{log.summary}</p>
                          <p className="mt-2 text-xs text-slate-500">
                            {log.createdByAdmin ? `By ${log.createdByAdmin.name}` : 'Author not recorded'}
                            {log.weatherConditions ? ` · ${log.weatherConditions}` : ''}
                          </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${log.clientVisible ? 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan' : 'border-slate-700 bg-slate-900/80 text-slate-300'}`}>
                          {log.clientVisible ? 'Share-ready' : 'Internal only'}
                        </span>
                      </div>
                    </summary>

                    <form action={`/api/admin/site-logs/${log.id}`} method="post" className="mt-4 grid gap-4 lg:grid-cols-2">
                      <input type="hidden" name="deliveryProjectId" value={project.id} />
                      <input type="hidden" name="returnTo" value={`/admin/projects/${project.id}/operations`} />
                      <label className="block">
                        <span className="text-sm font-semibold text-white">Log date</span>
                        <input name="logDate" type="date" defaultValue={toDateInputValue(log.logDate)} required className="interactive-input mt-2" />
                      </label>
                      <label className="block">
                        <span className="text-sm font-semibold text-white">Weather / conditions</span>
                        <input name="weatherConditions" defaultValue={log.weatherConditions || ''} className="interactive-input mt-2" />
                      </label>
                      <label className="block lg:col-span-2">
                        <span className="text-sm font-semibold text-white">Summary</span>
                        <textarea name="summary" defaultValue={log.summary} rows={3} required className="interactive-input mt-2" />
                      </label>
                      <label className="block lg:col-span-2">
                        <span className="text-sm font-semibold text-white">Work completed</span>
                        <textarea name="workCompleted" defaultValue={log.workCompleted || ''} rows={3} className="interactive-input mt-2" />
                      </label>
                      <label className="block lg:col-span-2">
                        <span className="text-sm font-semibold text-white">Issues / risks</span>
                        <textarea name="issuesRisks" defaultValue={log.issuesRisks || ''} rows={3} className="interactive-input mt-2" />
                      </label>
                      <label className="block lg:col-span-2">
                        <span className="text-sm font-semibold text-white">Next steps</span>
                        <textarea name="nextSteps" defaultValue={log.nextSteps || ''} rows={3} className="interactive-input mt-2" />
                      </label>
                      <label className="block lg:col-span-2">
                        <span className="text-sm font-semibold text-white">Attachment URLs</span>
                        <textarea name="attachmentUrlsText" defaultValue={log.attachmentUrls.join('\n')} rows={3} className="interactive-input mt-2" />
                      </label>
                      <label className="flex items-center gap-3 text-sm text-slate-300 lg:col-span-2">
                        <input type="hidden" name="clientVisible" value="false" />
                        <input type="checkbox" name="clientVisible" value="true" defaultChecked={log.clientVisible} className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-brand-cyan" />
                        Mark as potentially client-shareable later (not exposed automatically)
                      </label>
                      <button type="submit" className="btn-primary px-5 py-3 text-xs uppercase tracking-[0.16em] lg:col-span-2 lg:w-fit">
                        Save site log
                      </button>
                    </form>
                  </details>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/60 p-5 text-sm text-slate-400">
                    No site log entries have been recorded for this project yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>

        <section className="mt-8 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <div className="flex items-center gap-3">
            <span className="icon-pill-lg"><BriefcaseBusiness size={22} /></span>
            <div>
              <h2 className="text-xl font-semibold text-white">Boundary reminder</h2>
              <p className="text-sm text-slate-400">These operations records remain internal. Only curated project updates, milestones, invoices, contracts, and shared documents flow into the client portal.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
