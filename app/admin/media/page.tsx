import Image from 'next/image';
import { prisma } from '../../../lib/prisma';
import { requireAdminSession } from '../../../lib/auth';
import { MEDIA_ROLES } from '../../../lib/permissions';
import { AdminTopNav } from '../components/AdminTopNav';
import { MediaUploadPanel } from './MediaUploadPanel';

export const dynamic = 'force-dynamic';

export default async function AdminMediaPage() {
  const session = await requireAdminSession(MEDIA_ROLES);

  const assets = await prisma.mediaAsset.findMany({
    orderBy: { createdAt: 'desc' },
    take: 60,
  });

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Media</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Media asset workflow</h1>
          <p className="mt-3 text-slate-400">
            Upload validated project, service, and quote media assets with safe filenames and reusable URLs.
          </p>
        </div>

        <MediaUploadPanel />

        <section className="mt-6 rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <h2 className="text-xl font-semibold text-white">Recent assets</h2>

          {assets.length ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {assets.map((asset) => {
                const isImage = (asset.mimeType || '').startsWith('image/');
                const isLocalImage = asset.url.startsWith('/');

                return (
                  <article key={asset.id} className="rounded-2xl border border-slate-800/70 bg-slate-900/70 p-4">
                    {isImage ? (
                      <div className="relative h-40 w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
                        <Image src={asset.url} alt={asset.altText || asset.name} fill className="object-cover" unoptimized={!isLocalImage} />
                      </div>
                    ) : (
                      <div className="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-400">
                        {asset.mimeType || 'File'}
                      </div>
                    )}
                    <p className="mt-3 text-sm font-semibold text-white">{asset.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{asset.type}</p>
                    <p className="mt-2 break-all text-xs text-brand-cyan">{asset.url}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {asset.bytes ? `${Math.round(asset.bytes / 1024)} KB` : 'Unknown size'} · {new Date(asset.createdAt).toLocaleDateString()}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-400">No assets uploaded yet.</p>
          )}
        </section>
      </div>
    </main>
  );
}



