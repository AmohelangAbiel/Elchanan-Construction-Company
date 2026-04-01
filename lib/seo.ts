import type { Metadata } from 'next';
import { BASE_URL } from './constants';

const canonicalBase = BASE_URL.replace(/\/$/, '');

export function createPageMetadata(params: {
  title: string;
  description: string;
  path: string;
  image?: string;
}): Metadata {
  const url = `${canonicalBase}${params.path}`;
  const image = params.image || `${canonicalBase}/logo.svg`;

  return {
    title: params.title,
    description: params.description,
    alternates: { canonical: url },
    openGraph: {
      title: params.title,
      description: params.description,
      url,
      type: 'website',
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: 'Elchanan Construction Company',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: params.title,
      description: params.description,
      images: [image],
    },
  };
}

export function buildLocalBusinessJsonLd(args: {
  companyName: string;
  description: string;
  phone: string;
  email: string;
  address: string;
  image?: string;
  serviceAreas?: string[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: args.companyName,
    description: args.description,
    telephone: args.phone,
    email: args.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: args.address,
      addressCountry: 'ZA',
    },
    areaServed: args.serviceAreas?.length ? args.serviceAreas : ['Rustenburg', 'North West Province'],
    image: args.image || `${canonicalBase}/logo.svg`,
    url: canonicalBase,
  };
}

export function toAbsoluteUrl(path: string) {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${canonicalBase}${normalized}`;
}
