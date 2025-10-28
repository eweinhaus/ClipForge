import { useState, useEffect, useRef } from 'react';

// Shared thumbnail cache across all hook instances
const thumbnailCache = new Map();

/**
 * Custom hook for lazy loading and caching thumbnails
 * Uses IntersectionObserver to load thumbnails only when visible
 */
export function useThumbnailPreload(clipId, thumbnailSrc) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(() => Boolean(clipId && thumbnailCache.has(clipId)));
  const [hasError, setHasError] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    if (!clipId) {
      return undefined;
    }

    // If we already have the thumbnail cached, mark as loaded immediately
    if (thumbnailCache.has(clipId)) {
      setIsLoaded(true);
      setHasError(false);
      return undefined;
    }

    setIsLoaded(false);
    setHasError(false);
    setIsVisible(false);

    // Fallback for environments without IntersectionObserver (e.g. older browsers/tests)
    if (typeof window !== 'undefined' && typeof window.IntersectionObserver === 'undefined') {
      if (thumbnailSrc) {
        thumbnailCache.set(clipId, thumbnailSrc);
        setIsLoaded(true);
      }
      return undefined;
    }

    if (!observerRef.current && typeof window !== 'undefined') {
      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              observerRef.current?.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '50px'
        }
      );
    }

    const element = elementRef.current;
    if (element && observerRef.current) {
      observerRef.current.observe(element);
    }

    return () => {
      if (element && observerRef.current) {
        observerRef.current.unobserve(element);
      }
    };
  }, [clipId, thumbnailSrc]);

  useEffect(() => {
    if (!clipId || !thumbnailSrc || isLoaded || hasError || !isVisible) {
      return undefined;
    }

    const img = new Image();
    imageRef.current = img;

    img.onload = () => {
      thumbnailCache.set(clipId, thumbnailSrc);
      setIsLoaded(true);
      setHasError(false);
    };

    img.onerror = () => {
      setHasError(true);
    };

    img.src = thumbnailSrc;

    return () => {
      if (imageRef.current) {
        imageRef.current.onload = null;
        imageRef.current.onerror = null;
      }
    };
  }, [clipId, thumbnailSrc, isLoaded, hasError, isVisible]);

  useEffect(() => () => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
  }, []);

  return {
    elementRef,
    isVisible,
    isLoaded,
    hasError,
    cachedSrc: thumbnailCache.get(clipId) || (isLoaded ? thumbnailSrc : undefined)
  };
}
