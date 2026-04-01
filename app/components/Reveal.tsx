'use client';

import type { ElementType, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type RevealProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
  delayMs?: number;
};

export function Reveal<T extends ElementType = 'div'>({
  as,
  children,
  className,
  delayMs = 0,
}: RevealProps<T>) {
  const Component = (as || 'div') as ElementType;
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Component
      ref={ref}
      className={`reveal-up ${visible ? 'is-visible' : ''} ${className || ''}`.trim()}
      style={{ transitionDelay: `${delayMs}ms` }}
    >
      {children}
    </Component>
  );
}
