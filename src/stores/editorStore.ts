/**
 * editorStore — Zustand store for PlaybookEditor state.
 *
 * Centralizes all editor-specific state that was previously threaded
 * through 15+ props between PlaybookEditor, DocumentTab, FlowGraph,
 * and InspectorPanel.
 *
 * Components use selector hooks to subscribe to only the state they
 * need, preventing unnecessary re-renders:
 *
 *   const activeTab = useEditorStore(s => s.activeTab);
 *   const { selectChip, setActiveTab } = useEditorStore(s => s.actions);
 *
 * This replaces the prop-drilling pattern:
 *   <DocumentTab selectedChipKey={...} highlightedLines={...} ... />
 *   → DocumentTab internally reads from the store
 */

import { create } from 'zustand';
import type { ChipType, SmartChip } from '../parser/types';

// ─── Types ───────────────────────────────────────────────────────────

export type EditorTab = 'document' | 'structured' | 'flow' | 'notebook';
export type InspectorTab = 'details' | 'space';

interface SelectedChip {
  chip: SmartChip | null;
  type: ChipType;
  name: string;
}

interface EditorState {
  // Tab navigation
  activeTab: EditorTab;
  inspectorTab: InspectorTab;
  inspectorOpen: boolean;

  // Selection state (shared between Document ↔ Flow ↔ Inspector)
  selectedChip: SelectedChip | null;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  highlightedLines: number[];

  // UI state
  commandPaletteOpen: boolean;
  createWizardOpen: boolean;

  // Actions
  actions: {
    setActiveTab: (tab: EditorTab) => void;
    setInspectorTab: (tab: InspectorTab) => void;
    toggleInspector: () => void;
    openInspector: () => void;

    selectChip: (chip: SelectedChip) => void;
    clearChipSelection: () => void;
    selectNode: (nodeId: string, sourceLines: number[]) => void;
    hoverNode: (nodeId: string | null) => void;
    setHighlightedLines: (lines: number[]) => void;

    setCommandPaletteOpen: (open: boolean) => void;
    setCreateWizardOpen: (open: boolean) => void;
  };
}

// ─── Store ───────────────────────────────────────────────────────────

export const useEditorStore = create<EditorState>()((set) => ({
  // Initial state
  activeTab: 'document',
  inspectorTab: 'space',
  inspectorOpen: true,

  selectedChip: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  highlightedLines: [],

  commandPaletteOpen: false,
  createWizardOpen: false,

  // Actions — grouped to allow `const { selectChip } = useEditorStore(s => s.actions)`
  actions: {
    setActiveTab: (tab) => set({ activeTab: tab }),
    setInspectorTab: (tab) => set({ inspectorTab: tab }),
    toggleInspector: () => set((s) => ({ inspectorOpen: !s.inspectorOpen })),
    openInspector: () => set({ inspectorOpen: true }),

    selectChip: (chip) =>
      set({
        selectedChip: chip,
        inspectorTab: 'details',
        inspectorOpen: true,
      }),

    clearChipSelection: () =>
      set({
        selectedChip: null,
        selectedNodeId: null,
        highlightedLines: [],
      }),

    selectNode: (nodeId, sourceLines) =>
      set({
        selectedNodeId: nodeId,
        highlightedLines: sourceLines,
      }),

    hoverNode: (nodeId) => set({ hoveredNodeId: nodeId }),
    setHighlightedLines: (lines) => set({ highlightedLines: lines }),

    setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
    setCreateWizardOpen: (open) => set({ createWizardOpen: open }),
  },
}));

// ─── Selector hooks (memoized slices for performance) ────────────────

/** Derived: the string key for chip glow highlighting */
export const useSelectedChipKey = () =>
  useEditorStore((s) =>
    s.selectedChip ? `${s.selectedChip.type}:${s.selectedChip.name}` : null,
  );

/** Derived: is the editor on a mobile breakpoint? */
export const useEditorActions = () => useEditorStore((s) => s.actions);
