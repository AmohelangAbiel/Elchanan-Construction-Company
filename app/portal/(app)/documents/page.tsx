import Link from 'next/link';
import { requirePortalSession } from '../../../../lib/portal-auth';
import { getPortalDocumentOwnershipFilter, getProjectReference } from '../../../../lib/portal';
import { prisma } from '../../../../lib/prisma';
import { PortalContactActions } from '../components/PortalContactActions';

export const dynamic = 'force-dynamic';

export default async function PortalDocumentsPage() {
  const session = await requirePortalSession();

  if (!session.leadId) {
    return (
      <section className="space-y-6">
        <article className="rounded-[2rem] border border-amber-300/25 bg-amber-400/10 p-6 text-sm text-amber-100">
          Your document center is not available yet because your client account is pending project linkage.
        </article>
        <PortalContactActions title="Need portal document access?" />
      </section>
    );
  }

  const documents = await prisma.portalDocument.findMany({
    where: {
      deletedAt: null,
      clientVisible: true,
      ...getPortalDocumentOwnershipFilter(session.leadId),
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      quoteRequest: {
        select: {
          id: true,
          referenceCode: true,
          leadId: true,
          deletedAt: true,
        },
      },
      deliveryProject: {
        select: {
          id: true,
          title: true,
          projectCode: true,
          leadId: true,
          deletedAt: true,
          portalVisible: true,
          quoteRequest: {
            select: {
              referenceCode: true,
              leadId: true,
              deletedAt: true,
            },
          },
        },
      },
    },
  });

  const groupedCounts = documents.reduce<Record<string, number>>((acc, document) => {
    acc[document.type] = (acc[document.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="space-y-6">
      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Document center</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Shared documents</h1>
        <p className="mt-3 text-sm text-slate-400">
          Access approved quotation documents, project files, and update attachments relevant to your projects.
        </p>
      </article>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total files</p>
          <p className="mt-2 text-3xl font-semibold text-white">{documents.length}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Quotation docs</p>
          <p className="mt-2 text-3xl font-semibold text-white">{groupedCounts.QUOTE || 0}</p>
        </article>
        <article className="interactive-card rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Project docs</p>
          <p className="mt-2 text-3xl font-semibold text-white">{(groupedCounts.PROJECT || 0) + (groupedCounts.IMAGE || 0)}</p>
        </article>
      </section>

      <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
        <div className="space-y-3 md:hidden">
          {documents.length ? documents.map((document) => {
            const safeProject =
              document.deliveryProject &&
              !document.deliveryProject.deletedAt &&
              document.deliveryProject.portalVisible &&
              document.deliveryProject.leadId === session.leadId
                ? document.deliveryProject
                : null;

            const safeQuoteReference =
              safeProject?.quoteRequest &&
              !safeProject.quoteRequest.deletedAt &&
              safeProject.quoteRequest.leadId === session.leadId
                ? safeProject.quoteRequest.referenceCode
                : null;

            const safeQuote =
              document.quoteRequest &&
              !document.quoteRequest.deletedAt &&
              document.quoteRequest.leadId === session.leadId
                ? document.quoteRequest
                : null;

            const related = safeProject
              ? `Project: ${safeProject.title} (${getProjectReference({
                id: safeProject.id,
                projectCode: safeProject.projectCode,
                quoteRequest: safeQuoteReference ? { referenceCode: safeQuoteReference } : null,
              })})`
              : safeQuote
                ? `Quote: ${safeQuote.referenceCode}`
                : 'General';

            return (
              <article key={document.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-semibold text-white">{document.title}</p>
                  <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                    {document.type}
                  </span>
                </div>
                {document.description ? <p className="mt-2 text-xs text-slate-500">{document.description}</p> : null}
                <p className="mt-3 text-xs text-slate-300">{related}</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">{new Date(document.createdAt).toLocaleDateString()}</p>
                  <a
                    href={`/api/portal/documents/${document.id}`}
                    className="inline-flex rounded-full border border-brand-cyan/45 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-cyan transition hover:border-brand-cyan/80 hover:text-white"
                  >
                    Open
                  </a>
                </div>
              </article>
            );
          }) : (
            <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-400">
              No documents have been shared yet.
            </article>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-[0.16em] text-slate-400">
                <th className="px-2 py-3">Document</th>
                <th className="px-2 py-3">Type</th>
                <th className="px-2 py-3">Related record</th>
                <th className="px-2 py-3">Added</th>
                <th className="px-2 py-3 text-right">Access</th>
              </tr>
            </thead>
            <tbody>
              {documents.length ? (
                documents.map((document) => {
                  const safeProject =
                    document.deliveryProject &&
                    !document.deliveryProject.deletedAt &&
                    document.deliveryProject.portalVisible &&
                    document.deliveryProject.leadId === session.leadId
                      ? document.deliveryProject
                      : null;

                  const safeQuoteReference =
                    safeProject?.quoteRequest &&
                    !safeProject.quoteRequest.deletedAt &&
                    safeProject.quoteRequest.leadId === session.leadId
                      ? safeProject.quoteRequest.referenceCode
                      : null;

                  const safeQuote =
                    document.quoteRequest &&
                    !document.quoteRequest.deletedAt &&
                    document.quoteRequest.leadId === session.leadId
                      ? document.quoteRequest
                      : null;

                  const related = safeProject
                    ? `Project: ${safeProject.title} (${getProjectReference({
                      id: safeProject.id,
                      projectCode: safeProject.projectCode,
                      quoteRequest: safeQuoteReference ? { referenceCode: safeQuoteReference } : null,
                    })})`
                    : safeQuote
                      ? `Quote: ${safeQuote.referenceCode}`
                      : 'General';

                  return (
                    <tr key={document.id} className="border-b border-slate-800/50">
                      <td className="px-2 py-3">
                        <p className="font-semibold text-white">{document.title}</p>
                        {document.description ? <p className="mt-1 text-xs text-slate-500">{document.description}</p> : null}
                      </td>
                      <td className="px-2 py-3">
                        <span className="rounded-full border border-slate-700 px-3 py-1 text-xs uppercase tracking-[0.12em] text-slate-300">
                          {document.type}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-slate-300">{related}</td>
                      <td className="px-2 py-3 text-slate-400">{new Date(document.createdAt).toLocaleDateString()}</td>
                      <td className="px-2 py-3 text-right">
                        <a
                          href={`/api/portal/documents/${document.id}`}
                          className="inline-flex rounded-full border border-brand-cyan/45 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-cyan transition hover:border-brand-cyan/80 hover:text-white"
                        >
                          Open
                        </a>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-slate-400">
                    No documents have been shared yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/portal/quotes" className="interactive-card rounded-2xl p-5">
          <p className="text-sm font-semibold text-white">View quotation records</p>
          <p className="mt-2 text-xs text-slate-400">Open quote details and print-ready quotation documents.</p>
        </Link>
        <Link href="/portal/projects" className="interactive-card rounded-2xl p-5">
          <p className="text-sm font-semibold text-white">View project updates</p>
          <p className="mt-2 text-xs text-slate-400">Check milestones and latest updates alongside project files.</p>
        </Link>
      </section>

      <PortalContactActions title="Need a file that is not listed yet?" />
    </section>
  );
}
