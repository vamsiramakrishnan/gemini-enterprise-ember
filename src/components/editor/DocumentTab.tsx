/**
 * DocumentTab — Editable document view for the Playbook Editor.
 *
 * Renders the playbook as rich markdown with inline smart chips. Each line
 * is individually editable on click; typing `@` opens the ChipAutocomplete
 * dropdown to insert new references. Supports fenced code blocks with
 * syntax highlighting for topology expressions.
 *
 * Extracted from PlaybookEditor.tsx to keep the orchestrator lean.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { renderPlaybookLine } from '../chips/InlineChip';
import { ChipAutocomplete } from '../chips/ChipAutocomplete';
import type { ChipType, SmartChip } from '../../parser/types';

// ─── EditableDocumentTab ────────────────────────────────────────────────

export function EditableDocumentTab({
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
