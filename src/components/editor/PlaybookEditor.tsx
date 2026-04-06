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
import { REGISTRY, findChip } from '../../data/registry';
import { parsePlaybook, compilePlaybookToGraph } from '../../parser';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip, CompiledGraphNode } from '../../parser/types';
import { usePlaybook, useNotifications, useRegistry } from '../../contexts/AppContext';
import { PublishModal } from '../versioning/PublishModal';
import { ChipAutocomplete } from '../chips/ChipAutocomplete';
import { CreateAssetWizard } from '../shared/CreateAssetWizard';

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

/** adk-fluent construct name for each node type (shown as subtitle) */
const ADK_CONSTRUCT: Record<string, string> = {
  'trigger-entry': 'StreamRunner',
  grounding: 'VertexAiSearchTool',
  'tool-call': 'FunctionTool',
  'connector-call': 'IntegrationToolset',
  agent: 'LlmAgent',
  decision: 'RouteNode',
  gate: 'GateNode',
  output: 'OutputSchema',
  transform: 'TransformNode',
};

const NW = 220; // node width
const NH = 72;  // node height

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
@keyframes slideInRight {
  from { transform: translateX(40px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
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
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium cursor-pointer transition-all mx-0.5"
      style={{
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        boxShadow: glowing ? `0 0 0 2px ${colors.accent}33, 0 0 8px ${colors.accent}22` : 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 1px 3px ${colors.accent}22, 0 0 0 1px ${colors.accent}33`; e.currentTarget.style.transform = 'translateY(-0.5px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = glowing ? `0 0 0 2px ${colors.accent}33, 0 0 8px ${colors.accent}22` : 'none'; e.currentTarget.style.transform = 'none'; }}
      onClick={onClick}
    >
      <span style={{ color: colors.accent }}>{icon}</span> {name}
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

function EditableDocumentTab({
  content, onContentChange, onChipClick, highlightedLines, selectedChipKey, lineRefs, onCreateNew,
}: {
  content: string;
  onContentChange: (content: string) => void;
  onChipClick: (chip: SmartChip | null, type: ChipType, name: string) => void;
  highlightedLines: number[];
  selectedChipKey: string | null;
  lineRefs: React.MutableRefObject<Map<number, HTMLElement>>;
  onCreateNew?: () => void;
}) {
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteFilter, setAutocompleteFilter] = useState('');
  const [justCommittedLine, setJustCommittedLine] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editContainerRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => content.split('\n'), [content]);

  const startEditing = useCallback((lineIdx: number) => {
    setEditingLine(lineIdx);
    setEditText(lines[lineIdx]);
    setAutocompleteOpen(false);
    setAutocompleteFilter('');
  }, [lines]);

  const commitEdit = useCallback(() => {
    if (editingLine === null) return;
    const newLines = [...lines];
    newLines[editingLine] = editText;
    onContentChange(newLines.join('\n'));
    setJustCommittedLine(editingLine);
    setEditingLine(null);
    setAutocompleteOpen(false);
    setAutocompleteFilter('');
    setTimeout(() => setJustCommittedLine(null), 600);
  }, [editingLine, editText, lines, onContentChange]);

  const handleEditChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setEditText(value);
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([a-z:]*)$/);
    if (atMatch) {
      setAutocompleteFilter(atMatch[1]);
      setAutocompleteOpen(true);
    } else {
      setAutocompleteOpen(false);
      setAutocompleteFilter('');
    }
  }, []);

  const handleChipSelect = useCallback((chip: { type: string; name: string }) => {
    const textarea = textareaRef.current;
    const cursorPos = textarea?.selectionStart ?? editText.length;
    const textBeforeCursor = editText.slice(0, cursorPos);
    const atIdx = textBeforeCursor.lastIndexOf('@');
    if (atIdx >= 0) {
      const before = editText.slice(0, atIdx);
      const after = editText.slice(cursorPos);
      const inserted = `@${chip.type}(${chip.name})`;
      setEditText(before + inserted + after);
      setAutocompleteOpen(false);
      setAutocompleteFilter('');
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newCursorPos = atIdx + inserted.length;
          textareaRef.current.selectionStart = newCursorPos;
          textareaRef.current.selectionEnd = newCursorPos;
        }
      }, 0);
    }
  }, [editText]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !autocompleteOpen) {
      e.preventDefault();
      commitEdit();
    }
    if (e.key === 'Escape') {
      if (autocompleteOpen) {
        setAutocompleteOpen(false);
        setAutocompleteFilter('');
      } else {
        setEditingLine(null);
        setAutocompleteOpen(false);
      }
    }
  }, [commitEdit, autocompleteOpen]);

  useEffect(() => {
    if (editingLine !== null && textareaRef.current) {
      textareaRef.current.focus();
      const len = textareaRef.current.value.length;
      textareaRef.current.selectionStart = len;
      textareaRef.current.selectionEnd = len;
    }
  }, [editingLine]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [editText, editingLine]);

  const autocompletePos = useMemo(() => {
    if (!editContainerRef.current) return { top: 0, left: 0 };
    const rect = editContainerRef.current.getBoundingClientRect();
    return { top: rect.bottom + 4, left: rect.left + 16 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingLine, editText, autocompleteOpen]);

  const renderLine = useCallback((line: string, idx: number) => {
    const trimmed = line.trimStart();
    const isHighlighted = highlightedLines.includes(idx);
    const isJustCommitted = justCommittedLine === idx;
    const hlStyle: React.CSSProperties = isHighlighted
      ? { borderLeft: '3px solid #3B82F6', paddingLeft: 12, background: '#EFF6FF', borderRadius: 4, animation: 'lineHighlightPulse 1.5s ease-out' }
      : {};
    const refCb = (el: HTMLElement | null) => { if (el) lineRefs.current.set(idx, el); };
    const wrapperClass = `group/line relative transition-all duration-150 cursor-text rounded-sm ${isJustCommitted ? '' : 'hover:bg-blue-50/40'}`;
    const commitFlashStyle: React.CSSProperties = isJustCommitted
      ? { background: '#DCFCE730', transition: 'background 0.6s ease-out' } : {};
    const clickHandler = (e: React.MouseEvent) => {
      if ((e.target as Element).closest('.inline-chip-click')) return;
      startEditing(idx);
    };
    const hoverBar = <div className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full bg-blue-400 opacity-0 group-hover/line:opacity-100 transition-opacity" />;

    if (trimmed.startsWith('### ')) return (
      <div key={idx} className={wrapperClass} style={commitFlashStyle} onClick={clickHandler}>
        <h3 ref={refCb} className="text-base font-semibold text-gray-800 mt-6 mb-2 transition-all" style={{ fontFamily: 'var(--font-ui)', ...hlStyle }}>
          {renderPlaybookLine(trimmed.slice(4), idx, onChipClick, selectedChipKey)}
        </h3>{hoverBar}
      </div>
    );
    if (trimmed.startsWith('## ')) return (
      <div key={idx} className={wrapperClass} style={commitFlashStyle} onClick={clickHandler}>
        <h2 ref={refCb} className="text-lg font-semibold text-gray-900 mt-8 mb-3 pb-1 border-b border-gray-200 transition-all" style={{ fontFamily: 'var(--font-ui)', ...hlStyle }}>
          {renderPlaybookLine(trimmed.slice(3), idx, onChipClick, selectedChipKey)}
        </h2>{hoverBar}
      </div>
    );
    if (trimmed.startsWith('# ')) return (
      <div key={idx} className={wrapperClass} style={commitFlashStyle} onClick={clickHandler}>
        <h1 ref={refCb} className="text-2xl font-bold text-gray-900 mb-4 transition-all" style={{ fontFamily: 'var(--font-ui)', ...hlStyle }}>
          {renderPlaybookLine(trimmed.slice(2), idx, onChipClick, selectedChipKey)}
        </h1>{hoverBar}
      </div>
    );
    if (/^\d+\./.test(trimmed)) return (
      <div key={idx} className={wrapperClass} style={commitFlashStyle} onClick={clickHandler}>
        <div ref={refCb} className="flex gap-2 ml-4 mb-1 text-[15px] text-gray-700 leading-relaxed transition-all" style={hlStyle}>
          <span className="text-gray-400 font-mono text-sm mt-0.5 shrink-0">{trimmed.match(/^\d+/)![0]}.</span>
          <span>{renderPlaybookLine(trimmed.replace(/^\d+\.\s*/, ''), idx, onChipClick, selectedChipKey)}</span>
        </div>{hoverBar}
      </div>
    );
    if (trimmed.startsWith('- ')) return (
      <div key={idx} className={wrapperClass} style={commitFlashStyle} onClick={clickHandler}>
        <div ref={refCb} className="flex gap-2 ml-4 mb-1 text-[15px] text-gray-700 leading-relaxed transition-all" style={hlStyle}>
          <span className="text-gray-400 mt-1 shrink-0">&bull;</span>
          <span>{renderPlaybookLine(trimmed.slice(2), idx, onChipClick, selectedChipKey)}</span>
        </div>{hoverBar}
      </div>
    );
    if (trimmed === '') return <div key={idx} className="h-3 cursor-text" onClick={clickHandler} />;
    return (
      <div key={idx} className={wrapperClass} style={commitFlashStyle} onClick={clickHandler}>
        <p ref={refCb} className="text-[15px] text-gray-700 leading-relaxed mb-1 transition-all" style={hlStyle}>
          {renderPlaybookLine(line, idx, onChipClick, selectedChipKey)}
        </p>{hoverBar}
      </div>
    );
  }, [highlightedLines, justCommittedLine, selectedChipKey, onChipClick, lineRefs, startEditing]);

  // Pre-compute fenced code block ranges (```...```) so we render them as code, not prose
  const codeBlockRanges = useMemo(() => {
    const ranges: Array<{ start: number; end: number; lang: string }> = [];
    let inBlock = false;
    let blockStart = 0;
    let blockLang = '';
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (!inBlock && trimmed.startsWith('```')) {
        inBlock = true;
        blockStart = i;
        blockLang = trimmed.slice(3).trim();
      } else if (inBlock && trimmed === '```') {
        ranges.push({ start: blockStart, end: i, lang: blockLang });
        inBlock = false;
      }
    }
    return ranges;
  }, [lines]);

  const isInCodeBlock = useCallback((idx: number) => {
    return codeBlockRanges.find(r => idx >= r.start && idx <= r.end);
  }, [codeBlockRanges]);

  // Render code block lines as a styled code block
  const renderCodeBlock = useCallback((range: { start: number; end: number; lang: string }) => {
    const codeLines = lines.slice(range.start + 1, range.end);
    const langLabel = range.lang || 'code';
    // Syntax highlight topology operators
    const highlightLine = (line: string) => {
      if (range.lang !== 'topology') return line;
      return line.split(/(>>|\/\/|\||\*|@\w+\([^)]+\)|Route\([^)]*\)|gate\([^)]*\)|tap\([^)]*\)|until\([^)]*\))/).map((part, i) => {
        if (part === '>>') return <span key={i} style={{ color: '#2563EB', fontWeight: 600 }}>{part}</span>;
        if (part === '|') return <span key={i} style={{ color: '#EA580C', fontWeight: 600 }}>{part}</span>;
        if (part === '*') return <span key={i} style={{ color: '#7C3AED', fontWeight: 600 }}>{part}</span>;
        if (part === '//') return <span key={i} style={{ color: '#E11D48', fontWeight: 600 }}>{part}</span>;
        if (part.startsWith('@')) return <span key={i} style={{ color: '#4F46E5', fontWeight: 500 }}>{part}</span>;
        if (part.startsWith('Route(') || part.startsWith('gate(') || part.startsWith('tap(') || part.startsWith('until('))
          return <span key={i} style={{ color: '#7C3AED', fontWeight: 500 }}>{part}</span>;
        if (part.startsWith('#')) return <span key={i} style={{ color: '#9CA3AF', fontStyle: 'italic' }}>{part}</span>;
        return part;
      });
    };

    return (
      <div key={`codeblock-${range.start}`} className="my-4 rounded-lg overflow-hidden border" style={{ borderColor: '#E2E8F0', background: '#1E293B' }}>
        <div className="flex items-center justify-between px-3 py-1.5" style={{ background: '#334155', borderBottom: '1px solid #475569' }}>
          <span className="text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ color: '#94A3B8' }}>{langLabel}</span>
          {range.lang === 'topology' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: '#4F46E520', color: '#93C5FD' }}>adk-fluent expression</span>
          )}
        </div>
        <pre className="px-4 py-3 text-[12.5px] leading-relaxed overflow-x-auto" style={{ fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)', color: '#E2E8F0', margin: 0 }}>
          {codeLines.map((codeLine, ci) => (
            <div key={ci} className="flex">
              <span className="select-none mr-3 text-right shrink-0" style={{ color: '#475569', width: 20, fontSize: 11 }}>{ci + 1}</span>
              <span>{codeLine.trimStart().startsWith('#') ? <span style={{ color: '#64748B', fontStyle: 'italic' }}>{codeLine}</span> : highlightLine(codeLine)}</span>
            </div>
          ))}
        </pre>
      </div>
    );
  }, [lines]);

  return (
    <div className="max-w-3xl mx-auto py-4 px-3 sm:py-6 sm:px-4 md:py-8 md:px-4" style={{ fontFamily: 'var(--font-body)' }}>
      {(() => {
        const elements: React.ReactNode[] = [];
        let i = 0;
        while (i < lines.length) {
          const codeRange = isInCodeBlock(i);
          if (codeRange && i === codeRange.start) {
            // Render the entire code block as one element
            elements.push(renderCodeBlock(codeRange));
            i = codeRange.end + 1;
            continue;
          }
          if (codeRange) {
            // Skip lines inside a code block (already rendered)
            i++;
            continue;
          }
          // Normal line — editing or display
          if (editingLine === i) {
            const idx = i;
            elements.push(
              <div key={idx} ref={editContainerRef} className="relative my-0.5">
                <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-full" style={{ background: 'var(--color-accent)' }} />
                <textarea
                  ref={textareaRef}
                  value={editText}
                  onChange={handleEditChange}
                  onBlur={() => { if (!autocompleteOpen) setTimeout(commitEdit, 120); }}
                  onKeyDown={handleKeyDown}
                  className="w-full resize-none rounded-lg border-2 pl-4 pr-24 py-2 text-[13px] leading-relaxed outline-none"
                  style={{
                    borderColor: 'var(--color-accent)', background: '#FAFBFF',
                    color: 'var(--color-text-primary)', minHeight: 44,
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  }}
                  rows={1}
                />
                <div className="absolute right-2 top-2 flex items-center gap-1.5 text-[9px] px-1.5 py-0.5 rounded pointer-events-none select-none"
                  style={{ color: 'var(--color-text-tertiary)', background: 'var(--color-surface-2)' }}>
                  <span>Type <kbd className="font-mono bg-white/60 px-0.5 rounded">@</kbd> for refs</span>
                  <span>&middot;</span>
                  <span><kbd className="font-mono bg-white/60 px-0.5 rounded">Enter</kbd> save</span>
                  <span>&middot;</span>
                  <span><kbd className="font-mono bg-white/60 px-0.5 rounded">Esc</kbd> cancel</span>
                </div>
                {autocompleteOpen && (
                  <ChipAutocomplete
                    isOpen={true}
                    onClose={() => { setAutocompleteOpen(false); setAutocompleteFilter(''); }}
                    onSelect={handleChipSelect}
                    position={autocompletePos}
                    filterText={autocompleteFilter}
                    onCreateNew={onCreateNew}
                  />
                )}
              </div>
            );
          } else {
            elements.push(renderLine(lines[i], i));
          }
          i++;
        }
        return elements;
      })()}
    </div>
  );
}

