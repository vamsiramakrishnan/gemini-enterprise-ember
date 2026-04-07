/**
 * StructuredEditor — Block-based agent playbook editor.
 *
 * Design philosophy: Clarity, Ease, Intuition, Delight.
 *
 * Clarity:  Every section teaches what belongs inside it.
 *           Empty states guide; filled states celebrate.
 * Ease:     Progressive disclosure hides complexity until needed.
 *           Keyboard-first, mouse-friendly.
 * Intuition: Color = meaning. Shape = type. Position = relationship.
 *           You never need to read a manual.
 * Delight:  Micro-animations reward actions. Transitions feel alive.
 *           The editor feels like it's working *with* you.
 *
 * Every block maps 1:1 to an adk-fluent construct.
 * Skills and agents expand inline for progressive disclosure.
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { CHIP_COLORS, CHIP_ICONS } from '../../../parser/types';
import type { ChipType, SmartChip } from '../../../parser/types';
import { useRegistry } from '../../../contexts/AppContext';
import {
  parsePlaybookToBlocks,
  createEmptyBlock,
  createEmptySection,
  BLOCK_META,
  SECTION_META,
  type EditorSection,
  type EditorBlock,
  type SectionType,
} from '../../../data/blocks';
import { SlashCommandMenu } from './SlashCommandMenu';
import type { SlashCommandItem } from './SlashCommandMenu';

// ─── Google Cloud Design Tokens ──────────────────────────────────────
const GC = {
  // Surfaces
  bg:          '#FEFBFF',
  surface:     '#FFFFFF',
  surfaceDim:  '#F8F9FA',
  surfaceTint: '#F1F3F4',
  // Text
  textPrimary:   '#1F1F1F',
  textSecondary: '#5F6368',
  textTertiary:  '#9AA0A6',
  textDisabled:  '#DADCE0',
  // Brand
  blue:    '#4285F4',
  red:     '#EA4335',
  yellow:  '#FBBC04',
  green:   '#34A853',
  // Borders
  border:      '#DADCE0',
  borderLight: '#E8EAED',
  borderFocus: '#4285F4',
  // Accents (refined from chip colors, harmonized with GC palette)
  trigger:   '#E8710A',
  skill:     '#8430CE',
  tool:      '#4285F4',
  connector: '#1A73E8',
  guard:     '#EA4335',
  doc:       '#1E8E3E',
  schema:    '#5F6368',
  agent:     '#F9AB00',
  data:      '#1E8E3E',
  code:      '#E8710A',
};

// Section accent colors — maps section types to their thematic color
const SECTION_COLORS: Record<SectionType, string> = {
  identity:   GC.agent,
  triggers:   GC.trigger,
  skills:     GC.skill,
  knowledge:  GC.doc,
  systems:    GC.connector,
  topology:   '#6366F1',
  process:    GC.green,
  escalation: GC.red,
  output:     GC.schema,
  compliance: GC.guard,
  custom:     GC.textTertiary,
};

// Section empty state hints — what to add when a section is empty
const SECTION_HINTS: Record<SectionType, { prompt: string; suggestion: string; shortcut: string }> = {
  identity:   { prompt: 'Who is this agent?', suggestion: 'Describe the agent\'s role and personality', shortcut: 'Type to start writing...' },
  triggers:   { prompt: 'How does this agent wake up?', suggestion: 'Add a trigger: chat, inbox, webhook, schedule, or event', shortcut: '/trigger' },
  skills:     { prompt: 'What expertise does this agent have?', suggestion: 'Add reusable skills for tone, compliance, or domain knowledge', shortcut: '/skill' },
  knowledge:  { prompt: 'What should this agent know?', suggestion: 'Add documents, policies, or data stores for grounding', shortcut: '/doc' },
  systems:    { prompt: 'What can this agent connect to?', suggestion: 'Add tools and connectors (Jira, Salesforce, Slack...)', shortcut: '/connector or /tool' },
  topology:   { prompt: 'How do the pieces fit together?', suggestion: 'Define the execution flow with >> | * operators', shortcut: '/code' },
  process:    { prompt: 'What steps should this agent follow?', suggestion: 'Write the core instructions with @-references inline', shortcut: 'Type to start writing...' },
  escalation: { prompt: 'When should this agent ask for help?', suggestion: 'Add conditions, guards, and agent delegations', shortcut: '/condition or /guard' },
  output:     { prompt: 'What shape should responses take?', suggestion: 'Add a schema to constrain the output format', shortcut: '/schema' },
  compliance: { prompt: 'What are the hard boundaries?', suggestion: 'Add safety guards: PII redaction, budget limits, topic blocks', shortcut: '/guard' },
  custom:     { prompt: 'What goes here?', suggestion: 'Add any block type with /', shortcut: '/' },
};

// ─── Chip regex ──────────────────────────────────────────────────────
const CHIP_RE = /@(doc|tool|agent|guard|data|schema|connector|skill|trigger)\(([^)]+)\)/g;

// ─── CSS keyframes (injected once) ──────────────────────────────────
const STYLE_ID = 'structured-editor-animations';
function ensureStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes se-fadeSlideIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes se-scaleIn {
      from { opacity: 0; transform: scale(0.96); }
      to   { opacity: 1; transform: scale(1); }
    }
    @keyframes se-pulseOnce {
      0%   { box-shadow: 0 0 0 0 rgba(66,133,244,0.3); }
      70%  { box-shadow: 0 0 0 6px rgba(66,133,244,0); }
      100% { box-shadow: 0 0 0 0 rgba(66,133,244,0); }
    }
    @keyframes se-shimmer {
      0%   { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .se-block-enter {
      animation: se-fadeSlideIn 250ms ease-out;
    }
    .se-section-enter {
      animation: se-scaleIn 200ms ease-out;
    }
    .se-chip:hover {
      box-shadow: 0 0 0 2px currentColor !important;
      transform: translateY(-1px);
    }
    .se-block-wrapper:focus-within {
      border-left-color: var(--block-accent) !important;
    }
    .se-add-zone {
      transition: all 200ms ease;
    }
    .se-add-zone:hover .se-add-line {
      background: #E8EAED !important;
    }
    .se-add-zone:hover .se-add-btn {
      opacity: 1 !important;
      transform: scale(1) !important;
    }
    .se-section-header:hover .se-section-desc {
      opacity: 1 !important;
      max-height: 20px !important;
    }
  `;
  document.head.appendChild(style);
}

// ─── Mock skill expansion content ────────────────────────────────────
const SKILL_EXPANSIONS: Record<string, { sections: { title: string; content: string }[]; meta: string }> = {
  'customer-empathy': {
    meta: 'v1.3 \u00B7 Workspace \u00B7 Pinned',
    sections: [
      { title: 'Tone Guidelines', content: 'When a customer expresses frustration, acknowledge their feelings before addressing the issue. Use @doc(empathy-playbook) for response templates.' },
      { title: 'De-escalation', content: 'If sentiment score drops below 0.3, activate @guard(escalation-check) and consider routing to @agent(human-support).' },
      { title: 'Response Rules', content: 'Always end with a forward-looking statement. Never say "unfortunately." Use @tool(sentiment) to gauge customer mood.' },
    ],
  },
  'apac-compliance': {
    meta: 'v2.0 \u00B7 Workspace \u00B7 On-Demand',
    sections: [
      { title: 'Regional Rules', content: 'When handling Singapore customers, reference @doc(mas-guidelines-2024) and apply @guard(pdpa-compliance).' },
      { title: 'Connected Data', content: 'Search @connector(salesforce) for customer jurisdiction data. Verify regulatory status via @tool(regtech-api).' },
      { title: 'Escalation', content: 'If a query involves cross-border transactions, route to @agent(compliance-officer) with full context attached.' },
    ],
  },
};


// ─── Inline Chip Renderer ─────────────────────────────────────────────
function renderInlineChips(text: string, chips: SmartChip[]) {
  const parts: (string | React.ReactElement)[] = [];
  let lastIndex = 0;
  const re = new RegExp(CHIP_RE.source, 'g');
  let match;
  while ((match = re.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const chipType = match[1] as ChipType;
    const chipName = match[2];
    const colors = CHIP_COLORS[chipType];
    const icon = CHIP_ICONS[chipType];
    const resolved = chips.some(c => c.type === chipType && c.name === chipName);
    parts.push(
      <span
        key={`${match.index}-${chipName}`}
        className="se-chip"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 10px 2px 7px',
          borderRadius: 14,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'var(--font-ui, "Google Sans", sans-serif)',
          background: resolved ? colors.bg : '#FCE8E6',
          color: resolved ? colors.text : GC.red,
          border: `1px ${resolved ? 'solid' : 'dashed'} ${resolved ? colors.border : '#F28B82'}`,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          verticalAlign: 'middle',
          lineHeight: '22px',
          transition: 'all 150ms ease',
        }}
        title={resolved ? `${chipType}: ${chipName} (resolved)` : `${chipType}: ${chipName} (unresolved — click to create)`}
      >
        <span style={{ fontSize: 10, opacity: 0.8 }}>{icon}</span>
        {chipName}
        {!resolved && <span style={{ fontSize: 9, marginLeft: 2 }}>⚠</span>}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

// ─── Block Type Icon ─────────────────────────────────────────────────
function BlockTypeTag({ type, subtle }: { type: string; subtle?: boolean }) {
  const meta = BLOCK_META[type as keyof typeof BLOCK_META];
  if (!meta) return null;
  if (subtle) {
    return (
      <span style={{
        fontSize: 10, color: meta.color, fontFamily: 'var(--font-ui)',
        fontWeight: 500, letterSpacing: '0.02em', opacity: 0.7,
        textTransform: 'uppercase',
      }}>
        {meta.label}
      </span>
    );
  }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      fontSize: 10, color: meta.color, fontFamily: 'var(--font-ui)',
      fontWeight: 500, padding: '1px 6px', borderRadius: 4,
      background: `${meta.color}10`,
    }}>
      <span style={{ fontSize: 9 }}>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

// ─── Block Wrapper ────────────────────────────────────────────────────
function BlockWrapper({ block, children, onDelete, isNew }: {
  block: EditorBlock;
  children: React.ReactNode;
  onDelete?: () => void;
  isNew?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const meta = BLOCK_META[block.type];
  const accentColor = meta.color;

  return (
    <div
      className={`se-block-wrapper ${isNew ? 'se-block-enter' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        '--block-accent': accentColor,
        position: 'relative',
        borderLeft: `3px solid ${hovered ? accentColor : 'transparent'}`,
        borderRadius: '0 8px 8px 0',
        background: GC.surface,
        marginBottom: 2,
        padding: '12px 16px 12px 14px',
        transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: hovered ? `0 1px 8px rgba(60,64,67,0.07), 0 1px 3px rgba(60,64,67,0.06)` : 'none',
      } as React.CSSProperties}
    >
      {/* Drag handle — appears on hover, with tooltip */}
      <span
        style={{
          position: 'absolute', left: -20, top: '50%', transform: 'translateY(-50%)',
          fontSize: 10, color: GC.textDisabled, cursor: 'grab', userSelect: 'none',
          opacity: hovered ? 0.7 : 0, transition: 'opacity 200ms',
        }}
        title="Drag to reorder"
      >
        ⋮⋮
      </span>

      {children}

      {/* Footer: adk expression + block type tag — only on hover */}
      {hovered && (block.adkExpression || block.type !== 'instruction') && (
        <div style={{
          marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          animation: 'se-fadeSlideIn 150ms ease-out',
        }}>
          {block.adkExpression ? (
            <code style={{
              fontSize: 10,
              fontFamily: 'var(--font-mono, "Roboto Mono", monospace)',
              color: GC.textTertiary, letterSpacing: '0.02em',
              background: GC.surfaceTint, padding: '2px 6px', borderRadius: 4,
            }}>
              {block.adkExpression}
            </code>
          ) : <span />}
          <BlockTypeTag type={block.type} subtle />
        </div>
      )}

      {/* Delete — only on hover, with confirmation feel */}
      {hovered && onDelete && (
        <button
          onClick={onDelete}
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 24, height: 24, borderRadius: 6,
            border: 'none', background: 'transparent',
            color: GC.textDisabled, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FCE8E6'; e.currentTarget.style.color = GC.red; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = GC.textDisabled; }}
          title="Remove block"
        >
          ×
        </button>
      )}
    </div>
  );
}


