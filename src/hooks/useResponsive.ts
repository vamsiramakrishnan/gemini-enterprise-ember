/**
 * useResponsive — Single source of truth for responsive breakpoints.
 *
 * Replaces the duplicate useIsMobile (shell/Navigation) and
 * useBreakpoint (PlaybookEditor) with one consistent hook.
 */

import { useState, useEffect } from 'react';
import { breakpoints } from '../constants/layout';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

/**
 * Returns the current breakpoint name.
 * - mobile:  < 768px
 * - tablet:  768px–1023px
 * - desktop: >= 1024px
 */
export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    return w < breakpoints.mobile ? 'mobile' : w < breakpoints.tablet ? 'tablet' : 'desktop';
  });

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setBp(w < breakpoints.mobile ? 'mobile' : w < breakpoints.tablet ? 'tablet' : 'desktop');
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return bp;
}

/** Convenience: returns true when viewport is mobile (< 768px). */
export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile';
}
