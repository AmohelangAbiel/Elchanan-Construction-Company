'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const reportLinks = [
  { href: '/admin/reports', label: 'Overview' },
  { href: '/admin/reports/enquiries', label: 'Enquiries' },
  { href: '/admin/reports/quotes', label: 'Quotes' },
  { href: '/admin/reports/content', label: 'Content' },
  { href: '/admin/reports/moderation', label: 'Moderation' },
];

export function ReportsNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6 overflow-x-auto rounded-2xl border border-white/10 bg-slate-950/80 p-3 shadow-glow">
      <div className="flex min-w-max items-center gap-2">
        {reportLinks.map((item) => {
          const isActive = item.href === '/admin/reports'
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
  );
}

