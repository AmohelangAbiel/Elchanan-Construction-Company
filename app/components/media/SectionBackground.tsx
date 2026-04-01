import type { ReactNode } from 'react';
import { SmartImage } from './SmartImage';

type SectionBackgroundProps = {
  image: {
    src: string;
    alt: string;
  };
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  priority?: boolean;
};

export function SectionBackground({
  image,
  children,
  className,
  contentClassName,
  priority = false,
}: SectionBackgroundProps) {
  return (
    <div className={`relative overflow-hidden rounded-[2.5rem] border border-white/10 shadow-glow ${className || ''}`.trim()}>
      <div className="absolute inset-0">
        <SmartImage
          src={image.src}
          alt={image.alt}
          fill
          priority={priority}
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(4,16,28,0.9),rgba(4,16,28,0.72)_45%,rgba(9,142,199,0.3)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,187,237,0.3),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(102,102,102,0.34),transparent_28%)]" />
      </div>
      <div className={`relative z-10 ${contentClassName || ''}`.trim()}>{children}</div>
    </div>
  );
}
