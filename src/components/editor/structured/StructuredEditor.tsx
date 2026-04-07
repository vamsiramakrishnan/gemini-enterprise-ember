/**
 * StructuredEditor — Block-based agent playbook editor.
 *
 * Google Cloud design language: clean surfaces, generous spacing,
 * #4285F4 primary blue, warm neutrals, progressive disclosure.
 *
 * Every block maps 1:1 to an adk-fluent construct.
 * Skills and agents expand inline for progressive disclosure.
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import { CHIP_COLORS, CHIP_ICONS } from '../../../parser/types';
import type { ChipType, SmartChip } from '../../../parser/types';
import { useRegistry } from '../../../contexts/AppContext';
import {
  parsePlaybookToBlocks,
  createEmptyBlock,
  createEmptySection,
  BLOCK_META,
  type EditorSection,
  type EditorBlock,
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

// ─── Chip regex ──────────────────────────────────────────────────────
const CHIP_RE = /@(doc|tool|agent|guard|data|schema|connector|skill|trigger)\(([^)]+)\)/g;

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
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 8px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'var(--font-ui, "Google Sans", sans-serif)',
          background: resolved ? colors.bg : '#FCE8E6',
          color: resolved ? colors.text : GC.red,
          border: `1px ${resolved ? 'solid' : 'dashed'} ${resolved ? colors.border : '#F28B82'}`,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          verticalAlign: 'middle',
          lineHeight: '20px',
          transition: 'box-shadow 150ms',
        }}
      >
        <span style={{ fontSize: 9, opacity: 0.7 }}>{icon}</span>
        {chipName}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts.length > 0 ? parts : [text];
}

// ─── Block Wrapper ────────────────────────────────────────────────────
function BlockWrapper({ block, children, onDelete }: {
  block: EditorBlock;
  children: React.ReactNode;
  onDelete?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const meta = BLOCK_META[block.type];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        borderLeft: `3px solid ${hovered ? meta.color : GC.borderLight}`,
        borderRadius: '0 8px 8px 0',
        background: GC.surface,
        marginBottom: 4,
        padding: '12px 16px',
        transition: 'all 200ms ease',
        boxShadow: hovered ? '0 1px 6px rgba(60,64,67,0.08)' : 'none',
      }}
    >
      {/* Drag handle — appears on hover */}
      <span style={{
        position: 'absolute', left: -22, top: '50%', transform: 'translateY(-50%)',
        fontSize: 10, color: GC.textDisabled, cursor: 'grab', userSelect: 'none',
        opacity: hovered ? 1 : 0, transition: 'opacity 150ms',
      }}>
        ⋮⋮
      </span>
      {children}
      {/* adk-fluent expression — only on hover */}
      {block.adkExpression && hovered && (
        <div style={{
          marginTop: 6, fontSize: 10,
          fontFamily: 'var(--font-mono, "Roboto Mono", monospace)',
          color: GC.textTertiary, letterSpacing: '0.02em',
        }}>
          {block.adkExpression}
        </div>
      )}
      {/* Delete — only on hover */}
      {hovered && onDelete && (
        <button
          onClick={onDelete}
          style={{
            position: 'absolute', top: 8, right: 8,
            width: 22, height: 22, borderRadius: 6,
            border: `1px solid ${GC.borderLight}`, background: GC.surfaceDim,
            color: GC.textTertiary, fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0.7, transition: 'opacity 100ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.borderColor = GC.red; e.currentTarget.style.color = GC.red; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.borderColor = GC.borderLight; e.currentTarget.style.color = GC.textTertiary; }}
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
    <div style={{ fontSize: 14, lineHeight: 1.75, fontFamily: 'var(--font-body, "Google Sans Text", Georgia, serif)', color: GC.textPrimary, letterSpacing: '-0.01em' }}>
      {block.content.split('\n').map((line, i) => (
        <div key={i} style={{ minHeight: 24 }}>{renderInlineChips(line, chips)}</div>
      ))}
    </div>
  );
}

function TriggerBlockView({ block }: { block: EditorBlock }) {
  const name = block.chipRef?.name ?? 'unknown';
  const triggerType = name.includes(':') ? name.split(':')[0] : name;
  const detail = name.includes(':') ? name.split(':').slice(1).join(':') : '';
  const typeIcons: Record<string, string> = { chat: '💬', inbox: '📥', schedule: '🕐', webhook: '🔗', jira: '🎫', drive: '📁', slack: '💬', gmail: '✉️' };
  const descriptions: Record<string, string> = {
    chat: 'Real-time streaming conversation', inbox: `Async queue: ${detail}`, schedule: `Scheduled: ${detail}`,
    jira: `Jira event: ${detail}`, drive: `Drive event: ${detail}`,
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
        <div style={{ fontSize: 13, fontWeight: 500, color: GC.textPrimary, fontFamily: 'var(--font-ui)' }}>
          {name}
        </div>
        <div style={{ fontSize: 12, color: GC.textSecondary, fontFamily: 'var(--font-ui)', marginTop: 1 }}>
          {descriptions[triggerType] ?? `Event trigger: ${name}`}
        </div>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 12,
        background: '#E6F4EA', color: '#1E8E3E', fontFamily: 'var(--font-ui)',
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
        {/* Expand chevron */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 200ms ease', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
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
      </div>
      {/* Progressive disclosure — expanded skill content */}
      {expanded && expansion && (
        <div style={{
          marginTop: 12, marginLeft: 20, padding: '16px 20px',
          borderLeft: `2px solid #E8DAFF`, background: '#FDFAFF',
          borderRadius: '0 12px 12px 0',
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
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${GC.borderLight}` }}>
            <span style={{ fontSize: 12, color: GC.blue, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              Edit in Skill Editor →
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
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: GC.textPrimary, fontFamily: 'var(--font-ui)' }}>{name}</div>
        <div style={{ fontSize: 12, color: GC.textSecondary, fontFamily: 'var(--font-ui)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {chip?.description ?? BLOCK_META[block.type].description}
        </div>
      </div>
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
          {chip?.description ?? 'Enterprise connector'}{enabledCount > 0 ? ` \u00B7 ${enabledCount} entities` : ''}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: syncStatus === 'active' ? GC.green : syncStatus === 'error' ? GC.red : GC.yellow,
        }} />
        <span style={{ fontSize: 11, color: GC.textTertiary, fontFamily: 'var(--font-ui)' }}>{syncStatus}</span>
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
      <div style={{ display: 'flex', gap: 8, fontSize: 11, fontFamily: 'var(--font-ui)' }}>
        <span style={{ color: GC.green }}>✓ pass</span>
        <span style={{ color: GC.textDisabled }}>/</span>
        <span style={{ color: GC.red }}>✗ block</span>
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
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 200ms ease', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
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
      </div>
      {expanded && (
        <div style={{
          marginTop: 12, marginLeft: 20, padding: '16px 20px',
          borderLeft: `2px solid #FEEFC3`, background: '#FFFDF5',
          borderRadius: '0 12px 12px 0',
        }}>
          <div style={{ fontSize: 11, color: GC.textTertiary, marginBottom: 8, fontFamily: 'var(--font-ui)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ color: GC.textSecondary }}>Claims Agent</span>
            <span style={{ color: GC.textDisabled }}>›</span>
            <span style={{ fontWeight: 600, color: GC.agent }}>@agent({name})</span>
          </div>
          <div style={{ fontSize: 13, color: GC.textSecondary, fontFamily: 'var(--font-body, Georgia, serif)', lineHeight: 1.7 }}>
            {chip?.description ?? `Delegated agent handling specialized processing for ${name}.`}
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${GC.borderLight}` }}>
            <span style={{ fontSize: 12, color: GC.blue, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontWeight: 500 }}>
              Open Agent →
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
      <div style={{ fontSize: 10, color: GC.trigger, marginBottom: 8, fontFamily: 'var(--font-ui)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>⚠</span> Code Execution · Dev Only
      </div>
      {block.content.split('\n').map((line, i) => (
        <div key={i} style={{ whiteSpace: 'pre' }}>{line}</div>
      ))}
    </div>
  );
}


// ─── Block Renderer (dispatch) ────────────────────────────────────────
function BlockRenderer({ block, chips, expanded, onToggle, onDelete }: {
  block: EditorBlock; chips: SmartChip[]; expanded: boolean; onToggle: () => void; onDelete: () => void;
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

  return <BlockWrapper block={block} onDelete={onDelete}>{inner}</BlockWrapper>;
}

// ─── Add Block Divider ────────────────────────────────────────────────
function AddBlockDivider({ onAdd }: { onAdd: (pos: { top: number; left: number }) => void }) {
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
    >
      <div style={{ height: 1, width: '100%', background: hovered ? GC.borderLight : 'transparent', transition: 'background 200ms' }} />
      {hovered && (
        <button
          ref={btnRef}
          onClick={() => {
            const rect = btnRef.current?.getBoundingClientRect();
            if (rect) onAdd({ top: rect.bottom + 4, left: rect.left });
          }}
          style={{
            position: 'absolute', width: 22, height: 22, borderRadius: '50%',
            border: `1px solid ${GC.border}`, background: GC.surface,
            color: GC.textTertiary, fontSize: 15, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 1px 4px rgba(60,64,67,0.08)', transition: 'all 150ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = GC.blue; e.currentTarget.style.color = GC.blue; e.currentTarget.style.background = '#E8F0FE'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = GC.border; e.currentTarget.style.color = GC.textTertiary; e.currentTarget.style.background = GC.surface; }}
        >
          +
        </button>
      )}
    </div>
  );
}

// ─── Section Component ────────────────────────────────────────────────
function SectionComponent({ section, chips, expandedBlocks, onToggleBlock, onDeleteBlock, onAddBlock, onToggleCollapse }: {
  section: EditorSection; chips: SmartChip[]; expandedBlocks: Set<string>;
  onToggleBlock: (blockId: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
  onAddBlock: (sectionId: string, afterBlockId: string | null, pos: { top: number; left: number }) => void;
  onToggleCollapse: () => void;
}) {
  const blockCount = section.blocks.length;

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Section heading */}
      <div
        onClick={onToggleCollapse}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 0', cursor: 'pointer', userSelect: 'none',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transition: 'transform 200ms ease', transform: section.collapsed ? 'rotate(0deg)' : 'rotate(90deg)', flexShrink: 0 }}>
          <path d="M6 4l4 4-4 4" stroke={section.collapsed ? GC.textTertiary : GC.textSecondary} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{ fontSize: 14, fontWeight: 500, color: GC.textPrimary, fontFamily: 'var(--font-ui)' }}>
          {section.title}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 500, color: GC.textTertiary,
          fontFamily: 'var(--font-ui)', background: GC.surfaceTint,
          padding: '1px 8px', borderRadius: 10,
        }}>
          {blockCount}
        </span>
        {/* Collapsed summary */}
        {section.collapsed && blockCount > 0 && (
          <span style={{ fontSize: 12, color: GC.textTertiary, fontFamily: 'var(--font-ui)', marginLeft: 4 }}>
            {section.blocks.slice(0, 3).map(b => b.chipRef?.name ?? '').filter(Boolean).join(', ')}
            {blockCount > 3 ? `, +${blockCount - 3} more` : ''}
          </span>
        )}
      </div>

      {/* Section blocks — with generous spacing */}
      {!section.collapsed && (
        <div style={{ paddingLeft: 12, marginTop: 4 }}>
          {section.blocks.map((block) => (
            <div key={block.id}>
              <BlockRenderer
                block={block} chips={chips}
                expanded={expandedBlocks.has(block.id)}
                onToggle={() => onToggleBlock(block.id)}
                onDelete={() => onDeleteBlock(section.id, block.id)}
              />
              <AddBlockDivider onAdd={(pos) => onAddBlock(section.id, block.id, pos)} />
            </div>
          ))}
          {blockCount === 0 && (
            <div style={{ padding: '12px 16px', border: `1px dashed ${GC.border}`, borderRadius: 8, textAlign: 'center' }}>
              <span style={{ fontSize: 12, color: GC.textTertiary, fontFamily: 'var(--font-ui)' }}>
                No blocks yet — click + or type / to add
              </span>
            </div>
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
  const [slashMenu, setSlashMenu] = useState<{
    open: boolean; position: { top: number; left: number };
    sectionId: string; afterBlockId: string | null;
  }>({ open: false, position: { top: 0, left: 0 }, sectionId: '', afterBlockId: null });

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

  const totalBlocks = sections.reduce((n, s) => n + s.blocks.length, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: GC.bg, position: 'relative' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 20px', borderBottom: `1px solid ${GC.borderLight}`,
        background: GC.surface,
      }}>
        <div style={{ fontSize: 12, color: GC.textTertiary, fontFamily: 'var(--font-ui)' }}>
          {sections.length} sections · {totalBlocks} blocks
        </div>
        <div style={{
          display: 'flex', borderRadius: 8, border: `1px solid ${GC.border}`,
          overflow: 'hidden',
        }}>
          {(['blocks', 'source'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                fontSize: 12, fontWeight: 500, padding: '5px 14px',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                background: viewMode === mode ? GC.blue : GC.surface,
                color: viewMode === mode ? '#fff' : GC.textSecondary,
                transition: 'all 150ms',
              }}
            >
              {mode === 'blocks' ? 'Blocks' : 'Source'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px 48px', minHeight: 0 }}>
        {viewMode === 'blocks' ? (
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            {sections.map(section => (
              <SectionComponent
                key={section.id} section={section} chips={chips}
                expandedBlocks={expandedBlocks}
                onToggleBlock={toggleBlock}
                onDeleteBlock={deleteBlock}
                onAddBlock={openSlashMenu}
                onToggleCollapse={() => toggleSection(section.id)}
              />
            ))}
            <AddBlockDivider
              onAdd={(pos) => {
                const lastSec = sections[sections.length - 1];
                openSlashMenu(lastSec?.id ?? '', null, pos);
              }}
            />
          </div>
        ) : (
          <SourceView content={content} />
        )}
      </div>

      <SlashCommandMenu
        isOpen={slashMenu.open}
        onClose={() => setSlashMenu(prev => ({ ...prev, open: false }))}
        onSelect={handleSlashSelect}
        position={slashMenu.position}
      />

      {/* Bottom hint */}
      <div style={{
        position: 'absolute', bottom: 10, left: 0, right: 0,
        textAlign: 'center', fontSize: 11, color: GC.textDisabled,
        fontFamily: 'var(--font-ui)', pointerEvents: 'none',
      }}>
        Type / to insert a block · @ to reference an asset · Cmd+D to toggle view
      </div>
    </div>
  );
}
