/**
 * StructuredEditor — Block-based agent playbook editor.
 *
 * Notion-style editing surface where each adk-fluent construct is a typed block,
 * grouped under semantic sections. Supports:
 * - Typed sections (Triggers, Skills, Knowledge, Systems, Process, etc.)
 * - Typed blocks (trigger, skill, tool, connector, guard, doc, schema, agent, etc.)
 * - Slash command (/) for inserting blocks
 * - Skill/Agent expansion (progressive disclosure)
 * - Source toggle (blocks ↔ markdown)
 * - Inline @-chip rendering in instruction blocks
 */

import { useState, useMemo, useRef, useCallback } from 'react';
import { CHIP_COLORS, CHIP_ICONS } from '../../../parser/types';
import type { ChipType, SmartChip } from '../../../parser/types';
import { useRegistry } from '../../../contexts/AppContext';
import {
  parsePlaybookToBlocks,
  createEmptyBlock,
  createEmptySection,
  SECTION_META,
  BLOCK_META,
  type EditorSection,
  type EditorBlock,
} from '../../../data/blocks';
import { SlashCommandMenu } from './SlashCommandMenu';
import type { SlashCommandItem } from './SlashCommandMenu';

// ─── Chip regex for inline rendering ──────────────────────────────────
const CHIP_RE = /@(doc|tool|agent|guard|data|schema|connector|skill|trigger)\(([^)]+)\)/g;

// ─── Mock skill expansion content ────────────────────────────────────
const SKILL_EXPANSIONS: Record<string, { sections: { title: string; content: string }[]; meta: string }> = {
  'customer-empathy': {
    meta: 'v1.3 · Workspace · Pinned',
    sections: [
      { title: 'Tone Guidelines', content: 'When a customer expresses frustration, acknowledge their feelings before addressing the issue. Use @doc(empathy-playbook) for response templates.' },
      { title: 'De-escalation', content: 'If sentiment score drops below 0.3, activate @guard(escalation-check) and consider routing to @agent(human-support).' },
      { title: 'Response Rules', content: 'Always end with a forward-looking statement. Never say "unfortunately." Use @tool(sentiment) to gauge customer mood.' },
    ],
  },
  'apac-compliance': {
    meta: 'v2.0 · Workspace · On-Demand',
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
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
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
          gap: 3,
          padding: '1px 7px',
          borderRadius: 4,
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'var(--font-ui)',
          background: resolved ? colors.bg : '#FEF2F2',
          color: resolved ? colors.text : '#DC2626',
          border: `1px ${resolved ? 'solid' : 'dashed'} ${resolved ? colors.border : '#FCA5A5'}`,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          verticalAlign: 'middle',
          lineHeight: '20px',
        }}
      >
        <span style={{ fontSize: 10 }}>{icon}</span>
        {chipName}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts.length > 0 ? parts : [text];
}

// ─── Block Wrapper ────────────────────────────────────────────────────
function BlockWrapper({
  block,
  children,
  onDelete,
}: {
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
        borderLeft: `3px solid ${meta.color}`,
        borderRadius: '0 6px 6px 0',
        background: '#fff',
        marginBottom: 2,
        transition: 'box-shadow 150ms, border-color 150ms',
        boxShadow: hovered ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
      }}
    >
      {/* Drag handle */}
      {hovered && (
        <span
          style={{
            position: 'absolute',
            left: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 11,
            color: '#C4C4C4',
            cursor: 'grab',
            userSelect: 'none',
          }}
        >
          ⋮⋮
        </span>
      )}
      {/* Content */}
      <div style={{ padding: '8px 12px' }}>
        {children}
      </div>
      {/* adk-fluent expression badge */}
      {block.adkExpression && (
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 8,
            fontSize: 9,
            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
            color: '#C4C4C4',
            maxWidth: 200,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {block.adkExpression}
        </div>
      )}
      {/* Delete button */}
      {hovered && onDelete && (
        <button
          onClick={onDelete}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 18,
            height: 18,
            borderRadius: 4,
            border: 'none',
            background: '#F3F4F6',
            color: '#9CA3AF',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
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
    <div style={{ fontSize: 13, lineHeight: 1.7, fontFamily: 'var(--font-body, Georgia, serif)', color: '#374151' }}>
      {block.content.split('\n').map((line, i) => (
        <div key={i}>{renderInlineChips(line, chips)}</div>
      ))}
    </div>
  );
}

