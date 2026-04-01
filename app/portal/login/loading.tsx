export default function PortalLoginLoading() {
  return (
    <main className="mx-auto w-full max-w-lg px-4 py-14 sm:px-6 lg:px-0" aria-busy="true" aria-live="polite">
      <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/90 p-10 shadow-glow">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-3 w-28 animate-pulse rounded-full bg-slate-800" />
          <div className="mx-auto h-8 w-64 animate-pulse rounded-xl bg-slate-800" />
          <div className="mx-auto h-4 w-full max-w-sm animate-pulse rounded-xl bg-slate-800" />
        </div>
        <div className="mt-8 space-y-5">
          <div>
            <div className="h-4 w-16 animate-pulse rounded-full bg-slate-800" />
            <div className="mt-2 h-12 w-full animate-pulse rounded-3xl bg-slate-800" />
          </div>
          <div>
            <div className="h-4 w-20 animate-pulse rounded-full bg-slate-800" />
            <div className="mt-2 h-12 w-full animate-pulse rounded-3xl bg-slate-800" />
          </div>
          <div className="h-12 w-full animate-pulse rounded-full bg-slate-800" />
        </div>
      </div>
    </main>
  );
}
