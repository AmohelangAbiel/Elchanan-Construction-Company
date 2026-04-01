import type { MetadataRoute } from 'next';
import { BASE_URL } from '../lib/constants';

export default function robots(): MetadataRoute.Robots {
  const base = BASE_URL.replace(/\/$/, '');

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/api/admin'],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
