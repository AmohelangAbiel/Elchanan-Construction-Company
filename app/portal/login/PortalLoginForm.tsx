'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type PortalLoginFormProps = {
  notice?: string;
};

export function PortalLoginForm({ notice }: PortalLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const response = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response
        .json()
        .catch(() => ({} as { success?: boolean; error?: string }));

      if (response.ok && data.success) {
        router.push('/portal');
        router.refresh();
        return;
      }

      setStatus('error');
      setError(data.error || 'Unable to sign in.');
    } catch {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-14 sm:px-6 lg:px-0">
      <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/90 p-10 shadow-glow">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Client portal</p>
          <h1 className="text-3xl font-semibold text-white">Project and quote visibility</h1>
          <p className="text-sm text-slate-400">
            Sign in to view your live project progress, milestones, documents, and quotation history.
          </p>
        </div>

        {notice ? (
          <div className="mt-6 rounded-3xl border border-brand-cyan/35 bg-brand-cyan/10 p-4 text-sm text-slate-100">
            {notice}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm font-semibold text-white">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="interactive-input mt-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="interactive-input mt-2"
            />
          </label>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Signing in...' : 'Sign in to portal'}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-400">
          Access is provisioned directly by Elchanan Construction for verified clients.
        </div>
      </div>
    </main>
  );
}
