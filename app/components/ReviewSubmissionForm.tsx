'use client';

import { useState } from 'react';

const initialState = {
  name: '',
  email: '',
  rating: '5',
  projectContext: '',
  title: '',
  message: '',
  consentGiven: false,
  honeypot: '',
};

export function ReviewSubmissionForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          rating: Number(form.rating),
          consentGiven: form.consentGiven,
        }),
      });

      const result = await response.json().catch(() => ({} as Record<string, string>));
      if (response.ok && result.success) {
        setStatus('success');
        setMessage('Your review has been received and is pending moderation.');
        setForm(initialState);
        return;
      }

      setStatus('error');
      setMessage(result.error || 'Unable to submit your review.');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 shadow-glow">
      <h2 className="text-2xl font-semibold text-white">Share your review</h2>
      <p className="mt-4 text-slate-300">Submit a testimonial for moderation before publication.</p>

      {status === 'success' ? (
        <div className="mt-8 rounded-3xl border border-brand-cyan/30 bg-brand-cyan/10 p-8 text-slate-100">
          <p className="text-lg font-semibold text-white">Thank you for your feedback.</p>
          <p className="mt-3 text-slate-200">{message}</p>
          <button
            type="button"
            onClick={() => {
              setStatus('idle');
              setMessage('');
            }}
            className="btn-ghost mt-6 px-5 py-2"
          >
            Submit another review
          </button>
        </div>
      ) : (
        <form className="mt-8 grid gap-5" onSubmit={handleSubmit}>
          <input type="text" name="honeypot" value={form.honeypot} onChange={(event) => setForm({ ...form, honeypot: event.target.value })} className="hidden" tabIndex={-1} autoComplete="off" />

          <label className="block">
            <span className="text-sm font-semibold text-white">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              required
              className="interactive-input mt-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white">Email</span>
            <input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              type="email"
              className="interactive-input mt-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white">Rating</span>
              <select
                value={form.rating}
                onChange={(event) => setForm({ ...form, rating: event.target.value })}
                className="interactive-input mt-3"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>{value} stars</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white">Project or service</span>
            <input
              value={form.projectContext}
              onChange={(event) => setForm({ ...form, projectContext: event.target.value })}
              className="interactive-input mt-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white">Review title (optional)</span>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              className="interactive-input mt-3"
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-white">Review</span>
            <textarea
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              rows={5}
              required
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
            I consent to review moderation and publication when approved.
          </label>

          {message && status === 'error' ? <p className="text-sm text-rose-400">{message}</p> : null}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Submitting...' : 'Submit review'}
          </button>
        </form>
      )}
    </div>
  );
}
