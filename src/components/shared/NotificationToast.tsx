/**
 * NotificationToast — Stacking toast notification system with progress bars,
 * hover-to-pause, SVG icons, and smooth enter/exit animations.
 *
 * Renders up to 5 toasts in the bottom-right corner. Oldest auto-dismissed
 * when the cap is exceeded. Each toast shows a depleting progress bar that
 * pauses on hover. Fully CSS-animated (no framer-motion dependency).
 *
 * Uses shared design tokens: var(--color-*), var(--shadow-*), var(--radius-*).
 */

import { useEffect, useState, useCallback, useRef } from 'react';

/* ─── Public types ──────────────────────────────────────────────────── */

export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationToastProps {
  notifications: ToastNotification[];
  onDismiss: (id: string) => void;
}

/* ─── Constants ─────────────────────────────────────────────────────── */

const MAX_VISIBLE = 5;
const DEFAULT_DURATION = 4000;

/* ─── Color mappings ────────────────────────────────────────────────── */

const COLORS: Record<
  ToastNotification['type'],
  { bg: string; border: string; icon: string; iconBg: string; progress: string }
> = {
  success: {
    bg: 'var(--color-toast-success-bg, #F0FDF4)',
    border: 'var(--color-toast-success-border, #BBF7D0)',
    icon: 'var(--color-toast-success-icon, #166534)',
    iconBg: 'var(--color-toast-success-icon-bg, #DCFCE7)',
    progress: 'var(--color-success, #16A34A)',
  },
  error: {
    bg: 'var(--color-toast-error-bg, #FEF2F2)',
    border: 'var(--color-toast-error-border, #FECACA)',
    icon: 'var(--color-toast-error-icon, #991B1B)',
    iconBg: 'var(--color-toast-error-icon-bg, #FEE2E2)',
    progress: 'var(--color-unresolved, #DC2626)',
  },
  info: {
    bg: 'var(--color-toast-info-bg, #EFF6FF)',
    border: 'var(--color-toast-info-border, #BFDBFE)',
    icon: 'var(--color-toast-info-icon, #1E40AF)',
    iconBg: 'var(--color-toast-info-icon-bg, #DBEAFE)',
    progress: 'var(--color-accent, #2563EB)',
  },
  warning: {
    bg: 'var(--color-toast-warning-bg, #FFFBEB)',
    border: 'var(--color-toast-warning-border, #FDE68A)',
    icon: 'var(--color-toast-warning-icon, #92400E)',
    iconBg: 'var(--color-toast-warning-icon-bg, #FEF3C7)',
    progress: 'var(--color-draft, #CA8A04)',
  },
};

/* ─── SVG Icons ─────────────────────────────────────────────────────── */

function SuccessIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
      <path d="M5 8.5L7 10.5L11 6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
      <path d="M5.75 5.75L10.25 10.25M10.25 5.75L5.75 10.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M7.134 2.5a1 1 0 011.732 0l5.196 9A1 1 0 0113.196 13H2.804a1 1 0 01-.866-1.5l5.196-9z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 6v3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r="0.75" fill={color} />
    </svg>
  );
}

function InfoIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="7" stroke={color} strokeWidth="1.5" />
      <path d="M8 7v4" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="5" r="0.75" fill={color} />
    </svg>
  );
}

const ICON_MAP: Record<ToastNotification['type'], React.FC<{ color: string }>> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

/* ─── Keyframes injected once via <style> ───────────────────────────── */

