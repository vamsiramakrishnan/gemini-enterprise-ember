/**
 * EmptyState — Placeholder for empty/unselected states.
 */

import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8 py-12">
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[var(--color-surface-2)] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <div className="text-[13px] text-[var(--color-text-secondary)] mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
        {title}
      </div>
      {description && (
        <div className="text-[12px] text-[var(--color-text-tertiary)] mb-4 max-w-sm">
          {description}
        </div>
      )}
      {action}
    </div>
  );
}
