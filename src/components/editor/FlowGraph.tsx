/**
 * FlowGraph — Interactive compiled DAG view for the Playbook Editor.
 *
 * Renders a read-only directed acyclic graph compiled from the playbook
 * content. Supports pan/zoom, node selection with highlighting, bezier
 * edge routing, flowing dot animations, pattern detection badges, skill
 * region overlays, and topology expression bar display.
 *
 * The graph is NEVER directly editable — it is derived from the playbook.
 * Clicking a node shows its inspector details; double-clicking navigates
 * to the corresponding source line in the document tab.
 *
 * Also exports STYLE_TAG (CSS keyframe animations shared with the editor),
 * and the NODE_COLORS / NODE_ICONS / ADK_CONSTRUCT constants for reuse.
 *
 * Extracted from PlaybookEditor.tsx for modularity.
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { parsePlaybook, compilePlaybookToGraph } from '../../parser';
import { REGISTRY } from '../../data/registry';

// ─── Constants (derived from unified chipConfig) ────────────────────────

export { NODE_COLORS, NODE_ICONS, ADK_CONSTRUCT } from '../../config/chipConfig';
import { NODE_COLORS, NODE_ICONS, ADK_CONSTRUCT } from '../../config/chipConfig';
import { flowGraph } from '../../constants/layout';

export const NW = flowGraph.nodeWidth;
export const NH = flowGraph.nodeHeight;

// ─── CSS Keyframes (injected once by the editor orchestrator) ────────────

export const STYLE_TAG = `
@keyframes nodePulse {
  0%, 100% { stroke-opacity: 0.5; stroke-width: 2.5; }
  50% { stroke-opacity: 1; stroke-width: 3; }
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
@keyframes slideInRight {
  from { transform: translateX(40px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}
@keyframes nodeGlow {
  0%, 100% { filter: drop-shadow(0 0 4px var(--node-color, rgba(37,99,235,0.2))); }
  50% { filter: drop-shadow(0 0 12px var(--node-color, rgba(37,99,235,0.35))); }
}
@keyframes edgeTrail {
  0% { stroke-dashoffset: 20; }
  100% { stroke-dashoffset: 0; }
}
`;

// ─── FlowGraph Component ────────────────────────────────────────────────

export function FlowGraph({
  content, selectedNodeId, hoveredNodeId,
  onNodeClick, onNodeHover, onNodeLeave,
  onGoToSource,
}: {
  content: string;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
  onNodeHover: (nodeId: string) => void;
  onNodeLeave: () => void;
  onGoToSource: (nodeId: string) => void;
}) {
  const parsed = useMemo(() => parsePlaybook(content, REGISTRY), [content]);
  const graph = useMemo(() => compilePlaybookToGraph(parsed), [parsed]);

  // Compute graph bounds for centering
  const graphBounds = useMemo(() => {
    if (!graph.nodes.length) return { minX: 0, minY: 0, maxX: 400, maxY: 300 };
    const xs = graph.nodes.map(n => n.position?.x ?? 0);
    const ys = graph.nodes.map(n => n.position?.y ?? 0);
    return {
      minX: Math.min(...xs) - 30,
      minY: Math.min(...ys) - 40,
      maxX: Math.max(...xs) + NW + 30,
      maxY: Math.max(...ys) + NH + 40,
    };
  }, [graph.nodes]);

  // Pan & zoom state
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [hasAutoFit, setHasAutoFit] = useState(false);

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

  // Fit to screen — compute zoom and pan to center the graph
  const fitToScreen = useCallback(() => {
    const svgEl = svgRef.current;
    const containerW = svgEl?.clientWidth || 800;
    const containerH = svgEl?.clientHeight || 500;
    const graphW = graphBounds.maxX - graphBounds.minX;
    const graphH = graphBounds.maxY - graphBounds.minY;
    if (graphW <= 0 || graphH <= 0) { setPan({ x: 60, y: 60 }); setZoom(0.85); return; }
    const padding = 60;
    const scaleX = (containerW - padding * 2) / graphW;
    const scaleY = (containerH - padding * 2) / graphH;
    const newZoom = Math.max(0.3, Math.min(1.2, Math.min(scaleX, scaleY)));
    const newPanX = (containerW - graphW * newZoom) / 2 - graphBounds.minX * newZoom;
    const newPanY = (containerH - graphH * newZoom) / 2 - graphBounds.minY * newZoom;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [graphBounds]);

  // Auto-fit on first render and when graph changes
  useEffect(() => {
    if (graph.nodes.length > 0) {
      // Small delay to ensure SVG has rendered and has dimensions
      const timer = setTimeout(fitToScreen, 50);
      return () => clearTimeout(timer);
    }
  }, [graph.nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Also auto-fit once after initial mount
  useEffect(() => {
    if (!hasAutoFit && svgRef.current && graph.nodes.length > 0) {
      setHasAutoFit(true);
      fitToScreen();
    }
  }, [hasAutoFit, graph.nodes.length, fitToScreen]);

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
      style={{
        background: 'linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%)',
        cursor: dragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
      {/* Dot grid background */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.35 }}>
        <defs>
          <pattern id="dotgrid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="12" cy="12" r="0.8" fill="#94A3B8" />
          </pattern>
          <radialGradient id="centerGlow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.03" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotgrid)" />
        <rect width="100%" height="100%" fill="url(#centerGlow)" />
      </svg>

      {/* Topology expression bar */}
      {parsed.topologyRaw && (
        <div className="absolute top-0 left-0 right-0 z-20 px-4 py-2 border-b flex items-center gap-2" style={{ background: '#1E293B', borderColor: '#334155' }}>
          <span className="text-[9px] uppercase tracking-wider font-semibold shrink-0" style={{ color: '#64748B' }}>topology</span>
          <code className="text-[11px] leading-relaxed overflow-x-auto whitespace-nowrap" style={{ fontFamily: 'var(--font-mono)', color: '#E2E8F0' }}>
            {parsed.topologyRaw.split(/(>>|\/\/|\||\*)/).map((part, i) => {
              const t = part.trim();
              if (t === '>>') return <span key={i} style={{ color: '#60A5FA', fontWeight: 600 }}> {'>>'} </span>;
              if (t === '|') return <span key={i} style={{ color: '#FB923C', fontWeight: 600 }}> | </span>;
              if (t === '*') return <span key={i} style={{ color: '#A78BFA', fontWeight: 600 }}> * </span>;
              if (t === '//') return <span key={i} style={{ color: '#FB7185', fontWeight: 600 }}> // </span>;
              if (t.startsWith('@')) return <span key={i} style={{ color: '#93C5FD' }}>{t}</span>;
              return <span key={i}>{part}</span>;
            })}
          </code>
          <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#334155', color: '#94A3B8' }}>read-only</span>
        </div>
      )}

      {/* Controls — glass panels */}
      <div className={`absolute left-3 z-10 flex gap-1.5 ${parsed.topologyRaw ? 'top-12' : 'top-3'}`}>
        <div
          className="px-3 py-2 rounded-xl text-[11px] flex items-center gap-2"
          style={{
            background: 'rgba(255, 255, 255, 0.78)',
            backdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.4)',
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
            <path d="M2 4h8M2 6h5M2 8h6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          Auto-compiled from playbook
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{graph.nodes.length}</span> nodes
          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{graph.edges.length}</span> edges
        </div>
      </div>
      <div className={`absolute right-3 z-10 flex gap-1 ${parsed.topologyRaw ? 'top-12' : 'top-3'}`}>
        <div
          className="flex items-center gap-0 rounded-xl overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.78)',
            backdropFilter: 'blur(16px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.4)',
          }}
        >
          <button
            onClick={fitToScreen}
            className="px-3 py-2 text-[11px] font-medium transition-colors duration-150"
            style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-ui)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            Fit
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)' }} />
          <button
            onClick={() => setZoom(z => Math.min(2, z + 0.15))}
            className="px-2.5 py-2 text-xs transition-colors duration-150"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >+</button>
          <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)' }} />
          <button
            onClick={() => setZoom(z => Math.max(0.3, z - 0.15))}
            className="px-2.5 py-2 text-xs transition-colors duration-150"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >-</button>
          <div style={{ width: 1, height: 20, background: 'var(--color-border-subtle)' }} />
          <span className="px-2.5 py-2 text-[10px] tabular-nums" style={{ color: 'var(--color-text-quaternary)', fontFamily: 'var(--font-mono)' }}>
            {(zoom * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
      >
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" opacity="0.8" />
          </marker>
          <marker id="arrowGreen" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#16A34A" />
          </marker>
          <marker id="arrowRed" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#E11D48" />
          </marker>
          <filter id="nodeShadow" x="-15%" y="-15%" width="130%" height="145%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.06" />
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.04" />
          </filter>
          <filter id="nodeShadowHover" x="-15%" y="-15%" width="130%" height="150%">
            <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="#000" floodOpacity="0.10" />
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.06" />
          </filter>
          <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          {/* Node gradient fills per type */}
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <linearGradient key={`grad-${type}`} id={`nodeGrad-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.06" />
              <stop offset="100%" stopColor={color} stopOpacity="0.12" />
            </linearGradient>
          ))}
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
                {/* Flowing dot animation — subtle on all edges, brighter when connected */}
                <circle r={isConnected ? 3 : 2} fill={color} opacity={isConnected ? 0.8 : 0.3}>
                  <animateMotion dur={isConnected ? '1.5s' : '4s'} repeatCount="indefinite" path={d} />
                </circle>
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
            const rx = isGate ? 20 : isTrigger ? 20 : 12;

            return (
              <g key={node.id} className="graph-node cursor-pointer"
                onClick={() => onNodeClick(node.id)}
                onMouseEnter={() => onNodeHover(node.id)}
                onMouseLeave={onNodeLeave}
                onDoubleClick={() => onGoToSource(node.id)}
                style={{ opacity: dimmed ? 0.2 : 1, transition: 'opacity 0.35s ease' }}
              >
                {/* Selection glow ring */}
                {isSelected && (
                  <rect x={x - 5} y={y - 5} width={NW + 10} height={NH + 10} rx={rx + 5}
                    fill="none" stroke={color} strokeWidth={2} strokeOpacity={0.4}
                    style={{ animation: 'nodePulse 2.5s ease-in-out infinite' }}
                  />
                )}
                {/* Card body — white with gradient fill */}
                <rect x={x} y={y} width={NW} height={NH} rx={rx}
                  fill="white"
                  stroke={isActive ? color : 'var(--color-border)'}
                  strokeWidth={isActive ? 1.5 : 1}
                  filter={isActive ? 'url(#nodeShadowHover)' : 'url(#nodeShadow)'}
                  style={{ transition: 'all 0.25s ease' }}
                />
                {/* Gradient tint overlay */}
                <rect x={x} y={y} width={NW} height={NH} rx={rx}
                  fill={`url(#nodeGrad-${node.type})`}
                  style={{ transition: 'fill-opacity 0.25s ease', pointerEvents: 'none' }}
                />
                {/* Top highlight for depth illusion */}
                <rect x={x + 1} y={y + 1} width={NW - 2} height={NH / 2} rx={rx - 1}
                  fill="white" fillOpacity={0.4}
                  style={{ pointerEvents: 'none' }}
                />
                {/* Left accent bar — rounded, with glow */}
                <rect x={x + 1} y={y + 10} width={3.5} height={NH - 20} rx={2} fill={color}
                  style={{ filter: isActive ? `drop-shadow(0 0 3px ${color})` : 'none' }}
                />
                {/* Trigger: pulsing ring accent */}
                {isTrigger && (
                  <>
                    <circle cx={x + NW - 16} cy={y + 16} r={6} fill={color} fillOpacity={0.1} stroke={color} strokeWidth={1} strokeOpacity={0.4} />
                    <circle cx={x + NW - 16} cy={y + 16} r={3} fill={color} fillOpacity={0.3} />
                  </>
                )}
                {/* Icon + Label */}
                <text x={x + 16} y={y + 24} fill={color} fontSize={13} style={{ opacity: 0.8 }}>{icon}</text>
                <text x={x + 34} y={y + 25} fill="var(--color-text-primary)" fontSize={12} fontWeight={600}
                  style={{ fontFamily: 'var(--font-ui)', letterSpacing: '-0.01em' }}>
                  {node.label.length > 22 ? node.label.slice(0, 22) + '\u2026' : node.label}
                </text>
                {/* Type label + adk-fluent construct */}
                <text x={x + 16} y={y + 44} fill="var(--color-text-quaternary)" fontSize={10}
                  style={{ fontFamily: 'var(--font-ui)' }}>
                  {node.type.replace(/-/g, ' ')}{ADK_CONSTRUCT[node.type] ? ` \u00B7 ${ADK_CONSTRUCT[node.type]}` : ''}
                </text>
                {/* Line badge — pill shape */}
                {node.sourceLines[0] != null && (
                  <>
                    <rect x={x + NW - 38} y={y + 38} width={30} height={16} rx={8}
                      fill={color} fillOpacity={0.08} stroke={color} strokeOpacity={0.15} strokeWidth={0.5} />
                    <text x={x + NW - 23} y={y + 50} textAnchor="middle" fill={color}
                      fontSize={9} fontWeight={600} style={{ fontFamily: 'var(--font-mono)' }}>
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

      {/* Legend — glass panel */}
      <div
        className="absolute bottom-3 left-3 flex flex-wrap gap-2 sm:gap-2.5 text-[9px] sm:text-[10px] px-3 sm:px-4 py-2 sm:py-2.5 max-w-[calc(100%-24px)]"
        style={{
          background: 'rgba(255, 255, 255, 0.78)',
          backdropFilter: 'blur(16px) saturate(180%)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: 'var(--shadow-sm), inset 0 1px 0 rgba(255,255,255,0.4)',
          color: 'var(--color-text-tertiary)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded"
              style={{ background: color, boxShadow: `0 0 3px ${color}30` }}
            />
            {type.replace(/-/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}
