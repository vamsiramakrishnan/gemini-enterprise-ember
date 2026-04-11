/**
 * Drawer — A slide-in panel from the right edge.
 *
 * Used for QuickView (inspecting assets without leaving context),
 * inline editing, and detail panels. Unlike Modal, a Drawer doesn't
 * block interaction with the page behind it — you can still see
 * and scroll the editor while the drawer is open.
 *
 * Entering: slides from right with spring easing.
 * Exiting: slides out (controlled by parent via `open` prop).
 */

import { useEffect, useCallback, type ReactNode } from 'react';
import { zIndex } from '../constants/layout';

type DrawerSize = 'sm' | 'md' | 'lg';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  size?: DrawerSize;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

const sizeWidths: Record<DrawerSize, string> = {
  sm: 'min(320px, 85vw)',
  md: 'min(420px, 90vw)',
  lg: 'min(560px, 92vw)',
};

export function Drawer({
  open,
  onClose,
  size = 'md',
  title,
  subtitle,
  children,
  footer,
}: DrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <>
      {/* Scrim — subtle, doesn't block interaction fully */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.08)',
          zIndex: zIndex.overlay,
          animation: 'drawerScrimIn 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      />

      <style>{`
        @keyframes drawerScrimIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes drawerSlideIn {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: sizeWidths[size],
          zIndex: zIndex.modal,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface-0)',
          borderLeft: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow-xl)',
          fontFamily: 'var(--font-ui)',
          animation: 'drawerSlideIn 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Header */}
        {(title || subtitle) && (
          <div
            className="flex items-center justify-between shrink-0"
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div>
              {title && (
                <h3 style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.01em',
                }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p style={{
                  margin: '2px 0 0',
                  fontSize: 12,
                  color: 'var(--color-text-tertiary)',
                }}>
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-text-tertiary)',
                fontSize: 18,
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                transition: 'all var(--duration-fast) var(--ease-out)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-2)';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--color-text-tertiary)';
              }}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        )}

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px 20px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="shrink-0 flex items-center gap-2"
            style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--color-border)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
