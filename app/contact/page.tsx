import { Clock3, Mail, MapPin, MessageCircle, PhoneCall } from 'lucide-react';
import { ContactForm } from '../components/ContactForm';
import { ContactActionLink } from '../components/ContactActionLink';
import { Reveal } from '../components/Reveal';
import { WhatsAppCTA } from '../components/WhatsAppCTA';
import { BannerImage } from '../components/media/BannerImage';
import { SectionBackground } from '../components/media/SectionBackground';
import { getCompanyProfile } from '../../lib/content';
import { getDisplayPhone, toTelHref } from '../../lib/contact';
import { createPageMetadata } from '../../lib/seo';
import { sectionVisuals } from '../../lib/site-visuals';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata({
  title: 'Contact | Elchanan Construction Company',
  description:
    'Reach Elchanan Construction for enquiries, consultations, and quotation support in Rustenburg and nearby areas.',
  path: '/contact',
});

export default async function ContactPage() {
  const profile = await getCompanyProfile();
  const phoneHref = toTelHref(profile?.phone);
  const emailHref = `mailto:${profile?.email || 'hello@elchananconstruction.co.za'}`;
  const mapHref = profile?.address
    ? `https://maps.google.com/?q=${encodeURIComponent(profile.address)}`
    : phoneHref;

  return (
    <main className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-14">
        <Reveal>
          <BannerImage
            image={sectionVisuals.contact}
            eyebrow="Contact"
            title="Get in touch for enquiries, quotes, and project support"
            description="Reach our team for consultation scheduling, quote follow-up, and project planning guidance."
            ctaHref="/quote"
            ctaLabel="Request a quote"
            secondaryHref={phoneHref}
            secondaryLabel={`Call ${getDisplayPhone(profile?.phone)}`}
          />
        </Reveal>

        <div className="grid gap-10 lg:grid-cols-[0.95fr_0.85fr]">
          <Reveal>
            <ContactForm />
          </Reveal>

          <aside className="space-y-6">
            <Reveal>
              <SectionBackground image={sectionVisuals.hero} contentClassName="px-8 py-8">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-cyan">Contact details</p>
                <div className="mt-6 space-y-3 text-slate-100">
                  <ContactActionLink
                    href={phoneHref}
                    label={getDisplayPhone(profile?.phone)}
                    description="Tap to call the construction team"
                    icon={PhoneCall}
                    external
                  />
                  <ContactActionLink
                    href={emailHref}
                    label={profile?.email || 'hello@elchananconstruction.co.za'}
                    description="Send project details by email"
                    icon={Mail}
                    external
                  />
                  <ContactActionLink
                    href={mapHref}
                    label={profile?.address || 'Company address available in settings'}
                    description="Primary service area and office location"
                    icon={MapPin}
                    external
                  />
                </div>
              </SectionBackground>
            </Reveal>

            <Reveal delayMs={90}>
              <div className="photo-card rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow">
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
            </Reveal>

            <Reveal delayMs={160}>
              <div className="photo-card rounded-[2rem] border border-slate-800/70 bg-slate-950/70 p-8 shadow-glow">
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
            </Reveal>
          </aside>
        </div>

        <Reveal>
          <SectionBackground image={sectionVisuals.about} contentClassName="px-6 py-10 sm:px-10 sm:py-12">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                'Quality workmanship standards for every project scale.',
                'Reliable timelines supported by practical site planning.',
                'Professional communication and tailored quote responses.',
              ].map((item, index) => (
                <Reveal key={item} delayMs={index * 70}>
                  <div className="interactive-card photo-card flex items-start gap-3 rounded-2xl p-4 text-sm text-slate-200">
                    <span className="icon-pill">
                      <MessageCircle size={14} />
                    </span>
                    <span>{item}</span>
                  </div>
                </Reveal>
              ))}
            </div>
            <h3 className="mt-8 text-2xl font-semibold text-white">Service area confidence</h3>
            <p className="mt-4 max-w-3xl text-slate-200">
              {profile?.serviceAreaText || 'We support clients in Rustenburg and surrounding areas with responsive communication, practical site planning, and reliable delivery coordination.'}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ContactActionLink
                href={phoneHref}
                label={`Call ${getDisplayPhone(profile?.phone)}`}
                description="Speak directly with our team"
                icon={PhoneCall}
                external
              />
              <ContactActionLink
                href={emailHref}
                label="Email our office"
                description="Send plans, photos, or project notes"
                icon={Mail}
                external
              />
            </div>
          </SectionBackground>
        </Reveal>
      </div>
    </main>
  );
}
