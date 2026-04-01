'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

type PortalTopNavProps = {
  displayName: string;
};

const portalNav = [
  { href: '/portal', label: 'Dashboard' },
  { href: '/portal/quotes', label: 'Quotes' },
  { href: '/portal/projects', label: 'Projects' },
  { href: '/portal/invoices', label: 'Invoices' },
  { href: '/portal/contracts', label: 'Contracts' },
  { href: '/portal/documents', label: 'Documents' },
  { href: '/portal/profile', label: 'Profile' },
];

export function PortalTopNav({ displayName }: PortalTopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await fetch('/api/portal/logout', {
        method: 'POST',
      });
    } finally {
      router.push('/portal/login?signedOut=1');
      router.refresh();
    }
  }

  return (
    <header className="mb-8 rounded-[2rem] border border-slate-800/75 bg-slate-950/80 p-5 shadow-glow">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-cyan">Client portal</p>
          <p className="mt-2 text-lg font-semibold text-white">{displayName}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="btn-ghost px-5 py-2 text-xs uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>

      <nav className="mt-4 overflow-x-auto pb-1">
        <div className="flex min-w-max items-center gap-2">
          {portalNav.map((item) => {
            const isActive = item.href === '/portal'
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  isActive
                    ? 'border-brand-cyan/70 bg-brand-cyan/15 text-white'
                    : 'border-white/10 text-slate-300 hover:border-brand-cyan/60 hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
