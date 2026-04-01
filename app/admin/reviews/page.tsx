import Link from 'next/link';
import { prisma } from '../../../lib/prisma';
import { requireAdminSession } from '../../../lib/auth';
import { MODERATION_ROLES } from '../../../lib/permissions';
import { AdminTopNav } from '../components/AdminTopNav';
import { AdminFlash } from '../components/AdminFlash';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const session = await requireAdminSession(MODERATION_ROLES);
  const reviews = await prisma.review.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-glow">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-sky">Reviews</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Review moderation</h1>
          <p className="mt-3 text-slate-400">Approve or reject submitted reviews before they appear on the site.</p>
        </div>

        <div className="grid gap-4">
          {reviews.length ? reviews.map((review) => (
            <Link
              key={review.id}
              href={`/admin/reviews/${review.id}`}
              className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 shadow-glow transition hover:-translate-y-0.5 hover:border-brand-sky/50"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">{review.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{review.projectContext || 'General review'}</p>
                </div>
                <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-300">{review.status}</span>
              </div>
              <p className="mt-4 text-sm text-slate-300">{review.message.slice(0, 120)}...</p>
            </Link>
          )) : (
            <AdminFlash tone="warning" message="No reviews found yet." />
          )}
        </div>
      </div>
    </main>
  );
}




