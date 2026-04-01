import { DiscussionCard } from '../components/DiscussionCard';
import { ForumThreadForm } from '../components/ForumThreadForm';
import { SectionHeading } from '../components/SectionHeading';
import { getForumCategories, getOpenForumThreads } from '../../lib/content';
import { createPageMetadata } from '../../lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'Forum | Elchanan Construction Company',
  description:
    'Browse moderated construction discussions, ask project questions, and share practical advice with the community.',
  path: '/forum',
});

export default async function ForumPage() {
  const [categories, threads] = await Promise.all([getForumCategories(), getOpenForumThreads(12)]);

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title="Community discussion and project advice"
          subtitle="Forum"
          description="A moderated forum for homeowners, project teams, and commercial clients discussing practical construction topics."
        />

        {categories.length ? (
          <section className="mt-10 rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-6 shadow-glow">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Categories</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span key={category.id} className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs uppercase tracking-[0.14em] text-slate-300">
                  {category.name}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.95fr_0.8fr]">
          <section className="space-y-6">
            {threads.length ? (
              threads.map((thread) => (
                <DiscussionCard
                  key={thread.id}
                  slug={thread.slug}
                  title={thread.title}
                  meta={`${thread.authorName} - ${thread.category?.name || 'General'}`}
                  comments={thread.replies.length}
                  lastUpdated={thread.updatedAt.toLocaleDateString()}
                />
              ))
            ) : (
              <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 text-slate-300 shadow-glow">
                <p className="text-xl font-semibold text-white">No published discussions yet.</p>
                <p className="mt-4">Submit a topic. It will appear once approved by moderation.</p>
              </div>
            )}
          </section>

          <aside className="space-y-6">
            <ForumThreadForm
              categories={categories.map((category) => ({
                slug: category.slug,
                name: category.name,
              }))}
            />
            <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-sky">Community rules</p>
              <ul className="mt-6 space-y-3 text-slate-300">
                <li>Keep discussions professional and relevant to construction topics.</li>
                <li>Avoid posting private addresses, account numbers, or sensitive client details.</li>
                <li>Posts are moderated before they appear publicly.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

