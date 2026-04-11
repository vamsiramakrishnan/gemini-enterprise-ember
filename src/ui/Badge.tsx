/**
 * Badge — Shared badge/pill primitive.
 *
 * Used for: status badges, chip type indicators, version labels,
 * count pills, scope indicators, etc.
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
      }}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: dot }} />}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

// ─── Pre-configured status badge ─────────────────────────────────────

type StatusType = keyof typeof statusColors;

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

  return (
    <Badge bg={c.bg} color={c.text} size={size} className={className}>
      {label}
    </Badge>
  );
}
