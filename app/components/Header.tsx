'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { FileText, Menu, MessageCircle, Phone, UserRound, X } from 'lucide-react';
import { siteMeta } from '../data/siteData';
import { toTelHref, toWhatsAppHref } from '../../lib/contact';

export function Header() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Image src="/logo-mark.svg" width={52} height={52} alt="Elchanan Construction logo" className="h-11 w-11 rounded-xl" priority />
          <div>
            <p className="text-base font-semibold text-white">Elchanan Construction</p>
            <p className="text-xs text-slate-400">Rustenburg construction partner</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {siteMeta.nav.slice(0, 7).map((item) => (
            <Link key={item.href} href={item.href} className="relative text-sm text-slate-300 transition hover:text-brand-cyan after:absolute after:-bottom-1 after:left-0 after:h-px after:w-0 after:bg-brand-cyan after:transition-all after:duration-300 hover:after:w-full">
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/portal/login" className="interactive-button border border-white/20 bg-white/5 text-slate-100 hover:border-brand-cyan/45 hover:text-brand-cyan">
            <UserRound size={16} />
            Client portal
          </Link>
          <Link href="/quote" className="interactive-button border border-brand-cyan/50 bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20">
            <FileText size={16} />
            Request quote
          </Link>
          <Link href={toTelHref(siteMeta.phone)} className="interactive-button bg-brand-blue text-white hover:bg-brand-sky">
            <Phone size={16} />
            Call {siteMeta.phone}
          </Link>
        </div>

        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={open}
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-900/80 p-2 text-slate-200 lg:hidden"
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-slate-950/95 px-4 py-5 lg:hidden">
          <div className="grid gap-3">
            {siteMeta.nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm text-slate-100 transition duration-200 hover:border-brand-cyan/50"
                onClick={() => setOpen(false)}
              >
                {item.title}
              </Link>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            <Link href="/portal/login" className="interactive-button border border-white/20 bg-white/5 text-slate-100" onClick={() => setOpen(false)}>
              <UserRound size={16} />
              Client portal
            </Link>
            <Link href="/quote" className="interactive-button bg-brand-cyan text-slate-950" onClick={() => setOpen(false)}>
              <FileText size={16} />
              Request quote
            </Link>
            <Link href={toWhatsAppHref(undefined, 'Hello, I need help with a construction project quote.')} target="_blank" rel="noreferrer" className="interactive-button border border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan hover:bg-brand-cyan/20" onClick={() => setOpen(false)}>
              <MessageCircle size={16} />
              WhatsApp
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
