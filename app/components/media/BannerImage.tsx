import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { SectionBackground } from './SectionBackground';

type BannerImageProps = {
  image: {
    src: string;
    alt: string;
  };
  eyebrow: string;
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  children?: ReactNode;
  className?: string;
};

export function BannerImage({
  image,
  eyebrow,
  title,
  description,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
  children,
  className,
}: BannerImageProps) {
  return (
    <SectionBackground
      image={image}
      priority
      className={className}
      contentClassName="px-6 py-10 sm:px-10 sm:py-14 lg:px-14"
    >
      <div className="max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-brand-cyan">{eyebrow}</p>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200 sm:text-lg">{description}</p>
        {(ctaHref && ctaLabel) || (secondaryHref && secondaryLabel) ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            {ctaHref && ctaLabel ? (
              <Link href={ctaHref} className="btn-primary">
                {ctaLabel}
                <ArrowRight size={16} />
              </Link>
            ) : null}
            {secondaryHref && secondaryLabel ? (
              <Link href={secondaryHref} className="btn-ghost">
                {secondaryLabel}
                <ArrowRight size={16} />
              </Link>
            ) : null}
          </div>
        ) : null}
        {children ? <div className="mt-8">{children}</div> : null}
      </div>
    </SectionBackground>
  );
}
