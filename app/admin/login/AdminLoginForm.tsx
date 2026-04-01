'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiErrorMessage, readApiResponse } from '../../../lib/api-client';

type AdminLoginFormProps = {
  notice?: string;
};

export function AdminLoginForm({ notice }: AdminLoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState('admin@elchananconstruction.co.za');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await readApiResponse(response);
      if (response.ok && data.success) {
        router.push('/admin');
        router.refresh();
        return;
      }

      setStatus('error');
      setError(getApiErrorMessage(data, 'Unable to sign in.'));
    } catch {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-800/70 bg-slate-950/90 p-10 shadow-glow">
        <div className="space-y-3 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-brand-cyan">Admin access</p>
          <h1 className="text-3xl font-semibold text-white">Elchanan Construction dashboard</h1>
          <p className="text-slate-400">Sign in to manage enquiries, quotes, reviews, and forum discussions.</p>
        </div>
        {notice ? (
          <div className="mt-6 rounded-3xl border border-brand-cyan/35 bg-brand-cyan/10 p-4 text-sm text-slate-100">
            {notice}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <label className="block">
            <span className="text-sm font-semibold text-white">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="interactive-input mt-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white">Password</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="interactive-input mt-3"
            />
          </label>
          {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-8 rounded-3xl border border-slate-800/70 bg-slate-900/80 p-4 text-sm text-slate-300">
          <p className="font-semibold text-white">Seeded admin email</p>
          <p>Email: admin@elchananconstruction.co.za</p>
          <p className="mt-1 text-slate-400">Password is configured via `SEED_ADMIN_PASSWORD` during `npm run db:seed`.</p>
        </div>
      </div>
    </main>
  );
}

