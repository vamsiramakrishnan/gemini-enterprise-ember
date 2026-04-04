/**
 * NotificationToast — Toast notification system for app-wide feedback.
 *
 * Renders a stack of toast notifications in the bottom-right corner.
 * Used by all screens for success/error/info feedback on user actions.
 */

import { useEffect, useState, useCallback } from 'react';

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

const ICONS: Record<ToastNotification['type'], string> = {
  success: '✓',
  error: '!',
  info: 'i',
  warning: '!',
};

const COLORS: Record<ToastNotification['type'], { bg: string; border: string; icon: string; iconBg: string }> = {
  success: { bg: '#F0FDF4', border: '#BBF7D0', icon: '#166534', iconBg: '#DCFCE7' },
  error:   { bg: '#FEF2F2', border: '#FECACA', icon: '#991B1B', iconBg: '#FEE2E2' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', icon: '#1E40AF', iconBg: '#DBEAFE' },
  warning: { bg: '#FFFBEB', border: '#FDE68A', icon: '#92400E', iconBg: '#FEF3C7' },
};

function Toast({ notification, onDismiss }: { notification: ToastNotification; onDismiss: () => void }) {
  const [exiting, setExiting] = useState(false);
  const colors = COLORS[notification.type];

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(onDismiss, 200);
  }, [onDismiss]);

  useEffect(() => {
    const duration = notification.duration ?? 4000;
    if (duration > 0) {
      const timer = setTimeout(dismiss, duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration, dismiss]);

  return (
    <div
      className="flex items-start gap-2.5 px-4 py-3 rounded-lg shadow-lg border max-w-sm transition-all duration-200"
      style={{
        background: colors.bg,
        borderColor: colors.border,
        opacity: exiting ? 0 : 1,
        transform: exiting ? 'translateX(20px)' : 'translateX(0)',
      }}
    >
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
        style={{ background: colors.iconBg, color: colors.icon }}
      >
        {ICONS[notification.type]}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {notification.title}
        </div>
        {notification.message && (
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {notification.message}
          </div>
        )}
      </div>
      <button
        onClick={dismiss}
        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] hover:bg-black/5 transition-colors"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        x
      </button>
    </div>
  );
}

export function NotificationToast({ notifications, onDismiss }: NotificationToastProps) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col-reverse gap-2">
      {notifications.map((n) => (
        <Toast key={n.id} notification={n} onDismiss={() => onDismiss(n.id)} />
      ))}
    </div>
  );
}
