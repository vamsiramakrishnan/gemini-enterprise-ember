/**
 * ParserDemo — Interactive demonstration of the playbook parser + graph compiler.
 *
 * Shows the full pipeline:
 *   1. Raw playbook markdown (editable)
 *   2. Parsed references with live extraction
 *   3. Compiled graph (node/edge summary + Mermaid export)
 *   4. Smart chip rendering with colors
 *
 * This demonstrates the core thesis: "the playbook compiles into a graph,
 * but the graph is derived, never authored."
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { parsePlaybook, compilePlaybookToGraph, graphToMermaid, summarizePlaybook } from '../../parser';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, ParsedReference, CompiledGraphNode } from '../../parser/types';
import { CLAIMS_PLAYBOOK_CONTENT } from '../../data/playbook';
import { REGISTRY } from '../../data/registry';

// ─── Smart Chip Component ──────────────────────────────────────────────

function SmartChip({ type, name, resolved }: { type: ChipType; name: string; resolved: boolean }) {
  const colors = CHIP_COLORS[type];
  const icon = CHIP_ICONS[type];

  if (!resolved) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border-2 border-dashed"
        style={{ borderColor: '#DC2626', color: '#DC2626', background: '#FEF2F2' }}
        title={`Unresolved: @${type}(${name})`}
      >
        {icon} @{type}({name})
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity"
      style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
      title={`@${type}(${name}) — click to inspect`}
    >
      <span style={{ color: colors.accent }}>{icon}</span> {name}
    </span>
  );
}

// ─── Graph Node Badge ──────────────────────────────────────────────────

function GraphNodeBadge({ node }: { node: CompiledGraphNode }) {
  const chipColors = node.chipType ? CHIP_COLORS[node.chipType] : null;
  const bg = chipColors?.accent || '#6B7280';

  const typeLabel: Record<string, string> = {
    'trigger-entry': '▸ TRIGGER',
    'agent': '◎ AGENT',
    'tool-call': '⬡ TOOL',
    'connector-call': '◈ CONNECTOR',
    'decision': '◆ DECISION',
    'gate': '△ GATE',
    'grounding': '◇ DOC',
    'output': '▢ OUTPUT',
    'transform': '▣ TRANSFORM',
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs">
      <span
        className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white"
        style={{ background: bg }}
      >
        {typeLabel[node.type] || node.type}
      </span>
      <span className="font-medium text-gray-700">{node.label}</span>
      {node.sourceLines.length > 0 && (
        <span className="text-gray-400">L{node.sourceLines[0]}</span>
      )}
    </div>
  );
}

// ─── Reference Table ───────────────────────────────────────────────────

function ReferenceTable({ refs }: { refs: ParsedReference[] }) {
  // Group by type
  const grouped = useMemo(() => {
    const map = new Map<ChipType, ParsedReference[]>();
    for (const ref of refs) {
      if (!map.has(ref.type)) map.set(ref.type, []);
      map.get(ref.type)!.push(ref);
    }
    return map;
  }, [refs]);

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([type, typeRefs]) => {
        const uniqueNames = [...new Set(typeRefs.map(r => r.name))];
        return (
          <div key={type}>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
                style={{ background: CHIP_COLORS[type].bg }}
              >
                @{type}
              </span>
              <span className="text-xs text-gray-400">{uniqueNames.length} unique</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {uniqueNames.map(name => {
                const ref = typeRefs.find(r => r.name === name);
                return (
                  <SmartChip key={`${type}:${name}`} type={type} name={name} resolved={ref?.resolved ?? false} />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Demo Component ───────────────────────────────────────────────

export function ParserDemo() {
  const [content, setContent] = useState(CLAIMS_PLAYBOOK_CONTENT);
  const [activeTab, setActiveTab] = useState<'parsed' | 'graph' | 'mermaid'>('parsed');

  // Live parse + compile on every edit
  const parsed = useMemo(() => parsePlaybook(content, REGISTRY), [content]);
  const graph = useMemo(() => compilePlaybookToGraph(parsed), [parsed]);
  const mermaid = useMemo(() => graphToMermaid(graph), [graph]);
  const summary = useMemo(() => summarizePlaybook(parsed), [parsed]);

  return (
    <div className="min-h-screen bg-[var(--color-surface-0)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Back</Link>
          <div className="w-px h-5 bg-gray-200" />
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Parser Demo</h1>
            <p className="text-[10px] text-gray-500">
              Live playbook parsing → reference extraction → graph compilation
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-gray-500">
            <span className="px-2 py-1 rounded bg-gray-100">{parsed.stats.totalReferences} refs</span>
            <span className="px-2 py-1 rounded bg-gray-100">{graph.nodes.length} nodes</span>
            <span className="px-2 py-1 rounded bg-gray-100">{graph.edges.length} edges</span>
            <span className="px-2 py-1 rounded bg-gray-100">{parsed.conditionals.length} conditionals</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-6 min-h-[calc(100vh-120px)]">
          {/* Left: Editable Playbook */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Playbook Source</h2>
              <span className="text-[10px] text-gray-400">Edit to see live parsing</span>
            </div>
            <div className="flex-1 relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full min-h-[600px] p-4 rounded-xl border border-[var(--color-border)] bg-white text-sm leading-relaxed resize-none focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}
                spellCheck={false}
              />
            </div>
          </div>

          {/* Right: Parser Output */}
          <div className="flex flex-col">
            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-3">
              {(['parsed', 'graph', 'mermaid'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab === 'parsed' ? 'Parsed References' : tab === 'graph' ? 'Compiled Graph' : 'Mermaid Export'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-[var(--color-border)] bg-white p-4">
              {activeTab === 'parsed' && (
                <div className="space-y-6">
                  {/* Summary */}
                  <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap" style={{ fontFamily: 'var(--font-mono)' }}>
                      {summary}
                    </pre>
                  </div>

                  {/* Reference chips by type */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Extracted @References
                    </h3>
                    <ReferenceTable refs={parsed.allReferences} />
                  </div>

                  {/* Conditionals */}
                  {parsed.conditionals.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Conditional Logic (→ Decision Diamonds)
                      </h3>
                      <div className="space-y-2">
                        {parsed.conditionals.map((c, i) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs">
                            <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 font-bold text-[10px] mt-0.5">
                              {c.type.toUpperCase()}
                            </span>
                            <div>
                              <span className="text-gray-700">"{c.condition}"</span>
                              {c.thenRef && (
                                <span className="ml-2">
                                  →{' '}
                                  <SmartChip type={c.thenRef.type} name={c.thenRef.name} resolved={true} />
                                </span>
                              )}
                              <span className="ml-2 text-gray-400">line {c.line}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sections */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Section Structure
                    </h3>
                    <div className="space-y-1">
                      {parsed.sections.map((section, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs" style={{ paddingLeft: `${(section.level - 1) * 16}px` }}>
                          <span className="text-gray-300">{'#'.repeat(section.level)}</span>
                          <span className="font-medium text-gray-700">{section.title}</span>
                          {section.semanticRole && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-medium">
                              {section.semanticRole}
                            </span>
                          )}
                          <span className="text-gray-400">{section.references.length} refs</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'graph' && (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Nodes', value: graph.nodes.length, color: '#4F46E5' },
                      { label: 'Edges', value: graph.edges.length, color: '#059669' },
                      { label: 'Skill Regions', value: graph.skillRegions.length, color: '#7C3AED' },
                      { label: 'Entry Points', value: graph.nodes.filter(n => n.type === 'trigger-entry').length, color: '#EA580C' },
                    ].map(stat => (
                      <div key={stat.label} className="p-3 rounded-lg bg-gray-50 border border-gray-200 text-center">
                        <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Nodes by type */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Compiled Nodes (from playbook)
                    </h3>
                    <div className="space-y-1.5">
                      {graph.nodes.map(node => (
                        <GraphNodeBadge key={node.id} node={node} />
                      ))}
                    </div>
                  </div>

                  {/* Edges */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Edges ({graph.edges.length})
                    </h3>
                    <div className="space-y-1">
                      {graph.edges.map(edge => {
                        const from = graph.nodes.find(n => n.id === edge.from);
                        const to = graph.nodes.find(n => n.id === edge.to);
                        const edgeColors: Record<string, string> = {
                          'flow': 'text-gray-600',
                          'conditional-true': 'text-green-600',
                          'conditional-false': 'text-red-600',
                          'guard-pass': 'text-green-600',
                          'guard-block': 'text-red-600',
                          'data-flow': 'text-blue-600',
                        };
                        return (
                          <div key={edge.id} className={`text-xs font-mono ${edgeColors[edge.type] || 'text-gray-600'}`}>
                            {from?.label || '?'} → {to?.label || '?'}
                            {edge.label && <span className="text-gray-400 ml-2">[{edge.label}]</span>}
                            <span className="text-gray-300 ml-2">({edge.type})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Skill Regions */}
                  {graph.skillRegions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Skill Regions (Overlays)
                      </h3>
                      {graph.skillRegions.map((region, i) => (
                        <div key={i} className="p-2 rounded-lg border text-xs" style={{ borderColor: region.color + '40', background: region.color + '10' }}>
                          <span className="font-medium" style={{ color: region.color }}>✦ {region.label}</span>
                          <span className="text-gray-400 ml-2">affects {region.nodeIds.length} nodes</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'mermaid' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Mermaid Diagram (mirrors adk-fluent viz.ir_to_mermaid)
                    </h3>
                    <button
                      onClick={() => navigator.clipboard.writeText(mermaid)}
                      className="px-2 py-1 rounded bg-gray-100 text-xs text-gray-600 hover:bg-gray-200"
                    >
                      Copy
                    </button>
                  </div>
                  <pre
                    className="p-4 rounded-lg bg-gray-900 text-green-400 text-xs overflow-auto whitespace-pre"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {mermaid}
                  </pre>
                  <p className="text-[10px] text-gray-400 mt-3">
                    Paste this into mermaid.live to see the rendered graph. In the full editor,
                    this renders as the interactive Flow tab with clickable nodes.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
