/**
 * NotificationContext — Toast notification state management.
 *
 * Provides a queue of notifications with auto-dismiss timers.
 * Consumed by NotificationToast and any component needing to show
 * transient feedback (e.g., "Playbook saved", "Created @tool(...)").
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  duration?: number;
}

export interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

// ─── Context ─────────────────────────────────────────────────────────

export const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within <AppProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addNotification = useCallback(
    (n: Omit<Notification, 'id'>) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const notification: Notification = { ...n, id };
      setNotifications((prev) => [...prev, notification]);

      const duration = n.duration ?? 4000;
      const timer = setTimeout(() => removeNotification(id), duration);
      timersRef.current.set(id, timer);
    },
    [removeNotification],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}
