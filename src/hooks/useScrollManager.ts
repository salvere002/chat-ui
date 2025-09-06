import { useRef, useEffect, useCallback } from 'react';

interface ScrollManagerOptions {
  scrollThreshold?: number;
  autoScrollDelay?: number;
}

export const useScrollManager = (options: ScrollManagerOptions = {}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const lastScrollTimeRef = useRef(0);
  const rafIdRef = useRef<number | undefined>(undefined);
  
  const scrollThreshold = options.scrollThreshold || 100;
  const autoScrollDelay = options.autoScrollDelay || 150;

  const checkScrollPosition = useCallback(() => {
    if (!containerRef.current) return false;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= scrollThreshold;
  }, [scrollThreshold]);

  const shouldAutoScroll = useCallback(() => {
    if (isUserScrollingRef.current) return false;
    if (Date.now() - lastScrollTimeRef.current < autoScrollDelay) return false;
    return checkScrollPosition();
  }, [checkScrollPosition, autoScrollDelay]);

  const scrollToBottom = useCallback(() => {
    if (!endRef.current || !shouldAutoScroll()) return;
    
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      rafIdRef.current = undefined;
    }) as number;
  }, [shouldAutoScroll]);

  const scrollToBottomManual = useCallback(() => {
    if (!endRef.current) return;
    
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    
    rafIdRef.current = requestAnimationFrame(() => {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
      rafIdRef.current = undefined;
    }) as number;
  }, []);

  const handleScroll = useCallback(() => {
    lastScrollTimeRef.current = Date.now();
  }, []);

  const handleUserInteraction = useCallback(() => {
    isUserScrollingRef.current = true;
    setTimeout(() => {
      isUserScrollingRef.current = false;
    }, 1000);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('wheel', handleUserInteraction, { passive: true });
    container.addEventListener('touchstart', handleUserInteraction, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleUserInteraction);
      container.removeEventListener('touchstart', handleUserInteraction);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [handleScroll, handleUserInteraction]);

  return { containerRef, endRef, scrollToBottom, scrollToBottomManual, shouldAutoScroll };
};