// ─── Interactive Flow Graph ──────────────────────────────────────────────

function FlowGraph({
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

      {/* Controls */}
      <div className={`absolute left-3 z-10 flex gap-1.5 ${parsed.topologyRaw ? 'top-12' : 'top-3'}`}>
        <div className="px-2.5 py-1.5 bg-white/90 backdrop-blur border border-gray-200 rounded-lg text-[11px] text-gray-500 flex items-center gap-1.5 shadow-sm">
          Auto-compiled from playbook · {graph.nodes.length} nodes · {graph.edges.length} edges
        </div>
      </div>
      <div className={`absolute right-3 z-10 flex gap-1.5 ${parsed.topologyRaw ? 'top-12' : 'top-3'}`}>
        <button onClick={fitToScreen} className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-600 hover:bg-gray-50 shadow-sm">
          Fit
        </button>
        <button onClick={() => setZoom(z => Math.min(2, z + 0.15))} className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 shadow-sm">+</button>
        <button onClick={() => setZoom(z => Math.max(0.3, z - 0.15))} className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 shadow-sm">-</button>
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
                  {node.label.length > 22 ? node.label.slice(0, 22) + '…' : node.label}
                </text>
                {/* Type label + adk-fluent construct */}
                <text x={x + 16} y={y + 44} fill="#9CA3AF" fontSize={10}>
                  {node.type.replace(/-/g, ' ')}{ADK_CONSTRUCT[node.type] ? ` · ${ADK_CONSTRUCT[node.type]}` : ''}
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

function InspectorCodeExport({ chip }: { chip: SmartChip }) {
  const [code, setCode] = React.useState<import('../../services/adk-fluent').AssetCodeResult | null>(null);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { addNotification } = useNotifications();

  React.useEffect(() => {
    if (!open || code) return;
    setLoading(true);
    import('../../services/adk-fluent').then(({ getAdkFluentService }) =>
      getAdkFluentService()
        .generateAssetCode({ type: chip.type, name: chip.name, description: chip.description, metadata: chip.metadata ?? {} })
        .then((r) => { setCode(r); setLoading(false); })
        .catch(() => setLoading(false))
    );
  }, [open, code, chip.type, chip.name, chip.description, chip.metadata]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        style={{ color: '#7C3AED' }}
      >
        <span className="font-mono text-[10px] font-semibold">adk-fluent</span>
        <span style={{ color: '#374151' }}>{open ? 'Hide' : 'View'} Python Code</span>
        <span className="ml-auto">{open ? '\u25BE' : '\u25B8'}</span>
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg overflow-hidden border border-gray-200">
          {loading ? (
            <div className="px-3 py-3 text-[10px] text-gray-400 text-center">Generating...</div>
          ) : code ? (
            <>
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <code className="text-[10px] font-mono text-violet-700">{code.expression}</code>
              </div>
              <pre className="m-0 px-3 py-2 text-[10px] leading-relaxed font-mono overflow-x-auto max-h-48 overflow-y-auto" style={{ background: '#1E1E2E', color: '#CDD6F4' }}>
                {code.python}
              </pre>
              <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-200 flex items-center gap-1.5">
                <button
                  className="text-[9px] font-medium px-2 py-0.5 rounded bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(code.python).then(() => {
                      addNotification({ type: 'success', title: 'Copied!', message: 'adk-fluent code copied to clipboard.' });
                    });
                  }}
                >
                  Copy Code
                </button>
                <span className="text-[9px] text-gray-400 ml-auto">{code.dependencies.join(', ')}</span>
              </div>
            </>
          ) : (
            <div className="px-3 py-2 text-[10px] text-gray-400">Not available</div>
          )}
        </div>
      )}
    </div>
  );
}

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

      {/* adk-fluent Code Export */}
      <InspectorCodeExport chip={chip} />

      <button className="w-full text-left px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        style={{ color: colors.accent }}>
        Open in Registry →
      </button>

      {/* Context Strategy Card */}
      <ContextStrategyCard />
    </div>
  );
}

