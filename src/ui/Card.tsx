/**
 * Card — Shared card primitive with border accent support.
 *
 * Interactive cards lift on hover (translateY -2px + shadow-md)
 * and press back down on click (60ms snap). This gives cards
 * the feel of physical objects with depth.
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
  default: [
    'bg-white border border-[var(--color-border)] rounded-xl',
    'shadow-[var(--shadow-xs)]',
  ].join(' '),
  outlined: 'bg-white border border-[var(--color-border)] rounded-xl',
  elevated: [
    'bg-white border border-[var(--color-border)] rounded-xl',
    'shadow-[var(--shadow-sm)]',
  ].join(' '),
  interactive: [
    'bg-white border border-[var(--color-border)] rounded-xl',
    'shadow-[var(--shadow-xs)]',
    'transition-all duration-200 ease-out cursor-pointer',
    'hover:-translate-y-[2px] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-border-strong)]',
    'active:translate-y-0 active:shadow-[var(--shadow-sm)] active:duration-[60ms]',
  ].join(' '),
};

const paddingStyles: Record<string, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
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
          ? { borderLeftWidth: 3, borderLeftColor: accentColor }
          : {}),
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
