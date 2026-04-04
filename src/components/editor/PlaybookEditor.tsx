/**
 * PlaybookEditor — Screen 1: The hero mockup.
 *
 * Three tabs: Document | Flow | Notebook
 * - Document: playbook with inline smart chips, line highlighting
 * - Flow: beautiful interactive compiled DAG with pan/zoom
 * - Bidirectional: click chip → highlight node, click node → scroll to source
 * - Inspector sidebar with Details + Space tabs
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CLAIMS_PLAYBOOK_CONTENT } from '../../data/playbook';
import { REGISTRY, findChip } from '../../data/registry';
import { parsePlaybook, compilePlaybookToGraph } from '../../parser';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip, CompiledGraphNode } from '../../parser/types';
import { usePlaybook, useNotifications, useRegistry } from '../../contexts/AppContext';
import { PublishModal } from '../versioning/PublishModal';

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

// ─── Constants ───────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  'trigger-entry': '#EA580C',
  grounding: '#0D9488',
  'tool-call': '#4F46E5',
  'connector-call': '#2563EB',
  agent: '#D97706',
  decision: '#374151',
  gate: '#E11D48',
  output: '#475569',
  transform: '#059669',
};

const NODE_ICONS: Record<string, string> = {
  'trigger-entry': '▸',
  grounding: '◇',
  'tool-call': '⬡',
  'connector-call': '◈',
  agent: '◎',
  decision: '◆',
  gate: '△',
  output: '▢',
  transform: '◇',
};

const NW = 200; // node width
const NH = 64;  // node height

// ─── CSS Keyframes (injected once) ───────────────────────────────────────

const STYLE_TAG = `
@keyframes nodePulse {
  0%, 100% { stroke-opacity: 0.7; }
  50% { stroke-opacity: 1; }
}
@keyframes lineHighlightPulse {
  0% { background-color: #DBEAFE; }
  50% { background-color: #BFDBFE; }
  100% { background-color: #EFF6FF; }
}
@keyframes dotFlow {
  0% { offset-distance: 0%; }
  100% { offset-distance: 100%; }
}
`;

// ─── Inline Smart Chip ──────────────────────────────────────────────────

function InlineChip({
  type, name, onClick, glowing,
}: {
  type: ChipType; name: string; onClick?: () => void; glowing?: boolean;
}) {
  const colors = CHIP_COLORS[type];
  const icon = CHIP_ICONS[type];
  const resolved = !!findChip(type, name);

  if (!resolved) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border-2 border-dashed cursor-pointer mx-0.5"
        style={{ borderColor: '#DC2626', color: '#DC2626', background: '#FEF2F2' }}
        onClick={onClick}
      >
        {icon} {name}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white cursor-pointer hover:opacity-90 transition-all mx-0.5"
      style={{
        background: colors.bg,
        boxShadow: glowing ? `0 0 0 3px ${colors.bg}44, 0 0 12px ${colors.bg}33` : '0 1px 2px rgba(0,0,0,0.1)',
      }}
      onClick={onClick}
    >
      {icon} {name}
    </span>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function findNodeForChip(
  nodes: CompiledGraphNode[], chipType: ChipType, chipName: string,
): CompiledGraphNode | undefined {
  return nodes.find(
    (n) => n.chipType === chipType && n.label === chipName,
  );
}

// ─── Document Tab ────────────────────────────────────────────────────────

function renderPlaybookLine(
  line: string, lineIdx: number,
  onChipClick: (chip: SmartChip | null, type: ChipType, name: string) => void,
  selectedChipKey: string | null,
) {
  const chipRegex = /@(doc|tool|agent|guard|data|schema|connector|skill|trigger)\(([^)]+)\)/g;
  const parts: (string | React.JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = chipRegex.exec(line)) !== null) {
    if (match.index > lastIndex) parts.push(line.slice(lastIndex, match.index));
    const type = match[1] as ChipType;
    const name = match[2];
    const chip = findChip(type, name);
    const key = `${type}:${name}`;
    parts.push(
      <InlineChip
        key={`${lineIdx}-${match.index}`}
        type={type} name={name}
        glowing={selectedChipKey === key}
        onClick={() => onChipClick(chip || null, type, name)}
      />,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < line.length) parts.push(line.slice(lastIndex));
  return parts;
}

function DocumentTab({
  onChipClick, highlightedLines, selectedChipKey, lineRefs,
}: {
  onChipClick: (chip: SmartChip | null, type: ChipType, name: string) => void;
  highlightedLines: number[];
  selectedChipKey: string | null;
  lineRefs: React.MutableRefObject<Map<number, HTMLElement>>;
}) {
  const lines = CLAIMS_PLAYBOOK_CONTENT.split('\n');

  return (
    <div className="max-w-3xl mx-auto py-4 px-3 sm:py-6 sm:px-4 md:py-8 md:px-4" style={{ fontFamily: 'var(--font-body)' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trimStart();
        const isHighlighted = highlightedLines.includes(idx);
        const hlStyle: React.CSSProperties = isHighlighted
          ? { borderLeft: '3px solid #3B82F6', paddingLeft: 12, background: '#EFF6FF', borderRadius: 4, animation: 'lineHighlightPulse 1.5s ease-out' }
          : {};

        const refCb = (el: HTMLElement | null) => {
          if (el) lineRefs.current.set(idx, el);
        };

        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} ref={refCb} className="text-base font-semibold text-gray-800 mt-6 mb-2 transition-all" style={{ fontFamily: 'var(--font-ui)', ...hlStyle }}>
              {renderPlaybookLine(trimmed.slice(4), idx, onChipClick, selectedChipKey)}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} ref={refCb} className="text-lg font-semibold text-gray-900 mt-8 mb-3 pb-1 border-b border-gray-200 transition-all" style={{ fontFamily: 'var(--font-ui)', ...hlStyle }}>
              {renderPlaybookLine(trimmed.slice(3), idx, onChipClick, selectedChipKey)}
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} ref={refCb} className="text-2xl font-bold text-gray-900 mb-4 transition-all" style={{ fontFamily: 'var(--font-ui)', ...hlStyle }}>
              {renderPlaybookLine(trimmed.slice(2), idx, onChipClick, selectedChipKey)}
            </h1>
          );
        }
        if (/^\d+\./.test(trimmed)) {
          return (
            <div key={idx} ref={refCb} className="flex gap-2 ml-4 mb-1 text-[15px] text-gray-700 leading-relaxed transition-all" style={hlStyle}>
              <span className="text-gray-400 font-mono text-sm mt-0.5 shrink-0">{trimmed.match(/^\d+/)![0]}.</span>
              <span>{renderPlaybookLine(trimmed.replace(/^\d+\.\s*/, ''), idx, onChipClick, selectedChipKey)}</span>
            </div>
          );
        }
        if (trimmed.startsWith('- ')) {
          return (
            <div key={idx} ref={refCb} className="flex gap-2 ml-4 mb-1 text-[15px] text-gray-700 leading-relaxed transition-all" style={hlStyle}>
              <span className="text-gray-400 mt-1 shrink-0">•</span>
              <span>{renderPlaybookLine(trimmed.slice(2), idx, onChipClick, selectedChipKey)}</span>
            </div>
          );
        }
        if (trimmed === '') return <div key={idx} className="h-3" />;
        return (
          <p key={idx} ref={refCb} className="text-[15px] text-gray-700 leading-relaxed mb-1 transition-all" style={hlStyle}>
            {renderPlaybookLine(line, idx, onChipClick, selectedChipKey)}
          </p>
        );
      })}
    </div>
  );
}

