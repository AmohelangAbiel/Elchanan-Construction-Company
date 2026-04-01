import { notFound } from 'next/navigation';
import { prisma } from '../../../../lib/prisma';
import { requireAdminSession } from '../../../../lib/auth';
import { MODERATION_ROLES } from '../../../../lib/permissions';
import { AdminTopNav } from '../../components/AdminTopNav';
import { AdminFlash } from '../../components/AdminFlash';

export const dynamic = 'force-dynamic';

async function getReview(id: string) {
  return prisma.review.findFirst({ where: { id, deletedAt: null } });
}

export default async function AdminReviewDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { updated?: string };
}) {
  const session = await requireAdminSession(MODERATION_ROLES);
  const review = await getReview(params.id);
  if (!review) return notFound();

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <AdminTopNav role={session.role} />
        {searchParams?.updated === '1' ? (
          <AdminFlash message="Review moderation saved successfully." />
        ) : null}
        <div className="rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Review detail</p>
              <h1 className="mt-4 text-3xl font-semibold text-white">{review.name}</h1>
              <p className="mt-2 text-slate-400">Rating: {review.rating} / 5</p>
            </div>
            <span className="rounded-full bg-slate-800/70 px-4 py-2 text-sm uppercase tracking-[0.3em] text-slate-300">{review.status}</span>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_0.85fr]">
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Project context</p>
                <p className="mt-4 text-slate-300">{review.projectContext || 'Not specified'}</p>
              </div>

              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
                <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Message</p>
                <p className="mt-4 text-slate-300 whitespace-pre-line">{review.message}</p>
              </div>
            </section>

            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Moderation</p>
              <form action={`/api/admin/reviews/${review.id}`} method="post" className="mt-6 space-y-5">
                <label className="block">
                  <span className="text-sm font-semibold text-white">Status</span>
                  <select name="status" defaultValue={review.status} className="interactive-input mt-3">
                    {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                      <option key={status} value={status}>{status.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-white">Feature review</span>
                  <select name="featured" defaultValue={review.featured ? 'true' : 'false'} className="interactive-input mt-3">
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <button type="submit" className="btn-primary w-full">
                  Save moderation
                </button>
              </form>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}





