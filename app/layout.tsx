import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileQuoteCTA } from './components/MobileQuoteCTA';
import { BASE_URL } from '../lib/constants';
import { buildLocalBusinessJsonLd } from '../lib/seo';
import { getCompanyProfile } from '../lib/content';

const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' });

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: 'Elchanan Construction Company',
  description:
    'Premium construction, renovation, and project delivery services in Rustenburg with transparent quotation workflows.',
  openGraph: {
    title: 'Elchanan Construction Company',
    description:
      'Premium construction, renovation, and project delivery services in Rustenburg with transparent quotation workflows.',
    type: 'website',
    url: BASE_URL,
    images: [{ url: '/logo.svg', width: 1200, height: 630, alt: 'Elchanan Construction Company' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Elchanan Construction Company',
    description:
      'Premium construction, renovation, and project delivery services in Rustenburg with transparent quotation workflows.',
    images: ['/logo.svg'],
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const profile = await getCompanyProfile();

  const localBusinessSchema = buildLocalBusinessJsonLd({
    companyName: profile?.displayName || profile?.companyName || 'Elchanan Construction Company',
    description:
      profile?.description ||
      'Construction and renovation services in Rustenburg with transparent quotation workflows.',
    phone: profile?.phone || '074 751 2226',
    email: profile?.email || 'hello@elchananconstruction.co.za',
    address: profile?.address || 'Rustenburg, South Africa',
    serviceAreas: profile?.serviceAreas || ['Rustenburg', 'North West Province'],
  });

  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${plusJakarta.variable} ${spaceGrotesk.variable} bg-slate-950 text-slate-100`}>
        <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,217,255,0.12),transparent_28%),radial-gradient(circle_at_70%_8%,_rgba(12,143,224,0.15),transparent_32%),linear-gradient(180deg,_#030b17_0%,_#090d18_100%)] pb-20 md:pb-0">
          <Header />
          <main>{children}</main>
          <Footer />
          <MobileQuoteCTA />
        </div>
      </body>
    </html>
  );
}

