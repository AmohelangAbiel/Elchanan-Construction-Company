import { redirect } from 'next/navigation';
import { getPortalSession } from '../../../lib/portal-auth';
import { PortalLoginForm } from './PortalLoginForm';

export default async function PortalLoginPage({
  searchParams,
}: {
  searchParams?: { signedOut?: string; sessionExpired?: string };
}) {
  const session = await getPortalSession();
  if (session) {
    redirect('/portal');
  }

  const notice =
    searchParams?.sessionExpired === '1'
      ? 'Your portal session expired. Please sign in again.'
      : searchParams?.signedOut === '1'
        ? 'You were signed out successfully.'
        : undefined;

  return <PortalLoginForm notice={notice} />;
}
