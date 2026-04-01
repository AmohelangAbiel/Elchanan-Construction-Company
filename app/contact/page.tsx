import { SectionHeading } from '../components/SectionHeading';
import { Clock3, Mail, MapPin, MessageCircle, PhoneCall } from 'lucide-react';
import { ContactForm } from '../components/ContactForm';
import { WhatsAppCTA } from '../components/WhatsAppCTA';
import { getCompanyProfile } from '../../lib/content';
import { getDisplayPhone, toTelHref } from '../../lib/contact';
import { createPageMetadata } from '../../lib/seo';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'Contact | Elchanan Construction Company',
  description:
    'Reach Elchanan Construction for enquiries, consultations, and quotation support in Rustenburg and nearby areas.',
  path: '/contact',
});

export default async function ContactPage() {
  const profile = await getCompanyProfile();

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          title="Get in touch for enquiries, quotes, and project support"
          subtitle="Contact"
          description="Reach our team for consultation scheduling, quote follow-up, and project planning guidance."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[0.95fr_0.85fr]">
          <ContactForm />

          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-brand-cyan/30 bg-brand-cyan/10 p-8 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Contact details</p>
              <div className="mt-6 space-y-3 text-slate-100">
                <a href={toTelHref(profile?.phone)} className="contact-action-card flex items-center gap-3 rounded-2xl px-4 py-3">
                  <span className="icon-pill">
                    <PhoneCall size={16} />
                  </span>
                  <span className="leading-snug">{getDisplayPhone(profile?.phone)}</span>
                </a>
                <a href={`mailto:${profile?.email || 'hello@elchananconstruction.co.za'}`} className="contact-action-card flex items-center gap-3 rounded-2xl px-4 py-3">
                  <span className="icon-pill">
                    <Mail size={16} />
                  </span>
                  <span className="break-all leading-snug">{profile?.email || 'hello@elchananconstruction.co.za'}</span>
                </a>
                <div className="contact-action-card flex items-center gap-3 rounded-2xl px-4 py-3">
                  <span className="icon-pill">
                    <MapPin size={16} />
                  </span>
                  <span className="leading-snug">{profile?.address || 'Company address available in settings'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Business hours</p>
              <div className="mt-6 space-y-2 text-slate-300">
                {Array.isArray(profile?.hours) ? (
                  (profile?.hours as Array<{ day?: string; hours?: string }>).map((item, index) => (
                    <p key={`${item.day || 'day'}-${index}`} className="flex items-center gap-2">
                      <Clock3 size={14} className="text-brand-cyan" />
                      {item.day || 'Day'}: {item.hours || 'By appointment'}
                    </p>
                  ))
                ) : (
                  <p>Hours available in company settings.</p>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">WhatsApp quick connect</p>
              <p className="mt-4 text-slate-300">Start a chat with our team for urgent enquiries and quote support.</p>
              <div className="mt-6">
                <WhatsAppCTA
                  phone={profile?.whatsapp}
                  label="Message us on WhatsApp"
                  message="Hello, I need assistance with a construction enquiry."
                  className="interactive-button w-full bg-brand-blue text-white hover:bg-brand-sky"
                />
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-14 rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-10 shadow-glow">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              'Quality workmanship standards for every project scale.',
              'Reliable timelines supported by practical site planning.',
              'Professional communication and tailored quote responses.',
            ].map((item) => (
              <div key={item} className="interactive-card flex items-start gap-3 rounded-2xl p-4 text-sm text-slate-200">
                <span className="icon-pill">
                  <MessageCircle size={14} />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <h3 className="mt-8 text-2xl font-semibold text-white">Service area confidence</h3>
          <p className="mt-4 text-slate-300">
            {profile?.serviceAreaText || 'We support clients in Rustenburg and surrounding areas. Use this section as an editable location block until an embedded map is configured.'}
          </p>
          <div className="mt-8 h-[320px] overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/80">
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(34,217,255,0.14),_transparent_40%)]">
              <div className="text-center text-slate-500">
                <p className="text-lg font-semibold text-white">Map placeholder</p>
                <p className="mt-2">Replace with embedded map once location data is finalized.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

