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

import type { Workspace, WorkspaceVisibility } from '../data/workspaces';
import { WORKSPACES, WORKSPACE_IDS } from '../data/workspaces';
import type { SmartChip } from '../parser/types';
import { NotificationContext } from './NotificationContext';
import { MOCK_USER } from './AuthContext';
import {
  scopeForChip,
  wildcardScope,
  anyScopeMatches,
  DEFAULT_ROLE_SCOPES,
  type AgentPrincipal,
  type EffectiveAccess,
  type UserBinding,
  type Scope,
} from '../data/governance';

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

/** Input for createWorkspace — everything the modal collects. */
export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  defaultVisibility?: WorkspaceVisibility;
  agentName?: string;
  subscribeToPlatform?: boolean;
  region?: string;
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
  createWorkspace: (input: CreateWorkspaceInput) => Workspace;

  /** Look up a workspace by id. */
  getWorkspace: (id: string) => Workspace | undefined;
  /** Is the chip owned by the current workspace? */
  isOwnedByCurrent: (chip: SmartChip) => boolean;
  /** Why (if at all) can the current workspace see this chip? */
  getChipAccess: (chip: SmartChip) => ChipAccess;
  /** Filter a chip list to only those visible from the current workspace. */
  getVisibleChips: (chips: SmartChip[]) => SmartChip[];

  // ── AIPlex-aligned access resolution ─────────────────────────────

  /** Agent principals hosted in the current workspace. */
  currentPrincipals: AgentPrincipal[];
  /** Active user bindings for the current workspace. */
  currentBindings: UserBinding[];
  /**
   * The runtime answer: can this (user, agent) pair invoke the chip?
   * If `agentClientId` is omitted, only the user ceiling is evaluated.
   * This mirrors the rego policy at `policies/aiplex_authz.rego`.
   */
  resolveAccess: (
    chip: SmartChip,
    opts?: { userEmail?: string; agentClientId?: string },
  ) => EffectiveAccess;
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
    (input: CreateWorkspaceInput) => {
      const name = input.name.trim();
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const me = { name: MOCK_USER.name, email: MOCK_USER.email, avatar: MOCK_USER.avatar };
      const now = new Date().toISOString();
      const wsId = `ws-${Date.now()}`;
      // Seed a primary AgentPrincipal so the workspace has a runtime
      // identity from day one. Editors see this as the default "Acting
      // agent" dropdown in the playbook editor.
      const primaryPrincipal: AgentPrincipal = {
        clientId: `svc-${slug}-primary`,
        displayName: `${name} Responder`,
        description: `Primary agent principal for the ${name} workspace.`,
        authMethod: 'authorization_code',
        allowedScopes: [
          'llm:models:gemini-2.5-flash',
          'mcp:guards:pii-redaction',
        ],
        status: 'active',
        registeredAt: now,
        registeredBy: MOCK_USER.email,
        labels: { tier: 'primary', env: 'dev' },
      };
      // Seed an owner UserBinding — the creator always owns what they
      // make. This unlocks the full scope bundle via DEFAULT_ROLE_SCOPES.
      const ownerBinding: UserBinding = {
        id: `ub-${wsId}-owner`,
        principal: MOCK_USER.email,
        principalKind: 'user',
        role: 'owner',
        grantedAt: now,
        grantedBy: MOCK_USER.email,
      };
      const ws: Workspace = {
        id: wsId,
        slug,
        name,
        description: input.description?.trim() || `${name} workspace`,
        icon: input.icon || '📄',
        color: input.color || '#2563EB',
        owner: { ...me, role: 'owner' },
        members: [{ ...me, role: 'owner' }],
        defaultVisibility: input.defaultVisibility ?? 'private',
        sharingGrants: [],
        subscribedTo: input.subscribeToPlatform === false ? [] : [WORKSPACE_IDS.PLATFORM],
        agentName: input.agentName?.trim() || `${name} Agent`,
        agentVersion: '0.1.0',
        agentPrincipals: [primaryPrincipal],
        userBindings: [ownerBinding],
        resourceGrants: [],
        status: 'draft',
        lastUpdated: now,
        createdAt: now,
        region: input.region,
      };
      setWorkspaces((prev) => [ws, ...prev]);
      setCurrent(ws);
      notifCtx?.addNotification({
        type: 'success',
        title: `Created workspace "${name}"`,
        message: 'You are now working inside the new workspace.',
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

  // ── AIPlex-aligned access resolution ───────────────────────────────

  const currentPrincipals = useMemo(
    () => current?.agentPrincipals ?? [],
    [current],
  );
  const currentBindings = useMemo(
    () => current?.userBindings ?? [],
    [current],
  );

  /**
   * The two-level intersection:
   *
   *   userScopes   = DEFAULT_ROLE_SCOPES[binding.role] ∪ binding.extraScopes
   *                  ∪ { per-object grants for this user }
   *   agentScopes  = principal.allowedScopes
   *                  ∪ { per-object grants for this principal }
   *   required     = scopeForChip(chip.type, chip.name)
   *   effective    = (visible)                            // chip visibility layer
   *                ∧ userCanInvoke = required ∈ userScopes
   *                ∧ agentCanInvoke = required ∈ agentScopes (if agent picked)
   *
   * This is what the gateway's rego policy computes at runtime; we
   * replicate it client-side so the UI can tell the user *why* a chip
   * is/isn't callable before the round-trip.
   */
  const resolveAccess = useCallback(
    (
      chip: SmartChip,
      opts?: { userEmail?: string; agentClientId?: string },
    ): EffectiveAccess => {
      const userEmail = opts?.userEmail ?? MOCK_USER.email;
      const requiredScope = scopeForChip(chip.type, chip.name);

      // ── Visibility: reuse the existing chip-visibility resolver.
      const access = getChipAccess(chip);
      if (!access.visible) {
        return {
          visible: false,
          userCanInvoke: false,
          agentCanInvoke: false,
          reason:
            'Chip is not visible from the current workspace. Ask the owner to share it, move it to the org catalog, or grant your workspace access.',
          requiredScope,
        };
      }

      // ── Dimension B: user ceiling (role defaults + extras + per-object grants)
      const workspace = current;
      const binding = workspace?.userBindings.find(
        (b) => b.principalKind === 'user' && b.principal === userEmail,
      );
      const roleScopes: Scope[] = binding
        ? DEFAULT_ROLE_SCOPES[binding.role]
        : [];
      const extra: Scope[] = binding?.extraScopes ?? [];
      const userGrantBoost: Scope[] = (workspace?.resourceGrants ?? [])
        .filter(
          (g) =>
            g.chipId === chip.id &&
            g.grantee.kind === 'user' &&
            g.grantee.id === userEmail &&
            (g.access === 'invoker' ||
              g.access === 'editor' ||
              g.access === 'admin'),
        )
        .map(() => requiredScope);
      const userScopes = [...roleScopes, ...extra, ...userGrantBoost];
      const userCanInvoke = anyScopeMatches(userScopes, requiredScope);

      // ── Dimension A: agent ceiling (principal scopes + per-object grants)
      let agentCanInvoke = false;
      let agentReason = '';
      if (opts?.agentClientId) {
        const principal = workspace?.agentPrincipals.find(
          (p) => p.clientId === opts.agentClientId,
        );
        if (!principal) {
          agentReason = `Agent principal "${opts.agentClientId}" is not registered in this workspace.`;
        } else if (principal.status !== 'active') {
          agentReason = `Agent principal "${principal.displayName}" is ${principal.status}.`;
        } else {
          const grantBoost: Scope[] = (workspace?.resourceGrants ?? [])
            .filter(
              (g) =>
                g.chipId === chip.id &&
                g.grantee.kind === 'agent-principal' &&
                g.grantee.id === principal.clientId,
            )
            .map(() => requiredScope);
          const agentScopes = [...principal.allowedScopes, ...grantBoost];
          agentCanInvoke = anyScopeMatches(agentScopes, requiredScope);
          if (!agentCanInvoke) {
            agentReason = `${principal.displayName} is missing scope ${requiredScope}. Expand the agent ceiling in Workspace → Principals, or add a per-object grant.`;
          }
        }
      }

      // ── Synthesize the reason ───────────────────────────────────
      let reason: string;
      if (!userCanInvoke) {
        reason = binding
          ? `Your role "${binding.role}" does not include ${requiredScope}. Ask a workspace admin for an upgrade or an explicit grant.`
          : `You have no binding in this workspace — no scopes granted.`;
      } else if (opts?.agentClientId && !agentCanInvoke) {
        reason = agentReason;
      } else if (opts?.agentClientId) {
        reason = `User × agent intersection includes ${requiredScope}. ✓ callable.`;
      } else {
        reason = `Your user scopes include ${requiredScope}. ✓ directly invokable.`;
      }

      return {
        visible: true,
        userCanInvoke,
        agentCanInvoke,
        reason,
        requiredScope,
      };
    },
    [current, getChipAccess],
  );

  // Touch wildcardScope to keep the import tree-shakable yet present
  // as a dev-tool. (Exported via the governance module for UI badges.)
  void wildcardScope;

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
        currentPrincipals,
        currentBindings,
        resolveAccess,
      }}
    >
      {children}
    </WorkspaceCtx.Provider>
  );
}