// ─── Block Type Renderers ─────────────────────────────────────────────

function InstructionBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  return (
    <div style={{ fontSize: 14, lineHeight: 1.8, fontFamily: 'var(--font-body, "Google Sans Text", Georgia, serif)', color: GC.textPrimary, letterSpacing: '-0.01em' }}>
      {block.content.split('\n').map((line, i) => (
        <div key={i} style={{ minHeight: 26 }}>{renderInlineChips(line, chips)}</div>
      ))}
    </div>
  );
}

function TriggerBlockView({ block }: { block: EditorBlock }) {
  const name = block.chipRef?.name ?? 'unknown';
  const triggerType = name.includes(':') ? name.split(':')[0] : name;
  const detail = name.includes(':') ? name.split(':').slice(1).join(':') : '';
  const typeIcons: Record<string, string> = { chat: '💬', inbox: '📥', schedule: '🕐', webhook: '🔗', jira: '🎫', drive: '📁', slack: '💬', gmail: '✉️' };
  const typeLabels: Record<string, string> = {
    chat: 'Real-time conversation', inbox: 'Async queue', schedule: 'Scheduled',
    jira: 'Jira webhook', drive: 'Drive event', slack: 'Slack event', gmail: 'Gmail event',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: '#FEF3E2',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
      }}>
        {typeIcons[triggerType] ?? '⚡'}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: GC.textPrimary, fontFamily: 'var(--font-ui)' }}>
            {name}
          </span>
          <span style={{ fontSize: 10, color: GC.textTertiary, fontFamily: 'var(--font-ui)' }}>
            {typeLabels[triggerType] ?? 'Event trigger'}
          </span>
        </div>
        {detail && (
          <div style={{ fontSize: 12, color: GC.textSecondary, fontFamily: 'var(--font-ui)', marginTop: 2 }}>
            {triggerType === 'schedule' ? `Runs: ${detail}` : `Listens: ${detail}`}
          </div>
        )}
      </div>
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 12,
        background: '#E6F4EA', color: '#1E8E3E', fontFamily: 'var(--font-ui)',
        letterSpacing: '0.04em', textTransform: 'uppercase',
      }}>
        Active
      </span>
    </div>
  );
}