function TriggerBlockView({ block }: { block: EditorBlock }) {
  const name = block.chipRef?.name ?? 'unknown';
  const triggerType = name.includes(':') ? name.split(':')[0] : name;
  const detail = name.includes(':') ? name.split(':').slice(1).join(':') : '';
  const typeIcons: Record<string, string> = {
    chat: '💬', inbox: '📥', schedule: '🕐', webhook: '🔗',
    jira: '🎫', drive: '📁', slack: '💬', gmail: '✉️',
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 18 }}>{typeIcons[triggerType] ?? '⚡'}</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#C2410C', fontFamily: 'var(--font-ui)' }}>
          @trigger({name})
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-ui)' }}>
          {triggerType === 'chat' && 'Real-time streaming conversation'}
          {triggerType === 'inbox' && `Async queue: ${detail}`}
          {triggerType === 'schedule' && `Cron: ${detail}`}
          {triggerType === 'jira' && `Jira event: ${detail}`}
          {triggerType === 'drive' && `Drive event: ${detail}`}
          {!['chat', 'inbox', 'schedule', 'jira', 'drive'].includes(triggerType) && `Event trigger: ${name}`}
        </div>
      </div>
      <span style={{
        marginLeft: 'auto',
        fontSize: 10,
        fontWeight: 500,
        padding: '2px 8px',
        borderRadius: 10,
        background: '#ECFDF5',
        color: '#059669',
        fontFamily: 'var(--font-ui)',
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
      {/* Header */}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}
      >
        <span style={{ fontSize: 12, color: '#7C3AED', transition: 'transform 150ms', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#6D28D9', fontFamily: 'var(--font-ui)' }}>
          ✦ {name}
        </span>
        {expansion && (
          <span style={{ fontSize: 10, color: '#A78BFA', fontFamily: 'var(--font-ui)' }}>{expansion.meta}</span>
        )}
        <span style={{ fontSize: 10, color: '#C4B5FD', fontFamily: 'var(--font-ui)', marginLeft: 'auto' }}>
          {chip?.description ? chip.description.slice(0, 50) + '...' : 'Reusable skill bundle'}
        </span>
      </div>
      {/* Expanded content — progressive disclosure */}
      {expanded && expansion && (
        <div style={{
          marginTop: 8,
          marginLeft: 4,
          paddingLeft: 12,
          borderLeft: '2px solid #DDD6FE',
          background: '#FDFAFF',
          borderRadius: '0 6px 6px 0',
          padding: '10px 12px 10px 16px',
        }}>
          {/* Breadcrumb */}
          <div style={{ fontSize: 10, color: '#A78BFA', marginBottom: 8, fontFamily: 'var(--font-ui)' }}>
            Claims Agent › <span style={{ fontWeight: 600 }}>@skill({name})</span>
          </div>
          {/* Nested sections */}
          {expansion.sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: i < expansion.sections.length - 1 ? 10 : 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6D28D9', marginBottom: 3, fontFamily: 'var(--font-ui)' }}>
                {sec.title}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.6, color: '#4B5563', fontFamily: 'var(--font-body, Georgia, serif)' }}>
                {renderInlineChips(sec.content, chips)}
              </div>
            </div>
          ))}
          {/* Footer link */}
          <div style={{ marginTop: 10, fontSize: 10, color: '#7C3AED', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Edit in Skill Editor →
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  const name = block.chipRef?.name ?? '';
  const chip = chips.find(c => c.type === 'tool' && c.name === name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, color: '#4F46E5' }}>⬡</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#4338CA', fontFamily: 'var(--font-ui)' }}>
          @tool({name})
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-ui)' }}>
          {chip?.description ?? 'Function tool'}
        </div>
      </div>
      {chip?.healthStatus && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: chip.healthStatus === 'healthy' ? '#10B981' : chip.healthStatus === 'degraded' ? '#F59E0B' : '#EF4444',
        }} />
      )}
    </div>
  );
}

function ConnectorBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  const name = block.chipRef?.name ?? '';
  const chip = chips.find(c => c.type === 'connector' && c.name === name);
  const meta = chip?.metadata as Record<string, unknown> | undefined;
  const entities = (meta?.entities as Array<{ name: string; enabled: boolean }>) ?? [];
  const enabledCount = entities.filter(e => e.enabled).length;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, color: '#2563EB' }}>◈</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8', fontFamily: 'var(--font-ui)' }}>
          @connector({name})
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-ui)' }}>
          {chip?.description ?? 'Enterprise connector'}{enabledCount > 0 ? ` · ${enabledCount} entities` : ''}
        </div>
      </div>
      <span style={{
        fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 10,
        background: '#EFF6FF', color: '#2563EB', fontFamily: 'var(--font-ui)',
      }}>
        {(meta?.syncStatus as string) ?? 'active'}
      </span>
    </div>
  );
}

function GuardBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  const name = block.chipRef?.name ?? '';
  const chip = chips.find(c => c.type === 'guard' && c.name === name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, color: '#E11D48' }}>△</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#BE123C', fontFamily: 'var(--font-ui)' }}>
          @guard({name})
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-ui)' }}>
          {chip?.description ?? 'Safety guard'}
        </div>
      </div>
      <span style={{ fontSize: 10, color: '#E11D48', fontFamily: 'var(--font-ui)' }}>✓ pass / ✗ block</span>
    </div>
  );
}

function DocBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  const name = block.chipRef?.name ?? '';
  const chip = chips.find(c => c.type === 'doc' && c.name === name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, color: '#0D9488' }}>◇</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#0F766E', fontFamily: 'var(--font-ui)' }}>
          @doc({name})
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-ui)' }}>
          {chip?.description ?? 'Knowledge source'}
        </div>
      </div>
    </div>
  );
}

function SchemaBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  const name = block.chipRef?.name ?? '';
  const chip = chips.find(c => c.type === 'schema' && c.name === name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, color: '#475569' }}>▢</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', fontFamily: 'var(--font-ui)' }}>
          @schema({name})
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-ui)' }}>
          {chip?.description ?? 'Output schema'}
        </div>
      </div>
    </div>
  );
}

function AgentBlockView({ block, chips, expanded, onToggle }: { block: EditorBlock; chips: SmartChip[]; expanded: boolean; onToggle: () => void }) {
  const name = block.chipRef?.name ?? '';
  const chip = chips.find(c => c.type === 'agent' && c.name === name);
  return (
    <div>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
        <span style={{ fontSize: 12, color: '#D97706', transition: 'transform 150ms', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
        <span style={{ fontSize: 14, color: '#D97706' }}>◎</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#B45309', fontFamily: 'var(--font-ui)' }}>
            @agent({name})
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-ui)' }}>
            {chip?.description ?? 'Sub-agent delegation'}
          </div>
        </div>
      </div>
      {expanded && (
        <div style={{
          marginTop: 8, marginLeft: 4, paddingLeft: 12,
          borderLeft: '2px solid #FDE68A', background: '#FFFDF5',
          borderRadius: '0 6px 6px 0', padding: '10px 12px 10px 16px',
        }}>
          <div style={{ fontSize: 10, color: '#D97706', marginBottom: 6, fontFamily: 'var(--font-ui)' }}>
            Claims Agent › <span style={{ fontWeight: 600 }}>@agent({name})</span>
          </div>
          <div style={{ fontSize: 12, color: '#6B7280', fontFamily: 'var(--font-body, Georgia, serif)', lineHeight: 1.6 }}>
            {chip?.description ?? `Delegated agent handling specialized processing for ${name}.`}
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: '#D97706', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Open Agent →
          </div>
        </div>
      )}
    </div>
  );
}

function ConditionalBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <span style={{ fontSize: 14, color: '#DC2626', marginTop: 1 }}>◆</span>
      <div style={{ fontSize: 12, lineHeight: 1.6, color: '#374151', fontFamily: 'var(--font-body, Georgia, serif)' }}>
        {renderInlineChips(block.content, chips)}
      </div>
    </div>
  );
}

