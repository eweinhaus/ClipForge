import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for lazy loading and caching thumbnails
 * Uses IntersectionObserver to load thumbnails only when visible
 */
export function useThumbnailPreload(clipId, thumbnailSrc) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);
  
  // Thumbnail cache to prevent re-loading
  const cacheRef = useRef(new Map());
  
  useEffect(() => {
    // Check if thumbnail is already cached
    if (cacheRef.current.has(clipId)) {
      setIsLoaded(true);
      return;
    }
    
    // Set up IntersectionObserver
    if (!observerRef.current) {
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
  }, [clipId]);
  
  useEffect(() => {
    if (isVisible && thumbnailSrc && !isLoaded && !hasError) {
      // Preload the image
      const img = new Image();
      img.onload = () => {
        setIsLoaded(true);
        // Cache the thumbnail
        cacheRef.current.set(clipId, thumbnailSrc);
      };
      img.onerror = () => {
        setHasError(true);
      };
      img.src = thumbnailSrc;
    }
  }, [isVisible, thumbnailSrc, isLoaded, hasError, clipId]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
  
  return {
    elementRef,
    isVisible,
    isLoaded,
    hasError,
    cachedSrc: cacheRef.current.get(clipId)
  };
}