function SkillBlockView({ block, chips, expanded, onToggle }: { block: EditorBlock; chips: SmartChip[]; expanded: boolean; onToggle: () => void }) {
  const name = block.chipRef?.name ?? '';
  const expansion = SKILL_EXPANSIONS[name];
  const chip = chips.find(c => c.type === 'skill' && c.name === name);
  return (
    <div>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
        {/* Expand chevron with smooth rotation */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
          <path d="M6 4l4 4-4 4" stroke={GC.skill} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: '#F3E8FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: GC.skill, flexShrink: 0,
        }}>
          ✦
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: GC.textPrimary, fontFamily: 'var(--font-ui)' }}>{name}</div>
          <div style={{ fontSize: 12, color: GC.textSecondary, fontFamily: 'var(--font-ui)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {chip?.description ? chip.description.slice(0, 60) : 'Reusable skill bundle'}
          </div>
        </div>
        {expansion && (
          <span style={{ fontSize: 11, color: GC.textTertiary, fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>{expansion.meta}</span>
        )}
        {/* Expand hint */}
        <span style={{ fontSize: 10, color: GC.textDisabled, fontFamily: 'var(--font-ui)' }}>
          {expanded ? 'collapse' : `${expansion?.sections.length ?? 0} sections`}
        </span>
      </div>
      {/* Progressive disclosure — expanded skill content */}
      {expanded && expansion && (
        <div style={{
          marginTop: 12, marginLeft: 20, padding: '16px 20px',
          borderLeft: `2px solid #E8DAFF`, background: '#FDFAFF',
          borderRadius: '0 12px 12px 0',
          animation: 'se-fadeSlideIn 200ms ease-out',
        }}>
          <div style={{ fontSize: 11, color: GC.textTertiary, marginBottom: 14, fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: GC.textSecondary }}>Claims Agent</span>
            <span style={{ color: GC.textDisabled }}>›</span>
            <span style={{ fontWeight: 600, color: GC.skill }}>@skill({name})</span>
          </div>
          {expansion.sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: i < expansion.sections.length - 1 ? 16 : 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: GC.textPrimary, marginBottom: 4, fontFamily: 'var(--font-ui)' }}>
                {sec.title}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: GC.textSecondary, fontFamily: 'var(--font-body, Georgia, serif)' }}>
                {renderInlineChips(sec.content, chips)}
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${GC.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: GC.blue, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              Edit in Skill Editor →
            </span>
            <span style={{ fontSize: 10, color: GC.textDisabled, fontFamily: 'var(--font-mono)' }}>
              Skill("{name}/SKILL.md")
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function SimpleRefBlock({ block, chips, icon, accentColor, bgColor }: {
  block: EditorBlock; chips: SmartChip[];
  icon: string; accentColor: string; bgColor: string;
}) {
  const name = block.chipRef?.name ?? '';
  const chipType = block.chipRef?.type;
  const chip = chipType ? chips.find(c => c.type === chipType && c.name === name) : undefined;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: bgColor,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: accentColor, flexShrink: 0,
        transition: 'transform 150ms',
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: GC.textPrimary, fontFamily: 'var(--font-ui)' }}>{name}</div>
        <div style={{ fontSize: 12, color: GC.textSecondary, fontFamily: 'var(--font-ui)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chip?.description ?? BLOCK_META[block.type].description}
        </div>
      </div>
      {chip?.version && (
        <span style={{ fontSize: 10, color: GC.textTertiary, fontFamily: 'var(--font-mono)', background: GC.surfaceTint, padding: '1px 6px', borderRadius: 4 }}>
          {chip.version}
        </span>
      )}
    </div>
  );
}

function ConnectorBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  const name = block.chipRef?.name ?? '';
  const chip = chips.find(c => c.type === 'connector' && c.name === name);
  const meta = chip?.metadata as Record<string, unknown> | undefined;
  const syncStatus = (meta?.syncStatus as string) ?? 'active';
  const entities = (meta?.entities as Array<{ name: string; enabled: boolean }>) ?? [];
  const enabledCount = entities.filter(e => e.enabled).length;
  const statusColors: Record<string, string> = { active: GC.green, syncing: GC.yellow, error: GC.red, paused: GC.textTertiary };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: '#E8F0FE',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: GC.connector, flexShrink: 0,
      }}>
        ◈
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: GC.textPrimary, fontFamily: 'var(--font-ui)' }}>{name}</div>
        <div style={{ fontSize: 12, color: GC.textSecondary, fontFamily: 'var(--font-ui)', marginTop: 1 }}>
          {chip?.description ?? 'Enterprise connector'}{enabledCount > 0 ? ` · ${enabledCount} entities` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: statusColors[syncStatus] ?? GC.textTertiary,
          boxShadow: syncStatus === 'active' ? `0 0 4px ${GC.green}40` : 'none',
        }} />
        <span style={{ fontSize: 10, color: GC.textTertiary, fontFamily: 'var(--font-ui)', textTransform: 'capitalize' }}>{syncStatus}</span>
      </div>
    </div>
  );
}

function GuardBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  const name = block.chipRef?.name ?? '';
  const chip = chips.find(c => c.type === 'guard' && c.name === name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: '#FCE8E6',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: GC.guard, flexShrink: 0,
      }}>
        △
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: GC.textPrimary, fontFamily: 'var(--font-ui)' }}>{name}</div>
        <div style={{ fontSize: 12, color: GC.textSecondary, fontFamily: 'var(--font-ui)', marginTop: 1 }}>
          {chip?.description ?? 'Safety guard'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, fontSize: 10, fontFamily: 'var(--font-ui)' }}>
        <span style={{ padding: '2px 6px', borderRadius: 4, background: '#E6F4EA', color: '#1E8E3E' }}>✓ pass</span>
        <span style={{ padding: '2px 6px', borderRadius: 4, background: '#FCE8E6', color: GC.red }}>✗ block</span>
      </div>
    </div>
  );
}

function AgentBlockView({ block, chips, expanded, onToggle }: { block: EditorBlock; chips: SmartChip[]; expanded: boolean; onToggle: () => void }) {
  const name = block.chipRef?.name ?? '';
  const chip = chips.find(c => c.type === 'agent' && c.name === name);
  return (
    <div>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
          <path d="M6 4l4 4-4 4" stroke={GC.agent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: '#FEF7E0',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: GC.agent, flexShrink: 0,
        }}>
          ◎
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: GC.textPrimary, fontFamily: 'var(--font-ui)' }}>{name}</div>
          <div style={{ fontSize: 12, color: GC.textSecondary, fontFamily: 'var(--font-ui)', marginTop: 1 }}>
            {chip?.description ?? 'Sub-agent delegation'}
          </div>
        </div>
        <span style={{ fontSize: 10, color: GC.textDisabled, fontFamily: 'var(--font-ui)' }}>
          {expanded ? 'collapse' : 'expand'}
        </span>
      </div>
      {expanded && (
        <div style={{
          marginTop: 12, marginLeft: 20, padding: '16px 20px',
          borderLeft: `2px solid #FEEFC3`, background: '#FFFDF5',
          borderRadius: '0 12px 12px 0',
          animation: 'se-fadeSlideIn 200ms ease-out',
        }}>
          <div style={{ fontSize: 11, color: GC.textTertiary, marginBottom: 8, fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: GC.textSecondary }}>Claims Agent</span>
            <span style={{ color: GC.textDisabled }}>›</span>
            <span style={{ fontWeight: 600, color: GC.agent }}>@agent({name})</span>
          </div>
          <div style={{ fontSize: 13, color: GC.textSecondary, fontFamily: 'var(--font-body, Georgia, serif)', lineHeight: 1.7 }}>
            {chip?.description ?? `Delegated agent handling specialized processing for ${name}.`}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${GC.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 12, color: GC.blue, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              Open Agent →
            </span>
            <span style={{ fontSize: 10, color: GC.textDisabled, fontFamily: 'var(--font-mono)' }}>
              Agent("{name}")
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ConditionalBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      <div style={{
        width: 32, height: 32, borderRadius: 8, background: '#FFF0F0',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: GC.red, flexShrink: 0, marginTop: 2,
      }}>
        ◆
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.7, color: GC.textPrimary, fontFamily: 'var(--font-body, Georgia, serif)' }}>
        {renderInlineChips(block.content, chips)}
      </div>
    </div>
  );
}

