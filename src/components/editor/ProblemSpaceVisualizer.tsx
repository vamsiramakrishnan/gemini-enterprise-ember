/**
 * ProblemSpaceVisualizer — Radial diagram showing the agent's action space.
 *
 * Renders a concentric ring visualization of all @-references in the playbook:
 *   - Center: the agent loop
 *   - Inner ring: skills (reduce the space)
 *   - Mid-inner ring: docs (grounding anchors)
 *   - Middle ring: tools + connectors + data (available actions)
 *   - Outer ring: guards (hard boundary walls)
 *   - Top arc: triggers (entry points)
 *   - Bottom: schemas (output shape)
 *
 * Each ring updates reactively as @-references are added or removed from
 * the playbook, making the "reducing the problem space" concept tangible.
 *
 * Uses the playbook parser to extract references by type and the REGISTRY
 * for resolution.
 */

import React, { useMemo } from 'react';
import { parsePlaybook } from '../../parser';
import { REGISTRY } from '../../data/registry';

// ─── Tinted color palette per chip type ─────────────────────────────────

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

// ─── Ring radii ─────────────────────────────────────────────────────────

const R_SKILL = 42;
const R_DOC = 68;
const R_ACTION = 98;
const R_GUARD = 128;

// ─── Helpers ────────────────────────────────────────────────────────────

/** Deduplicate refs by name, keeping the first occurrence. */
function dedup(refs: { name: string }[]): { name: string }[] {
  return refs.filter((r, i, a) => a.findIndex(x => x.name === r.name) === i);
}

/** Compute pill dimensions scaled for item count. */
function pillSize(count: number): { w: number; h: number; font: number } {
  if (count <= 4) return { w: 56, h: 20, font: 7.5 };
  if (count <= 6) return { w: 50, h: 18, font: 7 };
  return { w: 44, h: 16, font: 6.5 };
}

// ─── ProblemSpaceVisualizer ─────────────────────────────────────────────

export function ProblemSpaceVisualizer({ content }: { content: string }) {
  const parsed = useMemo(() => parsePlaybook(content, REGISTRY), [content]);

  const cx = 150, cy = 150;

  // Get unique refs for each ring
  const triggers = dedup(parsed.referencesByType.trigger || []);
  const skills = dedup(parsed.referencesByType.skill || []);
  const docs = dedup(parsed.referencesByType.doc || []);
  const tools = dedup(parsed.referencesByType.tool || []);
  const connectors = dedup(parsed.referencesByType.connector || []);
  const dataRefs = dedup(parsed.referencesByType.data || []);
  const guards = dedup(parsed.referencesByType.guard || []);
  const schemas = dedup(parsed.referencesByType.schema || []);
  const actionRing = [
    ...tools.map(t => ({ ...t, _type: 'tool' as const })),
    ...connectors.map(c => ({ ...c, _type: 'connector' as const })),
    ...dataRefs.map(d => ({ ...d, _type: 'data' as const })),
  ];

  /**
   * Place pill-shaped nodes evenly around a ring within an angular range.
   * `startDeg` and `endDeg` are in degrees; 0 = top (12 o'clock).
   */
  function placeOnRing(
    items: { name: string; _type?: string }[],
    radius: number,
    type: string,
    startDeg: number,
    endDeg: number,
  ) {
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

  /** Draw dashed arc segments between adjacent guard nodes on the outer ring. */
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

        {/* Ring guides -- very subtle dotted lines */}
        <circle cx={cx} cy={cy} r={R_SKILL} fill="none" stroke="#94A3B8" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.1} />
        <circle cx={cx} cy={cy} r={R_DOC} fill="none" stroke="#94A3B8" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.1} />
        <circle cx={cx} cy={cy} r={R_ACTION} fill="none" stroke="#94A3B8" strokeWidth={0.5} strokeDasharray="2 4" opacity={0.1} />
        <circle cx={cx} cy={cy} r={R_GUARD} fill="none" stroke={TINTED.guard.accent} strokeWidth={0.5} strokeDasharray="3 4" opacity={0.15} />

        {/* Guard wall arcs between guard nodes */}
        {guardWallArcs()}

        {/* Center -- Agent Loop node */}
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

        {/* Ring 1 -- Triggers at top arc */}
        {placeOnRing(triggers.map(t => ({ ...t, _type: 'trigger' })), R_GUARD + 6, 'trigger', -50, 50)}

        {/* Ring 1 (innermost) -- Skills */}
        {placeOnRing(skills.map(s => ({ ...s, _type: 'skill' })), R_SKILL, 'skill', 120, 240)}

        {/* Ring 2 -- Docs (grounding anchors) */}
        {placeOnRing(docs.map(d => ({ ...d, _type: 'doc' })), R_DOC, 'doc', 200, 320)}

        {/* Ring 3 -- Tools + Connectors + Data (actions ring) */}
        {placeOnRing(actionRing, R_ACTION, 'tool', 60, 300)}

        {/* Ring 4 -- Guards (outermost, wall segments) */}
        {placeOnRing(guards.map(g => ({ ...g, _type: 'guard' })), R_GUARD, 'guard', 30, 330)}

        {/* Schemas -- output funnels at the bottom */}
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
