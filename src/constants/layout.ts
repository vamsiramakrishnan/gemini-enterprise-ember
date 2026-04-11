/**
 * Layout constants — breakpoints, sizes, spacing, and shadows.
 *
 * Single source of truth for all magic numbers.
 */

// ─── Breakpoints ──────────────────────────────────────────────────────

export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
} as const;

export const mediaQueries = {
  mobile: `(max-width: ${breakpoints.mobile - 1}px)`,
  tablet: `(min-width: ${breakpoints.mobile}px) and (max-width: ${breakpoints.tablet - 1}px)`,
  desktop: `(min-width: ${breakpoints.tablet}px)`,
} as const;

// ─── Layout sizes ─────────────────────────────────────────────────────

export const sidebar = {
  expanded: 220,
  collapsed: 56,
  mobileDrawer: 260,
} as const;

export const modal = {
  sm: 420,
  md: 580,
  lg: 720,
} as const;

export const flowGraph = {
  nodeWidth: 220,
  nodeHeight: 72,
} as const;

// ─── Spacing scale (4px base) ─────────────────────────────────────────

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

// ─── Typography ───────────────────────────────────────────────────────

export const fontFamily = {
  ui: 'var(--font-ui)',
  body: 'var(--font-body)',
  mono: 'var(--font-mono)',
} as const;

export const fontSize = {
  '2xs': 9,
  xs: 10,
  sm: 11,
  base: 12,
  md: 13,
  lg: 14,
  xl: 15,
  '2xl': 18,
  '3xl': 24,
} as const;

// ─── Shadows ──────────────────────────────────────────────────────────

export const shadow = {
  xs: 'var(--shadow-xs)',
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
} as const;

// ─── Border radius ────────────────────────────────────────────────────

export const radius = {
  sm: 6,
  md: 8,
  lg: 10,
  xl: 14,
  full: 9999,
} as const;

// ─── Z-index layers ──────────────────────────────────────────────────

export const zIndex = {
  dropdown: 50,
  sticky: 100,
  modal: 200,
  overlay: 150,
  tooltip: 300,
  toast: 400,
} as const;

// ─── Animation ────────────────────────────────────────────────────────

export const transition = {
  fast: '100ms ease-out',
  normal: '150ms ease-out',
  slow: '200ms ease-out',
  spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;
