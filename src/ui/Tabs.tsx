/**
 * Tabs — Shared tab bar primitive with active indicator.
 *
 * Used in: PlaybookEditor (Document|Flow|Notebook), Inspector,
 * AdminConsole, etc.
 */

import { type ReactNode } from 'react';

interface Tab<T extends string> {
  id: T;
  label: string;
  icon?: ReactNode;
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[];
  active: T;
  onChange: (id: T) => void;
  /** Optional trailing content (right side of tab bar) */
  trailing?: ReactNode;
  size?: 'sm' | 'md';
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  trailing,
  size = 'md',
}: TabsProps<T>) {
  const paddingClass = size === 'sm' ? 'px-2.5 py-2' : 'px-4 py-2.5';
  const fontSize = size === 'sm' ? 'text-[11px]' : 'text-[12px]';

  return (
    <div className="flex items-center gap-0 overflow-x-auto" style={{ fontFamily: 'var(--font-ui)' }}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-1.5 ${paddingClass} transition-colors group shrink-0`}
          >
            {tab.icon && (
              <span className={isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]'}>
                {tab.icon}
              </span>
            )}
            <span
              className={[
                fontSize,
                'font-medium',
                isActive
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]',
              ].join(' ')}
            >
              {tab.label}
            </span>
            {isActive && (
              <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--color-accent)]" />
            )}
          </button>
        );
      })}

      {trailing && (
        <>
          <div className="flex-1" />
          {trailing}
        </>
      )}
    </div>
  );
}
