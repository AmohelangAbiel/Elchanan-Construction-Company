import { Mail, MessageCircle, PhoneCall } from 'lucide-react';
import { getCompanyProfile } from '../../../../lib/content';
import { getDisplayPhone, toTelHref, toWhatsAppHref } from '../../../../lib/contact';

type PortalContactActionsProps = {
  title?: string;
  className?: string;
};

export async function PortalContactActions({
  title = 'Need support on your project?',
  className,
}: PortalContactActionsProps) {
  const profile = await getCompanyProfile();
  const displayPhone = getDisplayPhone(profile?.phone || null);
  const phoneHref = toTelHref(profile?.phone || null);
  const email = profile?.email || 'hello@elchananconstruction.co.za';
  const whatsappHref = toWhatsAppHref(
    profile?.whatsapp || null,
    'Hello Elchanan Construction team, I need assistance from the client portal.',
  );

  return (
    <section className={`rounded-[2rem] border border-slate-800/70 bg-slate-950/75 p-6 shadow-glow ${className || ''}`}>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">
        Reach our team quickly if you need clarity on milestones, timelines, or quotation details.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <a href={whatsappHref} target="_blank" rel="noreferrer" className="contact-action-card group">
          <div className="flex items-start gap-3">
            <span className="icon-pill transition duration-200 group-hover:border-brand-cyan/70 group-hover:bg-brand-cyan/20">
              <MessageCircle size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white transition group-hover:text-brand-cyan">WhatsApp</p>
              <p className="mt-1 text-xs text-slate-400">Fast response on project queries</p>
            </div>
          </div>
        </a>

        <a href={`mailto:${email}`} className="contact-action-card group">
          <div className="flex items-start gap-3">
            <span className="icon-pill transition duration-200 group-hover:border-brand-cyan/70 group-hover:bg-brand-cyan/20">
              <Mail size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white transition group-hover:text-brand-cyan">Email</p>
              <p className="mt-1 text-xs text-slate-400">{email}</p>
            </div>
          </div>
        </a>

        <a href={phoneHref} className="contact-action-card group">
          <div className="flex items-start gap-3">
            <span className="icon-pill transition duration-200 group-hover:border-brand-cyan/70 group-hover:bg-brand-cyan/20">
              <PhoneCall size={18} />
            </span>
            <div>
              <p className="text-sm font-semibold text-white transition group-hover:text-brand-cyan">Phone</p>
              <p className="mt-1 text-xs text-slate-400">{displayPhone}</p>
            </div>
          </div>
        </a>
      </div>
    </section>
  );
}
