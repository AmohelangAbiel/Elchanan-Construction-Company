'use client';

import { useState } from 'react';
import { getApiData, getApiErrorMessage, readApiResponse } from '../../../lib/api-client';

type UploadKind = 'project' | 'service' | 'quote' | 'general';

const uploadKinds: UploadKind[] = ['project', 'service', 'quote', 'general'];

type UploadResult = {
  id: string;
  name: string;
  url: string;
  type: string;
  mimeType: string | null;
  bytes: number | null;
  createdAt: string;
};

export function MediaUploadPanel() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [kind, setKind] = useState<UploadKind>('project');
  const [altText, setAltText] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedAsset, setUploadedAsset] = useState<UploadResult | null>(null);
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const fileInput = formElement.elements.namedItem('file') as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      setStatus('error');
      setMessage('Please select a file to upload.');
      return;
    }

    setStatus('loading');
    setMessage('');

    const formData = new FormData();
    formData.append('kind', kind);
    formData.append('altText', altText);
    formData.append('description', description);
    formData.append('file', file);

    try {
      const response = await fetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await readApiResponse<{
        asset?: UploadResult;
        message?: string;
      }>(response);
      const data = getApiData(result);

      if (!response.ok || !result.success) {
        setStatus('error');
        setMessage(getApiErrorMessage(result, 'Upload failed. Please try again.'));
        return;
      }

      setStatus('success');
      setMessage(typeof data.message === 'string' ? data.message : 'Upload completed.');
      setUploadedAsset((data.asset as UploadResult | undefined) || null);
      formElement.reset();
      setKind('project');
      setAltText('');
      setDescription('');
    } catch {
      setStatus('error');
      setMessage('Network error. Please try again.');
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
      <h2 className="text-xl font-semibold text-white">Upload media asset</h2>
      <p className="mt-2 text-sm text-slate-400">
        Supported formats: JPG, PNG, WEBP, SVG. Quote attachments also support PDF.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold text-white">Upload type</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as UploadKind)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          >
            {uploadKinds.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-white">File</span>
          <input
            name="file"
            type="file"
            required
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-white">Alt text (optional)</span>
          <input
            value={altText}
            onChange={(event) => setAltText(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-white">Description (optional)</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
          />
        </label>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-sky disabled:cursor-not-allowed disabled:opacity-60 lg:col-span-2 lg:w-fit"
        >
          {status === 'loading' ? 'Uploading...' : 'Upload asset'}
        </button>
      </form>

      {message ? (
        <p className={`mt-4 text-sm ${status === 'error' ? 'text-rose-300' : 'text-emerald-300'}`}>{message}</p>
      ) : null}

      {uploadedAsset ? (
        <div className="mt-5 rounded-2xl border border-brand-cyan/30 bg-brand-cyan/10 p-4">
          <p className="text-sm font-semibold text-white">Latest uploaded URL</p>
          <p className="mt-2 break-all text-sm text-brand-cyan">{uploadedAsset.url}</p>
          <button
            type="button"
            onClick={() => navigator.clipboard.writeText(uploadedAsset.url)}
            className="mt-3 rounded-full border border-brand-cyan/50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-cyan hover:bg-brand-cyan/10"
          >
            Copy URL
          </button>
        </div>
      ) : null}
    </section>
  );
}

