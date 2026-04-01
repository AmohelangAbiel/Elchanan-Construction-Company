import { prisma } from '../../../lib/prisma';
import { requireAdminSession } from '../../../lib/auth';
import { CONTENT_ROLES } from '../../../lib/permissions';
import { AdminTopNav } from '../components/AdminTopNav';
import { AdminFlash } from '../components/AdminFlash';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams?: { updated?: string };
}) {
  const session = await requireAdminSession(CONTENT_ROLES);
  const profile = await prisma.companyProfile.findFirst({ orderBy: { createdAt: 'asc' } });

  const serviceAreasText = profile?.serviceAreas?.join('\n') || '';
  const socialLinks = profile?.socialLinks && typeof profile.socialLinks === 'object'
    ? (profile.socialLinks as Record<string, string | null | undefined>)
    : {};
  const hoursJson = profile?.hours ? JSON.stringify(profile.hours, null, 2) : '[\n  { "day": "Mon", "hours": "09:00 - 17:00" }\n]';

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminTopNav role={session.role} />
        {searchParams?.updated === '1' ? (
          <AdminFlash message="Company settings updated successfully." />
        ) : null}

        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Settings</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Company profile and site settings</h1>
          <p className="mt-3 text-slate-400">Update business identity, contact metadata, structured hours, and SEO defaults.</p>
        </div>

        <section className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form action="/api/admin/settings" method="post" className="grid gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-white">Company name</span>
              <input name="companyName" defaultValue={profile?.companyName || ''} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Display name (public)</span>
              <input name="displayName" defaultValue={profile?.displayName || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Tagline</span>
              <input name="tagline" defaultValue={profile?.tagline || ''} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Description</span>
              <textarea name="description" defaultValue={profile?.description || ''} required rows={5} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Phone</span>
              <input name="phone" defaultValue={profile?.phone || ''} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">WhatsApp</span>
              <input name="whatsapp" defaultValue={profile?.whatsapp || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Email</span>
              <input name="email" type="email" defaultValue={profile?.email || ''} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Hero headline</span>
              <input name="heroHeadline" defaultValue={profile?.heroHeadline || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Address</span>
              <input name="address" defaultValue={profile?.address || ''} required className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Service areas (one per line or comma-separated)</span>
              <textarea name="serviceAreasText" defaultValue={serviceAreasText} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Service area confidence text</span>
              <textarea name="serviceAreaText" defaultValue={profile?.serviceAreaText || ''} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Website URL</span>
              <input name="websiteUrl" defaultValue={socialLinks.website || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Facebook URL</span>
              <input name="facebookUrl" defaultValue={socialLinks.facebook || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">Instagram URL</span>
              <input name="instagramUrl" defaultValue={socialLinks.instagram || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">LinkedIn URL</span>
              <input name="linkedinUrl" defaultValue={socialLinks.linkedin || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">SEO title</span>
              <input name="seoTitle" defaultValue={profile?.seoTitle || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-white">SEO description</span>
              <input name="seoDescription" defaultValue={profile?.seoDescription || ''} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Hours JSON array</span>
              <textarea name="hoursJson" defaultValue={hoursJson} rows={8} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-xs text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Quotation footer text</span>
              <textarea name="quotationFooter" defaultValue={profile?.quotationFooter || ''} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Quotation disclaimer text</span>
              <textarea name="quotationDisclaimer" defaultValue={profile?.quotationDisclaimer || ''} rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Default email signature</span>
              <textarea name="emailSignature" defaultValue={profile?.emailSignature || ''} rows={4} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-semibold text-white">Default email footer</span>
              <textarea name="emailFooter" defaultValue={profile?.emailFooter || ''} rows={3} className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100" />
            </label>
            <button type="submit" className="rounded-full bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-sky lg:col-span-2 lg:w-fit">
              Save Settings
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-[2rem] border border-amber-500/30 bg-amber-500/5 p-6 shadow-glow">
          <h2 className="text-lg font-semibold text-white">Session Security</h2>
          <p className="mt-2 text-sm text-slate-300">
            Force sign-out for all currently issued admin sessions.
          </p>
          <form action="/api/admin/session/revoke" method="post" className="mt-4">
            <button
              type="submit"
              className="rounded-full border border-amber-300/40 px-5 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-400/10"
            >
              Revoke all admin sessions
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}



