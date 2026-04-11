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
