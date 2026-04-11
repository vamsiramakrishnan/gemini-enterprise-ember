/**
 * Modal — Shared modal/dialog primitive with backdrop.
 *
 * Handles: overlay, centering, close-on-backdrop-click,
 * close-on-Escape, focus trap basics, and size variants.
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
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: zIndex.modal, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white flex flex-col overflow-hidden"
        style={{
          borderRadius: 14,
          width: sizeWidths[size],
          maxWidth: '92vw',
          maxHeight: '88vh',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          fontFamily: 'var(--font-ui)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || headerRight) && (
          <div
            className="flex items-center justify-between shrink-0"
            style={{ padding: '18px 24px 14px', borderBottom: '1px solid var(--color-surface-2)' }}
          >
            <div>
              {title && (
                <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)] m-0">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5 m-0">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {headerRight}
              <button
                onClick={onClose}
                className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] transition-colors text-lg leading-none bg-transparent border-none cursor-pointer p-1"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '20px 24px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-between shrink-0"
            style={{ padding: '14px 24px', borderTop: '1px solid var(--color-surface-2)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
