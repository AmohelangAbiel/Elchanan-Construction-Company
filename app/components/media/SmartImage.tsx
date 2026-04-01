'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';

type SmartImageProps = Omit<ImageProps, 'src'> & {
  src?: string | null;
  fallbackSrc?: string;
};

export function SmartImage({
  src,
  fallbackSrc = '/images/construction/fallback-construction.jpg',
  alt,
  ...props
}: SmartImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [fallbackSrc, src]);

  return (
    <Image
      {...props}
      src={currentSrc}
      alt={alt}
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
