/**
 * Kbd — Keyboard shortcut display.
 */

import type { ReactNode } from 'react';

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-mono bg-[var(--color-surface-2)] text-[var(--color-text-tertiary)]">
      {children}
    </kbd>
  );
}
