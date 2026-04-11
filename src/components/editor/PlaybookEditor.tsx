/**
 * PlaybookEditor — Screen 1: The hero mockup.
 *
 * Lean orchestrator that wires together the extracted sub-components:
 * - DocumentTab: rich markdown editing with inline smart chips
 * - FlowGraph: interactive compiled DAG (read-only)
 * - InspectorPanel: chip details + context strategy + code export
 * - ProblemSpaceVisualizer: radial action-space diagram
 * - CommandPalette: Cmd+K quick actions
 * - EditorStatusBar: bottom bar with stats and hints
 * - StructuredEditor: block-based editing view
 *
 * Three tabs: Document | Structured | Flow | Notebook
 * Bidirectional: click chip → highlight node, click node → scroll to source.
 * Inspector sidebar with Details + Space tabs.
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { REGISTRY, findChip } from '../../data/registry';
import { parsePlaybook, compilePlaybookToGraph } from '../../parser';
import type { ChipType, SmartChip } from '../../parser/types';
import { usePlaybook, useNotifications, useRegistry } from '../../contexts/AppContext';
import { PublishModal } from '../versioning/PublishModal';
import { CreateAssetWizard } from '../shared/CreateAssetWizard';
import { StructuredEditor } from './structured/StructuredEditor';
import { EditableDocumentTab } from './DocumentTab';
import { FlowGraph, STYLE_TAG } from './FlowGraph';
import { InspectorDetails } from './InspectorPanel';
import { ProblemSpaceVisualizer } from './ProblemSpaceVisualizer';
import { CommandPalette } from './CommandPalette';
import { StatusBar, TabIcon } from './EditorStatusBar';
import { findNodeForChip } from '../chips/InlineChip';

// ─── Responsive hook ────────────────────────────────────────────────────
function useBreakpoint() {
  const [bp, setBp] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  useEffect(() => {
    const check = () => {
      const w = window.innerWidth;
      setBp(w < 768 ? 'mobile' : w < 1024 ? 'tablet' : 'desktop');
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return bp;
}

// ─── Types ──────────────────────────────────────────────────────────────

type EditorTab = 'document' | 'structured' | 'flow' | 'notebook';
type InspectorTab = 'details' | 'space';

// ─── Main Editor Component ──────────────────────────────────────────────

export function PlaybookEditor() {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const navigate = useNavigate();
  const { content, setContent, openPublishModal, publishModalOpen, closePublishModal, publish, dirty, saving, currentVersion } = usePlaybook();
  const { addNotification } = useNotifications();
  const { createChip } = useRegistry();
  const [activeTab, setActiveTab] = useState<EditorTab>('document');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('space');
  const [inspectorOpen, setInspectorOpen] = useState(!isMobile);
  const [selectedChip, setSelectedChip] = useState<{ chip: SmartChip | null; type: ChipType; name: string } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [highlightedLines, setHighlightedLines] = useState<number[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);

  const lineRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Parse + compile reactively from content
  const parsed = useMemo(() => parsePlaybook(content, REGISTRY), [content]);
  const graph = useMemo(() => compilePlaybookToGraph(parsed), [parsed]);

  // Stats
  const chipCount = useMemo(() => {
    let count = 0;
    for (const refs of Object.values(parsed.referencesByType)) count += refs.length;
    return count;
  }, [parsed]);

  // Derive selected chip key for glowing
  const selectedChipKey = useMemo(() => {
    if (!selectedChip) return null;
    return `${selectedChip.type}:${selectedChip.name}`;
  }, [selectedChip]);

  // Scroll to line helper
  const scrollToLine = useCallback((line: number) => {
    const el = lineRefs.current.get(line);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Document chip click → highlight node in graph
  const handleChipClick = useCallback((chip: SmartChip | null, type: ChipType, name: string) => {
    setSelectedChip({ chip, type, name });
    setInspectorTab('details');
    setInspectorOpen(true);

    // Find corresponding graph node
    const node = findNodeForChip(graph.nodes, type, name);
    if (node) {
      setSelectedNodeId(node.id);
      setHighlightedLines(node.sourceLines);
    }
  }, [graph.nodes]);

  // Flow node click → select + show inspector
  const handleNodeClick = useCallback((nodeId: string) => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;
    setSelectedNodeId(nodeId);
    setHighlightedLines(node.sourceLines);

    // Find chip for inspector
    if (node.chipType && node.label) {
      const chip = findChip(node.chipType, node.label);
      setSelectedChip({ chip: chip || null, type: node.chipType, name: node.label });
      setInspectorTab('details');
      setInspectorOpen(true);
    }
  }, [graph.nodes]);

  // Flow node double-click → go to source in document
  const handleGoToSource = useCallback((nodeId: string) => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node || !node.sourceLines.length) return;
    setHighlightedLines(node.sourceLines);
    setActiveTab('document');
    setTimeout(() => scrollToLine(node.sourceLines[0]), 100);
  }, [graph.nodes, scrollToLine]);

  // Inspector "go to source" button
  const handleInspectorGoToSource = useCallback(() => {
    if (!selectedNodeId) return;
    handleGoToSource(selectedNodeId);
  }, [selectedNodeId, handleGoToSource]);

  // Get source line for inspector
  const inspectorSourceLine = useMemo(() => {
    if (!selectedNodeId) return undefined;
    const node = graph.nodes.find(n => n.id === selectedNodeId);
    return node?.sourceLines[0];
  }, [selectedNodeId, graph.nodes]);

  // Keyboard shortcut for command palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Tab descriptions for the subtle hint
  const tabHints: Record<EditorTab, string> = {
    document: 'Write your agent as a document',
    structured: 'Build with blocks — / to insert',
    flow: 'See the compiled topology',
    notebook: 'Test and prototype',
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-surface-0)]">
      <style>{STYLE_TAG}</style>
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onAction={(action) => {
          if (action === 'tab:document') setActiveTab('document');
          else if (action === 'tab:structured') setActiveTab('structured');
          else if (action === 'tab:flow') setActiveTab('flow');
          else if (action === 'tab:notebook') setActiveTab('notebook');
          else if (action === 'publish') openPublishModal();
          else if (action === 'share') navigate('/permissions');
          else if (action === 'history') navigate('/history');
          else if (action === 'test') addNotification({ type: 'info', title: 'Test mode', message: 'Switch to Notebook tab to run tests' });
          else if (action.startsWith('insert:')) addNotification({ type: 'info', title: 'Use @ in the editor to insert references' });
        }}
      />

      {/* ── Top Bar — Google Docs-inspired chrome ── */}
      <header className="shrink-0 z-40 bg-white" style={{ borderBottom: '1px solid var(--color-border)' }}>
        {/* Primary toolbar */}
        <div className="px-3 py-2 sm:px-5 sm:py-2.5 flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Document identity */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <h1
              className="text-[14px] sm:text-[15px] font-semibold truncate cursor-text"
              style={{ fontFamily: 'var(--font-ui)', letterSpacing: '-0.01em', color: 'var(--color-text-primary)' }}
            >
              Claims Processing Agent
            </h1>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#DCFCE7] text-[#166534]">
                v{currentVersion}
              </span>
              {!isMobile && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                  Published
                </span>
              )}
              {dirty && !saving && <span className="text-[10px] text-amber-500">Unsaved changes</span>}
              {saving && <span className="text-[10px] text-gray-400">Saving...</span>}
            </div>
          </div>

          {/* Command palette trigger — hidden on mobile */}
          {!isMobile && (
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs hover:border-gray-300 transition-colors"
              style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-tertiary)' }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span>Search</span>
              <kbd className="text-[10px] px-1 py-0.5 rounded font-mono ml-2" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-tertiary)' }}>
                {navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl+'}K
              </kbd>
            </button>
          )}

          {/* Actions — condensed on mobile */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {!isMobile && (
              <>
                <Link
                  to="/history"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg hover:bg-[var(--color-surface-1)] transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                  History
                </Link>
                <Link
                  to="/permissions"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] rounded-lg hover:bg-[var(--color-surface-1)] transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M5 7V5.5a3 3 0 016 0V7" stroke="currentColor" strokeWidth="1.2"/>
                    <rect x="3.5" y="7" width="9" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                  Share
                </Link>
              </>
            )}
            <button
              onClick={() => openPublishModal()}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 text-[12px] font-medium text-white rounded-lg transition-colors"
              style={{ background: 'var(--color-accent)' }}
            >
              Publish
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 4L5 6.5 7.5 4" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tab bar — the three lenses */}
        <div className="px-3 sm:px-5 flex items-center gap-0 overflow-x-auto" style={{ marginTop: -1 }}>
          {(['document', 'structured', 'flow', 'notebook'] as EditorTab[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2.5 transition-colors group shrink-0"
              >
                <TabIcon tab={tab} active={isActive} />
                <span className={`text-[12px] font-medium ${isActive ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-secondary)]'}`}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </span>
                {isActive && (
                  <div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: 'var(--color-accent)' }} />
                )}
              </button>
            );
          })}

          {/* Tab hint — hidden on mobile */}
          {!isMobile && (
            <div className="flex-1 flex justify-center">
              <span className="text-[11px] italic" style={{ color: 'var(--color-border-strong)' }}>
                {tabHints[activeTab]}
              </span>
            </div>
          )}

          <div className="flex-1" />

          {/* Inspector toggle */}
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-2 text-[12px] transition-colors shrink-0"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M10.5 2v12" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
            {!isMobile && 'Inspector'}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          {activeTab === 'document' && (
            <div key="tab-document" className="tab-content-enter">
            <EditableDocumentTab
              content={content}
              onContentChange={setContent}
              onChipClick={handleChipClick}
              highlightedLines={highlightedLines}
              selectedChipKey={selectedChipKey}
              lineRefs={lineRefs}
              onCreateNew={() => setCreateWizardOpen(true)}
            />
            </div>
          )}
          {activeTab === 'structured' && (
            <div key="tab-structured" className="tab-content-enter h-full">
              <StructuredEditor content={content} onContentChange={setContent} />
            </div>
          )}
          {activeTab === 'flow' && (
            <div key="tab-flow" className="tab-content-enter h-full">
            <FlowGraph
              content={content}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              onNodeClick={handleNodeClick}
              onNodeHover={setHoveredNodeId}
              onNodeLeave={() => setHoveredNodeId(null)}
              onGoToSource={handleGoToSource}
            />
            </div>
          )}
          {activeTab === 'notebook' && (
            <div key="tab-notebook" className="tab-content-enter h-full flex flex-col items-center justify-center text-center px-8">
              <div className="w-12 h-12 rounded-xl bg-[#F3F4F6] flex items-center justify-center mb-4">
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="2" width="10" height="4" rx="1" stroke="#9CA3AF" strokeWidth="1.2"/>
                  <rect x="3" y="8" width="10" height="3" rx="1" stroke="#9CA3AF" strokeWidth="1.2"/>
                  <rect x="3" y="13" width="6" height="1.5" rx="0.75" fill="#D1D5DB"/>
                </svg>
              </div>
              <div className="text-[13px] text-[#6B7280] mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
                Notebook is the development surface
              </div>
              <div className="text-[12px] text-[#9CA3AF] mb-4 max-w-sm">
                Prototype with code cells, test the agent loop, define tool schemas — all from the same playbook.
              </div>
              <Link
                to="/notebook"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-medium text-white transition-colors"
                style={{ background: '#2563EB', fontFamily: 'var(--font-ui)' }}
              >
                Open Notebook
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 2.5L8 6 4.5 9.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* ── Inspector Sidebar — overlay on mobile, panel on desktop ── */}
        {inspectorOpen && (
          <>
            {/* Mobile overlay backdrop */}
            {isMobile && (
              <div
                className="fixed inset-0 bg-black/20 z-30"
                onClick={() => setInspectorOpen(false)}
              />
            )}
            <div
              className={`${
                isMobile
                  ? 'fixed right-0 top-0 bottom-0 z-40 w-[min(300px,85vw)]'
                  : 'shrink-0 w-[280px] lg:w-[300px]'
              } overflow-auto bg-white`}
              style={{
                borderLeft: '1px solid var(--color-border)',
                boxShadow: isMobile ? 'var(--shadow-xl)' : 'none',
                animation: isMobile ? 'slideInRight 200ms ease-out' : 'fadeIn 150ms ease-out',
              }}
            >
            {/* Inspector tab bar */}
            <div className="flex" style={{ borderBottom: '1px solid #F3F4F6' }}>
              {([
                { id: 'details' as InspectorTab, label: 'Details' },
                { id: 'space' as InspectorTab, label: 'Problem Space' },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setInspectorTab(id)}
                  className={`flex-1 px-3 py-2.5 text-[11px] font-medium transition-colors relative ${
                    inspectorTab === id
                      ? 'text-[#2563EB]'
                      : 'text-[#9CA3AF] hover:text-[#6B7280]'
                  }`}
                  style={{ fontFamily: 'var(--font-ui)' }}
                >
                  {label}
                  {inspectorTab === id && (
                    <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#2563EB]" />
                  )}
                </button>
              ))}
            </div>

            {inspectorTab === 'details' && (
              selectedChip ? (
                <InspectorDetails
                  chip={selectedChip.chip}
                  chipType={selectedChip.type}
                  chipName={selectedChip.name}
                  sourceLine={inspectorSourceLine}
                  onGoToSource={handleInspectorGoToSource}
                  onCreateChip={(type, name) => createChip({ type, name, status: 'draft' })}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center px-8">
                  <div className="w-10 h-10 rounded-lg bg-[#F9FAFB] flex items-center justify-center mb-3">
                    <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                      <path d="M8 3v10M4 8l4-4 4 4" stroke="#D1D5DB" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="text-[12px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-ui)' }}>
                    Select any <span className="font-medium text-[#6B7280]">@reference</span> in the document or node in the flow graph to inspect it
                  </div>
                </div>
              )
            )}

            {inspectorTab === 'space' && <ProblemSpaceVisualizer content={content} />}
          </div>
          </>
        )}
      </div>

      {/* ── Status Bar ── */}
      <StatusBar
        chipCount={chipCount}
        nodeCount={graph.nodes.length}
        edgeCount={graph.edges.length}
        activeTab={activeTab}
      />

      <PublishModal
        open={publishModalOpen}
        onClose={closePublishModal}
        onPublish={(config) => {
          publish(
            config.bump,
            config.description,
            config.reviewers.map(r => r.email),
            config.target === 'draft' ? 'draft' : config.target === 'staging' ? 'staging' : 'production',
          );
        }}
      />

      <CreateAssetWizard
        isOpen={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
        onCreate={(partial) => {
          createChip(partial);
          addNotification({
            type: 'success',
            title: `Created @${partial.type}(${partial.name})`,
            message: 'New asset added to registry as draft. Reference it with @ in your playbook.',
          });
        }}
      />
    </div>
  );
}
