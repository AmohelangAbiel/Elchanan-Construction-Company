import Link from 'next/link';
import {
  BriefcaseBusiness,
  Camera,
  Clock3,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Users,
} from 'lucide-react';
import { getCompanyProfile } from '../../lib/content';
import { getDisplayPhone, toTelHref, toWhatsAppHref } from '../../lib/contact';
import { siteMeta } from '../data/siteData';

export async function Footer() {
  const profile = await getCompanyProfile();
  const displayName = profile?.displayName || profile?.companyName || siteMeta.name;
  const hours = Array.isArray(profile?.hours)
    ? (profile?.hours as Array<{ day?: string; hours?: string }>)
    : siteMeta.hours;
  const socialLinks = profile?.socialLinks && typeof profile.socialLinks === 'object'
    ? (profile.socialLinks as Record<string, string | null | undefined>)
    : {};

  return (
    <footer className="border-t border-white/10 bg-slate-950/95 text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8 lg:flex-row lg:justify-between">
        <div className="max-w-xl space-y-4">
          <p className="text-xl font-semibold text-white">{displayName}</p>
          <p className="max-w-md text-sm leading-6 text-slate-400">
            {profile?.description || siteMeta.description}
          </p>
          <div className="space-y-3 text-sm text-slate-300">
            <p className="inline-flex items-center gap-2">
              <MapPin size={14} className="text-brand-cyan" />
              {profile?.address || siteMeta.address}
            </p>
            <Link href={toTelHref(profile?.phone || siteMeta.phone)} className="group inline-flex items-center gap-2 text-brand-sky transition hover:text-white">
              <Phone size={14} className="transition duration-200" />
              {getDisplayPhone(profile?.phone || siteMeta.phone)}
            </Link>
            <Link href={`mailto:${profile?.email || siteMeta.email}`} className="group block w-fit text-brand-sky transition hover:text-white">
              <span className="inline-flex items-center gap-2">
                <Mail size={14} className="transition duration-200" />
                {profile?.email || siteMeta.email}
              </span>
            </Link>
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Explore</p>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              {siteMeta.nav.slice(0, 6).map((item) => (
                <Link key={item.href} href={item.href} className="block transition hover:text-white">
                  {item.title}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Support</p>
            <div className="mt-5 space-y-3 text-sm text-slate-300">
              <Link href="/quote" className="group inline-flex items-center gap-2 hover:text-white">
                <MessageCircle size={14} className="text-brand-cyan transition duration-200" />
                Request quotation
              </Link>
              <Link href="/contact" className="group block w-fit hover:text-white">
                <span className="inline-flex items-center gap-2">
                  <Mail size={14} className="text-brand-cyan transition duration-200" />
                  Customer enquiries
                </span>
              </Link>
              <Link href={toWhatsAppHref(profile?.whatsapp)} target="_blank" rel="noreferrer" className="group block w-fit hover:text-white">
                <span className="inline-flex items-center gap-2">
                  <MessageCircle size={14} className="text-brand-cyan transition duration-200" />
                  WhatsApp support
                </span>
              </Link>
              <Link href="/forum" className="group block w-fit hover:text-white">
                <span className="inline-flex items-center gap-2">
                  <MessageCircle size={14} className="text-brand-cyan transition duration-200" />
                  Project discussions
                </span>
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Business hours</p>
            <div className="mt-5 space-y-2 text-sm text-slate-300">
              {hours.map((item, index) => (
                <p key={`${item.day || 'day'}-${index}`} className="inline-flex items-center gap-2">
                  <Clock3 size={14} className="text-brand-cyan" />
                  {item.day || 'Day'}: {item.hours || 'By appointment'}
                </p>
              ))}
            </div>
          </div>

          {Object.values(socialLinks).some(Boolean) ? (
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">Social</p>
              <div className="mt-5 space-y-2 text-sm text-slate-300">
                {socialLinks.website ? <Link href={socialLinks.website} target="_blank" rel="noreferrer" className="group block w-fit hover:text-white"><span className="inline-flex items-center gap-2"><Globe size={14} className="text-brand-cyan transition duration-200" />Website</span></Link> : null}
                {socialLinks.facebook ? <Link href={socialLinks.facebook} target="_blank" rel="noreferrer" className="group block w-fit hover:text-white"><span className="inline-flex items-center gap-2"><Users size={14} className="text-brand-cyan transition duration-200" />Facebook</span></Link> : null}
                {socialLinks.instagram ? <Link href={socialLinks.instagram} target="_blank" rel="noreferrer" className="group block w-fit hover:text-white"><span className="inline-flex items-center gap-2"><Camera size={14} className="text-brand-cyan transition duration-200" />Instagram</span></Link> : null}
                {socialLinks.linkedin ? <Link href={socialLinks.linkedin} target="_blank" rel="noreferrer" className="group block w-fit hover:text-white"><span className="inline-flex items-center gap-2"><BriefcaseBusiness size={14} className="text-brand-cyan transition duration-200" />LinkedIn</span></Link> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="border-t border-white/10 bg-slate-950/95 px-4 py-6 text-center text-sm text-slate-500 sm:px-6 lg:px-8">
        &copy; {new Date().getFullYear()} {displayName}. Built for trusted construction delivery in South Africa.
      </div>
    </footer>
  );
}