const STYLE_ID = 'notification-toast-keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes toast-enter {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes toast-exit {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    @keyframes toast-progress {
      from {
        transform: scaleX(1);
      }
      to {
        transform: scaleX(0);
      }
    }
  `;
  document.head.appendChild(style);
}

/* ─── Individual Toast ──────────────────────────────────────────────── */

function Toast({
  notification,
  onDismiss,
}: {
  notification: ToastNotification;
  onDismiss: () => void;
}) {
  const [phase, setPhase] = useState<'entering' | 'visible' | 'exiting'>('entering');
  const [hovered, setHovered] = useState(false);
  const colors = COLORS[notification.type];
  const Icon = ICON_MAP[notification.type];
  const duration = notification.duration ?? DEFAULT_DURATION;

  // Track remaining time for hover-to-pause
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef(duration);
  const startTimeRef = useRef(Date.now());

  const dismiss = useCallback(() => {
    if (phase === 'exiting') return;
    setPhase('exiting');
    setTimeout(onDismiss, 200);
  }, [onDismiss, phase]);

  // Start / resume auto-dismiss timer
  const startTimer = useCallback(() => {
    if (duration <= 0) return;
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(dismiss, remainingRef.current);
  }, [duration, dismiss]);

  // Pause timer on hover
  const pauseTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const elapsed = Date.now() - startTimeRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  }, []);

  // Enter animation done → visible
  useEffect(() => {
    if (phase === 'entering') {
      const t = setTimeout(() => setPhase('visible'), 300);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Auto-dismiss timer lifecycle
  useEffect(() => {
    if (phase !== 'entering' && phase !== 'visible') return;
    if (hovered) return;
    if (duration <= 0) return;

    startTimer();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [hovered, phase, duration, startTimer]);

  const handleMouseEnter = () => {
    setHovered(true);
    pauseTimer();
  };

  const handleMouseLeave = () => {
    setHovered(false);
  };

  // Animation style based on phase
  const animationStyle: React.CSSProperties =
    phase === 'entering'
      ? {
          animation: 'toast-enter 300ms ease-out forwards',
        }
      : phase === 'exiting'
        ? {
            animation: 'toast-exit 200ms ease-in forwards',
          }
        : {};

  // Progress bar style
  const progressStyle: React.CSSProperties =
    duration > 0
      ? {
          animation: `toast-progress ${duration}ms linear forwards`,
          animationPlayState: hovered ? 'paused' : 'running',
        }
      : { transform: 'scaleX(0)' };

  return (
    <div
      role="alert"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        background: colors.bg,
        borderColor: colors.border,
        borderWidth: '1px',
        borderStyle: 'solid',
        borderRadius: 'var(--radius-md, 10px)',
        boxShadow: 'var(--shadow-lg)',
        maxWidth: '380px',
        width: '380px',
        overflow: 'hidden',
        position: 'relative',
        ...animationStyle,
      }}
    >
      {/* Content area */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 36px 12px 14px' }}>
        {/* Icon */}
        <span
          style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-sm, 6px)',
            background: colors.iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '1px',
          }}
        >
          <Icon color={colors.icon} />
        </span>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              lineHeight: '18px',
              color: 'var(--color-text-primary, #18181B)',
            }}
          >
            {notification.title}
          </div>
          {notification.message && (
            <div
              style={{
                fontSize: '12px',
                lineHeight: '16px',
                marginTop: '2px',
                color: 'var(--color-text-secondary, #52525B)',
              }}
            >
              {notification.message}
            </div>
          )}
        </div>
      </div>

      {/* Close button — visible on hover */}
      <button
        onClick={dismiss}
        aria-label="Dismiss notification"
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          width: '22px',
          height: '22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--radius-xs, 4px)',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          opacity: hovered ? 0.7 : 0,
          transition: 'opacity 150ms ease, background 150ms ease',
          padding: 0,
          color: 'var(--color-text-tertiary, #868583)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '1';
          e.currentTarget.style.background = 'rgba(0,0,0,0.06)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = hovered ? '0.7' : '0';
          e.currentTarget.style.background = 'transparent';
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M3 3L9 9M9 3L3 9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {/* Progress bar */}
      {duration > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              height: '100%',
              background: colors.progress,
              transformOrigin: 'left center',
              opacity: 0.7,
              ...progressStyle,
            }}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Container ─────────────────────────────────────────────────────── */

export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  ensureKeyframes();

  // Auto-dismiss oldest when more than MAX_VISIBLE
  useEffect(() => {
    if (notifications.length > MAX_VISIBLE) {
      const oldest = notifications[0];
      if (oldest) {
        onDismiss(oldest.id);
      }
    }
  }, [notifications, onDismiss]);

  const visible = notifications.slice(-MAX_VISIBLE);

  if (visible.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column-reverse',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      {visible.map((n) => (
        <div key={n.id} style={{ pointerEvents: 'auto' }}>
          <Toast notification={n} onDismiss={() => onDismiss(n.id)} />
        </div>
      ))}
    </div>
  );
}
