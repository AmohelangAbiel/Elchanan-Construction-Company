import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, CircleDollarSign, FileSpreadsheet, ShoppingCart, Truck } from 'lucide-react';
import { requireAdminSession } from '../../../../lib/auth';
import { safeRedirectPath } from '../../../../lib/api';
import { formatCurrency } from '../../../../lib/billing';
import { PURCHASE_REQUEST_STATUSES } from '../../../../lib/constants';
import { calculatePurchaseRequestTotals, formatStatusLabel, getPurchaseDocumentLabel } from '../../../../lib/operations';
import { PROCUREMENT_ROLES } from '../../../../lib/permissions';
import { prisma } from '../../../../lib/prisma';
import { AdminFlash } from '../../components/AdminFlash';
import { PurchaseLineItemRows } from '../../components/PurchaseLineItemRows';
import { AdminTopNav } from '../../components/AdminTopNav';

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
  if (status === 'RECEIVED') return 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100';
  if (status === 'PARTIALLY_RECEIVED' || status === 'ORDERED') return 'border-brand-cyan/35 bg-brand-cyan/10 text-brand-cyan';
  if (status === 'SUBMITTED' || status === 'APPROVED') return 'border-amber-400/35 bg-amber-500/10 text-amber-100';
  if (status === 'CANCELLED' || status === 'REJECTED') return 'border-slate-700 bg-slate-900/80 text-slate-300';
  return 'border-slate-700 bg-slate-900/80 text-slate-300';
}