function CodeBlockView({ block }: { block: EditorBlock }) {
  return (
    <div style={{
      background: '#202124', borderRadius: 8, padding: '14px 16px',
      fontFamily: 'var(--font-mono, "Roboto Mono", monospace)',
      fontSize: 12, lineHeight: 1.7, color: '#E8EAED',
      overflow: 'auto', maxHeight: 200,
    }}>
      <div style={{ fontSize: 10, color: GC.trigger, marginBottom: 8, fontFamily: 'var(--font-ui)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        <span>⚠</span> Code Execution · Dev Only
      </div>
      {block.content.split('\n').map((line, i) => (
        <div key={i} style={{ whiteSpace: 'pre' }}>{line}</div>
      ))}
    </div>
  );
}


// ─── Block Renderer (dispatch) ────────────────────────────────────────
function BlockRenderer({ block, chips, expanded, onToggle, onDelete, isNew }: {
  block: EditorBlock; chips: SmartChip[]; expanded: boolean; onToggle: () => void; onDelete: () => void; isNew?: boolean;
}) {
  const inner = (() => {
    switch (block.type) {
      case 'instruction':  return <InstructionBlockView block={block} chips={chips} />;
      case 'trigger':      return <TriggerBlockView block={block} />;
      case 'skill':        return <SkillBlockView block={block} chips={chips} expanded={expanded} onToggle={onToggle} />;
      case 'tool':         return <SimpleRefBlock block={block} chips={chips} icon="⬡" accentColor={GC.tool} bgColor="#E8F0FE" />;
      case 'connector':    return <ConnectorBlockView block={block} chips={chips} />;
      case 'guard':        return <GuardBlockView block={block} chips={chips} />;
      case 'doc':          return <SimpleRefBlock block={block} chips={chips} icon="◇" accentColor={GC.doc} bgColor="#E6F4EA" />;
      case 'schema':       return <SimpleRefBlock block={block} chips={chips} icon="▢" accentColor={GC.schema} bgColor={GC.surfaceTint} />;
      case 'agent':        return <AgentBlockView block={block} chips={chips} expanded={expanded} onToggle={onToggle} />;
      case 'conditional':  return <ConditionalBlockView block={block} chips={chips} />;
      case 'code':         return <CodeBlockView block={block} />;
      case 'data':         return <SimpleRefBlock block={block} chips={chips} icon="▣" accentColor={GC.data} bgColor="#E6F4EA" />;
      default:             return <div style={{ fontSize: 12, color: GC.textTertiary }}>Unknown block type: {block.type}</div>;
    }
  })();

  return <BlockWrapper block={block} onDelete={onDelete} isNew={isNew}>{inner}</BlockWrapper>;
}

// ─── Add Block Divider — The "+" that feels alive ────────────────────
function AddBlockDivider({ onAdd, hint }: { onAdd: (pos: { top: number; left: number }) => void; hint?: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="se-add-zone"
      style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <div className="se-add-line" style={{ height: 1, width: '100%', background: 'transparent', transition: 'background 200ms' }} />
      <button
        ref={btnRef}
        className="se-add-btn"
        onClick={() => {
          const rect = btnRef.current?.getBoundingClientRect();
          if (rect) onAdd({ top: rect.bottom + 4, left: rect.left });
        }}
        style={{
          position: 'absolute', width: 24, height: 24, borderRadius: '50%',
          border: `1.5px solid ${GC.borderLight}`, background: GC.surface,
          color: GC.textTertiary, fontSize: 15, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 4px rgba(60,64,67,0.06)',
          transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: 0, transform: 'scale(0.8)',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = GC.blue; e.currentTarget.style.color = GC.blue; e.currentTarget.style.background = '#E8F0FE'; e.currentTarget.style.transform = 'scale(1.1)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = GC.borderLight; e.currentTarget.style.color = GC.textTertiary; e.currentTarget.style.background = GC.surface; e.currentTarget.style.transform = 'scale(1)'; }}
        title={hint ?? 'Add block (/)'}
      >
        +
      </button>
    </div>
  );
}

// ─── Empty Section State — teaches users what belongs here ───────────
function EmptySection({ sectionType, onAdd }: { sectionType: SectionType; onAdd: (pos: { top: number; left: number }) => void }) {
  const hint = SECTION_HINTS[sectionType];
  const color = SECTION_COLORS[sectionType];
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div style={{
      padding: '20px 24px', border: `1.5px dashed ${GC.borderLight}`,
      borderRadius: 12, textAlign: 'center',
      background: `linear-gradient(135deg, ${color}03 0%, ${GC.surface} 100%)`,
      transition: 'all 200ms',
    }}>
      <div style={{ fontSize: 14, color: GC.textSecondary, fontFamily: 'var(--font-ui)', fontWeight: 500, marginBottom: 4 }}>
        {hint.prompt}
      </div>
      <div style={{ fontSize: 12, color: GC.textTertiary, fontFamily: 'var(--font-ui)', marginBottom: 12 }}>
        {hint.suggestion}
      </div>
      <button
        ref={btnRef}
        onClick={() => {
          const rect = btnRef.current?.getBoundingClientRect();
          if (rect) onAdd({ top: rect.bottom + 4, left: rect.left - 120 });
        }}
        style={{
          fontSize: 12, fontWeight: 500, fontFamily: 'var(--font-ui)',
          padding: '6px 16px', borderRadius: 20,
          border: `1px solid ${color}30`, background: `${color}08`,
          color, cursor: 'pointer',
          transition: 'all 150ms',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.borderColor = `${color}50`; }}
        onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.borderColor = `${color}30`; }}
      >
        + Add with {hint.shortcut}
      </button>
    </div>
  );
}

// ─── Section Component — now with color identity and description ─────
function SectionComponent({ section, chips, expandedBlocks, newBlockIds, onToggleBlock, onDeleteBlock, onAddBlock, onToggleCollapse }: {
  section: EditorSection; chips: SmartChip[]; expandedBlocks: Set<string>; newBlockIds: Set<string>;
  onToggleBlock: (blockId: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
  onAddBlock: (sectionId: string, afterBlockId: string | null, pos: { top: number; left: number }) => void;
  onToggleCollapse: () => void;
}) {
  const blockCount = section.blocks.length;
  const sectionColor = SECTION_COLORS[section.type];
  const sectionMeta = SECTION_META[section.type];

  return (
    <div className="se-section-enter" style={{ marginBottom: 28 }}>
      {/* Section heading — with colored accent, icon, and reveal description */}
      <div
        className="se-section-header"
        onClick={onToggleCollapse}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 0 6px', cursor: 'pointer', userSelect: 'none',
          position: 'relative',
        }}
      >
        {/* Colored dot indicator */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
          background: section.collapsed ? GC.textDisabled : sectionColor,
          transition: 'all 200ms',
          boxShadow: section.collapsed ? 'none' : `0 0 6px ${sectionColor}30`,
        }} />
        {/* Chevron */}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)', transform: section.collapsed ? 'rotate(0deg)' : 'rotate(90deg)', flexShrink: 0 }}>
          <path d="M6 4l4 4-4 4" stroke={section.collapsed ? GC.textTertiary : sectionColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {/* Section icon */}
        <span style={{ fontSize: 13, color: section.collapsed ? GC.textTertiary : sectionColor, transition: 'color 200ms' }}>
          {sectionMeta.icon}
        </span>
        {/* Title */}
        <span style={{
          fontSize: 14, fontWeight: 600, fontFamily: 'var(--font-ui)',
          color: section.collapsed ? GC.textSecondary : GC.textPrimary,
          transition: 'color 200ms', letterSpacing: '-0.01em',
        }}>
          {section.title}
        </span>
        {/* Block count badge */}
        {blockCount > 0 && (
          <span style={{
            fontSize: 10, fontWeight: 600, color: section.collapsed ? GC.textTertiary : sectionColor,
            fontFamily: 'var(--font-ui)', background: section.collapsed ? GC.surfaceTint : `${sectionColor}10`,
            padding: '1px 8px', borderRadius: 10,
            transition: 'all 200ms',
          }}>
            {blockCount}
          </span>
        )}
        {/* Collapsed inline summary — shows chip names */}
        {section.collapsed && blockCount > 0 && (
          <span style={{ fontSize: 12, color: GC.textTertiary, fontFamily: 'var(--font-ui)', marginLeft: 4, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {section.blocks.slice(0, 4).map(b => b.chipRef?.name ?? '').filter(Boolean).join(' · ')}
            {blockCount > 4 ? ` +${blockCount - 4}` : ''}
          </span>
        )}
        {/* Description — reveals on hover, hidden when collapsed */}
        {!section.collapsed && (
          <span
            className="se-section-desc"
            style={{
              fontSize: 11, color: GC.textTertiary, fontFamily: 'var(--font-ui)',
              opacity: 0, maxHeight: 0, overflow: 'hidden',
              transition: 'all 200ms', marginLeft: 'auto', whiteSpace: 'nowrap',
            }}
          >
            {sectionMeta.description}
          </span>
        )}
      </div>

      {/* Section blocks */}
      {!section.collapsed && (
        <div style={{
          paddingLeft: 16, marginTop: 4,
          borderLeft: `1px solid ${sectionColor}15`,
          marginLeft: 3,
        }}>
          {section.blocks.map((block) => (
            <div key={block.id}>
              <BlockRenderer
                block={block} chips={chips}
                expanded={expandedBlocks.has(block.id)}
                onToggle={() => onToggleBlock(block.id)}
                onDelete={() => onDeleteBlock(section.id, block.id)}
                isNew={newBlockIds.has(block.id)}
              />
              <AddBlockDivider onAdd={(pos) => onAddBlock(section.id, block.id, pos)} />
            </div>
          ))}
          {blockCount === 0 && (
            <EmptySection
              sectionType={section.type}
              onAdd={(pos) => onAddBlock(section.id, null, pos)}
            />
          )}
        </div>
      )}
    </div>
  );
}


// ─── Source View ──────────────────────────────────────────────────────
function SourceView({ content }: { content: string }) {
  return (
    <div style={{
      background: '#202124', borderRadius: 12, padding: 20,
      fontFamily: 'var(--font-mono, "Roboto Mono", monospace)',
      fontSize: 12, lineHeight: 1.8, color: '#E8EAED',
      overflow: 'auto', flex: 1, whiteSpace: 'pre-wrap', minHeight: 0,
    }}>
      {content.split('\n').map((line, i) => (
        <div key={i} style={{ display: 'flex' }}>
          <span style={{ width: 36, textAlign: 'right', color: '#5F6368', fontSize: 11, marginRight: 16, flexShrink: 0, userSelect: 'none' }}>
            {i + 1}
          </span>
          <span>{line || ' '}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Minimap / Outline — quick section navigation ────────────────────
function SectionOutline({ sections, onJump }: { sections: EditorSection[]; onJump: (sectionId: string) => void }) {
  return (
    <div style={{
      position: 'sticky', top: 16, padding: '12px 0',
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: GC.textTertiary, fontFamily: 'var(--font-ui)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, paddingLeft: 8 }}>
        Outline
      </div>
      {sections.map(s => {
        const color = SECTION_COLORS[s.type];
        const meta = SECTION_META[s.type];
        return (
          <button
            key={s.id}
            onClick={() => onJump(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 8px', borderRadius: 6,
              border: 'none', background: 'transparent',
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = GC.surfaceTint; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: GC.textSecondary, fontFamily: 'var(--font-ui)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.title}
            </span>
            <span style={{ fontSize: 10, color: GC.textDisabled, fontFamily: 'var(--font-ui)', marginLeft: 'auto', flexShrink: 0 }}>
              {meta.icon}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main StructuredEditor ────────────────────────────────────────────
interface StructuredEditorProps {
  content: string;
  onContentChange?: (content: string) => void;
}

export function StructuredEditor({ content }: StructuredEditorProps) {
  const { chips } = useRegistry();
  const [viewMode, setViewMode] = useState<'blocks' | 'source'>('blocks');
  const [sections, setSections] = useState<EditorSection[]>([]);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [newBlockIds, setNewBlockIds] = useState<Set<string>>(new Set());
  const [slashMenu, setSlashMenu] = useState<{
    open: boolean; position: { top: number; left: number };
    sectionId: string; afterBlockId: string | null;
  }>({ open: false, position: { top: 0, left: 0 }, sectionId: '', afterBlockId: null });
  const contentRef = useRef<HTMLDivElement>(null);

  // Inject animation styles
  useEffect(() => { ensureStyles(); }, []);

  useMemo(() => {
    setSections(parsePlaybookToBlocks(content));
  }, [content]);

  const toggleBlock = useCallback((blockId: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      next.has(blockId) ? next.delete(blockId) : next.add(blockId);
      return next;
    });
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s));
  }, []);

  const deleteBlock = useCallback((sectionId: string, blockId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) } : s
    ));
  }, []);

  const openSlashMenu = useCallback((sectionId: string, afterBlockId: string | null, pos: { top: number; left: number }) => {
    setSlashMenu({ open: true, position: pos, sectionId, afterBlockId });
  }, []);

  const handleSlashSelect = useCallback((item: SlashCommandItem) => {
    if (item.action.type === 'insert-block') {
      const newBlock = createEmptyBlock(item.action.blockType);
      newBlock.content = `New ${BLOCK_META[item.action.blockType].label} block`;
      if (newBlock.chipRef) newBlock.chipRef.name = `new-${item.action.blockType}`;
      newBlock.adkExpression = item.adkConstruct ?? '';
      // Track new block for entrance animation
      setNewBlockIds(prev => new Set(prev).add(newBlock.id));
      setTimeout(() => {
        setNewBlockIds(prev => { const n = new Set(prev); n.delete(newBlock.id); return n; });
      }, 300);
      setSections(prev => prev.map(s => {
        if (s.id !== slashMenu.sectionId) return s;
        if (slashMenu.afterBlockId === null) return { ...s, blocks: [...s.blocks, newBlock] };
        const idx = s.blocks.findIndex(b => b.id === slashMenu.afterBlockId);
        const blocks = [...s.blocks];
        blocks.splice(idx + 1, 0, newBlock);
        return { ...s, blocks };
      }));
    } else if (item.action.type === 'insert-section') {
      const newSection = createEmptySection(item.action.sectionType);
      setSections(prev => {
        const idx = prev.findIndex(s => s.id === slashMenu.sectionId);
        const next = [...prev];
        next.splice(idx + 1, 0, newSection);
        return next;
      });
    }
    setSlashMenu(prev => ({ ...prev, open: false }));
  }, [slashMenu]);

  const jumpToSection = useCallback((sectionId: string) => {
    // Uncollapse and scroll
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, collapsed: false } : s));
    // Scroll to section element
    setTimeout(() => {
      const el = contentRef.current?.querySelector(`[data-section-id="${sectionId}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, []);

  const totalBlocks = sections.reduce((n, s) => n + s.blocks.length, 0);
  const chipRefCount = sections.reduce((n, s) => n + s.blocks.filter(b => b.chipRef).length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: GC.bg, position: 'relative' }}>
      {/* Toolbar — informative, not cluttered */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 20px', borderBottom: `1px solid ${GC.borderLight}`,
        background: GC.surface,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: GC.textTertiary, fontFamily: 'var(--font-ui)' }}>
          <span>{sections.length} sections</span>
          <span style={{ color: GC.textDisabled }}>·</span>
          <span>{totalBlocks} blocks</span>
          <span style={{ color: GC.textDisabled }}>·</span>
          <span style={{ color: GC.blue }}>{chipRefCount} @-references</span>
        </div>
        <div style={{
          display: 'flex', borderRadius: 8, border: `1px solid ${GC.borderLight}`,
          overflow: 'hidden',
        }}>
          {(['blocks', 'source'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                fontSize: 11, fontWeight: 500, padding: '4px 14px',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                background: viewMode === mode ? GC.blue : GC.surface,
                color: viewMode === mode ? '#fff' : GC.textSecondary,
                transition: 'all 150ms',
              }}
            >
              {mode === 'blocks' ? '⊞ Blocks' : '</> Source'}
            </button>
          ))}
        </div>
      </div>

      {/* Content area with optional outline */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0, display: 'flex' }}>
        {viewMode === 'blocks' ? (
          <>
            {/* Outline sidebar — only when enough sections */}
            {sections.length > 3 && (
              <div style={{ width: 160, flexShrink: 0, padding: '0 8px', borderRight: `1px solid ${GC.borderLight}`, background: GC.surfaceDim, overflow: 'auto' }}>
                <SectionOutline sections={sections} onJump={jumpToSection} />
              </div>
            )}
            {/* Main blocks area */}
            <div ref={contentRef} style={{ flex: 1, overflow: 'auto', padding: '20px 28px 60px' }}>
              <div style={{ maxWidth: 740, margin: '0 auto' }}>
                {sections.map(section => (
                  <div key={section.id} data-section-id={section.id}>
                    <SectionComponent
                      section={section} chips={chips}
                      expandedBlocks={expandedBlocks}
                      newBlockIds={newBlockIds}
                      onToggleBlock={toggleBlock}
                      onDeleteBlock={deleteBlock}
                      onAddBlock={openSlashMenu}
                      onToggleCollapse={() => toggleSection(section.id)}
                    />
                  </div>
                ))}
                <AddBlockDivider
                  onAdd={(pos) => {
                    const lastSec = sections[sections.length - 1];
                    openSlashMenu(lastSec?.id ?? '', null, pos);
                  }}
                  hint="Add block to end"
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, padding: '20px 28px' }}>
            <SourceView content={content} />
          </div>
        )}
      </div>

      <SlashCommandMenu
        isOpen={slashMenu.open}
        onClose={() => setSlashMenu(prev => ({ ...prev, open: false }))}
        onSelect={handleSlashSelect}
        position={slashMenu.position}
      />

      {/* Bottom hint bar — keyboard shortcuts */}
      <div style={{
        padding: '6px 20px', borderTop: `1px solid ${GC.borderLight}`,
        background: GC.surface,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
        fontSize: 11, color: GC.textDisabled, fontFamily: 'var(--font-ui)',
      }}>
        <span><kbd style={{ padding: '1px 4px', borderRadius: 3, border: `1px solid ${GC.borderLight}`, background: GC.surfaceDim, fontSize: 10 }}>/</kbd> insert block</span>
        <span><kbd style={{ padding: '1px 4px', borderRadius: 3, border: `1px solid ${GC.borderLight}`, background: GC.surfaceDim, fontSize: 10 }}>@</kbd> reference asset</span>
        <span><kbd style={{ padding: '1px 4px', borderRadius: 3, border: `1px solid ${GC.borderLight}`, background: GC.surfaceDim, fontSize: 10 }}>⌘D</kbd> toggle view</span>
      </div>
    </div>
  );
}
