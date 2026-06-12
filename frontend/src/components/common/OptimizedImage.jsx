import Image from 'next/image';
import { useEffect, useState } from 'react';

const BLUR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const FALLBACK_SRC = '/logos/mbkz-64.png';

const isUnoptimizable = (src) => {
  const path = typeof src === 'object' && src !== null ? src.src : src;
  if (!path || typeof path !== 'string') return true;
  return path.startsWith('data:') ||
    path.endsWith('.svg') ||
    path.startsWith('blob:');
};

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  fill = false,
  sizes,
  quality = 80,
  className = '',
  style,
  fallbackSrc = FALLBACK_SRC,
  objectFit = 'cover',
  onLoad,
  ...props
}) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setIsLoaded(false);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  const handleLoad = (event) => {
    setIsLoaded(true);
    onLoad?.(event);
  };

  const unoptimized = isUnoptimizable(imgSrc);
  const wrapperStyle = fill
    ? { position: 'relative', overflow: 'hidden', ...style }
    : {
        position: 'relative',
        width: width ? `${width}px` : '100%',
        aspectRatio: width && height ? `${width} / ${height}` : undefined,
        minHeight: height ? `${height}px` : undefined,
        overflow: 'hidden',
        ...style,
      };

  return (
    <div className={`optimized-img-wrapper ${className}`} style={wrapperStyle}>
      <Image
        src={imgSrc}
        alt={alt || ''}
        {...(fill ? { fill: true } : { width: width || 500, height: height || 300 })}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        placeholder={unoptimized ? 'empty' : 'blur'}
        blurDataURL={unoptimized ? undefined : BLUR_DATA_URL}
        quality={quality}
        sizes={
          sizes ||
          (fill
            ? '(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw'
            : undefined)
        }
        unoptimized={unoptimized}
        onError={handleError}
        onLoad={handleLoad}
        style={{
          objectFit,
          width: '100%',
          height: '100%',
          transition: 'opacity 0.3s ease',
          opacity: isLoaded ? 1 : 0.6,
        }}
        {...props}
      />
    </div>
  );
}
