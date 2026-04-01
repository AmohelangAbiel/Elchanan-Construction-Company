import { CONTACT_METHODS } from '../../../../lib/constants';
import { getCompanyProfile } from '../../../../lib/content';
import { requirePortalSession } from '../../../../lib/portal-auth';
import { prisma } from '../../../../lib/prisma';
import { PortalContactActions } from '../components/PortalContactActions';

type SearchParamValue = string | string[] | undefined;

function firstParam(value: SearchParamValue) {
  if (Array.isArray(value)) return value[0];
  return value;
}

export const dynamic = 'force-dynamic';

export default async function PortalProfilePage({
  searchParams,
}: {
  searchParams?: Record<string, SearchParamValue>;
}) {
  const session = await requirePortalSession();

  const [clientUser, profile] = await Promise.all([
    prisma.clientUser.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        displayName: true,
        phone: true,
        companyName: true,
        location: true,
        contactPreference: true,
        createdAt: true,
      },
    }),
    getCompanyProfile(),
  ]);

  if (!clientUser) {
    return (
      <section className="space-y-6">
        <article className="rounded-[2rem] border border-amber-300/25 bg-amber-400/10 p-6 text-sm text-amber-100">
          Your portal profile could not be loaded right now. Please contact our team for assistance.
        </article>
        <PortalContactActions title="Need profile support?" />
      </section>
    );
  }

  const wasUpdated = firstParam(searchParams?.updated) === '1';
  const hasError = firstParam(searchParams?.error) === '1';

  return (
    <section className="space-y-6">
      <article className="rounded-[2rem] border border-white/10 bg-slate-950/85 p-8 shadow-glow">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-cyan">Account settings</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Portal profile</h1>
        <p className="mt-3 text-sm text-slate-400">
          Keep your contact details up to date so project updates and quotation communication stay accurate.
        </p>
      </article>

      {wasUpdated ? (
        <article className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          Profile updated successfully.
        </article>
      ) : null}
      {hasError ? (
        <article className="rounded-2xl border border-rose-300/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          We could not save your profile changes. Please review your input and try again.
        </article>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
          <form action="/api/portal/profile" method="post" className="space-y-5">
            <input type="hidden" name="returnTo" value="/portal/profile" />

            <label className="block">
              <span className="text-sm font-semibold text-white">Full name</span>
              <input
                name="fullName"
                defaultValue={clientUser.fullName}
                required
                className="interactive-input mt-2"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-white">Display name</span>
              <input name="displayName" defaultValue={clientUser.displayName || ''} className="interactive-input mt-2" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-white">Phone</span>
              <input name="phone" defaultValue={clientUser.phone || ''} className="interactive-input mt-2" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-white">Company name</span>
              <input name="companyName" defaultValue={clientUser.companyName || ''} className="interactive-input mt-2" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-white">Location</span>
              <input name="location" defaultValue={clientUser.location || ''} className="interactive-input mt-2" />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-white">Preferred contact method</span>
              <select
                name="contactPreference"
                defaultValue={clientUser.contactPreference || ''}
                className="interactive-input mt-2"
              >
                <option value="">Not specified</option>
                {CONTACT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </label>

            <button type="submit" className="btn-primary w-full">
              Save profile updates
            </button>
          </form>
        </article>

        <div className="space-y-6">
          <article className="rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">Portal account</p>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <p>
                <span className="text-slate-500">Email (login):</span> {clientUser.email}
              </p>
              <p>
                <span className="text-slate-500">Joined portal:</span>{' '}
                {new Date(clientUser.createdAt).toLocaleDateString()}
              </p>
              <p>
                <span className="text-slate-500">Service area:</span>{' '}
                {profile?.serviceAreaText || profile?.address || 'Managed by Elchanan Construction'}
              </p>
            </div>
            <p className="mt-4 text-xs text-slate-500">
              Password reset and full credential management are handled securely by the Elchanan team.
            </p>
          </article>

          <PortalContactActions title="Need account help from our team?" />
        </div>
      </section>
    </section>
  );
}
