export default function PortalAppLoading() {
  return (
    <section className="space-y-6" aria-busy="true" aria-live="polite">
      <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-8 shadow-glow">
        <div className="h-3 w-40 animate-pulse rounded-full bg-slate-800" />
        <div className="mt-4 h-9 w-72 animate-pulse rounded-xl bg-slate-800" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-xl bg-slate-800" />
      </article>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="rounded-2xl border border-slate-800/70 bg-slate-950/75 p-5 shadow-glow">
            <div className="h-3 w-28 animate-pulse rounded-full bg-slate-800" />
            <div className="mt-3 h-9 w-20 animate-pulse rounded-xl bg-slate-800" />
          </article>
        ))}
      </section>

      <section className="grid gap-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <article key={index} className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <div className="h-5 w-56 animate-pulse rounded-full bg-slate-800" />
            <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-800" />
            <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-slate-800" />
          </article>
        ))}
      </section>
    </section>
  );
}
