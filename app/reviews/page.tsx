import { SectionHeading } from '../components/SectionHeading';
import { TestimonialCard } from '../components/TestimonialCard';
import { ReviewSubmissionForm } from '../components/ReviewSubmissionForm';
import { getApprovedReviews } from '../../lib/content';
import { createPageMetadata } from '../../lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'Reviews | Elchanan Construction Company',
  description:
    'Read approved client reviews and submit moderated testimonials for construction and renovation projects.',
  path: '/reviews',
});

export default async function ReviewsPage() {
  const reviews = await getApprovedReviews(12);

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title="Reviews from clients who trust our delivery"
          subtitle="Reviews"
          description="Only approved testimonials are displayed publicly. Every submission is moderated before publication."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.95fr_0.85fr]">
          <div className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {reviews.length ? (
                reviews.map((review) => (
                  <TestimonialCard
                    key={review.id}
                    name={review.name}
                    role={review.projectContext || 'Construction client'}
                    quote={review.message}
                    rating={review.rating}
                  />
                ))
              ) : (
                <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 text-slate-300 shadow-glow">
                  <p className="text-lg font-semibold text-white">No approved reviews yet.</p>
                  <p className="mt-4">Be the first to share your experience with a quote or project delivery.</p>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 shadow-glow">
            <div className="space-y-6">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-sky">Share your feedback</p>
                <p className="mt-4 text-slate-300">Submit your review. Our moderation team approves valid testimonials for public display.</p>
              </div>
              <div className="mt-6">
                <ReviewSubmissionForm />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
