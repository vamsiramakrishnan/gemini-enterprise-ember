/**
 * Modal — Shared modal/dialog primitive with backdrop.
 *
 * Features: glass backdrop blur, spring entrance animation,
 * close-on-Escape, close-on-backdrop-click, size variants,
 * and smooth exit (via open prop).
 */

import { useEffect, useCallback, type ReactNode } from 'react';
import { zIndex } from '../constants/layout';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  size?: ModalSize;
  /** Optional title in the header */
  title?: string;
  /** Optional subtitle below title */
  subtitle?: string;
  /** Right side of header (e.g. step indicator) */
  headerRight?: ReactNode;
  children: ReactNode;
  /** Footer content (buttons) */
  footer?: ReactNode;
}

const sizeWidths: Record<ModalSize, number> = {
  sm: 420,
  md: 580,
  lg: 720,
  xl: 900,
};

export function Modal({
  open,
  onClose,
  size = 'md',
  title,
  subtitle,
  headerRight,
  children,
  footer,
}: ModalProps) {
  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        zIndex: zIndex.modal,
        background: 'rgba(0, 0, 0, 0.2)',
        backdropFilter: 'blur(8px) saturate(150%)',
        WebkitBackdropFilter: 'blur(8px) saturate(150%)',
        animation: 'modalOverlayIn 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes modalOverlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalIn {
          0% { opacity: 0; transform: scale(0.92) translateY(12px); filter: blur(4px); }
          60% { opacity: 1; transform: scale(1.01) translateY(-2px); filter: blur(0); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0); }
        }
      `}</style>
      <div
        className="flex flex-col overflow-hidden"
        style={{
          borderRadius: 'var(--radius-2xl)',
          width: sizeWidths[size],
          maxWidth: '92vw',
          maxHeight: '88vh',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 32px 64px -12px rgba(0,0,0,0.16), 0 12px 24px -4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.6)',
          fontFamily: 'var(--font-ui)',
          animation: 'modalIn 350ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || headerRight) && (
          <div
            className="flex items-center justify-between shrink-0"
            style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--color-border-subtle)' }}
          >
            <div>
              {title && (
                <h2
                  className="m-0"
                  style={{
                    fontSize: 16,
                    fontWeight: 650,
                    color: 'var(--color-text-primary)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="mt-0.5 m-0" style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {headerRight}
              <button
                onClick={onClose}
                className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 bg-transparent border-none cursor-pointer"
                style={{ color: 'var(--color-text-tertiary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--color-surface-2)';
                  e.currentTarget.style.color = 'var(--color-text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--color-text-tertiary)';
                }}
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: '20px 24px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-between shrink-0"
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--color-border-subtle)',
              background: 'rgba(249, 249, 248, 0.5)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
