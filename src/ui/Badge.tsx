/**
 * Badge — Shared badge/pill primitive with refined styling.
 *
 * Used for: status badges, chip type indicators, version labels,
 * count pills, scope indicators, etc.
 *
 * Now features inner highlight, gradient subtle variant,
 * and distinct shapes per status (not just color).
 */

import type { ReactNode } from 'react';
import { statusColors } from '../constants/colors';

type BadgeVariant = 'solid' | 'outline' | 'subtle';
type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  children: ReactNode;
  /** Background and text color */
  color?: string;
  bg?: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Optional icon before text */
  icon?: ReactNode;
  /** Optional dot indicator (e.g. health status) */
  dot?: string;
  className?: string;
}

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'px-1.5 py-0.5 text-[9px]',
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-[11px]',
};

export function Badge({
  children,
  color,
  bg,
  variant = 'subtle',
  size = 'sm',
  icon,
  dot,
  className = '',
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center gap-1 font-semibold rounded-md whitespace-nowrap';

  const variantClasses =
    variant === 'solid'
      ? 'border-transparent'
      : variant === 'outline'
        ? 'bg-transparent border'
        : 'border-transparent';

  return (
    <span
      className={[baseClasses, variantClasses, sizeStyles[size], className].join(' ')}
      style={{
        background: bg || (color ? `${color}15` : undefined),
        color: color || 'var(--color-text-secondary)',
        borderColor: variant === 'outline' ? (color || 'var(--color-border)') : undefined,
        boxShadow: variant === 'subtle' ? 'inset 0 1px 0 rgba(255,255,255,0.4)' : undefined,
        letterSpacing: '-0.01em',
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: dot, boxShadow: `0 0 3px ${dot}40` }}
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// ─── Pre-configured status badge ─────────────────────────────────────

type StatusType = keyof typeof statusColors;

/** Status shapes for accessibility: different shapes per status, not just color */
const STATUS_SHAPES: Record<string, string> = {
  production: '\u25CF',   // filled circle
  staging: '\u25CB',      // open circle
  draft: '\u25B3',        // triangle
  deprecated: '\u2013',   // en dash
  'rolled-back': '\u21A9', // return arrow
  resolved: '\u2713',     // checkmark
  unresolved: '\u2717',   // x mark
};

export function StatusBadge({
  status,
  size = 'sm',
  className = '',
}: {
  status: StatusType;
  size?: BadgeSize;
  className?: string;
}) {
  const c = statusColors[status] ?? statusColors.draft;
  const label = status === 'resolved' ? 'PUBLISHED' : status.toUpperCase().replace('-', ' ');
  const shape = STATUS_SHAPES[status];

  return (
    <Badge bg={c.bg} color={c.text} size={size} className={className}>
      {shape && <span className="text-[8px] opacity-70">{shape}</span>}
      {label}
    </Badge>
  );
}
