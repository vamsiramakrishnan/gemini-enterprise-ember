/**
 * Design tokens — single source of truth for colors, spacing, and layout.
 *
 * All values reference CSS custom properties defined in index.css.
 * Components should import from here instead of hardcoding hex values.
 */

// ─── Semantic colors (map to CSS vars) ────────────────────────────────

export const colors = {
  // Surfaces
  surface0: 'var(--color-surface-0)',
  surface1: 'var(--color-surface-1)',
  surface2: 'var(--color-surface-2)',
  surface3: 'var(--color-surface-3)',

  // Text
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textTertiary: 'var(--color-text-tertiary)',

  // Chrome
  border: 'var(--color-border)',
  borderStrong: 'var(--color-border-strong)',

  // Accent
  accent: 'var(--color-accent)',
  accentHover: 'var(--color-accent-hover)',
  accentLight: 'var(--color-accent-light)',

  // Status
  success: 'var(--color-success)',
  unresolved: 'var(--color-unresolved)',
  draft: 'var(--color-draft)',
  deprecated: 'var(--color-deprecated)',
} as const;

// ─── Chip accent colors ─────────────────────────────────────────────
// Derived from CHIP_CONFIG — re-exported for convenience.
// DO NOT define chip colors here. Edit config/chipConfig.ts instead.

export { CHIP_ACCENTS as chipAccent } from '../config/chipConfig';

// ─── Status colors ────────────────────────────────────────────────────
// Derived from STATUS_COLORS in config/statusConfig.ts.
// DO NOT define status colors here. Edit config/statusConfig.ts instead.

export { STATUS_COLORS as statusColors } from '../config/statusConfig';
