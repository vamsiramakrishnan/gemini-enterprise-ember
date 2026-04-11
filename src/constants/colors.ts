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

export const statusColors = {
  resolved:   { bg: '#DCFCE7', text: '#166534' },
  draft:      { bg: '#FEF9C3', text: '#854D0E' },
  unresolved: { bg: '#FEE2E2', text: '#991B1B' },
  deprecated: { bg: '#F3F4F6', text: '#6B7280' },
  production: { bg: '#DCFCE7', text: '#166534' },
  staging:    { bg: '#DBEAFE', text: '#1E40AF' },
  'rolled-back': { bg: '#FEF3C7', text: '#92400E' },
} as const;
