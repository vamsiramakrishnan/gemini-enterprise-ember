import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { parsePlaybook } from '../../parser/playbook-parser';
import { compilePlaybookToGraph } from '../../parser/graph-compiler';
import { CLAIMS_PLAYBOOK_CONTENT } from '../../data/playbook';
import { CHIP_COLORS } from '../../parser/types';
import type { ChipType, CompiledGraph, CompiledGraphNode } from '../../parser/types';
import { REGISTRY } from '../../data/registry';

// ─── Chip Color Helpers ─────────────────────────────────────────────────
const chipTypeColor = (type: ChipType) => CHIP_COLORS[type]?.accent || '#6B7280';

const NODE_TYPE_TO_CHIP: Record<string, ChipType> = {
  'trigger-entry': 'trigger', grounding: 'doc', 'tool-call': 'tool',
  'connector-call': 'connector', 'agent-delegate': 'agent', decision: 'guard',
  gate: 'guard', output: 'schema', 'skill-activation': 'skill',
};

function nodeColor(node: CompiledGraphNode): string {
  const ct = NODE_TYPE_TO_CHIP[node.type];
  return ct ? chipTypeColor(ct) : '#6B7280';
}

// ─── Graph Layout ───────────────────────────────────────────────────────
function layoutNodes(graph: CompiledGraph) {
  const cols: Record<string, number> = {
    'trigger-entry': 0, grounding: 1, 'tool-call': 2, 'connector-call': 2,
    'agent-delegate': 2, decision: 3, gate: 3, 'skill-activation': 2, output: 4,
  };
  const groups: Record<number, CompiledGraphNode[]> = {};
  graph.nodes.forEach(n => {
    const c = cols[n.type] ?? 2;
    (groups[c] ??= []).push(n);
  });
  const positions: Record<string, { x: number; y: number }> = {};
  const colX = [60, 240, 420, 600, 780];
  Object.entries(groups).forEach(([col, nodes]) => {
    const c = Number(col);
    const startY = 40;
    nodes.forEach((n, i) => {
      positions[n.id] = { x: colX[c] || 420, y: startY + i * 90 };
    });
  });
  return positions;
}

// ─── Playbook Text with Highlighted Chips ───────────────────────────────
function RenderPlaybook({ text, highlightedChip, onChipClick }: {
  text: string; highlightedChip: string | null;
  onChipClick: (type: ChipType, name: string) => void;
}) {
  const lines = text.split('\n');

  return (
    <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, lineHeight: 1.8 }}>
      {lines.map((line, li) => {
        if (line.startsWith('# ')) return <h1 key={li} className="text-2xl font-bold text-gray-900 mt-4 mb-2" style={{ fontFamily: 'var(--font-ui)' }}>{line.slice(2)}</h1>;
        if (line.startsWith('## ')) return <h2 key={li} className="text-lg font-semibold text-gray-800 mt-6 mb-1" style={{ fontFamily: 'var(--font-ui)' }}>{line.slice(3)}</h2>;
        if (line.startsWith('### ')) return <h3 key={li} className="text-sm font-semibold text-gray-700 mt-4 mb-1" style={{ fontFamily: 'var(--font-ui)' }}>{line.slice(4)}</h3>;
        if (line.trim() === '') return <div key={li} className="h-2" />;

        const parts: React.ReactNode[] = [];
        let last = 0;
        let match: RegExpExecArray | null;
        const lineRegex = /@(\w+)\(([^)]+)\)/g;
        while ((match = lineRegex.exec(line)) !== null) {
          if (match.index > last) parts.push(<span key={`t${li}-${last}`}>{line.slice(last, match.index)}</span>);
          const type = match[1] as ChipType;
          const name = match[2];
          const key = `${type}:${name}`;
          const chipColors = CHIP_COLORS[type];
          const isHighlighted = highlightedChip === key;
          parts.push(
            <span key={`c${li}-${match.index}`}
              onClick={() => onChipClick(type, name)}
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium cursor-pointer transition-all"
              style={{
                backgroundColor: chipColors?.bg, color: chipColors?.text,
                border: `1px solid ${chipColors?.border}`,
                boxShadow: isHighlighted ? `0 0 0 3px ${chipColors?.accent}44, 0 0 12px ${chipColors?.accent}66` : 'none',
                transform: isHighlighted ? 'scale(1.1)' : 'scale(1)',
              }}>
              @{type}({name})
            </span>
          );
          last = match.index + match[0].length;
        }
        if (last < line.length) parts.push(<span key={`t${li}-end`}>{line.slice(last)}</span>);

        const isListItem = line.trim().match(/^(\d+\.|-)/) !== null;
        return (
          <div key={li} className={`text-gray-700 ${isListItem ? 'ml-4' : ''}`}>
            {parts.length > 0 ? parts : line}
          </div>
        );
      })}
    </div>
  );
}

