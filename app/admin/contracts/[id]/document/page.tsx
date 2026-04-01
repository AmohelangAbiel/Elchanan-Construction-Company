import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdminSession } from '../../../../../lib/auth';
import { getCompanyProfile } from '../../../../../lib/content';
import { prisma } from '../../../../../lib/prisma';
import { OPERATIONS_ROLES } from '../../../../../lib/permissions';
import { deriveDocumentApprovalStatus } from '../../../../../lib/billing';

type PageProps = {
  params: { id: string };
  searchParams?: { print?: string };
};

export const dynamic = 'force-dynamic';

export default async function AdminContractDocumentPage({ params, searchParams }: PageProps) {
  await requireAdminSession(OPERATIONS_ROLES);
  const [document, profile] = await Promise.all([
    prisma.portalDocument.findFirst({
      where: { id: params.id, deletedAt: null },
      include: {
        lead: {
          select: { id: true, fullName: true, companyName: true, email: true },
        },
        quoteRequest: {
          select: { id: true, referenceCode: true, fullName: true, serviceType: true },
        },
        deliveryProject: {
          select: { id: true, title: true, projectCode: true, status: true },
        },
        uploadedByAdmin: {
          select: { id: true, name: true, email: true },
        },
        clientRespondedByClientUser: {
          select: { id: true, fullName: true, displayName: true },
        },
      },
    }),
    getCompanyProfile(),
  ]);

  if (!document) return notFound();

  const displayStatus = deriveDocumentApprovalStatus({
    approvalStatus: document.approvalStatus,
    clientViewedAt: document.clientViewedAt,
  });
  const companyName = profile?.displayName || profile?.companyName || 'Elchanan Construction Company';

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-slate-800/70 bg-slate-950/80 p-8 text-slate-100 shadow-glow print:rounded-none print:border-0 print:bg-white print:p-8 print:text-slate-900 print:shadow-none">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/admin/contracts/${document.id}`} className="rounded-full border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-brand-cyan/60 hover:text-white">
            Back to contract
          </Link>
          <Link href={`/admin/contracts/${document.id}/document?print=1`} className="rounded-full bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-sky">
            Print / Save PDF
          </Link>
          {document.url ? (
            <a href={document.url} target="_blank" rel="noreferrer" className="rounded-full border border-brand-cyan/45 px-4 py-2 text-sm font-semibold text-brand-cyan transition hover:border-brand-cyan/80 hover:text-white">
              Open source file
            </a>
          ) : null}
        </div>

        <header className="border-b border-slate-800/60 pb-6 print:border-slate-300">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-4">
              <Image src="/logo-mark.svg" alt="Elchanan Construction" width={56} height={56} className="h-14 w-14 rounded-xl" />
              <div>
                <p className="text-2xl font-semibold text-white print:text-slate-900">{companyName}</p>
                <p className="mt-1 text-sm text-slate-400 print:text-slate-600">Client Contract Document</p>
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
              <p><span className="font-semibold">Title:</span> {document.title}</p>
              <p><span className="font-semibold">Type:</span> {document.type.replace('_', ' ')}</p>
              <p><span className="font-semibold">Status:</span> {displayStatus.replace('_', ' ')}</p>
              <p><span className="font-semibold">Created:</span> {new Date(document.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Client details</p>
            <div className="mt-3 space-y-1 text-sm">
              <p><span className="font-semibold">Name:</span> {document.lead?.fullName || 'Not set'}</p>
              <p><span className="font-semibold">Company:</span> {document.lead?.companyName || 'Not set'}</p>
              <p><span className="font-semibold">Email:</span> {document.lead?.email || 'Not set'}</p>
              <p><span className="font-semibold">Visible:</span> {document.clientVisible ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Linked records</p>
          <div className="mt-3 grid gap-2 text-sm text-slate-200 print:text-slate-800 sm:grid-cols-2">
            <p>Quote: {document.quoteRequest ? document.quoteRequest.referenceCode : 'Not linked'}</p>
            <p>Project: {document.deliveryProject ? document.deliveryProject.projectCode || document.deliveryProject.title : 'Not linked'}</p>
            <p>Uploaded by: {document.uploadedByAdmin?.name || document.uploadedByAdmin?.email || 'Not set'}</p>
            <p>Viewed at: {document.clientViewedAt ? new Date(document.clientViewedAt).toLocaleString() : 'Not yet'}</p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Document summary</p>
          <p className="mt-3 whitespace-pre-line text-sm text-slate-200 print:text-slate-800">
            {document.description || 'Contract, agreement, or scope document prepared for client review.'}
          </p>
          <div className="mt-4 space-y-2 text-sm text-slate-300 print:text-slate-800">
            <p><span className="text-slate-500 print:text-slate-600">URL:</span> {document.url}</p>
            <p><span className="text-slate-500 print:text-slate-600">File name:</span> {document.fileName || 'Not set'}</p>
            <p><span className="text-slate-500 print:text-slate-600">Mime type:</span> {document.mimeType || 'Not set'}</p>
            <p><span className="text-slate-500 print:text-slate-600">Bytes:</span> {document.bytes ? document.bytes.toLocaleString() : 'Not set'}</p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Approval activity</p>
            <div className="mt-3 space-y-1 text-sm text-slate-200 print:text-slate-800">
              <p>Viewed by: {document.clientRespondedByClientUser ? document.clientRespondedByClientUser.displayName || document.clientRespondedByClientUser.fullName : 'N/A'}</p>
              <p>Responded at: {document.clientRespondedAt ? new Date(document.clientRespondedAt).toLocaleString() : 'Not yet'}</p>
              <p>Approval note: {document.clientResponseNote || 'No response note recorded.'}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-5 print:border-slate-300 print:bg-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan print:text-slate-700">Admin note</p>
            <p className="mt-3 text-xs text-slate-400 print:text-slate-600">
              This print view supports internal review and client collaboration, and should be paired with the live approval workflow in the portal.
            </p>
          </div>
        </section>

        {searchParams?.print === '1' ? (
          <script
            dangerouslySetInnerHTML={{
              __html: 'setTimeout(function(){window.print();}, 350);',
            }}
          />
        ) : null}
      </div>
    </main>
  );
}