function CodeBlockView({ block }: { block: EditorBlock }) {
  return (
    <div style={{
      background: '#1E1E1E', borderRadius: 4, padding: '10px 12px',
      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
      fontSize: 11, lineHeight: 1.6, color: '#D4D4D4',
      overflow: 'auto', maxHeight: 200,
      borderTop: '3px solid repeating-linear-gradient(90deg, #EA580C 0, #EA580C 8px, transparent 8px, transparent 16px)',
    }}>
      <div style={{ fontSize: 9, color: '#EA580C', marginBottom: 6, fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
        ⚠️ CODE EXECUTION · Dev Only
      </div>
      {block.content.split('\n').map((line, i) => (
        <div key={i} style={{ whiteSpace: 'pre' }}>{line}</div>
      ))}
    </div>
  );
}

function DataBlockView({ block, chips }: { block: EditorBlock; chips: SmartChip[] }) {
  const name = block.chipRef?.name ?? '';
  const chip = chips.find(c => c.type === 'data' && c.name === name);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 14, color: '#059669' }}>▣</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#047857', fontFamily: 'var(--font-ui)' }}>
          @data({name})
        </div>
        <div style={{ fontSize: 11, color: '#9CA3AF', fontFamily: 'var(--font-ui)' }}>
          {chip?.description ?? 'Data source'}
        </div>
      </div>
    </div>
  );
}


// ─── Block Renderer (dispatch) ────────────────────────────────────────
function BlockRenderer({
  block,
  chips,
  expanded,
  onToggle,
  onDelete,
}: {
  block: EditorBlock;
  chips: SmartChip[];
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const inner = (() => {
    switch (block.type) {
      case 'instruction':  return <InstructionBlockView block={block} chips={chips} />;
      case 'trigger':      return <TriggerBlockView block={block} />;
      case 'skill':        return <SkillBlockView block={block} chips={chips} expanded={expanded} onToggle={onToggle} />;
      case 'tool':         return <ToolBlockView block={block} chips={chips} />;
      case 'connector':    return <ConnectorBlockView block={block} chips={chips} />;
      case 'guard':        return <GuardBlockView block={block} chips={chips} />;
      case 'doc':          return <DocBlockView block={block} chips={chips} />;
      case 'schema':       return <SchemaBlockView block={block} chips={chips} />;
      case 'agent':        return <AgentBlockView block={block} chips={chips} expanded={expanded} onToggle={onToggle} />;
      case 'conditional':  return <ConditionalBlockView block={block} chips={chips} />;
      case 'code':         return <CodeBlockView block={block} />;
      case 'data':         return <DataBlockView block={block} chips={chips} />;
      default:             return <div style={{ fontSize: 12, color: '#9CA3AF' }}>Unknown block type: {block.type}</div>;
    }
  })();

  return (
    <BlockWrapper block={block} onDelete={onDelete}>
      {inner}
    </BlockWrapper>
  );
}

// ─── Add Block Divider ────────────────────────────────────────────────
function AddBlockDivider({ onAdd }: { onAdd: (pos: { top: number; left: number }) => void }) {
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        height: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: 'default',
      }}
    >
      {/* Line */}
      <div style={{ height: 1, width: '100%', background: hovered ? '#E5E7EB' : 'transparent', transition: 'background 150ms' }} />
      {/* Plus button */}
      {hovered && (
        <button
          ref={btnRef}
          onClick={() => {
            const rect = btnRef.current?.getBoundingClientRect();
            if (rect) onAdd({ top: rect.bottom + 4, left: rect.left });
          }}
          style={{
            position: 'absolute',
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: '1px solid #D1D5DB',
            background: '#fff',
            color: '#9CA3AF',
            fontSize: 14,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            transition: 'all 100ms',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A73E8'; e.currentTarget.style.color = '#1A73E8'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#D1D5DB'; e.currentTarget.style.color = '#9CA3AF'; }}
        >
          +
        </button>
      )}
    </div>
  );
}

