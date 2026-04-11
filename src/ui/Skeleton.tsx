/**
 * Skeleton — Loading placeholder with shimmer animation.
 *
 * Uses pure CSS (the .skeleton class in index.css) for the shimmer effect.
 * Compose these to build loading states that match your final layout.
 */

interface SkeletonProps {
  /** Width — string (e.g., "100%", "200px") or number (px) */
  width?: string | number;
  /** Height — string or number */
  height?: string | number;
  /** Border radius override */
  radius?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const radiusMap = {
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
};

export function Skeleton({ width, height = 12, radius = 'sm', className = '' }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${radiusMap[radius]} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  );
}

/** Pre-built: a card skeleton matching the registry card layout */
export function SkeletonCard() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton width={28} height={28} radius="md" />
        <div className="flex-1 space-y-1.5">
          <Skeleton width="60%" height={13} />
          <Skeleton width="40%" height={10} />
        </div>
        <Skeleton width={64} height={20} radius="full" />
      </div>
      <Skeleton width="90%" height={11} />
      <div className="flex items-center gap-2">
        <Skeleton width={48} height={10} />
        <Skeleton width={48} height={10} />
      </div>
    </div>
  );
}

/** Pre-built: text block skeleton (paragraph) */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          width={i === lines - 1 ? '75%' : '100%'}
          height={12}
        />
      ))}
    </div>
  );
}
