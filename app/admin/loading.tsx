export default function AdminLoading() {
  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-slate-800/80 bg-slate-950/80 p-8 shadow-glow">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-cyan">Admin</p>
          <h1 className="mt-4 text-2xl font-semibold text-white">Loading operations workspace...</h1>
          <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-cyan" />
          </div>
        </div>
      </div>
    </main>
  );
}

