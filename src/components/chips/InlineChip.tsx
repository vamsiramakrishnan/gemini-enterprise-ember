/**
 * InlineChip — Inline smart chip component for @-references.
 *
 * Renders a colored pill for each @type(name) reference in the playbook.
 * Resolved chips show with their type's accent color; unresolved chips
 * render with a dashed red border and warning style.
 *
 * Also exports `renderPlaybookLine` (parses a line of text and replaces
 * @type(name) tokens with InlineChip components) and `findNodeForChip`
 * (looks up the compiled graph node corresponding to a chip reference).
 *
 * These helpers are shared across the editor, notebook, and inspector views.
 */

import React from 'react';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import { findChip } from '../../data/registry';
import type { ChipType, SmartChip, CompiledGraphNode } from '../../parser/types';

// ─── InlineChip ─────────────────────────────────────────────────────────

export function InlineChip({
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
        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border-[1.5px] border-dashed cursor-pointer mx-0.5 transition-all duration-150 hover:scale-[1.03] active:scale-[0.97]"
        style={{
          borderColor: '#EF4444',
          color: '#DC2626',
          background: 'linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)',
        }}
        onClick={onClick}
      >
        <span className="opacity-70">⚠</span> {name}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-[3px] rounded-full text-[11px] font-semibold cursor-pointer mx-0.5 group/chip"
      style={{
        background: `linear-gradient(135deg, ${colors.bg} 0%, ${colors.tint} 100%)`,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        boxShadow: glowing
          ? `0 0 0 3px ${colors.accent}25, 0 0 12px ${colors.accent}18, inset 0 1px 0 rgba(255,255,255,0.5)`
          : `inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 2px ${colors.accent}08`,
        transition: 'all 180ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        letterSpacing: '-0.01em',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 2px 8px ${colors.accent}20, 0 0 0 2px ${colors.accent}18, inset 0 1px 0 rgba(255,255,255,0.6)`;
        e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
        e.currentTarget.style.borderColor = colors.accent + '55';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = glowing
          ? `0 0 0 3px ${colors.accent}25, 0 0 12px ${colors.accent}18, inset 0 1px 0 rgba(255,255,255,0.5)`
          : `inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 2px ${colors.accent}08`;
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.borderColor = colors.border;
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px) scale(1.03)';
      }}
      onClick={onClick}
    >
      <span
        className="text-[10px] transition-transform duration-150"
        style={{ color: colors.accent, filter: `drop-shadow(0 0 2px ${colors.accent}30)` }}
      >
        {icon}
      </span>
      {name}
    </span>
  );
}

// ─── findNodeForChip ────────────────────────────────────────────────────

/**
 * Find the compiled graph node that corresponds to a given chip type and name.
 */
export function findNodeForChip(
  nodes: CompiledGraphNode[], chipType: ChipType, chipName: string,
): CompiledGraphNode | undefined {
  return nodes.find(
    (n) => n.chipType === chipType && n.label === chipName,
  );
}

// ─── renderPlaybookLine ─────────────────────────────────────────────────

/**
 * Parse a single line of playbook text and replace all @type(name) tokens
 * with InlineChip components. Returns an array of strings and JSX elements
 * suitable for rendering inside a React element.
 */
export function renderPlaybookLine(
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
