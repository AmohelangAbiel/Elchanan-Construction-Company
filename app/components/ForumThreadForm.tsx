'use client';

import { useState } from 'react';
import { getApiData, getApiErrorMessage, readApiResponse } from '../../lib/api-client';

type ForumThreadFormProps = {
  categories?: Array<{ slug: string; name: string }>;
};

const initialState = {
  categorySlug: '',
  title: '',
  content: '',
  authorName: '',
  authorEmail: '',
  consentGiven: false,
  honeypot: '',
};

export function ForumThreadForm({ categories = [] }: ForumThreadFormProps) {
  const [form, setForm] = useState({
    ...initialState,
    categorySlug: categories[0]?.slug || '',
  });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          consentGiven: form.consentGiven,
        }),
      });

      const result = await readApiResponse<{
        message?: string;
      }>(response);
      const data = getApiData(result);
      if (response.ok && result.success) {
        setStatus('success');
        setMessage(typeof data.message === 'string' ? data.message : 'Your discussion has been submitted for moderation.');
        setForm({
          ...initialState,
          categorySlug: categories[0]?.slug || '',
        });
        return;
      }

      setStatus('error');
      setMessage(getApiErrorMessage(result, 'Unable to submit discussion topic.'));
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow">
      <h2 className="text-2xl font-semibold text-white">Start a new discussion</h2>
      <p className="mt-4 text-slate-300">Topics are moderated before public publication.</p>

      {status === 'success' ? (
        <div className="mt-6 rounded-3xl border border-brand-cyan/30 bg-brand-cyan/10 p-6 text-slate-100">
          <p className="font-semibold text-white">Discussion submitted.</p>
          <p className="mt-3 text-slate-200">{message}</p>
          <button
            type="button"
            onClick={() => {
              setStatus('idle');
              setMessage('');
            }}
            className="btn-ghost mt-5 px-4 py-2"
          >
            Submit another discussion
          </button>
        </div>
      ) : (
        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          <input type="text" name="honeypot" value={form.honeypot} onChange={(event) => setForm({ ...form, honeypot: event.target.value })} className="hidden" tabIndex={-1} autoComplete="off" />

          {categories.length ? (
            <label className="block">
              <span className="text-sm font-semibold text-white">Category</span>
              <select
                value={form.categorySlug}
                onChange={(event) => setForm({ ...form, categorySlug: event.target.value })}
                className="interactive-input mt-3"
              >
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>{category.name}</option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="text-sm font-semibold text-white">Discussion title</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
              className="interactive-input mt-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white">Topic description</span>
            <textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              rows={4}
              required
              className="interactive-input mt-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white">Your name</span>
            <input
              value={form.authorName}
              onChange={(event) => setForm({ ...form, authorName: event.target.value })}
              required
              className="interactive-input mt-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white">Email</span>
            <input
              value={form.authorEmail}
              onChange={(event) => setForm({ ...form, authorEmail: event.target.value })}
              type="email"
              className="interactive-input mt-3"
            />
          </label>
          <label className="flex items-center gap-3 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={form.consentGiven}
              onChange={(event) => setForm({ ...form, consentGiven: event.target.checked })}
              required
              className="h-5 w-5 rounded border-slate-700 bg-slate-900 text-brand-sky outline-none focus:ring-brand-sky"
            />
            I consent to moderation and publication rules.
          </label>

          {message && status === 'error' ? <p className="text-sm text-rose-400">{message}</p> : null}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Posting...' : 'Post discussion'}
          </button>
        </form>
      )}
    </div>
  );
}