export default async function AdminProcurementDetailPage({ params, searchParams }: PageProps) {
  const session = await requireAdminSession(PROCUREMENT_ROLES);

  const [record, suppliers, materials, procurementItems] = await Promise.all([
    prisma.purchaseRequest.findUnique({
      where: { id: params.id },
      include: {
        supplier: {
          select: { id: true, name: true, email: true, phone: true, cityArea: true },
        },
        deliveryProject: {
          select: { id: true, title: true, projectCode: true, status: true },
        },
        createdByAdmin: {
          select: { id: true, name: true, email: true },
        },
        approvedByAdmin: {
          select: { id: true, name: true, email: true },
        },
        lineItems: {
          orderBy: { sortOrder: 'asc' },
          include: {
            materialItem: {
              select: { id: true, name: true, category: true, unit: true },
            },
            projectProcurementItem: {
              select: { id: true, name: true, unit: true, status: true },
            },
          },
        },
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
    prisma.projectProcurementItem.findMany({
      where: {
        purchaseLineItems: {
          some: {
            purchaseRequestId: params.id,
          },
        },
      },
      orderBy: [{ requiredBy: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, name: true, unit: true },
    }),
  ]);

  if (!record) return notFound();

  const additionalProjectRequirements = await prisma.projectProcurementItem.findMany({
    where: {
      deliveryProjectId: record.deliveryProjectId,
      id: { notIn: procurementItems.map((item) => item.id) },
    },
    orderBy: [{ requiredBy: 'asc' }, { createdAt: 'desc' }],
    select: { id: true, name: true, unit: true },
  });

  const availableProcurementItems = [...procurementItems, ...additionalProjectRequirements];
  const totals = calculatePurchaseRequestTotals(record.lineItems);
  const rawReturnTo = firstParam(searchParams?.returnTo);
  const returnTo = safeRedirectPath(rawReturnTo, '/admin/procurement', ['/admin/procurement', '/admin/projects']);

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <AdminTopNav role={session.role} />

        {firstParam(searchParams?.created) === '1' ? <AdminFlash message="Purchase record created successfully." /> : null}
        {firstParam(searchParams?.updated) === '1' ? <AdminFlash message="Purchase record updated successfully." /> : null}

        <Link href={returnTo} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-cyan transition hover:text-white">
          <span aria-hidden="true">&larr;</span>
          Back to procurement
        </Link>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">{getPurchaseDocumentLabel(record.status)}</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{record.referenceCode}</h1>
              <p className="mt-2 text-sm text-slate-400">{record.deliveryProject.title} {record.deliveryProject.projectCode ? `· ${record.deliveryProject.projectCode}` : ''}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.16em] ${statusTone(record.status)}`}>
                {formatStatusLabel(record.status)}
              </span>
              <Link href={`/admin/procurement/${record.id}/document`} className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
                Open document
              </Link>
              <Link href={`/admin/procurement/${record.id}/document?print=1`} className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
                Print / PDF
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Estimated value</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(totals.estimated)}</p>
            </article>
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Actual value</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(totals.actual || totals.estimated)}</p>
            </article>
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Received value</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(totals.received)}</p>
            </article>
            <article className="interactive-card rounded-2xl p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Line items</p>
              <p className="mt-2 text-xl font-semibold text-white">{record.lineItems.length}</p>
            </article>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="space-y-6">
              <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <div className="flex items-center gap-3">
                  <span className="icon-pill"><Truck size={16} /></span>
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Supplier and project context</p>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p><span className="text-slate-500">Supplier:</span> {record.supplier?.name || 'Not assigned'}</p>
                  <p><span className="text-slate-500">Supplier contact:</span> {record.supplier?.email || record.supplier?.phone || 'Not set'}</p>
                  <p><span className="text-slate-500">Project:</span> {record.deliveryProject.title}</p>
                  <p><span className="text-slate-500">Request date:</span> {new Date(record.requestDate).toLocaleDateString()}</p>
                  <p><span className="text-slate-500">Issue date:</span> {record.issueDate ? new Date(record.issueDate).toLocaleDateString() : 'Not issued'}</p>
                  <p><span className="text-slate-500">Expected delivery:</span> {record.expectedDeliveryDate ? new Date(record.expectedDeliveryDate).toLocaleDateString() : 'Not set'}</p>
                  <p><span className="text-slate-500">Created by:</span> {record.createdByAdmin?.name || record.createdByAdmin?.email || 'System'}</p>
                  <p><span className="text-slate-500">Approved by:</span> {record.approvedByAdmin?.name || record.approvedByAdmin?.email || 'Not approved yet'}</p>
                </div>
                {record.notes ? <p className="mt-4 whitespace-pre-line text-sm text-slate-300">{record.notes}</p> : null}
                {record.internalNotes ? <p className="mt-4 whitespace-pre-line text-sm text-slate-400">{record.internalNotes}</p> : null}
              </article>

              <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <div className="flex items-center gap-3">
                  <span className="icon-pill"><FileSpreadsheet size={16} /></span>
                  <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Current line items</p>
                </div>
                <div className="mt-4 space-y-3">
                  {record.lineItems.length ? record.lineItems.map((lineItem) => (
                    <article key={lineItem.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{lineItem.description}</p>
                        <span className="text-xs text-slate-500">{lineItem.quantity.toString()} {lineItem.unit}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400">
                        {lineItem.materialItem ? <span>Catalog: {lineItem.materialItem.name}</span> : null}
                        {lineItem.projectProcurementItem ? <span>Requirement: {lineItem.projectProcurementItem.name}</span> : null}
                        <span>Estimated {formatCurrency(lineItem.estimatedUnitCost ? Number(lineItem.estimatedUnitCost) : null)}</span>
                        <span>Actual {formatCurrency(lineItem.actualUnitCost ? Number(lineItem.actualUnitCost) : null)}</span>
                        <span>Received qty {lineItem.receivedQuantity ? Number(lineItem.receivedQuantity) : 0}</span>
                      </div>
                      {lineItem.notes ? <p className="mt-3 text-sm text-slate-300">{lineItem.notes}</p> : null}
                    </article>
                  )) : (
                    <p className="text-sm text-slate-400">No line items recorded yet.</p>
                  )}
                </div>
              </article>
            </section>

            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
              <div className="flex items-center gap-3">
                <span className="icon-pill"><CalendarDays size={16} /></span>
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Update purchase record</p>
              </div>

              <form action={`/api/admin/procurement/${record.id}`} method="post" className="mt-6 space-y-4">
                <input type="hidden" name="deliveryProjectId" value={record.deliveryProjectId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <div className="grid gap-4 lg:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Supplier</span>
                    <select name="supplierId" defaultValue={record.supplierId || ''} className="interactive-input mt-2">
                      <option value="">No supplier yet</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Status</span>
                    <select name="status" defaultValue={record.status} className="interactive-input mt-2">
                      {PURCHASE_REQUEST_STATUSES.map((status) => (
                        <option key={status} value={status}>{formatStatusLabel(status)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Request date</span>
                    <input name="requestDate" type="date" defaultValue={toDateInputValue(record.requestDate)} className="interactive-input mt-2" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Issue date</span>
                    <input name="issueDate" type="date" defaultValue={toDateInputValue(record.issueDate)} className="interactive-input mt-2" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-white">Expected delivery</span>
                    <input name="expectedDeliveryDate" type="date" defaultValue={toDateInputValue(record.expectedDeliveryDate)} className="interactive-input mt-2" />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold text-white">Notes</span>
                  <textarea name="notes" defaultValue={record.notes || ''} rows={3} className="interactive-input mt-2" />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Internal review notes</span>
                  <textarea name="internalNotes" defaultValue={record.internalNotes || ''} rows={3} className="interactive-input mt-2" />
                </label>

                <PurchaseLineItemRows
                  materials={materials}
                  procurementItems={availableProcurementItems}
                  lineItems={record.lineItems.map((lineItem) => ({
                    description: lineItem.description,
                    quantity: Number(lineItem.quantity),
                    unit: lineItem.unit,
                    estimatedUnitCost: lineItem.estimatedUnitCost ? Number(lineItem.estimatedUnitCost) : '',
                    actualUnitCost: lineItem.actualUnitCost ? Number(lineItem.actualUnitCost) : '',
                    receivedQuantity: lineItem.receivedQuantity ? Number(lineItem.receivedQuantity) : '',
                    materialItemId: lineItem.materialItemId,
                    projectProcurementItemId: lineItem.projectProcurementItemId,
                    notes: lineItem.notes,
                  }))}
                  minRows={Math.max(4, record.lineItems.length)}
                />

                <button type="submit" className="btn-primary w-full">
                  Save purchase record
                </button>
              </form>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/admin/projects/${record.deliveryProjectId}/operations`} className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">
                  Open project operations
                </Link>
                <Link href={`/admin/procurement/${record.id}/document`} className="btn-ghost px-4 py-2 text-xs uppercase tracking-[0.16em]">
                  Printable view
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