// ─── Interactive Flow Graph ──────────────────────────────────────────────

function FlowGraph({
  selectedNodeId, hoveredNodeId,
  onNodeClick, onNodeHover, onNodeLeave,
  onGoToSource,
}: {
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onNodeHover: (nodeId: string) => void;
  onNodeLeave: () => void;
  onGoToSource: (nodeId: string) => void;
}) {
  const parsed = useMemo(() => parsePlaybook(CLAIMS_PLAYBOOK_CONTENT, REGISTRY), []);
  const graph = useMemo(() => compilePlaybookToGraph(parsed), [parsed]);

  // Pan & zoom state
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [zoom, setZoom] = useState(0.85);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // Pattern detection badges
  const patternBadges = useMemo(() => {
    const badges: { label: string; x: number; y: number }[] = [];

    // Supervised Pattern: decision diamond followed by agent delegation node
    const decisionNodes = graph.nodes.filter(n => n.type === 'decision');
    for (const dn of decisionNodes) {
      const outEdges = graph.edges.filter(e => e.from === dn.id);
      for (const edge of outEdges) {
        const target = graph.nodes.find(n => n.id === edge.to);
        if (target && target.type === 'agent') {
          const mx = ((dn.position?.x ?? 0) + (target.position?.x ?? 0)) / 2 + NW / 2;
          const my = Math.min(dn.position?.y ?? 0, target.position?.y ?? 0) - 24;
          badges.push({ label: 'Supervised Pattern', x: mx, y: my });
          break;
        }
      }
    }

    // Fan-Out Pattern: multiple parallel process nodes sharing same source
    const processTypes = new Set(['tool-call', 'connector-call']);
    const sourceToTargets = new Map<string, typeof graph.nodes>();
    for (const edge of graph.edges) {
      const target = graph.nodes.find(n => n.id === edge.to);
      if (target && processTypes.has(target.type)) {
        const list = sourceToTargets.get(edge.from) || [];
        list.push(target);
        sourceToTargets.set(edge.from, list);
      }
    }
    for (const [, targets] of sourceToTargets) {
      if (targets.length >= 2) {
        const avgX = targets.reduce((s, n) => s + (n.position?.x ?? 0), 0) / targets.length + NW / 2;
        const minY = Math.min(...targets.map(n => (n.position?.y ?? 0))) - 24;
        badges.push({ label: 'Fan-Out Pattern', x: avgX, y: minY });
      }
    }

    // Gated Pattern: any gate node (guard)
    const gateNodes = graph.nodes.filter(n => n.type === 'gate');
    for (const gn of gateNodes) {
      badges.push({
        label: 'Gated Pattern',
        x: (gn.position?.x ?? 0) + NW / 2,
        y: (gn.position?.y ?? 0) - 24,
      });
    }

    // Deduplicate badges at nearby positions
    const seen = new Set<string>();
    return badges.filter(b => {
      const key = `${b.label}-${Math.round(b.x / 80)}-${Math.round(b.y / 80)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [graph.nodes, graph.edges]);

  // Connected node tracking
  const connectedNodeIds = useMemo(() => {
    const active = hoveredNodeId || selectedNodeId;
    if (!active) return new Set<string>();
    const ids = new Set<string>();
    ids.add(active);
    for (const e of graph.edges) {
      if (e.from === active) ids.add(e.to);
      if (e.to === active) ids.add(e.from);
    }
    return ids;
  }, [hoveredNodeId, selectedNodeId, graph.edges]);

  // Fit to screen
  const fitToScreen = useCallback(() => {
    setPan({ x: 60, y: 60 });
    setZoom(0.85);
  }, []);

  // Pan handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as Element).closest('.graph-node')) return;
    setDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const onMouseUp = useCallback(() => setDragging(false), []);

  // Zoom handler
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001)));
  }, []);

  // Bezier path between two nodes
  function edgePath(fromId: string, toId: string) {
    const fromNode = graph.nodes.find(n => n.id === fromId);
    const toNode = graph.nodes.find(n => n.id === toId);
    if (!fromNode?.position || !toNode?.position) return '';
    const x1 = fromNode.position.x + NW;
    const y1 = fromNode.position.y + NH / 2;
    const x2 = toNode.position.x;
    const y2 = toNode.position.y + NH / 2;
    const cx1 = x1 + (x2 - x1) * 0.4;
    const cx2 = x2 - (x2 - x1) * 0.4;
    return `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`;
  }

  return (
    <div
      className="w-full h-full overflow-hidden relative"
      style={{ background: '#FAFBFC', cursor: dragging ? 'grabbing' : 'grab' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      {/* Dot grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.4 }}>
        <defs>
          <pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="1" fill="#CBD5E1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />
      </svg>

      {/* Controls */}
      <div className="absolute top-3 left-3 z-10 flex gap-1.5">
        <div className="px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-500 flex items-center gap-1.5">
          Compiled from playbook — click a node to go to source
        </div>
      </div>
      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <button onClick={fitToScreen} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 hover:bg-gray-50 shadow-sm">
          Fit ⊞
        </button>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 shadow-sm">+</button>
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 shadow-sm">−</button>
        <span className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] text-gray-400 font-mono">{(zoom * 100).toFixed(0)}%</span>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
      >
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
            <polygon points="0 0, 10 4, 0 8" fill="#94A3B8" />
          </marker>
          <marker id="arrowGreen" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
            <polygon points="0 0, 10 4, 0 8" fill="#16A34A" />
          </marker>
          <marker id="arrowRed" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto">
            <polygon points="0 0, 10 4, 0 8" fill="#E11D48" />
          </marker>
          <filter id="nodeShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
          </filter>
          <filter id="nodeShadowHover" x="-10%" y="-10%" width="120%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.15" />
          </filter>
        </defs>

        <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>

          {/* Skill regions (background) */}
          {graph.skillRegions.map((region, i) => {
            const rNodes = graph.nodes.filter(n => region.nodeIds.includes(n.id));
            if (!rNodes.length) return null;
            const rxMin = Math.min(...rNodes.map(n => (n.position?.x ?? 0))) - 16;
            const rxMax = Math.max(...rNodes.map(n => (n.position?.x ?? 0))) + NW + 16;
            const ryMin = Math.min(...rNodes.map(n => (n.position?.y ?? 0))) - 28;
            const ryMax = Math.max(...rNodes.map(n => (n.position?.y ?? 0))) + NH + 16;
            return (
              <g key={`region-${i}`}>
                <rect x={rxMin} y={ryMin} width={rxMax - rxMin} height={ryMax - ryMin} rx={12}
                  fill={region.color} fillOpacity={0.05} stroke={region.color} strokeOpacity={0.2}
                  strokeWidth={1.5} strokeDasharray="8 4" />
                <text x={rxMin + 10} y={ryMin + 16} fill={region.color} fontSize={11} fontWeight={600} opacity={0.6}>
                  {region.label}
                </text>
              </g>
            );
          })}

          {/* Edges */}
          {graph.edges.map((edge) => {
            const d = edgePath(edge.from, edge.to);
            if (!d) return null;
            const active = hoveredNodeId || selectedNodeId;
            const isConnected = active && (edge.from === active || edge.to === active);
            const isDashed = edge.type === 'guard-block' || edge.type === 'conditional-false';
            const color =
              edge.type === 'guard-pass' ? '#16A34A' :
              edge.type === 'guard-block' ? '#E11D48' :
              edge.type === 'conditional-true' ? '#16A34A' :
              edge.type === 'conditional-false' ? '#DC2626' :
              edge.type === 'data-flow' ? '#0D9488' :
              isConnected ? '#64748B' : '#CBD5E1';
            const marker = edge.type === 'guard-pass' || edge.type === 'conditional-true'
              ? 'url(#arrowGreen)'
              : edge.type === 'guard-block' ? 'url(#arrowRed)' : 'url(#arrow)';

            return (
              <g key={edge.id}>
                <path d={d} fill="none" stroke={color}
                  strokeWidth={isConnected ? 2.5 : 1.5}
                  strokeDasharray={isDashed ? '6 4' : undefined}
                  markerEnd={marker}
                  opacity={active && !isConnected ? 0.25 : 1}
                  style={{ transition: 'all 0.3s ease' }}
                />
                {/* Flowing dot animation */}
                {isConnected && (
                  <circle r="3" fill={color} opacity={0.8}>
                    <animateMotion dur="2s" repeatCount="indefinite" path={d} />
                  </circle>
                )}
                {/* Edge label */}
                {edge.label && (
                  <text dy={-8} fill={color} fontSize={10} fontWeight={500}>
                    <textPath href={`#epath-${edge.id}`} startOffset="50%" textAnchor="middle">
                      {edge.label}
                    </textPath>
                  </text>
                )}
                {edge.label && <path id={`epath-${edge.id}`} d={d} fill="none" stroke="none" />}
              </g>
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const x = node.position?.x ?? 0;
            const y = node.position?.y ?? 0;
            const color = NODE_COLORS[node.type] || '#6B7280';
            const icon = NODE_ICONS[node.type] || '●';
            const isSelected = selectedNodeId === node.id;
            const isHovered = hoveredNodeId === node.id;
            const isActive = isSelected || isHovered;
            const isConnected = connectedNodeIds.has(node.id);
            const dimmed = (hoveredNodeId || selectedNodeId) && !isConnected;
            const isDecision = node.type === 'decision';

            if (isDecision) {
              const cx = x + NW / 2;
              const cy = y + NH / 2;
              const hw = 100, hh = 32;
              return (
                <g key={node.id} className="graph-node cursor-pointer"
                  onClick={() => onNodeClick(node.id)}
                  onMouseEnter={() => onNodeHover(node.id)}
                  onMouseLeave={onNodeLeave}
                  onDoubleClick={() => onGoToSource(node.id)}
                  style={{ opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.3s ease' }}
                >
                  <polygon
                    points={`${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`}
                    fill="white" stroke={color} strokeWidth={isActive ? 3 : 2}
                    filter={isActive ? 'url(#nodeShadowHover)' : 'url(#nodeShadow)'}
                  />
                  {isSelected && (
                    <polygon
                      points={`${cx},${cy - hh - 4} ${cx + hw + 4},${cy} ${cx},${cy + hh + 4} ${cx - hw - 4},${cy}`}
                      fill="none" stroke={color} strokeWidth={2} strokeDasharray="4 2"
                      style={{ animation: 'nodePulse 2s infinite' }}
                    />
                  )}
                  <text x={cx} y={cy + 4} textAnchor="middle" fill={color} fontSize={10} fontWeight={600}>
                    {node.label.length > 28 ? node.label.slice(0, 28) + '…' : node.label}
                  </text>
                </g>
              );
            }

            const isGate = node.type === 'gate';
            const isTrigger = node.type === 'trigger-entry';
            const rx = isGate ? 24 : isTrigger ? 24 : 10;

            return (
              <g key={node.id} className="graph-node cursor-pointer"
                onClick={() => onNodeClick(node.id)}
                onMouseEnter={() => onNodeHover(node.id)}
                onMouseLeave={onNodeLeave}
                onDoubleClick={() => onGoToSource(node.id)}
                style={{ opacity: dimmed ? 0.3 : 1, transition: 'opacity 0.3s ease' }}
              >
                {/* Selection ring */}
                {isSelected && (
                  <rect x={x - 4} y={y - 4} width={NW + 8} height={NH + 8} rx={rx + 4}
                    fill="none" stroke={color} strokeWidth={2.5} strokeDasharray="none"
                    style={{ animation: 'nodePulse 2s infinite' }}
                  />
                )}
                {/* Card body */}
                <rect x={x} y={y} width={NW} height={NH} rx={rx}
                  fill="white" stroke={isActive ? color : '#E2E8F0'}
                  strokeWidth={isActive ? 2 : 1}
                  filter={isActive ? 'url(#nodeShadowHover)' : 'url(#nodeShadow)'}
                  style={{ transition: 'all 0.2s ease' }}
                />
                {/* Color tint */}
                <rect x={x} y={y} width={NW} height={NH} rx={rx}
                  fill={color} fillOpacity={isActive ? 0.08 : 0.03}
                  style={{ transition: 'fill-opacity 0.2s ease' }}
                />
                {/* Left accent bar */}
                <rect x={x} y={y + 8} width={4} height={NH - 16} rx={2} fill={color} />
                {/* Trigger: double circle accent */}
                {isTrigger && (
                  <circle cx={x + NW - 16} cy={y + 16} r={6} fill="none" stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />
                )}
                {/* Icon + Label */}
                <text x={x + 16} y={y + 24} fill="#374151" fontSize={14}>{icon}</text>
                <text x={x + 34} y={y + 25} fill="#1F2937" fontSize={12} fontWeight={600}
                  style={{ fontFamily: 'var(--font-ui)' }}>
                  {node.label.length > 16 ? node.label.slice(0, 16) + '…' : node.label}
                </text>
                {/* Type label */}
                <text x={x + 16} y={y + 44} fill="#9CA3AF" fontSize={10}>
                  {node.type.replace(/-/g, ' ')}
                </text>
                {/* Line badge */}
                {node.sourceLines[0] != null && (
                  <>
                    <rect x={x + NW - 36} y={y + 38} width={28} height={16} rx={4}
                      fill={color} fillOpacity={0.1} />
                    <text x={x + NW - 22} y={y + 50} textAnchor="middle" fill={color}
                      fontSize={9} fontWeight={500}>
                      L{node.sourceLines[0]}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Pattern detection badges */}
          {patternBadges.map((badge, i) => {
            const textLen = badge.label.length * 5.5 + 16;
            return (
              <g key={`pattern-badge-${i}`}>
                <rect
                  x={badge.x - textLen / 2} y={badge.y - 9}
                  width={textLen} height={18} rx={9}
                  fill="#EDE9FE" fillOpacity={0.85}
                  stroke="#7C3AED" strokeWidth={0.5} strokeOpacity={0.3}
                />
                <text
                  x={badge.x} y={badge.y + 4}
                  textAnchor="middle" fill="#6D28D9"
                  fontSize={9} fontWeight={600}
                  style={{ fontFamily: 'var(--font-ui)' }}
                >
                  {badge.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] bg-white/80 backdrop-blur rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 border max-w-[calc(100%-24px)]" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-surface-2)' }}>
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            {type.replace(/-/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Context Strategy Card ──────────────────────────────────────────────

function ContextStrategyCard() {
  const stateKeys = [
    { key: 'topic', color: '#059669' },
    { key: 'jurisdiction', color: '#059669' },
    { key: 'claim_id', color: '#059669' },
  ];

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-indigo-500 font-bold" style={{ lineHeight: 1 }}>C</span>
        <span className="text-[11px] font-semibold text-gray-600" style={{ fontFamily: 'var(--font-ui)' }}>
          Context Strategy
        </span>
      </div>

      {/* Window */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Window</div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{
                  width: 10, height: 14,
                  background: `rgba(79, 70, 229, ${0.15 + i * 0.12})`,
                  border: '1px solid rgba(79, 70, 229, 0.25)',
                }}
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-600">Last 3 turns</span>
          <span className="text-[10px] text-gray-400 font-mono">C.window(3)</span>
        </div>
      </div>

      {/* State Injections */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">State Injections</div>
        <div className="flex flex-wrap gap-1">
          {stateKeys.map(({ key, color }) => (
            <span
              key={key}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
            >
              {key}
            </span>
          ))}
        </div>
        <div className="text-[10px] text-gray-400 font-mono">C.from_state(&quot;topic&quot;, &quot;jurisdiction&quot;, &quot;claim_id&quot;)</div>
      </div>

      {/* Filtering */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Filtering</div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
          User messages only
        </span>
        <div className="text-[10px] text-gray-400 font-mono">C.user_only()</div>
      </div>

      {/* Summarization */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Summarization</div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
          LLM-summarized
        </span>
        <div className="text-[10px] text-gray-400 font-mono">C.summarize()</div>
      </div>

      {/* Annotation */}
      <div className="pt-1 border-t border-gray-200">
        <div className="text-[9px] text-gray-400 leading-relaxed italic">
          Controls what the LLM sees on each iteration of the loop.
        </div>
      </div>
    </div>
  );
}

// ─── Inspector Sidebar ──────────────────────────────────────────────────

function InspectorDetails({
  chip, chipType, chipName, sourceLine, onGoToSource, onCreateChip,
}: {
  chip: SmartChip | null; chipType: ChipType; chipName: string;
  sourceLine?: number; onGoToSource?: () => void;
  onCreateChip?: (type: ChipType, name: string) => void;
}) {
  if (!chip) {
    return (
      <div className="p-4">
        <div className="mb-3"><InlineChip type={chipType} name={chipName} /></div>
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <div className="font-semibold mb-1">Unresolved Reference</div>
          <div className="text-xs text-red-500">@{chipType}({chipName}) is not in the registry.</div>
          <button
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
            onClick={() => onCreateChip?.(chipType, chipName)}
          >Create →</button>
        </div>
      </div>
    );
  }

  const colors = CHIP_COLORS[chip.type];
  return (
    <div className="p-4 space-y-4">
      <div>
        <InlineChip type={chip.type} name={chip.name} />
        <div className="mt-2 text-xs text-gray-500">{chip.registryId}</div>
      </div>

      {/* Source line link */}
      {sourceLine != null && onGoToSource && (
        <button
          onClick={onGoToSource}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <span>↩</span>
          <span>Go to source — Line {sourceLine}</span>
        </button>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
        {[
          ['Version', chip.version],
          ['Owner', chip.owner],
          ['Permission', chip.permissions.currentUser],
          ['Usage', `${chip.usageCount} playbooks`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-700">{value}</span>
          </div>
        ))}
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Status</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{
              background: chip.status === 'resolved' ? '#DCFCE7' : chip.status === 'draft' ? '#FEF9C3' : '#FEE2E2',
              color: chip.status === 'resolved' ? '#166534' : chip.status === 'draft' ? '#854D0E' : '#991B1B',
            }}>
            {chip.status.toUpperCase()}
          </span>
        </div>
        {chip.type === 'guard' && (() => {
          const guardPhases: Record<string, { phase: string; label: string; description: string }> = {
            'pii-redaction': { phase: 'post_model', label: 'post_model', description: 'Fires after LLM responds' },
            'fraud-detection': { phase: 'pre_model', label: 'pre_model', description: 'Fires before LLM call' },
            'apac-compliance-rules': { phase: 'context', label: 'context', description: 'Fires during context assembly' },
          };
          const phaseInfo = guardPhases[chip.name] || { phase: 'post_model', label: 'post_model', description: 'Fires after LLM responds' };
          return (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Phase</span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{ background: '#FFF1F2', color: '#9F1239' }}
                title={phaseInfo.description}
              >
                {phaseInfo.phase === 'pre_model' ? '⬆' : phaseInfo.phase === 'post_model' ? '⬇' : '⟳'}{' '}
                {phaseInfo.label}
              </span>
            </div>
          );
        })()}
        {chip.endpoint && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Endpoint</span>
            <span className="text-gray-700 font-mono text-[10px] truncate max-w-32">{chip.endpoint}</span>
          </div>
        )}
        {chip.healthStatus && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Health</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{
                background: chip.healthStatus === 'healthy' ? '#16A34A' : chip.healthStatus === 'degraded' ? '#EAB308' : '#DC2626'
              }} />
              <span className="text-gray-700">{chip.healthStatus}</span>
            </span>
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
        <div className="text-xs text-gray-700 leading-relaxed">{chip.description}</div>
      </div>

      {/* Skill Internal Topology */}
      {chip.type === 'skill' && (
        <div className="bg-violet-50 rounded-lg border border-violet-200 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-violet-700" style={{ fontFamily: 'var(--font-ui)' }}>
            Internal Topology
          </div>
          {chip.name === 'apac-compliance' ? (
            <svg viewBox="0 0 260 52" className="w-full" style={{ maxHeight: 52 }}>
              {/* jurisdiction_check box */}
              <rect x={4} y={8} width={100} height={36} rx={6}
                fill="#F5F3FF" stroke="#7C3AED" strokeWidth={1.2} />
              <text x={54} y={30} textAnchor="middle" fill="#6D28D9"
                fontSize={8} fontWeight={600} style={{ fontFamily: 'var(--font-ui)' }}>
                jurisdiction_check
              </text>
              {/* arrow */}
              <line x1={108} y1={26} x2={148} y2={26}
                stroke="#7C3AED" strokeWidth={1.2} markerEnd="url(#skill-arrow)" />
              {/* compliance_advisor box */}
              <rect x={152} y={8} width={104} height={36} rx={6}
                fill="#F5F3FF" stroke="#7C3AED" strokeWidth={1.2} />
              <text x={204} y={30} textAnchor="middle" fill="#6D28D9"
                fontSize={8} fontWeight={600} style={{ fontFamily: 'var(--font-ui)' }}>
                compliance_advisor
              </text>
              {/* arrow marker */}
              <defs>
                <marker id="skill-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#7C3AED" />
                </marker>
              </defs>
            </svg>
          ) : chip.name === 'customer-empathy' ? (
            <svg viewBox="0 0 260 52" className="w-full" style={{ maxHeight: 52 }}>
              <rect x={70} y={8} width={120} height={36} rx={6}
                fill="#F5F3FF" stroke="#7C3AED" strokeWidth={1.2} />
              <text x={130} y={30} textAnchor="middle" fill="#6D28D9"
                fontSize={9} fontWeight={600} style={{ fontFamily: 'var(--font-ui)' }}>
                empathy_advisor
              </text>
            </svg>
          ) : (
            <div className="text-[10px] text-violet-400 italic">
              Single-agent skill
            </div>
          )}
          <div className="text-[9px] text-violet-400">
            {chip.name === 'apac-compliance'
              ? 'jurisdiction_check >> compliance_advisor'
              : 'Single agent topology'}
          </div>
        </div>
      )}

      <button className="w-full text-left px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        style={{ color: colors.bg }}>
        Open in Registry →
      </button>

      {/* Context Strategy Card */}
      <ContextStrategyCard />
    </div>
  );
}

function ProblemSpaceVisualizer() {
  const parsed = useMemo(() => parsePlaybook(CLAIMS_PLAYBOOK_CONTENT, REGISTRY), []);
  const cx = 140, cy = 140;

  function arcSegments(items: { name: string }[], radius: number, color: string, startAngle: number, arcSpan: number) {
    if (!items.length) return null;
    const unique = items.filter((t, i, a) => a.findIndex(x => x.name === t.name) === i);
    const step = arcSpan / unique.length;
    return unique.map((item, i) => {
      const angle = startAngle + i * step + step / 2;
      const rad = (angle * Math.PI) / 180;
      const x = cx + radius * Math.cos(rad);
      const y = cy + radius * Math.sin(rad);
      return (
        <g key={`${color}-${item.name}`}>
          <circle cx={x} cy={y} r={14} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} />
          <text x={x} y={y + 3} textAnchor="middle" fill={color} fontSize={7} fontWeight={600}>
            {item.name.length > 10 ? item.name.slice(0, 10) + '..' : item.name}
          </text>
        </g>
      );
    });
  }

  return (
    <div className="p-4">
      <div className="text-xs font-semibold text-gray-700 mb-3" style={{ fontFamily: 'var(--font-ui)' }}>Problem Space Visualizer</div>
      <svg viewBox="0 0 280 280" className="w-full">
        <circle cx={cx} cy={cy} r={125} fill="none" stroke="#E11D48" strokeWidth={2} strokeDasharray="4 2" opacity={0.3} />
        <circle cx={cx} cy={cy} r={90} fill="none" stroke="#94A3B8" strokeWidth={1} strokeDasharray="2 2" opacity={0.2} />
        <circle cx={cx} cy={cy} r={55} fill="#7C3AED" fillOpacity={0.04} stroke="#7C3AED" strokeWidth={1} strokeDasharray="2 2" opacity={0.3} />
        <circle cx={cx} cy={cy} r={22} fill="#1A73E8" fillOpacity={0.1} stroke="#1A73E8" strokeWidth={2} />
        <text x={cx} y={cy - 2} textAnchor="middle" fill="#1A73E8" fontSize={8} fontWeight={700}>AGENT</text>
        <text x={cx} y={cy + 9} textAnchor="middle" fill="#1A73E8" fontSize={7} fontWeight={600}>LOOP</text>
        {arcSegments(parsed.referencesByType.trigger || [], 125, '#EA580C', -120, 60)}
        {arcSegments(parsed.referencesByType.guard || [], 120, '#E11D48', 30, 120)}
        {arcSegments([...(parsed.referencesByType.tool || []), ...(parsed.referencesByType.connector || [])], 88, '#4F46E5', -60, 180)}
        {arcSegments(parsed.referencesByType.skill || [], 52, '#7C3AED', 160, 100)}
        {arcSegments(parsed.referencesByType.doc || [], 70, '#0D9488', 120, 60)}
        {arcSegments(parsed.referencesByType.schema || [], 88, '#475569', 160, 40)}
        {arcSegments(parsed.referencesByType.data || [], 70, '#059669', 200, 40)}
      </svg>
      <div className="mt-3 grid grid-cols-2 gap-1 text-[9px]">
        {[['#EA580C','Triggers (entry)'],['#7C3AED','Skills (reduce)'],['#4F46E5','Tools (capability)'],['#2563EB','Connectors (expand)'],['#0D9488','Docs (ground)'],['#E11D48','Guards (constrain)'],['#475569','Schemas (shape)'],['#059669','Data (bind)']].map(([c,l]) => (
          <div key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:c}} />{l}</div>
        ))}
      </div>
    </div>
  );
}

// ─── Command Palette ────────────────────────────────────────────────────

function CommandPalette({ open, onClose, onAction }: { open: boolean; onClose: () => void; onAction: (action: string) => void }) {
  const [query, setQuery] = useState('');

  const commands = useMemo(() => [
    { section: 'Navigate', items: [
      { label: 'Switch to Document tab', shortcut: '1', action: 'tab:document' },
      { label: 'Switch to Flow tab', shortcut: '2', action: 'tab:flow' },
      { label: 'Switch to Notebook tab', shortcut: '3', action: 'tab:notebook' },
    ]},
    { section: 'Actions', items: [
      { label: 'Publish new version...', shortcut: 'P', action: 'publish' },
      { label: 'Share with team...', shortcut: 'S', action: 'share' },
      { label: 'View version history', shortcut: 'H', action: 'history' },
      { label: 'Run test...', shortcut: 'T', action: 'test' },
    ]},
    { section: 'Insert', items: [
      { label: 'Insert @tool reference', shortcut: '@t', action: 'insert:tool' },
      { label: 'Insert @connector reference', shortcut: '@c', action: 'insert:connector' },
      { label: 'Insert @guard reference', shortcut: '@g', action: 'insert:guard' },
      { label: 'Insert @skill reference', shortcut: '@s', action: 'insert:skill' },
    ]},
  ], []);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.map(section => ({
      ...section,
      items: section.items.filter(item => item.label.toLowerCase().includes(q)),
    })).filter(section => section.items.length > 0);
  }, [query, commands]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 shrink-0">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, references, actions..."
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
            style={{ fontFamily: 'var(--font-ui)' }}
          />
          <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-auto py-2">
          {filtered.map((section) => (
            <div key={section.section}>
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-400">
                {section.section}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => { onAction(item.action); onClose(); }}
                >
                  <span className="text-[13px] text-gray-700 flex-1">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Status Bar (bottom) ────────────────────────────────────────────────

function StatusBar({
  chipCount, nodeCount, edgeCount, activeTab,
}: {
  chipCount: number; nodeCount: number; edgeCount: number; activeTab: string;
}) {
  return (
    <div
      className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-1 text-[10px] select-none"
      style={{ borderTop: '1px solid var(--color-surface-2)', background: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)' }}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <span>{chipCount} refs</span>
        <span className="hidden sm:inline">{nodeCount} nodes</span>
        <span className="hidden sm:inline">{edgeCount} edges</span>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
          <span className="hidden sm:inline">Auto-compiling</span>
        </span>
        <span className="hidden md:inline">
          {activeTab === 'document' && 'Editing document'}
          {activeTab === 'flow' && 'Viewing compiled graph'}
          {activeTab === 'notebook' && 'Development mode'}
        </span>
      </div>
    </div>
  );
}

// ─── Tab Icons ──────────────────────────────────────────────────────────

function TabIcon({ tab, active }: { tab: string; active: boolean }) {
  const color = active ? '#2563EB' : '#9CA3AF';
  if (tab === 'document') return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke={color} strokeWidth="1.2"/>
      <path d="M5.5 5.5h5M5.5 8h3.5M5.5 10.5h4" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
  if (tab === 'flow') return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="8" r="2" stroke={color} strokeWidth="1.2"/>
      <circle cx="12" cy="5" r="2" stroke={color} strokeWidth="1.2"/>
      <circle cx="12" cy="11" r="2" stroke={color} strokeWidth="1.2"/>
      <path d="M6 7.2L10 5.5M6 8.8L10 10.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="4" rx="1" stroke={color} strokeWidth="1.2"/>
      <rect x="3" y="8" width="10" height="3" rx="1" stroke={color} strokeWidth="1.2"/>
      <rect x="3" y="13" width="6" height="1.5" rx="0.75" fill={color} fillOpacity="0.3"/>
    </svg>
  );
}

// ─── Main Editor Component ──────────────────────────────────────────────

type EditorTab = 'document' | 'flow' | 'notebook';
type InspectorTab = 'details' | 'space';

export function PlaybookEditor() {
  const bp = useBreakpoint();
  const isMobile = bp === 'mobile';
  const navigate = useNavigate();
  const { openPublishModal, publishModalOpen, closePublishModal, publish, dirty, saving, currentVersion } = usePlaybook();
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

  const lineRefs = useRef<Map<number, HTMLElement>>(new Map());

  // Parse + compile once
  const parsed = useMemo(() => parsePlaybook(CLAIMS_PLAYBOOK_CONTENT, REGISTRY), []);
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
  React.useEffect(() => {
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
          {(['document', 'flow', 'notebook'] as EditorTab[]).map((tab) => {
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
            <DocumentTab
              onChipClick={handleChipClick}
              highlightedLines={highlightedLines}
              selectedChipKey={selectedChipKey}
              lineRefs={lineRefs}
            />
          )}
          {activeTab === 'flow' && (
            <FlowGraph
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              onNodeClick={handleNodeClick}
              onNodeHover={setHoveredNodeId}
              onNodeLeave={() => setHoveredNodeId(null)}
              onGoToSource={handleGoToSource}
            />
          )}
          {activeTab === 'notebook' && (
            <div className="h-full flex flex-col items-center justify-center text-center px-8">
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
              style={{ borderLeft: '1px solid var(--color-border)', boxShadow: isMobile ? 'var(--shadow-xl)' : 'none' }}
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

            {inspectorTab === 'space' && <ProblemSpaceVisualizer />}
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
    </div>
  );
}
