/**
 * PlaybookEditor — Screen 1: The hero mockup.
 *
 * Three tabs: Document | Flow | Notebook
 * - Document: playbook with inline smart chips
 * - Flow: compiled DAG (read-only)
 * - Inspector sidebar with Details + Space tabs
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CLAIMS_PLAYBOOK_CONTENT } from '../../data/playbook';
import { REGISTRY, findChip } from '../../data/registry';
import { parsePlaybook, compilePlaybookToGraph } from '../../parser';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip } from '../../parser/types';

// ─── Chip Colors (inline for the flow view) ─────────────────────────────

const NODE_COLORS: Record<string, string> = {
  'trigger-entry': '#EA580C',
  'grounding': '#0D9488',
  'tool-call': '#4F46E5',
  'connector-call': '#2563EB',
  'agent': '#D97706',
  'decision': '#374151',
  'gate': '#E11D48',
  'output': '#475569',
  'transform': '#059669',
};

const NODE_ICONS: Record<string, string> = {
  'trigger-entry': '⚡',
  'grounding': '📄',
  'tool-call': '🔧',
  'connector-call': '🔗',
  'agent': '🤖',
  'decision': '◆',
  'gate': '🛡️',
  'output': '📐',
  'transform': '📊',
};

// ─── Inline Smart Chip ──────────────────────────────────────────────────

function InlineChip({
  type,
  name,
  onClick,
}: {
  type: ChipType;
  name: string;
  onClick?: () => void;
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
        {icon} {name} ⚠️
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white cursor-pointer hover:opacity-90 transition-all mx-0.5 shadow-sm"
      style={{ background: colors.bg }}
      onClick={onClick}
    >
      {icon} {name}
    </span>
  );
}

// ─── Playbook Renderer (Document Tab) ───────────────────────────────────

function renderPlaybookLine(line: string, lineIdx: number, onChipClick: (chip: SmartChip | null, type: ChipType, name: string) => void) {
  // Parse @type(name) references and render them as chips
  const chipRegex = /@(doc|tool|agent|guard|data|schema|connector|skill|trigger)\(([^)]+)\)/g;
  const parts: (string | React.JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = chipRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const type = match[1] as ChipType;
    const name = match[2];
    const chip = findChip(type, name);
    parts.push(
      <InlineChip
        key={`${lineIdx}-${match.index}`}
        type={type}
        name={name}
        onClick={() => onChipClick(chip || null, type, name)}
      />,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }

  return parts;
}

function DocumentTab({ onChipClick }: { onChipClick: (chip: SmartChip | null, type: ChipType, name: string) => void }) {
  const lines = CLAIMS_PLAYBOOK_CONTENT.split('\n');

  return (
    <div className="max-w-3xl mx-auto py-8 px-4" style={{ fontFamily: 'var(--font-body)' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trimStart();

        // Heading
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-semibold text-gray-800 mt-6 mb-2" style={{ fontFamily: 'var(--font-ui)' }}>
              {renderPlaybookLine(trimmed.slice(4), idx, onChipClick)}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-lg font-semibold text-gray-900 mt-8 mb-3 pb-1 border-b border-gray-200" style={{ fontFamily: 'var(--font-ui)' }}>
              {renderPlaybookLine(trimmed.slice(3), idx, onChipClick)}
            </h2>
          );
        }
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'var(--font-ui)' }}>
              {renderPlaybookLine(trimmed.slice(2), idx, onChipClick)}
            </h1>
          );
        }

        // Numbered list
        if (/^\d+\./.test(trimmed)) {
          return (
            <div key={idx} className="flex gap-2 ml-4 mb-1 text-[15px] text-gray-700 leading-relaxed">
              <span className="text-gray-400 font-mono text-sm mt-0.5 shrink-0">{trimmed.match(/^\d+/)![0]}.</span>
              <span>{renderPlaybookLine(trimmed.replace(/^\d+\.\s*/, ''), idx, onChipClick)}</span>
            </div>
          );
        }

        // Bullet list
        if (trimmed.startsWith('- ')) {
          return (
            <div key={idx} className="flex gap-2 ml-4 mb-1 text-[15px] text-gray-700 leading-relaxed">
              <span className="text-gray-400 mt-1 shrink-0">•</span>
              <span>{renderPlaybookLine(trimmed.slice(2), idx, onChipClick)}</span>
            </div>
          );
        }

        // Empty line
        if (trimmed === '') {
          return <div key={idx} className="h-3" />;
        }

        // Normal paragraph
        return (
          <p key={idx} className="text-[15px] text-gray-700 leading-relaxed mb-1">
            {renderPlaybookLine(line, idx, onChipClick)}
          </p>
        );
      })}
    </div>
  );
}