function ProblemSpaceVisualizer({ content }: { content: string }) {
  const parsed = useMemo(() => parsePlaybook(content, REGISTRY), [content]);

  const TINTED: Record<string, { bg: string; accent: string; text: string; tint: string; border: string }> = {
    trigger:   { bg: '#FFF7ED', accent: '#EA580C', text: '#C2410C', tint: '#FFEDD5', border: '#FED7AA' },
    skill:     { bg: '#F5F3FF', accent: '#7C3AED', text: '#6D28D9', tint: '#EDE9FE', border: '#DDD6FE' },
    tool:      { bg: '#EEF2FF', accent: '#4F46E5', text: '#4338CA', tint: '#E0E7FF', border: '#C7D2FE' },
    connector: { bg: '#EFF6FF', accent: '#2563EB', text: '#1D4ED8', tint: '#DBEAFE', border: '#BFDBFE' },
    doc:       { bg: '#F0FDFA', accent: '#0D9488', text: '#0F766E', tint: '#CCFBF1', border: '#99F6E4' },
    guard:     { bg: '#FFF1F2', accent: '#E11D48', text: '#BE123C', tint: '#FFE4E6', border: '#FECDD3' },
    schema:    { bg: '#F8FAFC', accent: '#475569', text: '#334155', tint: '#E2E8F0', border: '#CBD5E1' },
    data:      { bg: '#ECFDF5', accent: '#059669', text: '#047857', tint: '#D1FAE5', border: '#A7F3D0' },
    agent:     { bg: '#FFFBEB', accent: '#D97706', text: '#B45309', tint: '#FEF3C7', border: '#FDE68A' },
  };

  const cx = 150, cy = 150;

  // Deduplicate refs by name
  function dedup(refs: { name: string }[]): { name: string }[] {
    return refs.filter((r, i, a) => a.findIndex(x => x.name === r.name) === i);
  }

  // Get unique refs for each ring
  const triggers = dedup(parsed.referencesByType.trigger || []);
  const skills = dedup(parsed.referencesByType.skill || []);
  const docs = dedup(parsed.referencesByType.doc || []);
  const tools = dedup(parsed.referencesByType.tool || []);
  const connectors = dedup(parsed.referencesByType.connector || []);
  const dataRefs = dedup(parsed.referencesByType.data || []);
  const guards = dedup(parsed.referencesByType.guard || []);
  const schemas = dedup(parsed.referencesByType.schema || []);
  const actionRing = [...tools.map(t => ({ ...t, _type: 'tool' as const })), ...connectors.map(c => ({ ...c, _type: 'connector' as const })), ...dataRefs.map(d => ({ ...d, _type: 'data' as const }))];

  // Radii for each ring
  const R_SKILL = 42;
  const R_DOC = 68;
  const R_ACTION = 98;
  const R_GUARD = 128;

  // Pill dimensions — scale down slightly if many items
  function pillSize(count: number): { w: number; h: number; font: number } {
    if (count <= 4) return { w: 56, h: 20, font: 7.5 };
    if (count <= 6) return { w: 50, h: 18, font: 7 };
    return { w: 44, h: 16, font: 6.5 };
  }

  // Place nodes evenly around a ring within an angular range (degrees)
  function placeOnRing(items: { name: string; _type?: string }[], radius: number, type: string, startDeg: number, endDeg: number) {
    if (!items.length) return null;
    const count = items.length;
    const { w, h, font } = pillSize(count);
    const spanDeg = endDeg - startDeg;
    const stepDeg = count === 1 ? 0 : spanDeg / (count - 1);

    return items.map((item, i) => {
      const angleDeg = count === 1 ? (startDeg + endDeg) / 2 : startDeg + i * stepDeg;
      const angleRad = (angleDeg - 90) * Math.PI / 180; // -90 so 0deg = top
      const x = cx + radius * Math.cos(angleRad);
      const y = cy + radius * Math.sin(angleRad);
      const chipType = (item as { _type?: string })._type || type;
      const colors = TINTED[chipType] || TINTED.tool;
      const label = item.name.length > 9 ? item.name.slice(0, 8) + '\u2026' : item.name;

      return (
        <g key={`${chipType}-${item.name}`}>
          <rect
            x={x - w / 2} y={y - h / 2}
            width={w} height={h}
            rx={h / 2}
            fill={colors.tint}
            stroke={colors.accent}
            strokeWidth={1}
          />
          <text
            x={x} y={y + font * 0.36}
            textAnchor="middle"
            fill={colors.text}
            fontSize={font}
            fontWeight={600}
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            {label}
          </text>
        </g>
      );
    });
  }

  // Draw guard wall arcs between guard nodes
  function guardWallArcs() {
    if (guards.length < 2) return null;
    const count = guards.length;
    const startDeg = 30;
    const endDeg = 330;
    const stepDeg = (endDeg - startDeg) / (count - 1);
    const arcs: React.ReactNode[] = [];
    for (let i = 0; i < count - 1; i++) {
      const a1 = (startDeg + i * stepDeg - 90) * Math.PI / 180;
      const a2 = (startDeg + (i + 1) * stepDeg - 90) * Math.PI / 180;
      // Arc segment between adjacent guards
      const x1 = cx + R_GUARD * Math.cos(a1);
      const y1 = cy + R_GUARD * Math.sin(a1);
      const x2 = cx + R_GUARD * Math.cos(a2);
      const y2 = cy + R_GUARD * Math.sin(a2);
      arcs.push(
        <path
          key={`guard-wall-${i}`}
          d={`M ${x1} ${y1} A ${R_GUARD} ${R_GUARD} 0 0 1 ${x2} ${y2}`}
          fill="none"
          stroke={TINTED.guard.accent}
          strokeWidth={1.5}
          strokeDasharray="6 3"
          opacity={0.35}
        />
      );
    }
    return arcs;
  }

  // Stats counts
  const actionCount = tools.length + connectors.length + dataRefs.length;
  const statItems = [
    { count: triggers.length, label: 'triggers', type: 'trigger' },
    { count: skills.length, label: 'skills', type: 'skill' },
    { count: actionCount, label: 'actions', type: 'tool' },
    { count: guards.length, label: 'guards', type: 'guard' },
  ].filter(s => s.count > 0);

  const legendItems = [
    { type: 'trigger', label: 'Triggers (entry)' },
    { type: 'skill', label: 'Skills (reduce)' },
    { type: 'tool', label: 'Tools + Connectors (actions)' },
    { type: 'doc', label: 'Docs (ground)' },
    { type: 'guard', label: 'Guards (constrain)' },
    { type: 'schema', label: 'Schemas (shape)' },
  ];

  return (
    <div className="p-4">
      <div className="text-xs font-semibold text-gray-700 mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
        Problem Space Visualizer
      </div>

      {/* SVG Diagram */}
      <svg viewBox="0 0 300 300" className="w-full">
        <defs>
          <style>{`
            @keyframes agent-pulse {
              0%, 100% { r: 18; opacity: 0.12; }
              50% { r: 22; opacity: 0.06; }
            }
            .agent-pulse-ring { animation: agent-pulse 3s ease-in-out infinite; }
          `}</style>
        </defs>

        {/* Ring guides — very subtle dotted lines */}
        <circle cx={cx} cy={cy} r={R_SKILL} fill="none" stroke="#94A3B8" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.1} />
        <circle cx={cx} cy={cy} r={R_DOC} fill="none" stroke="#94A3B8" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.1} />
        <circle cx={cx} cy={cy} r={R_ACTION} fill="none" stroke="#94A3B8" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.1} />
        <circle cx={cx} cy={cy} r={R_GUARD} fill="none" stroke={TINTED.guard.accent} strokeWidth={0.5} strokeDasharray="3 4" opacity={0.15} />

        {/* Guard wall arcs between guard nodes */}
        {guardWallArcs()}

        {/* Center — Agent Loop node */}
        <circle className="agent-pulse-ring" cx={cx} cy={cy} r={20} fill="#1A73E8" opacity={0.1} />
        <circle cx={cx} cy={cy} r={16} fill="#EFF6FF" stroke="#1A73E8" strokeWidth={1.5} />
        <text x={cx} y={cy - 2} textAnchor="middle" fill="#1A73E8" fontSize={6.5} fontWeight={700} style={{ fontFamily: 'var(--font-ui)' }}>
          AGENT
        </text>
        <text x={cx} y={cy + 6.5} textAnchor="middle" fill="#1A73E8" fontSize={5.5} fontWeight={600} style={{ fontFamily: 'var(--font-ui)' }}>
          LOOP
        </text>
        {/* Small circular arrows icon around center */}
        <path
          d={`M ${cx + 10} ${cy - 5} A 11 11 0 1 1 ${cx + 5} ${cy - 10}`}
          fill="none" stroke="#1A73E8" strokeWidth={0.8} opacity={0.4}
          markerEnd="url(#arrow-head)"
        />
        <defs>
          <marker id="arrow-head" markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
            <path d="M0,0 L4,2 L0,4" fill="#1A73E8" opacity="0.4" />
          </marker>
        </defs>

        {/* Ring 1 — Triggers at top arc */}
        {placeOnRing(triggers.map(t => ({ ...t, _type: 'trigger' })), R_GUARD + 6, 'trigger', -50, 50)}

        {/* Ring 1 (innermost) — Skills */}
        {placeOnRing(skills.map(s => ({ ...s, _type: 'skill' })), R_SKILL, 'skill', 120, 240)}

        {/* Ring 2 — Docs (grounding anchors) */}
        {placeOnRing(docs.map(d => ({ ...d, _type: 'doc' })), R_DOC, 'doc', 200, 320)}

        {/* Ring 3 — Tools + Connectors + Data (actions ring) */}
        {placeOnRing(actionRing, R_ACTION, 'tool', 60, 300)}

        {/* Ring 4 — Guards (outermost, wall segments) */}
        {placeOnRing(guards.map(g => ({ ...g, _type: 'guard' })), R_GUARD, 'guard', 30, 330)}

        {/* Schemas — output funnels at the bottom */}
        {placeOnRing(schemas.map(s => ({ ...s, _type: 'schema' })), R_DOC + 10, 'schema', 340, 380)}
      </svg>

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
        {statItems.map(s => {
          const colors = TINTED[s.type];
          return (
            <span
              key={s.label}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
              style={{
                background: colors.tint,
                color: colors.text,
                border: `1px solid ${colors.border}`,
              }}
            >
              {s.count} {s.label}
            </span>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 justify-center">
        {legendItems.map(item => {
          const colors = TINTED[item.type];
          return (
            <div key={item.label} className="flex items-center gap-1 text-[9px] text-gray-500" style={{ fontFamily: 'var(--font-ui)' }}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors.accent }} />
              {item.label}
            </div>
          );
        })}
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
          {activeTab === 'document' && 'Click any @reference to inspect \u00B7 Type @ to insert'}
          {activeTab === 'flow' && 'Compiled graph \u00B7 Click nodes to view source'}
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
