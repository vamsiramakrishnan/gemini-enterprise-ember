/**
 * Tabs — Shared tab bar primitive with animated sliding indicator.
 *
 * The active indicator smoothly slides between tabs using CSS transitions
 * with spring easing, creating a polished, fluid feel.
 *
 * Used in: PlaybookEditor (Document|Flow|Notebook), Inspector,
 * AdminConsole, etc.
 */

import { type ReactNode, useRef, useEffect, useState, useCallback } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const paddingClass = size === 'sm' ? 'px-3 py-2' : 'px-4 py-2.5';
  const fontSize = size === 'sm' ? 'text-[11px]' : 'text-[12px]';

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    const activeEl = tabRefs.current.get(active);
    if (!container || !activeEl) return;

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    setIndicator({
      left: activeRect.left - containerRect.left,
      width: activeRect.width,
    });
  }, [active]);

  useEffect(() => {
    updateIndicator();
    window.addEventListener('resize', updateIndicator);
    return () => window.removeEventListener('resize', updateIndicator);
  }, [updateIndicator]);

  return (
    <div
      ref={containerRef}
      className="flex items-center gap-0 overflow-x-auto relative"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              if (el) tabRefs.current.set(tab.id, el);
            }}
            onClick={() => onChange(tab.id)}
            className={`relative flex items-center gap-1.5 ${paddingClass} transition-colors duration-150 group shrink-0`}
          >
            {tab.icon && (
              <span
                className="transition-all duration-200"
                style={{
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                  filter: isActive ? 'drop-shadow(0 0 3px rgba(37, 99, 235, 0.2))' : 'none',
                }}
              >
                {tab.icon}
              </span>
            )}
            <span
              className={[
                fontSize,
                'font-medium transition-colors duration-200',
                isActive
                  ? 'text-[var(--color-accent)]'
                  : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]',
              ].join(' ')}
            >
              {tab.label}
            </span>
          </button>
        );
      })}

      {/* Sliding indicator */}
      <div
        className="absolute bottom-0 h-[2.5px] rounded-t-full"
        style={{
          left: indicator.left,
          width: indicator.width,
          background: 'var(--color-accent)',
          boxShadow: '0 0 8px rgba(37, 99, 235, 0.3)',
          transition: 'left 280ms cubic-bezier(0.34, 1.56, 0.64, 1), width 280ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />

      {trailing && (
        <>
          <div className="flex-1" />
          {trailing}
        </>
      )}
    </div>
  );
}
