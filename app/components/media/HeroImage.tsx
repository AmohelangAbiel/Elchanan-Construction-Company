import type { ReactNode } from 'react';
import { SmartImage } from './SmartImage';

type HeroImageProps = {
  image: {
    src: string;
    alt: string;
  };
  children: ReactNode;
};

export function HeroImage({ image, children }: HeroImageProps) {
  return (
    <section className="relative isolate overflow-hidden border-b border-white/10 px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
      <div className="absolute inset-0">
        <SmartImage
          src={image.src}
          alt={image.alt}
          fill
          priority
          sizes="100vw"
          className="object-cover object-center motion-safe:animate-[heroFloat_18s_ease-in-out_infinite]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(112deg,rgba(4,16,28,0.93)_0%,rgba(4,16,28,0.78)_42%,rgba(4,16,28,0.66)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,187,237,0.36),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(102,102,102,0.38),transparent_26%)]" />
        <div className="absolute inset-x-0 top-0 h-48 bg-[linear-gradient(180deg,rgba(9,142,199,0.22),transparent)]" />
      </div>
      <div className="relative z-10 mx-auto max-w-7xl">{children}</div>
    </section>
  );
}
