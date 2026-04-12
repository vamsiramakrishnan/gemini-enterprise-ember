/**
 * useScrollStagger — Scroll-triggered stagger animation hook.
 *
 * Attaches to a container ref. When the container enters the viewport,
 * its children animate in with staggered delays.
 *
 * Usage:
 *   const ref = useScrollStagger<HTMLDivElement>();
 *   <div ref={ref} className="scroll-stagger"> ... children ... </div>
 */

import { useRef, useEffect, type RefObject } from 'react';

export function useScrollStagger<T extends HTMLElement>(
  options: {
    threshold?: number;
    staggerMs?: number;
    rootMargin?: string;
  } = {}
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const { threshold = 0.1, staggerMs = 60, rootMargin = '0px 0px -40px 0px' } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Mark children as initially hidden
    const children = Array.from(el.children) as HTMLElement[];
    children.forEach((child) => {
      child.style.opacity = '0';
      child.style.transform = 'translateY(16px)';
      child.style.transition = 'none';
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const kids = Array.from(el.children) as HTMLElement[];
            kids.forEach((child, i) => {
              // Use requestAnimationFrame for smooth start
              requestAnimationFrame(() => {
                setTimeout(() => {
                  child.style.transition = `opacity 400ms cubic-bezier(0.16, 1, 0.3, 1), transform 400ms cubic-bezier(0.16, 1, 0.3, 1)`;
                  child.style.opacity = '1';
                  child.style.transform = 'translateY(0)';
                }, i * staggerMs);
              });
            });
            observer.unobserve(el);
          }
        });
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, staggerMs, rootMargin]);

  return ref;
}
