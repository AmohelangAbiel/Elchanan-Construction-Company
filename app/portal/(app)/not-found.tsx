import Link from 'next/link';

export default function PortalNotFound() {
  return (
    <section className="mx-auto max-w-3xl space-y-6 py-8">
      <article className="rounded-[2rem] border border-amber-300/25 bg-amber-400/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100">Record unavailable</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">We could not find that portal item</h1>
        <p className="mt-3 text-sm text-amber-100/85">
          The record may not exist, may no longer be shared in the portal, or may not belong to your account.
        </p>
      </article>

      <div className="flex flex-wrap gap-3">
        <Link href="/portal" className="btn-primary px-5 py-2 text-xs uppercase tracking-[0.16em]">
          Back to dashboard
        </Link>
        <Link href="/portal/projects" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
          View projects
        </Link>
        <Link href="/portal/quotes" className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em]">
          View quotes
        </Link>
      </div>
    </section>
  );
}
