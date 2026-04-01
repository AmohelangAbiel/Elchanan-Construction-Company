import type { ReactNode } from 'react';
import { SmartImage } from './SmartImage';

type CardImageProps = {
  src?: string | null;
  alt: string;
  badge?: string;
  className?: string;
  imageClassName?: string;
  aspectClassName?: string;
  sizes?: string;
  priority?: boolean;
  children?: ReactNode;
};

export function CardImage({
  src,
  alt,
  badge,
  className,
  imageClassName,
  aspectClassName = 'h-56',
  sizes = '(min-width: 1280px) 28rem, (min-width: 768px) 45vw, 100vw',
  priority = false,
  children,
}: CardImageProps) {
  return (
    <div className={`relative overflow-hidden ${aspectClassName} ${className || ''}`.trim()}>
      <SmartImage
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className={`object-cover transition duration-700 ease-out group-hover:scale-[1.06] ${imageClassName || ''}`.trim()}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,16,28,0.08),rgba(4,16,28,0.3)_45%,rgba(4,16,28,0.84)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(61,187,237,0.32),transparent_42%)]" />
      {badge ? (
        <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-slate-950/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-cyan shadow-[0_8px_24px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          {badge}
        </div>
      ) : null}
      {children ? <div className="absolute inset-x-0 bottom-0 p-5">{children}</div> : null}
    </div>
  );
}
