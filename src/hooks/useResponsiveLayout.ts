import { useState, useEffect, useMemo } from 'react';

interface ResponsiveBreakpoints {
  /** Window width in pixels */
  windowWidth: number;
  /** Screen width >= 1280px (xl breakpoint) */
  isWideScreen: boolean;
  /** Screen width >= 1024px (lg breakpoint) */
  isLargeScreen: boolean;
  /** Screen width >= 768px (md breakpoint) */
  isMediumScreen: boolean;
  /** Screen width >= 640px (sm breakpoint) */
  isSmallScreen: boolean;
}

/**
 * Hook that tracks window width and provides responsive breakpoint flags.
 * Uses Tailwind CSS breakpoint values.
 */
export function useResponsiveLayout(): ResponsiveBreakpoints {
  const [windowWidth, setWindowWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const breakpoints = useMemo(() => ({
    windowWidth,
    isWideScreen: windowWidth >= 1280,
    isLargeScreen: windowWidth >= 1024,
    isMediumScreen: windowWidth >= 768,
    isSmallScreen: windowWidth >= 640,
  }), [windowWidth]);

  return breakpoints;
}

export default useResponsiveLayout;
