import { redirect } from 'next/navigation';
import { getAdminSession } from '../../../lib/auth';
import { AdminLoginForm } from './AdminLoginForm';

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?: { revoked?: string };
}) {
  const session = await getAdminSession();
  if (session) {
    redirect('/admin');
  }

  const notice =
    searchParams?.revoked === '1'
      ? 'Admin sessions were revoked. Please sign in again.'
      : undefined;

  return <AdminLoginForm notice={notice} />;
}
