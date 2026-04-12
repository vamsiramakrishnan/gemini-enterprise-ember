/**
 * WorkspaceContext — Manages the current workspace, membership, and
 * cross-workspace visibility.
 *
 * A workspace is the top-level organizational container: every chip
 * (tool, guard, agent, connector, doc, data, schema, skill, trigger)
 * is owned by exactly ONE workspace. Cross-workspace access is granted
 * via explicit sharing or via org-catalog visibility.
 *
 * Switching workspaces changes the entire context — the registry
 * filters, the sidebar chrome, the editor's default save target.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';

import type { Workspace } from '../data/workspaces';
import { WORKSPACES, WORKSPACE_IDS } from '../data/workspaces';
import type { SmartChip } from '../parser/types';
import { NotificationContext } from './NotificationContext';
import { MOCK_USER } from './AuthContext';

// ─── Types ───────────────────────────────────────────────────────────

export type WorkspaceAccessReason =
  | 'owned'          // chip lives in the current workspace
  | 'shared'         // explicitly shared to current workspace via sharedWith.workspaceIds
  | 'granted'        // owning workspace granted a role to current workspace via sharingGrants
  | 'org-catalog'    // org-wide discoverable
  | 'published';     // external marketplace

export interface ChipAccess {
  visible: boolean;
  reason: WorkspaceAccessReason | null;
  ownerWorkspace: Workspace | null;
}

export interface WorkspaceContextValue {
  /** All workspaces loaded (full org list, not filtered by membership). */
  workspaces: Workspace[];
  /** Workspaces the current user is a member of. */
  accessibleWorkspaces: Workspace[];
  /** The currently active workspace. */
  current: Workspace | null;
  loading: boolean;

  switchWorkspace: (id: string) => void;
  createWorkspace: (name: string, icon?: string) => Workspace;

  /** Look up a workspace by id. */
  getWorkspace: (id: string) => Workspace | undefined;
  /** Is the chip owned by the current workspace? */
  isOwnedByCurrent: (chip: SmartChip) => boolean;
  /** Why (if at all) can the current workspace see this chip? */
  getChipAccess: (chip: SmartChip) => ChipAccess;
  /** Filter a chip list to only those visible from the current workspace. */
  getVisibleChips: (chips: SmartChip[]) => SmartChip[];
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
      // Default to Claims — the demo workspace
      const claims = WORKSPACES.find((w) => w.id === WORKSPACE_IDS.CLAIMS) ?? WORKSPACES[0];
      setCurrent(claims);
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ── Membership ────────────────────────────────────────────────────
  const accessibleWorkspaces = useMemo(
    () =>
      workspaces.filter((w) =>
        w.members.some((m) => m.email === MOCK_USER.email) ||
        // Workspaces that share to a workspace the user is a member of
        // are ALSO listed (so the user sees the Platform and Compliance catalogs).
        w.sharingGrants.some((g) =>
          workspaces
            .filter((ws) => ws.members.some((m) => m.email === MOCK_USER.email))
            .some((ws) => ws.id === g.workspaceId),
        ),
      ),
    [workspaces],
  );

  // ── Actions ───────────────────────────────────────────────────────

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
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const me = { name: MOCK_USER.name, email: MOCK_USER.email, avatar: MOCK_USER.avatar };
      const ws: Workspace = {
        id: `ws-${Date.now()}`,
        slug,
        name,
        description: `${name} workspace`,
        icon,
        color: '#2563EB',
        owner: { ...me, role: 'owner' },
        members: [{ ...me, role: 'owner' }],
        defaultVisibility: 'private',
        sharingGrants: [],
        subscribedTo: [WORKSPACE_IDS.PLATFORM],
        agentName: `${name} Agent`,
        agentVersion: '0.1.0',
        status: 'draft',
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

  // ── Lookups ───────────────────────────────────────────────────────

  const getWorkspace = useCallback(
    (id: string) => workspaces.find((w) => w.id === id),
    [workspaces],
  );

  const isOwnedByCurrent = useCallback(
    (chip: SmartChip) => {
      if (!current) return false;
      return chip.scope.workspaceId === current.id;
    },
    [current],
  );

  const getChipAccess = useCallback(
    (chip: SmartChip): ChipAccess => {
      const owner = workspaces.find((w) => w.id === chip.scope.workspaceId) ?? null;

      if (!current) {
        return { visible: false, reason: null, ownerWorkspace: owner };
      }

      // Owned by current workspace
      if (chip.scope.workspaceId === current.id) {
        return { visible: true, reason: 'owned', ownerWorkspace: owner };
      }

      // Published — visible to everyone
      if (chip.scope.visibility === 'published') {
        return { visible: true, reason: 'published', ownerWorkspace: owner };
      }

      // Org-catalog — visible org-wide
      if (chip.scope.visibility === 'org-catalog') {
        return { visible: true, reason: 'org-catalog', ownerWorkspace: owner };
      }

      // Explicitly shared to current workspace via chip.sharedWith
      if (
        chip.scope.visibility === 'shared' &&
        chip.scope.sharedWith?.workspaceIds?.includes(current.id)
      ) {
        return { visible: true, reason: 'shared', ownerWorkspace: owner };
      }

      // Owning workspace granted a role to current workspace (workspace-level grant)
      if (owner?.sharingGrants.some((g) => g.workspaceId === current.id)) {
        // Workspace grants only expose org-catalog / shared chips, not private ones.
        if (chip.scope.visibility !== 'private') {
          return { visible: true, reason: 'granted', ownerWorkspace: owner };
        }
      }

      return { visible: false, reason: null, ownerWorkspace: owner };
    },
    [current, workspaces],
  );

  const getVisibleChips = useCallback(
    (chips: SmartChip[]) => chips.filter((c) => getChipAccess(c).visible),
    [getChipAccess],
  );

  return (
    <WorkspaceCtx.Provider
      value={{
        workspaces,
        accessibleWorkspaces,
        current,
        loading,
        switchWorkspace,
        createWorkspace,
        getWorkspace,
        isOwnedByCurrent,
        getChipAccess,
        getVisibleChips,
      }}
    >
      {children}
    </WorkspaceCtx.Provider>
  );
}
