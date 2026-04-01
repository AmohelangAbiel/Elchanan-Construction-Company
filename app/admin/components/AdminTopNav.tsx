'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { getAdminNavItemsForRole } from '../../../lib/permissions';

type AdminTopNavProps = {
  role: UserRole;
};

export function AdminTopNav({ role }: AdminTopNavProps) {
  const pathname = usePathname();
  const links = getAdminNavItemsForRole(role);

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-slate-950/85 p-4 shadow-glow">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
            {links.map((item) => {
              const isActive = item.href === '/admin'
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
        <form action="/api/admin/logout" method="post">
          <button
            type="submit"
            className="w-full rounded-full border border-rose-400/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-rose-300 transition hover:bg-rose-500/10 sm:w-auto"
          >
            Logout
          </button>
        </form>
      </div>
    </div>
  );
}
