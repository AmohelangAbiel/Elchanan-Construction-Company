'use client';

export default function AdminError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-rose-400/30 bg-rose-950/20 p-8 shadow-glow">
        <p className="text-sm uppercase tracking-[0.3em] text-rose-300">Admin error</p>
        <h1 className="mt-4 text-2xl font-semibold text-white">Unable to load this admin page.</h1>
        <p className="mt-4 text-sm text-rose-100/90">
          {error.message || 'An unexpected error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="mt-6 inline-flex items-center justify-center rounded-full border border-rose-300/40 px-5 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/10"
        >
          Try again
        </button>
      </div>
    </main>
  );
}

