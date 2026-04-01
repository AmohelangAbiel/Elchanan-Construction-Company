'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, MessageCircle } from 'lucide-react';
import { toWhatsAppHref } from '../../lib/contact';

export function MobileQuoteCTA() {
  const pathname = usePathname();

  if (
    pathname?.startsWith('/admin') ||
    pathname === '/quote'
  ) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-brand-cyan/30 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2">
        <Link href="/quote" className="interactive-button bg-brand-cyan text-slate-950">
          <FileText size={16} />
          Request Quote
        </Link>
        <Link href={toWhatsAppHref(undefined, 'Hello, I would like to request a quote.')} target="_blank" rel="noreferrer" className="interactive-button border border-brand-cyan/50 bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20">
          <MessageCircle size={16} />
          WhatsApp
        </Link>
      </div>
    </div>
  );
}

