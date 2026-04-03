/**
 * StatusBadge — visual badge for chip/version status.
 * Uses distinct shapes + colors for accessibility (not just color).
 */

import type { ChipStatus } from '../../parser/types';

const STATUS_CONFIG: Record<ChipStatus, { label: string; bg: string; text: string; icon: string }> = {
  resolved:   { label: 'Published', bg: '#DCFCE7', text: '#166534', icon: '●' },
  draft:      { label: 'Draft',     bg: '#FEF9C3', text: '#854D0E', icon: '◐' },
  unresolved: { label: 'Missing',   bg: '#FEE2E2', text: '#991B1B', icon: '○' },
  deprecated: { label: 'Deprecated',bg: '#F3F4F6', text: '#6B7280', icon: '◌' },
};

export function StatusBadge({ status }: { status: ChipStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}
