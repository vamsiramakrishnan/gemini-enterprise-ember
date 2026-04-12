/**
 * RegistryContext — Smart chip registry with search, CRUD, and selection.
 *
 * Every @-referenceable asset (doc, tool, agent, guard, skill, connector,
 * trigger, schema, data) lives here. The registry is the single source
 * of truth for what chips are available to playbooks.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

import type { SmartChip, ChipType, ChipStatus } from '../parser/types';
import { REGISTRY } from '../data/registry';
import { NotificationContext } from './NotificationContext';
import { MOCK_USER } from './AuthContext';
import { useWorkspace } from './WorkspaceContext';
import { WORKSPACE_IDS } from '../data/workspaces';

// ─── Types ───────────────────────────────────────────────────────────

export interface RegistryContextValue {
  /** All chips the current workspace can see (owned + shared + org-catalog). */
  chips: SmartChip[];
  /** The raw org-wide pool, unfiltered by workspace. Use sparingly. */
  allChips: SmartChip[];
  /** `chips` further filtered by searchQuery. */
  filteredChips: SmartChip[];
  loading: boolean;
  searchQuery: string;
  selectedChip: SmartChip | null;
  createModalOpen: boolean;
  setSearchQuery: (q: string) => void;
  selectChip: (id: string) => void;
  clearSelection: () => void;
  createChip: (partial: Partial<SmartChip> & { type: ChipType; name: string }) => void;
  updateChip: (id: string, updates: Partial<SmartChip>) => void;
  deleteChip: (id: string) => void;
  openCreateModal: () => void;
  closeCreateModal: () => void;
}

// ─── Context ─────────────────────────────────────────────────────────

const RegistryCtx = createContext<RegistryContextValue | null>(null);

export function useRegistry(): RegistryContextValue {
  const ctx = useContext(RegistryCtx);
  if (!ctx) throw new Error('useRegistry must be used within <AppProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────

export function RegistryProvider({ children }: { children: ReactNode }) {
  const [allChips, setAllChips] = useState<SmartChip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChip, setSelectedChip] = useState<SmartChip | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const notifCtx = useContext(NotificationContext);
  const { getVisibleChips, current: currentWorkspace } = useWorkspace();

  useEffect(() => {
    const timer = setTimeout(() => {
      setAllChips([...REGISTRY]);
      setLoading(false);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Workspace-scoped view: everything the current workspace can see.
  const chips = React.useMemo(() => getVisibleChips(allChips), [allChips, getVisibleChips]);

  const filteredChips = React.useMemo(() => {
    if (!searchQuery.trim()) return chips;
    const q = searchQuery.toLowerCase();
    return chips.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q),
    );
  }, [chips, searchQuery]);

  const selectChip = useCallback(
    (id: string) => setSelectedChip(allChips.find((c) => c.id === id) ?? null),
    [allChips],
  );

  const clearSelection = useCallback(() => setSelectedChip(null), []);

  const createChip = useCallback(
    (partial: Partial<SmartChip> & { type: ChipType; name: string }) => {
      const id = `${partial.type}-${partial.name}-${Date.now()}`;
      const ownerWorkspace = currentWorkspace?.id ?? WORKSPACE_IDS.CLAIMS;
      const newChip: SmartChip = {
        id,
        registryId: `registry/${partial.type}/${partial.name}`,
        version: '0.1.0',
        status: 'draft' as ChipStatus,
        owner: MOCK_USER.email,
        description: partial.description ?? '',
        permissions: { currentUser: 'admin' },
        scope: partial.scope ?? {
          workspaceId: ownerWorkspace,
          visibility: currentWorkspace?.defaultVisibility ?? 'private',
        },
        metadata: partial.metadata ?? {},
        lastUpdated: new Date().toISOString(),
        usageCount: 0,
        ...partial,
      };
      setAllChips((prev) => [...prev, newChip]);
      setCreateModalOpen(false);
      notifCtx?.addNotification({
        type: 'success',
        title: `Created @${newChip.type}(${newChip.name})`,
        message: `New asset added to ${currentWorkspace?.name ?? 'registry'} as draft.`,
      });
    },
    [notifCtx, currentWorkspace],
  );

  const updateChip = useCallback((id: string, updates: Partial<SmartChip>) => {
    setAllChips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates, lastUpdated: new Date().toISOString() } : c)),
    );
  }, []);

  const deleteChip = useCallback(
    (id: string) => {
      setAllChips((prev) => prev.filter((c) => c.id !== id));
      if (selectedChip?.id === id) setSelectedChip(null);
      notifCtx?.addNotification({ type: 'info', title: 'Asset removed from registry' });
    },
    [selectedChip, notifCtx],
  );

  const openCreateModal = useCallback(() => setCreateModalOpen(true), []);
  const closeCreateModal = useCallback(() => setCreateModalOpen(false), []);

  return (
    <RegistryCtx.Provider
      value={{
        chips, allChips, filteredChips, loading, searchQuery, selectedChip, createModalOpen,
        setSearchQuery, selectChip, clearSelection, createChip, updateChip, deleteChip,
        openCreateModal, closeCreateModal,
      }}
    >
      {children}
    </RegistryCtx.Provider>
  );
}
