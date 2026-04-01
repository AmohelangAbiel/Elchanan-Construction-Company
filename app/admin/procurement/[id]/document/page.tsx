import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminSession } from '../../../../../lib/auth';
import { formatCurrency } from '../../../../../lib/billing';
import { getCompanyProfile } from '../../../../../lib/content';
import { calculatePurchaseRequestTotals, formatStatusLabel, getPurchaseDocumentLabel } from '../../../../../lib/operations';
import { PROCUREMENT_ROLES } from '../../../../../lib/permissions';
import { prisma } from '../../../../../lib/prisma';

type PageProps = {
  params: { id: string };
  searchParams?: { print?: string };
};

export const dynamic = 'force-dynamic';

export default async function AdminProcurementDocumentPage({ params, searchParams }: PageProps) {
  await requireAdminSession(PROCUREMENT_ROLES);

  const [record, profile] = await Promise.all([
    prisma.purchaseRequest.findUnique({
      where: { id: params.id },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            contactPerson: true,
            email: true,
            phone: true,
            address: true,
            cityArea: true,
          },
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
              select: { id: true, name: true, category: true },
            },
            projectProcurementItem: {
              select: { id: true, name: true },
            },
          },
        },
      },
    }),
    getCompanyProfile(),
  ]);

  if (!record) return notFound();

  const totals = calculatePurchaseRequestTotals(record.lineItems);
  const documentTitle = getPurchaseDocumentLabel(record.status);
  const companyName = profile?.displayName || profile?.companyName || 'Elchanan Construction Company';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-800/70 bg-slate-950/80 p-8 text-slate-100 shadow-glow print:rounded-none print:border-0 print:bg-white print:p-8 print:text-slate-900 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/admin/procurement/${record.id}`} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-cyan/60 hover:text-white">
            Back to record
          </Link>
          <Link href={`/admin/procurement/${record.id}/document?print=1`} className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-sky">
            Print / Save PDF
          </Link>
        </div>

        <header className="border-b border-slate-800/60 pb-6 print:border-slate-300">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image src="/logo-mark.svg" alt="Elchanan Construction" width={56} height={56} className="h-14 w-14 rounded-xl" />
              <div>
                <p className="text-2xl font-semibold text-white print:text-slate-900">{companyName}</p>
                <p className="mt-1 text-sm text-slate-400 print:text-slate-600">{documentTitle}</p>
              </div>
            </div>
            <div className="text-right text-sm text-slate-300 print:text-slate-700">
              <p><span className="font-semibold">Phone:</span> {profile?.phone || 'Not set'}</p>
              <p><span className="font-semibold">Email:</span> {profile?.email || 'Not set'}</p>
              <p><span className="font-semibold">Address:</span> {profile?.address || 'Not set'}</p>
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Document details</p>
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="font-semibold">Reference:</span> {record.referenceCode}</p>
              <p><span className="font-semibold">Type:</span> {documentTitle}</p>
              <p><span className="font-semibold">Status:</span> {formatStatusLabel(record.status)}</p>
              <p><span className="font-semibold">Request date:</span> {new Date(record.requestDate).toLocaleDateString()}</p>
              <p><span className="font-semibold">Issue date:</span> {record.issueDate ? new Date(record.issueDate).toLocaleDateString() : 'Not issued'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Supplier details</p>
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="font-semibold">Supplier:</span> {record.supplier?.name || 'Not assigned'}</p>
              <p><span className="font-semibold">Contact:</span> {record.supplier?.contactPerson || 'Not set'}</p>
              <p><span className="font-semibold">Email:</span> {record.supplier?.email || 'Not set'}</p>
              <p><span className="font-semibold">Phone:</span> {record.supplier?.phone || 'Not set'}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Project and internal workflow</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-200 print:text-slate-800 sm:grid-cols-2">
            <p>Project: {record.deliveryProject.projectCode || record.deliveryProject.title}</p>
            <p>Project status: {formatStatusLabel(record.deliveryProject.status)}</p>
            <p>Requested by: {record.createdByAdmin?.name || record.createdByAdmin?.email || 'System'}</p>
            <p>Approved by: {record.approvedByAdmin?.name || record.approvedByAdmin?.email || 'Pending approval'}</p>
            <p>Expected delivery: {record.expectedDeliveryDate ? new Date(record.expectedDeliveryDate).toLocaleDateString() : 'Not set'}</p>
          </div>
          {record.notes ? <p className="mt-4 whitespace-pre-line text-sm text-slate-300 print:text-slate-800">{record.notes}</p> : null}
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Line items</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-800/70 text-left text-slate-400 print:border-slate-300 print:text-slate-700">
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4 text-right">Qty</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2 pr-4 text-right">Estimated</th>
                  <th className="py-2 pr-4 text-right">Actual</th>
                  <th className="py-2 text-right">Received</th>
                </tr>
              </thead>
              <tbody>
                {record.lineItems.length ? record.lineItems.map((lineItem) => (
                  <tr key={lineItem.id} className="border-b border-slate-800/40 print:border-slate-200">
                    <td className="py-2 pr-4">
                      <p>{lineItem.description}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {lineItem.materialItem ? `Catalog: ${lineItem.materialItem.name}` : ''}
                        {lineItem.projectProcurementItem ? `${lineItem.materialItem ? ' · ' : ''}Requirement: ${lineItem.projectProcurementItem.name}` : ''}
                      </p>
                    </td>
                    <td className="py-2 pr-4 text-right">{lineItem.quantity.toString()}</td>
                    <td className="py-2 pr-4">{lineItem.unit}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(lineItem.estimatedUnitCost ? Number(lineItem.estimatedUnitCost) : null)}</td>
                    <td className="py-2 pr-4 text-right">{formatCurrency(lineItem.actualUnitCost ? Number(lineItem.actualUnitCost) : null)}</td>
                    <td className="py-2 text-right">{lineItem.receivedQuantity ? Number(lineItem.receivedQuantity) : 0}</td>
                  </tr>
                )) : (
                  <tr>
                    <td className="py-3 pr-4 text-slate-300 print:text-slate-700" colSpan={6}>
                      No line items have been recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-4 pr-4 text-right font-semibold" colSpan={5}>Estimated total</td>
                  <td className="pt-4 text-right">{formatCurrency(totals.estimated)}</td>
                </tr>
                <tr>
                  <td className="pt-2 pr-4 text-right font-semibold" colSpan={5}>Actual total</td>
                  <td className="pt-2 text-right">{formatCurrency(totals.actual || totals.estimated)}</td>
                </tr>
                <tr>
                  <td className="pt-2 pr-4 text-right font-semibold" colSpan={5}>Received value</td>
                  <td className="pt-2 text-right">{formatCurrency(totals.received)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <footer className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Internal note</p>
          <p className="mt-3 text-xs text-slate-400 print:text-slate-600">
            This document is generated from the protected procurement record and is intended for internal planning, approval, and supplier coordination use.
          </p>
        </footer>
      </div>

      {searchParams?.print === '1' ? (
        <script
          dangerouslySetInnerHTML={{
            __html: 'setTimeout(function(){window.print();}, 350);',
          }}
        />
      ) : null}
    </main>
  );
}