// ─── Flow Tab (Compiled DAG) ────────────────────────────────────────────

function FlowTab() {
  const parsed = useMemo(() => parsePlaybook(CLAIMS_PLAYBOOK_CONTENT, REGISTRY), []);
  const graph = useMemo(() => compilePlaybookToGraph(parsed), [parsed]);

  // Calculate bounding box
  const minX = Math.min(...graph.nodes.map(n => n.position?.x ?? 0)) - 60;
  const maxX = Math.max(...graph.nodes.map(n => n.position?.x ?? 0)) + 240;
  const minY = Math.min(...graph.nodes.map(n => n.position?.y ?? 0)) - 40;
  const maxY = Math.max(...graph.nodes.map(n => n.position?.y ?? 0)) + 100;
  const width = maxX - minX;
  const height = maxY - minY;

  const getNodeCenter = useCallback((nodeId: string) => {
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node?.position) return { x: 0, y: 0 };
    return { x: node.position.x - minX + 90, y: node.position.y - minY + 30 };
  }, [graph.nodes, minX, minY]);

  return (
    <div className="w-full h-full overflow-auto bg-gray-50 p-4">
      {/* Read-only notice */}
      <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2">
        <span>🔒</span>
        <span>This view is compiled from your playbook. Edit the document to change the flow.</span>
      </div>

      {/* SVG DAG */}
      <div className="overflow-auto rounded-xl border border-gray-200 bg-white" style={{ minHeight: 400 }}>
        <svg
          viewBox={`0 0 ${width + 120} ${height + 80}`}
          width={width + 120}
          height={height + 80}
          className="block"
        >
          {/* Edges */}
          {graph.edges.map((edge) => {
            const from = getNodeCenter(edge.from);
            const to = getNodeCenter(edge.to);
            const isDashed = edge.type === 'guard-block' || edge.type === 'conditional-false';
            const color =
              edge.type === 'guard-pass' ? '#16A34A' :
              edge.type === 'guard-block' ? '#E11D48' :
              edge.type === 'conditional-true' ? '#16A34A' :
              edge.type === 'conditional-false' ? '#DC2626' :
              edge.type === 'data-flow' ? '#0D9488' :
              '#94A3B8';

            // Curved path
            const midX = (from.x + to.x) / 2;
            const d = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;

            return (
              <g key={edge.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray={isDashed ? '6 4' : undefined}
                  markerEnd="url(#arrowhead)"
                />
                {edge.label && (
                  <text
                    x={midX}
                    y={(from.y + to.y) / 2 - 6}
                    textAnchor="middle"
                    fill={color}
                    fontSize={9}
                    fontWeight={500}
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Arrowhead marker */}
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" />
            </marker>
          </defs>

          {/* Skill regions */}
          {graph.skillRegions.map((region, i) => {
            const regionNodes = graph.nodes.filter(n => region.nodeIds.includes(n.id));
            if (regionNodes.length === 0) return null;
            const rxMin = Math.min(...regionNodes.map(n => (n.position?.x ?? 0) - minX)) - 10;
            const rxMax = Math.max(...regionNodes.map(n => (n.position?.x ?? 0) - minX)) + 195;
            const ryMin = Math.min(...regionNodes.map(n => (n.position?.y ?? 0) - minY)) - 10;
            const ryMax = Math.max(...regionNodes.map(n => (n.position?.y ?? 0) - minY)) + 70;
            return (
              <g key={`region-${i}`}>
                <rect
                  x={rxMin}
                  y={ryMin}
                  width={rxMax - rxMin}
                  height={ryMax - ryMin}
                  rx={8}
                  fill={region.color}
                  fillOpacity={0.06}
                  stroke={region.color}
                  strokeOpacity={0.2}
                  strokeWidth={1.5}
                  strokeDasharray="8 4"
                />
                <text x={rxMin + 6} y={ryMin + 14} fill={region.color} fontSize={10} fontWeight={600} opacity={0.7}>
                  ✨ {region.label}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {graph.nodes.map((node) => {
            const x = (node.position?.x ?? 0) - minX;
            const y = (node.position?.y ?? 0) - minY;
            const color = NODE_COLORS[node.type] || '#6B7280';
            const icon = NODE_ICONS[node.type] || '●';
            const isDecision = node.type === 'decision';
            const isGate = node.type === 'gate';

            if (isDecision) {
              // Diamond shape
              return (
                <g key={node.id}>
                  <polygon
                    points={`${x + 90},${y} ${x + 180},${y + 30} ${x + 90},${y + 60} ${x},${y + 30}`}
                    fill="white"
                    stroke={color}
                    strokeWidth={2}
                  />
                  <text x={x + 90} y={y + 34} textAnchor="middle" fill={color} fontSize={9} fontWeight={500}>
                    {node.label.length > 30 ? node.label.slice(0, 30) + '...' : node.label}
                  </text>
                </g>
              );
            }

            return (
              <g key={node.id} className="cursor-pointer">
                <rect
                  x={x}
                  y={y}
                  width={180}
                  height={isGate ? 52 : 48}
                  rx={isGate ? 20 : 10}
                  fill="white"
                  stroke={color}
                  strokeWidth={2}
                />
                <rect
                  x={x}
                  y={y}
                  width={180}
                  height={isGate ? 52 : 48}
                  rx={isGate ? 20 : 10}
                  fill={color}
                  fillOpacity={0.08}
                />
                {/* Colored left accent */}
                <rect
                  x={x}
                  y={y}
                  width={4}
                  height={isGate ? 52 : 48}
                  rx={2}
                  fill={color}
                />
                <text x={x + 14} y={y + (isGate ? 20 : 18)} fill="#374151" fontSize={12}>
                  {icon}
                </text>
                <text x={x + 30} y={y + (isGate ? 21 : 19)} fill="#374151" fontSize={11} fontWeight={600}>
                  {node.label.length > 18 ? node.label.slice(0, 18) + '...' : node.label}
                </text>
                <text x={x + 14} y={y + (isGate ? 38 : 36)} fill="#9CA3AF" fontSize={9}>
                  {node.type.replace(/-/g, ' ')}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-gray-500">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <span key={type} className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm" style={{ background: color }} />
            {type.replace(/-/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Inspector Sidebar ──────────────────────────────────────────────────

function InspectorDetails({ chip, chipType, chipName }: { chip: SmartChip | null; chipType: ChipType; chipName: string }) {
  if (!chip) {
    return (
      <div className="p-4">
        <div className="mb-3">
          <InlineChip type={chipType} name={chipName} />
        </div>
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <div className="font-semibold mb-1">Unresolved Reference</div>
          <div className="text-xs text-red-500">@{chipType}({chipName}) is not in the registry.</div>
          <button className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700">
            Create →
          </button>
        </div>
      </div>
    );
  }

  const colors = CHIP_COLORS[chip.type];
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <InlineChip type={chip.type} name={chip.name} />
        <div className="mt-2 text-xs text-gray-500">{chip.registryId}</div>
      </div>

      {/* Metadata card */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Version</span>
          <span className="font-mono font-medium">{chip.version}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Status</span>
          <span
            className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{
              background: chip.status === 'resolved' ? '#DCFCE7' : chip.status === 'draft' ? '#FEF9C3' : '#FEE2E2',
              color: chip.status === 'resolved' ? '#166534' : chip.status === 'draft' ? '#854D0E' : '#991B1B',
            }}
          >
            {chip.status.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Owner</span>
          <span className="text-gray-700">{chip.owner}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Permission</span>
          <span className="text-gray-700">{chip.permissions.currentUser}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Usage</span>
          <span className="text-gray-700">{chip.usageCount} playbooks</span>
        </div>
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
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  background: chip.healthStatus === 'healthy' ? '#16A34A' : chip.healthStatus === 'degraded' ? '#EAB308' : '#DC2626'
                }}
              />
              <span className="text-gray-700">{chip.healthStatus}</span>
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
        <div className="text-xs text-gray-700 leading-relaxed">{chip.description}</div>
      </div>

      {/* Actions */}
      <div className="space-y-1.5">
        <button
          className="w-full text-left px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          style={{ color: colors.bg }}
        >
          Open in Registry →
        </button>
      </div>
    </div>
  );
}

function ProblemSpaceVisualizer() {
  const parsed = useMemo(() => parsePlaybook(CLAIMS_PLAYBOOK_CONTENT, REGISTRY), []);

  const triggers = parsed.referencesByType.trigger || [];
  const skills = parsed.referencesByType.skill || [];
  const tools = parsed.referencesByType.tool || [];
  const connectors = parsed.referencesByType.connector || [];
  const docs = parsed.referencesByType.doc || [];
  const guards = parsed.referencesByType.guard || [];
  const schemas = parsed.referencesByType.schema || [];
  const data = parsed.referencesByType.data || [];

  const cx = 140, cy = 140;

  function arcSegments(items: { name: string }[], radius: number, color: string, startAngle: number, arcSpan: number) {
    if (items.length === 0) return null;
    const step = arcSpan / items.length;
    return items.map((item, i) => {
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
      <div className="text-xs font-semibold text-gray-700 mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
        Problem Space Visualizer
      </div>
      <svg viewBox="0 0 280 280" className="w-full">
        {/* Outer ring — Guards (rose) */}
        <circle cx={cx} cy={cy} r={125} fill="none" stroke="#E11D48" strokeWidth={2} strokeDasharray="4 2" opacity={0.3} />

        {/* Middle ring — Tools + Connectors */}
        <circle cx={cx} cy={cy} r={90} fill="none" stroke="#94A3B8" strokeWidth={1} strokeDasharray="2 2" opacity={0.2} />

        {/* Inner ring — Skills */}
        <circle cx={cx} cy={cy} r={55} fill="#7C3AED" fillOpacity={0.04} stroke="#7C3AED" strokeWidth={1} strokeDasharray="2 2" opacity={0.3} />

        {/* Center — Agent */}
        <circle cx={cx} cy={cy} r={22} fill="#1A73E8" fillOpacity={0.1} stroke="#1A73E8" strokeWidth={2} />
        <text x={cx} y={cy - 3} textAnchor="middle" fill="#1A73E8" fontSize={12}>🔄</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#1A73E8" fontSize={7} fontWeight={600}>LOOP</text>

        {/* Triggers (top arc) */}
        {arcSegments(triggers.filter((t, i, a) => a.findIndex(x => x.name === t.name) === i), 125, '#EA580C', -120, 60)}

        {/* Guards (outer ring, bottom) */}
        {arcSegments(guards.filter((t, i, a) => a.findIndex(x => x.name === t.name) === i), 120, '#E11D48', 30, 120)}

        {/* Tools + Connectors (middle ring) */}
        {arcSegments(
          [...tools, ...connectors].filter((t, i, a) => a.findIndex(x => x.name === t.name) === i),
          88, '#4F46E5', -60, 180
        )}

        {/* Skills (inner ring) */}
        {arcSegments(skills.filter((t, i, a) => a.findIndex(x => x.name === t.name) === i), 52, '#7C3AED', 160, 100)}

        {/* Docs (between inner and middle) */}
        {arcSegments(docs.filter((t, i, a) => a.findIndex(x => x.name === t.name) === i), 70, '#0D9488', 120, 60)}

        {/* Schemas (bottom) */}
        {arcSegments(schemas.filter((t, i, a) => a.findIndex(x => x.name === t.name) === i), 88, '#475569', 160, 40)}

        {/* Data */}
        {arcSegments(data.filter((t, i, a) => a.findIndex(x => x.name === t.name) === i), 70, '#059669', 200, 40)}
      </svg>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-2 gap-1 text-[9px]">
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#EA580C'}} />Triggers (entry)</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#7C3AED'}} />Skills (reduce)</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#4F46E5'}} />Tools (capability)</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#2563EB'}} />Connectors (expand)</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#0D9488'}} />Docs (ground)</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#E11D48'}} />Guards (constrain)</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#475569'}} />Schemas (shape)</div>
        <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{background:'#059669'}} />Data (bind)</div>
      </div>
    </div>
  );
}

// ─── Main Editor Component ──────────────────────────────────────────────

type EditorTab = 'document' | 'flow' | 'notebook';
type InspectorTab = 'details' | 'space';

export function PlaybookEditor() {
  const [activeTab, setActiveTab] = useState<EditorTab>('document');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('space');
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [selectedChip, setSelectedChip] = useState<{ chip: SmartChip | null; type: ChipType; name: string } | null>(null);

  const handleChipClick = useCallback((chip: SmartChip | null, type: ChipType, name: string) => {
    setSelectedChip({ chip, type, name });
    setInspectorTab('details');
    setInspectorOpen(true);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[var(--color-surface-0)]">
      {/* ── Top Bar ── */}
      <header className="border-b border-[var(--color-border)] bg-white/90 backdrop-blur-sm shrink-0 z-40">
        <div className="px-4 py-2.5 flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Home</Link>
          <div className="w-px h-5 bg-gray-200" />
          <div className="w-7 h-7 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white text-xs font-bold">
            P
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>
                Claims Processing Agent
              </h1>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700">v2.1</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-50 text-green-600">PUBLISHED</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/history"
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1"
            >
              🕐 History
            </Link>
            <button className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Share
            </button>
            <button className="px-3 py-1.5 text-xs text-white bg-[var(--color-accent)] rounded-lg hover:opacity-90">
              Publish ▾
            </button>
          </div>
        </div>

        {/* ── Tab Bar ── */}
        <div className="px-4 flex gap-0 border-t border-gray-100">
          {(['document', 'flow', 'notebook'] as EditorTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              {tab === 'document' && '📝 Document'}
              {tab === 'flow' && '🔀 Flow'}
              {tab === 'notebook' && '📓 Notebook'}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setInspectorOpen(!inspectorOpen)}
            className="px-3 py-2 text-xs text-gray-500 hover:text-gray-700"
          >
            {inspectorOpen ? 'Hide Inspector ›' : '‹ Inspector'}
          </button>
        </div>
      </header>

      {/* ── Main Content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Canvas ── */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'document' && <DocumentTab onChipClick={handleChipClick} />}
          {activeTab === 'flow' && <FlowTab />}
          {activeTab === 'notebook' && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              <Link to="/notebook" className="text-[var(--color-accent)] hover:underline">
                Open full Notebook view →
              </Link>
            </div>
          )}
        </div>

        {/* ── Inspector Sidebar ── */}
        {inspectorOpen && (
          <div className="w-72 border-l border-[var(--color-border)] bg-white shrink-0 overflow-auto">
            <div className="flex border-b border-gray-100">
              {(['details', 'space'] as InspectorTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setInspectorTab(tab)}
                  className={`flex-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                    inspectorTab === tab
                      ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'details' ? '📋 Details' : '🎯 Space'}
                </button>
              ))}
            </div>

            {inspectorTab === 'details' && (
              selectedChip ? (
                <InspectorDetails chip={selectedChip.chip} chipType={selectedChip.type} chipName={selectedChip.name} />
              ) : (
                <div className="p-4 text-xs text-gray-400 text-center mt-8">
                  Click any @chip in the document to inspect it.
                </div>
              )
            )}

            {inspectorTab === 'space' && <ProblemSpaceVisualizer />}
          </div>
        )}
      </div>
    </div>
  );
}
