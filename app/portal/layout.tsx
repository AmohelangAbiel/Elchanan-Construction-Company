import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Client Portal | Elchanan Construction Company',
  description:
    'Secure client portal for quote visibility, project progress milestones, and document access.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function PortalRootLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-[70vh]">{children}</div>;
}
