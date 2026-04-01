'use client';

import { useState } from 'react';

const initialState = {
  fullName: '',
  email: '',
  phone: '',
  subject: '',
  serviceInterest: '',
  preferredContactMethod: 'Phone',
  location: '',
  message: '',
  consentGiven: false,
  honeypot: '',
};

const serviceInterests = [
  'Residential Construction',
  'Renovations and Upgrades',
  'Roofing and Ceilings',
  'Paving and Brickwork',
  'Commercial Fitout',
  'General Enquiry',
];

const contactMethods = ['Phone', 'Email', 'WhatsApp'];

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
  if (sourcePage.startsWith('/contact')) leadSourceType = 'CONTACT_PAGE';
  else if (sourcePage.startsWith('/quote')) leadSourceType = 'QUOTE_PAGE';
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

export function ContactForm() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          consentGiven: form.consentGiven,
          ...getLeadAttributionPayload(),
        }),
      });

      const result = await response.json().catch(() => ({} as Record<string, string>));

      if (response.ok && result.success) {
        setStatus('success');
        setReference(result.referenceCode || '');
        setMessage(result.message || 'Your enquiry has been received successfully.');
        setForm(initialState);
        return;
      }

      setStatus('error');
      setMessage(result.error || 'Unable to send enquiry. Please try again.');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 shadow-glow">
      <h2 className="text-2xl font-semibold text-white">Contact form</h2>
      <p className="mt-4 text-slate-300">Send your details and our team will respond with clear next steps.</p>

      {status === 'success' ? (
        <div className="mt-8 rounded-3xl border border-brand-cyan/30 bg-brand-cyan/10 p-8 text-slate-100">
          <p className="text-lg font-semibold text-white">Thank you. Your enquiry has been submitted.</p>
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
            Submit another enquiry
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
                type="text"
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
                required
                className="interactive-input mt-3"
              />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
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
            <label className="block">
              <span className="text-sm font-semibold text-white">Preferred contact method</span>
              <select
                value={form.preferredContactMethod}
                onChange={(event) => setForm({ ...form, preferredContactMethod: event.target.value })}
                className="interactive-input mt-3"
              >
                {contactMethods.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white">Subject</span>
              <input
                value={form.subject}
                onChange={(event) => setForm({ ...form, subject: event.target.value })}
                type="text"
                required
                className="interactive-input mt-3"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Service interest</span>
              <select
                value={form.serviceInterest}
                onChange={(event) => setForm({ ...form, serviceInterest: event.target.value })}
                className="interactive-input mt-3"
              >
                <option value="">Select service</option>
                {serviceInterests.map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-semibold text-white">Location</span>
            <input
              value={form.location}
              onChange={(event) => setForm({ ...form, location: event.target.value })}
              placeholder="City or service area"
              className="interactive-input mt-3"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-white">Message</span>
            <textarea
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
              rows={5}
              required
              placeholder="Share your project details or enquiry."
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
            I consent to follow-up communication for this enquiry.
          </label>

          {message && status === 'error' ? <p className="text-sm text-rose-400">{message}</p> : null}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Sending...' : 'Send enquiry'}
          </button>
        </form>
      )}
    </div>
  );
}
