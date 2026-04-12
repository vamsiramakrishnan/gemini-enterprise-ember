/**
 * Button — Shared button primitive with variants and micro-interactions.
 *
 * Variants: primary, secondary, ghost, danger
 * Sizes: sm, md, lg
 *
 * Interaction: hover lifts with colored shadow glow, active snaps down.
 * Primary buttons get a subtle gradient and glow on hover.
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
    'text-white border-transparent',
    'hover:shadow-[0_4px_14px_rgba(37,99,235,0.35)]',
    'hover:-translate-y-[1px]',
    'active:translate-y-[0.5px] active:shadow-[0_1px_4px_rgba(37,99,235,0.2)] active:transition-[transform,box-shadow]',
  ].join(' '),
  secondary: [
    'bg-white text-[var(--color-text-secondary)] border-[var(--color-border)]',
    'hover:bg-[var(--color-surface-1)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-sm)]',
    'hover:-translate-y-[0.5px]',
    'active:translate-y-0 active:bg-[var(--color-surface-2)]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[var(--color-text-secondary)] border-transparent',
    'hover:bg-[var(--color-surface-1)] hover:text-[var(--color-text-primary)]',
    'active:bg-[var(--color-surface-2)]',
  ].join(' '),
  danger: [
    'bg-[var(--color-unresolved)] text-white border-transparent',
    'hover:bg-[#B91C1C] hover:shadow-[0_4px_14px_rgba(220,38,38,0.3)]',
    'hover:-translate-y-[1px]',
    'active:translate-y-[0.5px]',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-[11px] gap-1.5 rounded-lg min-h-[30px]',
  md: 'px-3.5 py-1.5 text-[12px] gap-1.5 rounded-[10px] min-h-[34px]',
  lg: 'px-5 py-2 text-[13px] gap-2 rounded-xl min-h-[38px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', icon, loading, children, className = '', disabled, style, ...props }, ref) => {
    const isPrimary = variant === 'primary';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={[
          'inline-flex items-center justify-center font-semibold border',
          'transition-all duration-[180ms] ease-[cubic-bezier(0.34,1.56,0.64,1)]',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none',
          variantStyles[variant],
          sizeStyles[size],
          className,
        ].join(' ')}
        style={{
          ...(isPrimary ? {
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #1E40AF 100%)',
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
          } : {}),
          letterSpacing: '-0.01em',
          ...style,
        }}
        {...props}
      >
        {loading ? (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : icon ? (
          <span className="shrink-0 transition-transform duration-150">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
