/**
 * statusConfig — Registry for all status types (chip status + version status).
 *
 * To add a new status:
 *   1. Add to the relevant union type in parser/types.ts
 *   2. Add one entry here
 *   3. Done — StatusBadge, diff views, timeline all derive automatically.
 */

import type { ChipStatus, VersionStatus } from '../parser/types';

export interface StatusConfig {
  label: string;
  bg: string;
  text: string;
  /** Optional border color for when status needs extra emphasis */
  border?: string;
}

// ─── Chip statuses ────────────────���──────────────────────────────────

export const CHIP_STATUS_CONFIG: Record<ChipStatus, StatusConfig> = {
  resolved:   { label: 'PUBLISHED',   bg: '#DCFCE7', text: '#166534' },
  draft:      { label: 'DRAFT',       bg: '#FEF9C3', text: '#854D0E' },
  unresolved: { label: 'UNRESOLVED',  bg: '#FEE2E2', text: '#991B1B' },
  deprecated: { label: 'DEPRECATED',  bg: '#F3F4F6', text: '#6B7280' },
};

// ─── Version/deploy statuses ─────────────────────────────────────────

export const VERSION_STATUS_CONFIG: Record<VersionStatus, StatusConfig> = {
  draft:        { label: 'DRAFT',       bg: '#F3F4F6', text: '#6B7280' },
  staging:      { label: 'STAGING',     bg: '#DBEAFE', text: '#1E40AF' },
  production:   { label: 'PRODUCTION',  bg: '#DCFCE7', text: '#166534' },
  'rolled-back': { label: 'ROLLED BACK', bg: '#FEF3C7', text: '#92400E' },
  deprecated:   { label: 'DEPRECATED',  bg: '#F3F4F6', text: '#6B7280' },
};

// ─── Merged status colors (for StatusBadge and general use) ──────────
// This replaces the standalone statusColors in constants/colors.ts

export const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ...Object.fromEntries(
    Object.entries(CHIP_STATUS_CONFIG).map(([k, v]) => [k, { bg: v.bg, text: v.text }]),
  ),
  ...Object.fromEntries(
    Object.entries(VERSION_STATUS_CONFIG).map(([k, v]) => [k, { bg: v.bg, text: v.text }]),
  ),
};