// ─── Section Component ────────────────────────────────────────────────
function SectionComponent({
  section,
  chips,
  expandedBlocks,
  onToggleBlock,
  onDeleteBlock,
  onAddBlock,
  onToggleCollapse,
}: {
  section: EditorSection;
  chips: SmartChip[];
  expandedBlocks: Set<string>;
  onToggleBlock: (blockId: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
  onAddBlock: (sectionId: string, afterBlockId: string | null, pos: { top: number; left: number }) => void;
  onToggleCollapse: () => void;
}) {
  const meta = SECTION_META[section.type];
  const blockCount = section.blocks.length;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Section heading */}
      <div
        onClick={onToggleCollapse}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 0',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{
          fontSize: 10,
          color: section.collapsed ? '#9CA3AF' : meta.color,
          transition: 'transform 150ms',
          transform: section.collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
        }}>
          ▶
        </span>
        <span style={{ fontSize: 13, color: meta.color }}>{meta.icon}</span>
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: '#1F2937',
          fontFamily: 'var(--font-ui)',
        }}>
          {section.title}
        </span>
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          color: '#9CA3AF',
          fontFamily: 'var(--font-ui)',
          background: '#F3F4F6',
          padding: '1px 6px',
          borderRadius: 8,
        }}>
          {blockCount}
        </span>
        {meta.adkMapping && (
          <span style={{
            fontSize: 9,
            fontFamily: 'var(--font-mono, monospace)',
            color: '#C4C4C4',
            marginLeft: 'auto',
          }}>
            {meta.adkMapping}
          </span>
        )}
      </div>

      {/* Section blocks */}
      {!section.collapsed && (
        <div style={{ paddingLeft: 8 }}>
          {section.blocks.map((block) => (
            <div key={block.id}>
              <BlockRenderer
                block={block}
                chips={chips}
                expanded={expandedBlocks.has(block.id)}
                onToggle={() => onToggleBlock(block.id)}
                onDelete={() => onDeleteBlock(section.id, block.id)}
              />
              <AddBlockDivider
                onAdd={(pos) => onAddBlock(section.id, block.id, pos)}
              />
            </div>
          ))}
          {blockCount === 0 && (
            <AddBlockDivider
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
      background: '#1E1E1E',
      borderRadius: 8,
      padding: 16,
      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
      fontSize: 12,
      lineHeight: 1.7,
      color: '#D4D4D4',
      overflow: 'auto',
      flex: 1,
      whiteSpace: 'pre-wrap',
      minHeight: 0,
    }}>
      {content.split('\n').map((line, i) => (
        <div key={i} style={{ display: 'flex' }}>
          <span style={{ width: 32, textAlign: 'right', color: '#555', fontSize: 11, marginRight: 12, flexShrink: 0, userSelect: 'none' }}>
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
    open: boolean;
    position: { top: number; left: number };
    sectionId: string;
    afterBlockId: string | null;
  }>({ open: false, position: { top: 0, left: 0 }, sectionId: '', afterBlockId: null });

  // Parse content into blocks on mount
  useMemo(() => {
    const parsed = parsePlaybookToBlocks(content);
    setSections(parsed);
  }, [content]);

  // Toggle block expansion (for skills/agents)
  const toggleBlock = useCallback((blockId: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      next.has(blockId) ? next.delete(blockId) : next.add(blockId);
      return next;
    });
  }, []);

  // Toggle section collapse
  const toggleSection = useCallback((sectionId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, collapsed: !s.collapsed } : s
    ));
  }, []);

  // Delete block
  const deleteBlock = useCallback((sectionId: string, blockId: string) => {
    setSections(prev => prev.map(s =>
      s.id === sectionId
        ? { ...s, blocks: s.blocks.filter(b => b.id !== blockId) }
        : s
    ));
  }, []);

  // Open slash command
  const openSlashMenu = useCallback((sectionId: string, afterBlockId: string | null, pos: { top: number; left: number }) => {
    setSlashMenu({ open: true, position: pos, sectionId, afterBlockId });
  }, []);

  // Handle slash command selection
  const handleSlashSelect = useCallback((item: SlashCommandItem) => {
    if (item.action.type === 'insert-block') {
      const newBlock = createEmptyBlock(item.action.blockType);
      newBlock.content = `New ${BLOCK_META[item.action.blockType].label} block`;
      if (newBlock.chipRef) {
        newBlock.chipRef.name = `new-${item.action.blockType}`;
      }
      newBlock.adkExpression = item.adkConstruct ?? '';

      setSections(prev => prev.map(s => {
        if (s.id !== slashMenu.sectionId) return s;
        if (slashMenu.afterBlockId === null) {
          return { ...s, blocks: [...s.blocks, newBlock] };
        }
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#FAFAF9', position: 'relative' }}>
      {/* View toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderBottom: '1px solid #F3F4F6',
      }}>
        <div style={{ fontSize: 11, color: '#6B7280', fontFamily: 'var(--font-ui)' }}>
          {sections.length} sections · {sections.reduce((n, s) => n + s.blocks.length, 0)} blocks
        </div>
        <div style={{
          display: 'flex',
          borderRadius: 6,
          border: '1px solid #E5E7EB',
          overflow: 'hidden',
        }}>
          {(['blocks', 'source'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '4px 12px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'var(--font-ui)',
                background: viewMode === mode ? '#1F2937' : '#fff',
                color: viewMode === mode ? '#fff' : '#6B7280',
                transition: 'all 150ms',
              }}
            >
              {mode === 'blocks' ? '⊞ Blocks' : '</> Source'}
            </button>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px 32px', minHeight: 0 }}>
        {viewMode === 'blocks' ? (
          <>
            {/* Dot pattern background */}
            <div style={{
              backgroundImage: 'radial-gradient(circle, #E5E7EB 0.5px, transparent 0.5px)',
              backgroundSize: '16px 16px',
              position: 'absolute',
              inset: 0,
              pointerEvents: 'none',
              opacity: 0.4,
              zIndex: 0,
            }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
              {sections.map(section => (
                <SectionComponent
                  key={section.id}
                  section={section}
                  chips={chips}
                  expandedBlocks={expandedBlocks}
                  onToggleBlock={toggleBlock}
                  onDeleteBlock={deleteBlock}
                  onAddBlock={openSlashMenu}
                  onToggleCollapse={() => toggleSection(section.id)}
                />
              ))}
              {/* Add section at end */}
              <AddBlockDivider
                onAdd={(pos) => {
                  const lastSec = sections[sections.length - 1];
                  openSlashMenu(lastSec?.id ?? '', null, pos);
                }}
              />
            </div>
          </>
        ) : (
          <SourceView content={content} />
        )}
      </div>

      {/* Slash command menu */}
      <SlashCommandMenu
        isOpen={slashMenu.open}
        onClose={() => setSlashMenu(prev => ({ ...prev, open: false }))}
        onSelect={handleSlashSelect}
        position={slashMenu.position}
      />

      {/* Keyboard shortcut hint */}
      <div style={{
        position: 'absolute',
        bottom: 8,
        right: 16,
        fontSize: 10,
        color: '#C4C4C4',
        fontFamily: 'var(--font-ui)',
      }}>
        / to insert · @ to reference · {viewMode === 'blocks' ? 'Source' : 'Blocks'}: Cmd+D
      </div>
    </div>
  );
}
