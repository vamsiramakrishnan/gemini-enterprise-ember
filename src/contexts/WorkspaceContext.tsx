/**
 * WorkspaceContext — Manages the current workspace and workspace switching.
 *
 * A workspace scopes the user's view: the editor loads its playbook,
 * the registry filters to its assets, the sidebar shows its identity.
 *
 * Switching workspaces changes the entire context — like opening a
 * different project in VS Code or switching teams in Linear.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

import type { Workspace } from '../data/workspaces';
import { WORKSPACES } from '../data/workspaces';
import { NotificationContext } from './NotificationContext';

// ─── Types ───────────────────────────────────────────────────────────

export interface WorkspaceContextValue {
  /** All workspaces the user has access to */
  workspaces: Workspace[];
  /** The currently active workspace */
  current: Workspace | null;
  /** Loading state */
  loading: boolean;
  /** Switch to a different workspace */
  switchWorkspace: (id: string) => void;
  /** Create a new workspace (returns the new workspace) */
  createWorkspace: (name: string, icon?: string) => Workspace;
  /** Check if an asset ID belongs to the current workspace */
  isInCurrentWorkspace: (assetId: string) => boolean;
}

// ─── Context ─────────────────────────────────────────────────────────

const WorkspaceCtx = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceCtx);
  if (!ctx) throw new Error('useWorkspace must be used within <WorkspaceProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [current, setCurrent] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);

  const notifCtx = useContext(NotificationContext);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWorkspaces([...WORKSPACES]);
      setCurrent(WORKSPACES[0]); // Default to first workspace
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const switchWorkspace = useCallback(
    (id: string) => {
      const ws = workspaces.find((w) => w.id === id);
      if (ws) {
        setCurrent(ws);
        notifCtx?.addNotification({
          type: 'info',
          title: `Switched to ${ws.name}`,
          message: `Now viewing ${ws.agentName} (v${ws.agentVersion})`,
        });
      }
    },
    [workspaces, notifCtx],
  );

  const createWorkspace = useCallback(
    (name: string, icon = '📄') => {
      const ws: Workspace = {
        id: `ws-${Date.now()}`,
        name,
        agentName: `${name} Agent`,
        agentVersion: '0.1.0',
        owner: { name: 'Vamsi K', email: 'vamsi@acme.com', avatar: 'VK' },
        members: [{ name: 'Vamsi K', email: 'vamsi@acme.com', avatar: 'VK', role: 'admin' }],
        assetIds: [],
        color: '#2563EB',
        icon,
        status: 'active',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setWorkspaces((prev) => [ws, ...prev]);
      setCurrent(ws);
      notifCtx?.addNotification({
        type: 'success',
        title: `Created workspace "${name}"`,
      });
      return ws;
    },
    [notifCtx],
  );

  const isInCurrentWorkspace = useCallback(
    (assetId: string) => {
      if (!current) return true; // No workspace = show everything
      return current.assetIds.includes(assetId);
    },
    [current],
  );

  return (
    <WorkspaceCtx.Provider
      value={{ workspaces, current, loading, switchWorkspace, createWorkspace, isInCurrentWorkspace }}
    >
      {children}
    </WorkspaceCtx.Provider>
  );
}
