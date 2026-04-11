/**
 * ConnectorContext — Enterprise connector catalog with toggle/sync/test.
 *
 * Manages the inventory of Google-native and third-party connectors
 * (Jira, Salesforce, Slack, etc.) available to the workspace.
 * Each connector exposes entities and actions that map to @connector chips.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

import type { ConnectorEntry } from '../data/connectors';
import { GOOGLE_CONNECTORS, THIRD_PARTY_CONNECTORS } from '../data/connectors';
import { NotificationContext } from './NotificationContext';

// ─── Types ───────────────────────────────────────────────────────────

export interface ConnectorContextValue {
  connectors: ConnectorEntry[];
  loading: boolean;
  selectedConnector: ConnectorEntry | null;
  actionCount: number;
  selectConnector: (id: string) => void;
  clearSelection: () => void;
  toggleConnector: (id: string, enabled: boolean) => void;
  syncConnector: (id: string) => void;
  testQuery: (id: string, query: string) => Promise<{ results: string[]; latencyMs: number }>;
}

// ─── Context ─────────────────────────────────────────────────────────

const ConnectorCtx = createContext<ConnectorContextValue | null>(null);

export function useConnectors(): ConnectorContextValue {
  const ctx = useContext(ConnectorCtx);
  if (!ctx) throw new Error('useConnectors must be used within <AppProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────

export function ConnectorProvider({ children }: { children: ReactNode }) {
  const [connectors, setConnectors] = useState<ConnectorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorEntry | null>(null);

  const notifCtx = useContext(NotificationContext);

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectors([...GOOGLE_CONNECTORS, ...THIRD_PARTY_CONNECTORS]);
      setLoading(false);
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const actionCount = React.useMemo(() => {
    return connectors.reduce((sum, c) => {
      if (c.status !== 'active') return sum;
      return sum + c.actions.filter((a) => a.enabled).length;
    }, 0);
  }, [connectors]);

  const selectConnector = useCallback(
    (id: string) => setSelectedConnector(connectors.find((c) => c.id === id) ?? null),
    [connectors],
  );

  const clearSelection = useCallback(() => setSelectedConnector(null), []);

  const toggleConnector = useCallback(
    (id: string, enabled: boolean) => {
      setConnectors((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const newStatus = enabled ? 'active' : 'draft';
          const newActions = c.actions.map((a) => ({ ...a, enabled }));
          return { ...c, status: newStatus as ConnectorEntry['status'], actions: newActions };
        }),
      );
      const connector = connectors.find((c) => c.id === id);
      notifCtx?.addNotification({
        type: 'info',
        title: enabled
          ? `${connector?.product ?? id} connected`
          : `${connector?.product ?? id} disconnected`,
      });
    },
    [connectors, notifCtx],
  );

  const syncConnector = useCallback(
    (id: string) => {
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, status: 'active' as const, lastSync: new Date().toISOString() } : c,
        ),
      );
      const connector = connectors.find((c) => c.id === id);
      notifCtx?.addNotification({
        type: 'success',
        title: `${connector?.product ?? id} synced`,
        message: 'Data refreshed successfully.',
      });
    },
    [connectors, notifCtx],
  );

  const testQuery = useCallback(
    async (id: string, query: string): Promise<{ results: string[]; latencyMs: number }> => {
      const latency = 200 + Math.random() * 800;
      await new Promise((resolve) => setTimeout(resolve, latency));
      const connector = connectors.find((c) => c.id === id);
      const product = connector?.product ?? id;
      return {
        results: [
          `${product} result 1 for "${query}"`,
          `${product} result 2 for "${query}"`,
          `${product} result 3 for "${query}"`,
        ],
        latencyMs: Math.round(latency),
      };
    },
    [connectors],
  );

  return (
    <ConnectorCtx.Provider
      value={{
        connectors, loading, selectedConnector, actionCount,
        selectConnector, clearSelection, toggleConnector, syncConnector, testQuery,
      }}
    >
      {children}
    </ConnectorCtx.Provider>
  );
}
