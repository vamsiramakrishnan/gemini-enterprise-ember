/**
 * Button — Shared button primitive with variants.
 *
 * Variants: primary, secondary, ghost, danger
 * Sizes: sm, md, lg
 *
 * Interaction: hover lifts + shadow, active presses down (snappy 60ms).
 * Focus: visible ring on keyboard navigation.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[var(--color-accent)] text-white border-transparent',
    'hover:bg-[var(--color-accent-hover)] hover:shadow-[0_2px_8px_rgba(37,99,235,0.3)]',
    'hover:-translate-y-[1px]',
    'active:translate-y-0 active:shadow-sm active:transition-[transform,box-shadow]_60ms',
  ].join(' '),
  secondary: [
    'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)]',
    'hover:bg-[var(--color-surface-1)] hover:border-[var(--color-border-strong)] hover:shadow-xs',
    'hover:-translate-y-[0.5px]',
    'active:translate-y-0 active:bg-[var(--color-surface-2)] active:transition-[transform]_60ms',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--color-text-secondary)] border-transparent',
    'hover:bg-[var(--color-surface-1)] hover:text-[var(--color-text-primary)]',
  ].join(' '),
  danger: [
    'bg-[var(--color-unresolved)] text-white border-transparent',
    'hover:bg-[#B91C1C] hover:shadow-[0_2px_8px_rgba(220,38,38,0.3)]',
    'hover:-translate-y-[1px]',
    'active:translate-y-0 active:transition-[transform]_60ms',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-[11px] gap-1 rounded-md min-h-[30px]',
  md: 'px-3.5 py-1.5 text-[12px] gap-1.5 rounded-lg min-h-[34px]',
  lg: 'px-5 py-2 text-[13px] gap-2 rounded-lg min-h-[38px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, loading, children, className = '', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center font-medium border',
          'transition-all duration-150 ease-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
