'use client';

import { useState } from 'react';
import { getApiData, getApiErrorMessage, readApiResponse } from '../../lib/api-client';
import { BUDGET_RANGES, PROJECT_TYPES, SERVICE_TYPES } from '../../lib/constants';

type QuoteFormState = {
  fullName: string;
  email: string;
  phone: string;
  serviceType: string;
  projectType: string;
  location: string;
  estimatedBudgetRange: string;
  preferredStartDate: string;
  siteVisitRequired: 'yes' | 'no';
  projectDescription: string;
  attachmentUrl: string;
  consentGiven: boolean;
  honeypot: string;
};

const initialState: QuoteFormState = {
  fullName: '',
  email: '',
  phone: '',
  serviceType: SERVICE_TYPES[0],
  projectType: PROJECT_TYPES[0],
  location: '',
  estimatedBudgetRange: BUDGET_RANGES[BUDGET_RANGES.length - 1],
  preferredStartDate: '',
  siteVisitRequired: 'no',
  projectDescription: '',
  attachmentUrl: '',
  consentGiven: false,
  honeypot: '',
};

function getLeadAttributionPayload() {
  if (typeof window === 'undefined') {
    return {};
  }

  const search = window.location.search || '';
  const sourcePath = `${window.location.pathname}${search}`;
  const sourcePage = window.location.pathname;
  const referrer = document.referrer || '';
  const params = new URLSearchParams(search);

  let leadSourceType = 'DIRECT';
  if (sourcePage.startsWith('/quote')) leadSourceType = 'QUOTE_PAGE';
  else if (sourcePage.startsWith('/contact')) leadSourceType = 'CONTACT_PAGE';
  else if (sourcePage.startsWith('/services')) leadSourceType = 'SERVICE_PAGE';
  else if (sourcePage.startsWith('/projects')) leadSourceType = 'PROJECT_PAGE';
  else if (sourcePage.startsWith('/forum')) leadSourceType = 'FORUM_PAGE';
  else if (referrer.includes('wa.me') || referrer.includes('whatsapp.com')) leadSourceType = 'WHATSAPP';

  return {
    leadSourceType,
    sourcePath,
    sourcePage,
    sourceReferrer: referrer,
    utmSource: params.get('utm_source') || '',
    utmMedium: params.get('utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || '',
  };
}

export function QuoteForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          consentGiven: form.consentGiven,
          ...getLeadAttributionPayload(),
        }),
      });

      const result = await readApiResponse<{
        referenceCode?: string;
        message?: string;
      }>(response);
      const data = getApiData(result);
      if (response.ok && result.success) {
        setStatus('success');
        setReference(typeof data.referenceCode === 'string' ? data.referenceCode : '');
        setMessage(typeof data.message === 'string' ? data.message : 'Your quotation request has been submitted.');
        setForm(initialState);
        return;
      }

      setStatus('error');
      setMessage(getApiErrorMessage(result, 'Unable to submit quote request.'));
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 shadow-glow">
      <h2 className="text-2xl font-semibold text-white">Quotation request</h2>
      <p className="mt-4 text-slate-300">Share your scope, budget range, and timeline expectations for a tailored response.</p>

      {status === 'success' ? (
        <div className="mt-8 rounded-3xl border border-brand-cyan/30 bg-brand-cyan/10 p-8 text-slate-100">
          <p className="text-lg font-semibold text-white">Quote request submitted.</p>
          <p className="mt-3 text-slate-200">{message}</p>
          {reference ? <p className="mt-4 text-sm text-slate-100">Reference code: <span className="font-semibold text-white">{reference}</span></p> : null}
          <button
            type="button"
            onClick={() => {
              setStatus('idle');
              setMessage('');
            }}
            className="btn-ghost mt-6 px-5 py-2"
          >
            Submit another request
          </button>
        </div>
      ) : (
        <form className="mt-8 grid gap-6" onSubmit={handleSubmit}>
          <input type="text" name="honeypot" value={form.honeypot} onChange={(event) => setForm({ ...form, honeypot: event.target.value })} className="hidden" tabIndex={-1} autoComplete="off" />

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white">Full name</span>
              <input
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                required
                className="interactive-input mt-3"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Phone</span>
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                type="tel"
                required
                className="interactive-input mt-3"
              />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white">Email</span>
              <input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                type="email"
                required
                className="interactive-input mt-3"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Service type</span>
              <select
                value={form.serviceType}
                onChange={(event) => setForm({ ...form, serviceType: event.target.value })}
                className="interactive-input mt-3"
              >
                {SERVICE_TYPES.map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white">Project type</span>
              <select
                value={form.projectType}
                onChange={(event) => setForm({ ...form, projectType: event.target.value })}
                className="interactive-input mt-3"
              >
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Preferred start date</span>
              <input
                value={form.preferredStartDate}
                onChange={(event) => setForm({ ...form, preferredStartDate: event.target.value })}
                type="date"
                className="interactive-input mt-3"
              />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white">Location</span>
              <input
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                placeholder="City or neighbourhood"
                className="interactive-input mt-3"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Budget range</span>
              <select
                value={form.estimatedBudgetRange}
                onChange={(event) => setForm({ ...form, estimatedBudgetRange: event.target.value })}
                className="interactive-input mt-3"
              >
                {BUDGET_RANGES.map((range) => (
                  <option key={range} value={range}>{range}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white">Site visit required?</span>
              <select
                value={form.siteVisitRequired}
                onChange={(event) =>
                  setForm({
                    ...form,
                    siteVisitRequired: event.target.value as QuoteFormState['siteVisitRequired'],
                  })
                }
                className="interactive-input mt-3"
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Attachment URL (optional)</span>
              <input
                value={form.attachmentUrl}
                onChange={(event) => setForm({ ...form, attachmentUrl: event.target.value })}
                placeholder="Link to plans/photos"
                className="interactive-input mt-3"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-white">Project description</span>
            <textarea
              value={form.projectDescription}
              onChange={(event) => setForm({ ...form, projectDescription: event.target.value })}
              rows={5}
              required
              placeholder="Tell us about scope, priorities, and any deadlines."
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
            I consent to follow-up communication for quote preparation.
          </label>

          {message && status === 'error' ? <p className="text-sm text-rose-400">{message}</p> : null}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-accent w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Sending...' : 'Submit quote request'}
          </button>
        </form>
      )}
    </div>
  );
}
