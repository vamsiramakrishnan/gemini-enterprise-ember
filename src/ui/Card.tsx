/**
 * Card — Shared card primitive with border accent support.
 *
 * Used for registry cards, create cards, detail panels, etc.
 */

import { type HTMLAttributes, type ReactNode } from 'react';

type CardVariant = 'default' | 'outlined' | 'elevated' | 'interactive';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Colored left border (e.g. chip accent color) */
  accentColor?: string;
  /** Padding preset */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white border border-[var(--color-border)] rounded-xl',
  outlined: 'bg-white border border-[var(--color-border)] rounded-xl',
  elevated: 'bg-white border border-[var(--color-border)] rounded-xl shadow-sm',
  interactive:
    'bg-white border border-[var(--color-border)] rounded-xl hover:border-[var(--color-border-strong)] hover:shadow-md transition-all cursor-pointer',
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-5',
};

export function Card({
  variant = 'default',
  accentColor,
  padding = 'md',
  children,
  className = '',
  style,
  ...props
}: CardProps) {
  return (
    <div
      className={[variantStyles[variant], paddingStyles[padding], className].join(' ')}
      style={{
        ...(accentColor
          ? { borderLeftWidth: 4, borderLeftColor: accentColor }
          : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