// ─── SVG Flow Graph ─────────────────────────────────────────────────────
function FlowGraph({ graph, positions, selectedNodeId, onNodeClick, prevNodeIds }: {
  graph: CompiledGraph;
  positions: Record<string, { x: number; y: number }>;
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  prevNodeIds: Set<string>;
}) {
  const W = 900, H = Math.max(500, Object.values(positions).reduce((m, p) => Math.max(m, p.y + 100), 0));

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className="select-none">
      <defs>
        <marker id="arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#94A3B8" />
        </marker>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Dot grid */}
      {Array.from({ length: Math.ceil(W / 20) }).map((_, xi) =>
        Array.from({ length: Math.ceil(H / 20) }).map((_, yi) => (
          <circle key={`d${xi}-${yi}`} cx={xi * 20} cy={yi * 20} r={0.5} fill="#D1D5DB" />
        ))
      )}

      {/* Edges */}
      {graph.edges.map(e => {
        const from = positions[e.from];
        const to = positions[e.to];
        if (!from || !to) return null;
        const x1 = from.x + 70, y1 = from.y + 20;
        const x2 = to.x, y2 = to.y + 20;
        const mx = (x1 + x2) / 2;
        return (
          <g key={e.id}>
            <path d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
              stroke="#CBD5E1" strokeWidth={1.5} fill="none" markerEnd="url(#arrow)" />
            {e.label && (
              <text x={mx} y={Math.min(y1, y2) - 6} textAnchor="middle" className="text-[9px] fill-gray-400">{e.label}</text>
            )}
          </g>
        );
      })}

      {/* Nodes */}
      {graph.nodes.map(n => {
        const pos = positions[n.id];
        if (!pos) return null;
        const color = nodeColor(n);
        const isSelected = selectedNodeId === n.id;
        const isNew = !prevNodeIds.has(n.id) && prevNodeIds.size > 0;
        const chipType = NODE_TYPE_TO_CHIP[n.type];

        return (
          <g key={n.id} onClick={() => onNodeClick(n.id)} className="cursor-pointer"
            filter={isSelected ? 'url(#glow)' : undefined}>
            {/* New node pulse */}
            {isNew && (
              <rect x={pos.x - 4} y={pos.y - 4} width={148} height={48} rx={12}
                fill={color} opacity={0.3}>
                <animate attributeName="opacity" values="0.4;0;0.4" dur="1.5s" repeatCount="3" />
                <animate attributeName="width" values="148;156;148" dur="1.5s" repeatCount="3" />
              </rect>
            )}

            {n.type === 'decision' ? (
              <g transform={`translate(${pos.x + 70}, ${pos.y + 20})`}>
                <polygon points="0,-22 40,0 0,22 -40,0" fill="white" stroke={color} strokeWidth={2} />
                <text textAnchor="middle" y={4} className="text-[9px] font-medium" fill={color}>
                  {n.label.length > 18 ? n.label.slice(0, 18) + '…' : n.label}
                </text>
              </g>
            ) : (
              <>
                <rect x={pos.x} y={pos.y} width={140} height={40} rx={8}
                  fill="white" stroke={isSelected ? color : '#E5E7EB'} strokeWidth={isSelected ? 2 : 1} />
                <rect x={pos.x} y={pos.y} width={4} height={40} rx={2} fill={color} />
                <text x={pos.x + 14} y={pos.y + 16} className="text-[10px] font-semibold" fill="#1F2937">
                  {n.label.length > 16 ? n.label.slice(0, 16) + '…' : n.label}
                </text>
                <text x={pos.x + 14} y={pos.y + 30} className="text-[8px]" fill="#9CA3AF">
                  {chipType || n.type}
                </text>
                {/* Animated dot for flowing data */}
                <circle cx={pos.x + 130} cy={pos.y + 20} r={3} fill={color} opacity={0.6}>
                  <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite" />
                </circle>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────
export function LiveSplitView() {
  const [text, setText] = useState(CLAIMS_PLAYBOOK_CONTENT);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedChip, setHighlightedChip] = useState<string | null>(null);
  const [layout, setLayout] = useState<'side' | 'stacked'>('side');
  const [prevNodeIds, setPrevNodeIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [compiledGraph, setCompiledGraph] = useState<CompiledGraph | null>(null);

  // Parse & compile with debounce
  const recompile = useCallback((newText: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const parsed = parsePlaybook(newText, REGISTRY);
        const graph = compilePlaybookToGraph(parsed);
        setCompiledGraph(prev => {
          if (prev) setPrevNodeIds(new Set(prev.nodes.map(n => n.id)));
          return graph;
        });
      } catch { /* ignore parse errors while typing */ }
    }, 300);
  }, []);

  useEffect(() => {
    recompile(text);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const handleTextChange = (newText: string) => {
    setText(newText);
    recompile(newText);
  };

  const positions = useMemo(() => compiledGraph ? layoutNodes(compiledGraph) : {}, [compiledGraph]);

  // Bidirectional: chip click → find node
  const handleChipClick = (type: ChipType, name: string) => {
    const key = `${type}:${name}`;
    setHighlightedChip(key);
    if (compiledGraph) {
      const node = compiledGraph.nodes.find(n => n.label.toLowerCase().includes(name.toLowerCase()));
      if (node) setSelectedNodeId(node.id);
    }
    setTimeout(() => setHighlightedChip(null), 2000);
  };

  // Bidirectional: node click → highlight chip
  const handleNodeClick = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    if (compiledGraph) {
      const node = compiledGraph.nodes.find(n => n.id === nodeId);
      if (node) {
        const chipType = NODE_TYPE_TO_CHIP[node.type];
        if (chipType) {
          const key = `${chipType}:${node.label}`;
          setHighlightedChip(key);
          setTimeout(() => setHighlightedChip(null), 2000);
        }
      }
    }
  };

  const nodeCount = compiledGraph?.nodes.length ?? 0;
  const edgeCount = compiledGraph?.edges.length ?? 0;
  const refCount = useMemo(() => {
    const matches = text.match(/@\w+\([^)]+\)/g);
    return matches?.length ?? 0;
  }, [text]);

  return (
    <div className="h-full bg-[#FAFAF9] flex flex-col">
      {/* Top Bar */}
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur-sm px-4 py-2.5 flex items-center gap-4 sticky top-0 z-50">
        <div>
          <h1 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>Live Split View</h1>
          <p className="text-[10px] text-gray-400">Claims Processing Agent v2.1 — real-time compilation</p>
        </div>
        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span className="px-2 py-1 rounded bg-gray-50">{refCount} refs</span>
          <span className="px-2 py-1 rounded bg-gray-50">{nodeCount} nodes</span>
          <span className="px-2 py-1 rounded bg-gray-50">{edgeCount} edges</span>
        </div>

        {/* Layout Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setLayout('side')}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${layout === 'side' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            Side by Side
          </button>
          <button onClick={() => setLayout('stacked')}
            className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${layout === 'stacked' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            Stacked
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className={`flex-1 flex ${layout === 'stacked' ? 'flex-col' : 'flex-row'}`}>
        {/* Left: Document Editor */}
        <div className={`${layout === 'side' ? 'w-[55%]' : 'h-1/2'} border-r border-gray-200 flex flex-col`}>
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Document</span>
            <span className="text-[10px] text-gray-400">Edit the playbook — graph updates live</span>
          </div>
          <div className="flex-1 overflow-auto">
            {/* Editable textarea (hidden) + rendered overlay */}
            <div className="relative">
              <div className="p-6">
                <RenderPlaybook text={text} highlightedChip={highlightedChip} onChipClick={handleChipClick} />
              </div>
              {/* Floating edit button */}
              <EditPanel text={text} onChange={handleTextChange} />
            </div>
          </div>
        </div>

        {/* Right: Compiled Flow */}
        <div className={`${layout === 'side' ? 'w-[45%]' : 'h-1/2'} flex flex-col bg-white`}>
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Compiled Flow</span>
            <span className="text-[10px] text-gray-400">Auto-derived from playbook — read only</span>
            <div className="flex-1" />
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">LIVE</span>
          </div>
          <div className="flex-1 overflow-auto p-2">
            {compiledGraph ? (
              <FlowGraph graph={compiledGraph} positions={positions}
                selectedNodeId={selectedNodeId} onNodeClick={handleNodeClick} prevNodeIds={prevNodeIds} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">Compiling...</div>
            )}
          </div>

          {/* Legend */}
          <div className="border-t border-gray-100 px-3 py-2 flex flex-wrap gap-2">
            {(['trigger', 'doc', 'tool', 'connector', 'agent', 'guard', 'schema'] as ChipType[]).map(t => (
              <div key={t} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: chipTypeColor(t) }} />
                <span className="text-[9px] text-gray-400">@{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Panel (floating textarea for editing) ─────────────────────────
function EditPanel({ text, onChange }: { text: string; onChange: (t: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 z-50 w-10 h-10 rounded-full bg-[#1A73E8] text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-lg"
        title="Edit playbook source">
        ✎
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm flex items-end justify-start p-6">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-[600px] max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-700">Edit Playbook Source</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">Changes compile in real-time</span>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
              </div>
            </div>
            <textarea
              value={text}
              onChange={e => onChange(e.target.value)}
              className="flex-1 p-4 text-xs font-mono text-gray-700 resize-none focus:outline-none"
              style={{ minHeight: 400 }}
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
