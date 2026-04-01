import type { ReactNode } from 'react';
import { requirePortalSession } from '../../../lib/portal-auth';
import { getPortalDisplayName } from '../../../lib/portal';
import { PortalTopNav } from './components/PortalTopNav';

export default async function PortalAppLayout({ children }: { children: ReactNode }) {
  const session = await requirePortalSession();
  const displayName = getPortalDisplayName({
    displayName: session.displayName,
    fullName: session.fullName,
    email: session.email,
  });

  return (
    <main className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <PortalTopNav displayName={displayName} />
        {children}
      </div>
    </main>
  );
}
