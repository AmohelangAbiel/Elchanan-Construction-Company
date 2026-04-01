import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
      <div className="max-w-xl rounded-[2rem] border border-slate-800/70 bg-slate-900/90 p-14 shadow-glow">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Page not found</p>
        <h1 className="mt-6 text-5xl font-semibold text-white">404</h1>
        <p className="mt-4 text-base leading-8 text-slate-400">
          The page you requested is not available. Return to the homepage to continue exploring our services.
        </p>
        <Link href="/" className="mt-8 inline-flex rounded-full bg-brand-blue px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-sky">
          Return home
        </Link>
      </div>
    </main>
  );
}
