/**
 * Spinner — Loading indicator.
 */

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = { sm: 'w-3.5 h-3.5', md: 'w-5 h-5', lg: 'w-7 h-7' };

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`${sizeMap[size]} border-2 rounded-full animate-spin ${className}`}
      style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }}
    />
  );
}
