/**
 * ChipAutocomplete -- Rich @ autocomplete dropdown for the Playbook Editor.
 *
 * Shows the full enterprise capability surface with categorized sections,
 * product icons, sync/health status indicators, permission badges,
 * and keyboard navigation.
 *
 * Populated from registry data. Each chip type gets its own collapsible
 * section with type-specific metadata columns (sync status for connectors,
 * health dots for tools, scope badges for skills, etc.).
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip, ConnectorMetadata, SkillMetadata, TriggerMetadata } from '../../parser/types';
import {
  DOCS, TOOLS, AGENTS, GUARDS, DATA_SOURCES, SCHEMAS,
  CONNECTORS, SKILLS, TRIGGERS,
} from '../../data/registry';

// ─── Props ───────────────────────────────────────────────────────────────

export interface ChipAutocompleteProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chip: { type: string; name: string }) => void;
  position: { top: number; left: number };
  filterText?: string;
}

// ─── Section definition ──────────────────────────────────────────────────

interface Section {
  type: ChipType;
  label: string;
  shortcut: string;       // e.g. "@t:" to filter
  items: SmartChip[];
}

const SECTIONS: Section[] = [
  { type: 'trigger',   label: 'Triggers',   shortcut: '@tr:', items: TRIGGERS },
  { type: 'connector', label: 'Connectors', shortcut: '@c:',  items: CONNECTORS },
  { type: 'skill',     label: 'Skills',     shortcut: '@s:',  items: SKILLS },
  { type: 'doc',       label: 'Documents',  shortcut: '@d:',  items: DOCS },
  { type: 'tool',      label: 'Tools',      shortcut: '@t:',  items: TOOLS },
  { type: 'agent',     label: 'Agents',     shortcut: '@a:',  items: AGENTS },
  { type: 'guard',     label: 'Guards',     shortcut: '@g:',  items: GUARDS },
  { type: 'data',      label: 'Data',       shortcut: '@da:', items: DATA_SOURCES },
  { type: 'schema',    label: 'Schemas',    shortcut: '@sc:', items: SCHEMAS },
];

// Recently used (mock)
const RECENTLY_USED_IDS = [
  'tool-policy-lookup',
  'connector-salesforce',
  'guard-pii-redaction',
  'skill-customer-empathy',
];

// ─── Helpers ─────────────────────────────────────────────────────────────

const TRIGGER_ICONS: Record<string, string> = {
  chat: '\u{1F4AC}',      // speech bubble
  inbox: '\u{1F4E5}',     // inbox tray
  event: '\u{1F50C}',     // webhook/plug
  schedule: '\u{1F551}',  // clock
  webhook: '\u{1F310}',   // globe
};

const CONNECTOR_LOGOS: Record<string, string> = {
  salesforce: '\u{2601}\uFE0F',  // cloud
  jira: '\u{1F4CB}',              // clipboard
  slack: '\u{1F4AC}',             // speech bubble
  drive: '\u{1F4C1}',             // folder
  gmail: '\u{2709}\uFE0F',        // envelope
  bigquery: '\u{1F4CA}',          // bar chart
};

const GUARD_LABELS: Record<string, string> = {
  'pii-redaction': 'Content Safety',
  'fraud-detection': 'Policy',
  'apac-compliance-rules': 'Policy',
};

function connectorMeta(chip: SmartChip): ConnectorMetadata | null {
  if (chip.type !== 'connector') return null;
  return chip.metadata as unknown as ConnectorMetadata;
}

function skillMeta(chip: SmartChip): SkillMetadata | null {
  if (chip.type !== 'skill') return null;
  return chip.metadata as unknown as SkillMetadata;
}

function triggerMeta(chip: SmartChip): TriggerMetadata | null {
  if (chip.type !== 'trigger') return null;
  return chip.metadata as unknown as TriggerMetadata;
}

function permissionIcon(level: string) {
  switch (level) {
    case 'viewer':  return { icon: '\u{1F441}\uFE0F', label: 'Viewer' };   // eye
    case 'invoker': return { icon: '\u25B6',  label: 'Invoker' };   // play
    case 'editor':  return { icon: '\u270F\uFE0F',  label: 'Editor' };    // pencil
    case 'admin':   return { icon: '\u2B50',  label: 'Admin' };     // star
    default:        return { icon: '\u{1F512}',  label: 'No Access' }; // lock
  }
}

function syncDotColor(status: string) {
  switch (status) {
    case 'active':  return '#22C55E';
    case 'syncing': return '#EAB308';
    case 'error':   return '#EF4444';
    case 'paused':  return '#9CA3AF';
    default:        return '#9CA3AF';
  }
}

function healthDotColor(status?: string) {
  switch (status) {
    case 'healthy':  return '#22C55E';
    case 'degraded': return '#EAB308';
    case 'down':     return '#EF4444';
    default:         return '#9CA3AF';
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '\u2026' : s;
}

// ─── Sub-components ──────────────────────────────────────────────────────

function SyncBadge({ status }: { status: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: syncDotColor(status) }}
      title={`Sync: ${status}`}
    />
  );
}

function HealthBadge({ status }: { status?: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: healthDotColor(status) }}
      title={`Health: ${status ?? 'unknown'}`}
    />
  );
}

function VersionBadge({ version }: { version: string }) {
  return (
    <span className="px-1.5 py-0 rounded text-[10px] font-medium bg-gray-100 text-gray-500 flex-shrink-0">
      v{version}
    </span>
  );
}

function PermBadge({ level }: { level: string }) {
  const p = permissionIcon(level);
  return (
    <span className="text-[11px] text-gray-400 flex-shrink-0" title={p.label}>
      {p.icon}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const colors: Record<string, string> = {
    workspace: 'bg-violet-100 text-violet-700',
    user: 'bg-blue-100 text-blue-700',
    extension: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-1.5 py-0 rounded text-[10px] font-medium flex-shrink-0 ${colors[scope] ?? colors.extension}`}>
      {scope.charAt(0).toUpperCase() + scope.slice(1)}
    </span>
  );
}

function ActivationBadge({ mode }: { mode: string }) {
  return (
    <span className={`px-1.5 py-0 rounded text-[10px] font-medium flex-shrink-0 ${mode === 'pinned' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
      {mode === 'pinned' ? 'Pinned' : 'On-Demand'}
    </span>
  );
}

// ─── Item row renderers ──────────────────────────────────────────────────

function ItemRow({
  chip,
  isHighlighted,
  onSelect,
  onHover,
}: {
  chip: SmartChip;
  isHighlighted: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const colors = CHIP_COLORS[chip.type];
  const noAccess = chip.permissions.currentUser === 'viewer' && chip.type === 'tool';

  // Type-specific icon
  let leadIcon = CHIP_ICONS[chip.type];
  if (chip.type === 'trigger') {
    const tm = triggerMeta(chip);
    if (tm) leadIcon = TRIGGER_ICONS[tm.triggerType] ?? leadIcon;
  }
  if (chip.type === 'connector') {
    const cm = connectorMeta(chip);
    if (cm) leadIcon = CONNECTOR_LOGOS[cm.productIcon] ?? leadIcon;
  }

  return (
    <button
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors duration-100
        ${isHighlighted ? 'bg-blue-50' : 'hover:bg-gray-50'}
        ${noAccess ? 'opacity-50' : ''}`}
      onClick={onSelect}
      onMouseEnter={onHover}
      role="option"
      aria-selected={isHighlighted}
    >
      {/* Colored type dot + icon */}
      <span
        className="flex items-center justify-center w-6 h-6 rounded-md text-xs flex-shrink-0"
        style={{ backgroundColor: colors.bg + '18', color: colors.bg }}
      >
        {leadIcon}
      </span>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-semibold text-gray-800 truncate">
            {chip.type === 'trigger' ? `@trigger(${chip.name})` : chip.name}
          </span>
          {chip.status === 'draft' && (
            <span className="px-1 py-0 rounded text-[9px] font-medium bg-yellow-100 text-yellow-700">Draft</span>
          )}
          {chip.status === 'deprecated' && (
            <span className="px-1 py-0 rounded text-[9px] font-medium bg-gray-100 text-gray-400">Deprecated</span>
          )}
        </div>
        <p className="text-[11px] text-gray-400 truncate leading-tight">
          {truncate(chip.description, 65)}
        </p>
      </div>

      {/* Type-specific metadata badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Connector: sync status + action count */}
        {chip.type === 'connector' && (() => {
          const cm = connectorMeta(chip);
          if (!cm) return null;
          const actionCount = cm.actions.filter(a => a.enabled).length;
          const entityCount = cm.entities.filter(e => e.enabled).length;
          return (
            <>
              <SyncBadge status={cm.syncStatus} />
              <span className="text-[10px] text-gray-400">{entityCount}E {actionCount}A</span>
            </>
          );
        })()}

        {/* Tool: health status + latency hint */}
        {chip.type === 'tool' && (
          <HealthBadge status={chip.healthStatus} />
        )}

        {/* Skill: scope + activation */}
        {chip.type === 'skill' && (() => {
          const sm = skillMeta(chip);
          if (!sm) return null;
          return (
            <>
              <ScopeBadge scope={sm.scope} />
              <ActivationBadge mode={sm.activationMode} />
            </>
          );
        })()}

        {/* Trigger: status dot */}
        {chip.type === 'trigger' && (() => {
          const tm = triggerMeta(chip);
          if (!tm) return null;
          return <SyncBadge status={tm.status === 'active' ? 'active' : 'paused'} />;
        })()}

        {/* Guard: type label */}
        {chip.type === 'guard' && (
          <span className="text-[10px] text-gray-400">
            {GUARD_LABELS[chip.name] ?? 'Policy'}
          </span>
        )}

        {/* Doc: last updated */}
        {chip.type === 'doc' && (
          <span className="text-[10px] text-gray-400">{relativeTime(chip.lastUpdated)}</span>
        )}

        {/* Data: row hint */}
        {chip.type === 'data' && (
          <span className="text-[10px] text-gray-400">
            {chip.name === 'claims-database' ? '2.3M rows' : '48 rows'}
          </span>
        )}

        {/* Schema: field count hint */}
        {chip.type === 'schema' && (
          <span className="text-[10px] text-gray-400">
            {chip.name === 'claims-response-v2' ? '5 fields' : '4 fields'}
          </span>
        )}

        {/* Agent: conversation count hint */}
        {chip.type === 'agent' && (
          <span className="text-[10px] text-gray-400">{chip.usageCount} refs</span>
        )}

        <VersionBadge version={chip.version} />
        <PermBadge level={chip.permissions.currentUser} />

        {/* Lock for restricted items */}
        {noAccess && (
          <span className="text-[10px] text-rose-400 font-medium whitespace-nowrap">
            Request Access
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function ChipAutocomplete({
  isOpen,
  onClose,
  onSelect,
  position,
  filterText = '',
}: ChipAutocompleteProps) {
  const [query, setQuery] = useState(filterText);
  const [collapsedSections, setCollapsedSections] = useState<Set<ChipType>>(new Set());
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Sync external filterText
  useEffect(() => {
    setQuery(filterText);
  }, [filterText]);

  // Auto-focus search on open
  useEffect(() => {
    if (isOpen) {
      setHighlightIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Detect type-specific shortcuts (e.g. "@t:" filters to tools)
  const { activeTypeFilter, normalizedQuery } = useMemo(() => {
    const q = query.trim().toLowerCase();
    for (const sec of SECTIONS) {
      const prefix = sec.shortcut.toLowerCase();
      if (q.startsWith(prefix)) {
        return { activeTypeFilter: sec.type, normalizedQuery: q.slice(prefix.length).trim() };
      }
    }
    return { activeTypeFilter: null, normalizedQuery: q };
  }, [query]);

  // Filter items
  const filteredSections = useMemo(() => {
    return SECTIONS
      .filter(sec => !activeTypeFilter || sec.type === activeTypeFilter)
      .map(sec => {
        const items = normalizedQuery
          ? sec.items.filter(item =>
              item.name.toLowerCase().includes(normalizedQuery) ||
              item.description.toLowerCase().includes(normalizedQuery)
            )
          : sec.items;
        return { ...sec, items };
      })
      .filter(sec => sec.items.length > 0);
  }, [activeTypeFilter, normalizedQuery]);

  // Flat list of all visible items for keyboard navigation
  const flatItems = useMemo(() => {
    const result: SmartChip[] = [];
    for (const sec of filteredSections) {
      if (!collapsedSections.has(sec.type)) {
        result.push(...sec.items);
      }
    }
    return result;
  }, [filteredSections, collapsedSections]);

  // Recently used chips
  const recentlyUsed = useMemo(() => {
    if (normalizedQuery || activeTypeFilter) return [];
    return RECENTLY_USED_IDS
      .map(id => [...DOCS, ...TOOLS, ...AGENTS, ...GUARDS, ...DATA_SOURCES, ...SCHEMAS, ...CONNECTORS, ...SKILLS, ...TRIGGERS].find(c => c.id === id))
      .filter(Boolean) as SmartChip[];
  }, [normalizedQuery, activeTypeFilter]);

  // Clamp highlight index
  useEffect(() => {
    if (highlightIndex >= flatItems.length) {
      setHighlightIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, highlightIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector('[aria-selected="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [highlightIndex]);

  const toggleSection = useCallback((type: ChipType) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  }, []);

  // Keyboard handling
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(i => Math.min(i + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatItems[highlightIndex]) {
          const item = flatItems[highlightIndex];
          onSelect({ type: item.type, name: item.name });
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatItems, highlightIndex, onSelect, onClose]);

  if (!isOpen) return null;

  // Track running offset for highlight index across sections
  let runningIndex = 0;

  return (
    <>
      {/* Backdrop for click-to-close */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown panel */}
      <div
        className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
        style={{
          top: position.top,
          left: position.left,
          width: 400,
          maxHeight: 440,
          animation: 'chipDropdownIn 150ms ease-out',
          backdropFilter: 'blur(8px)',
        }}
        role="listbox"
        onKeyDown={handleKeyDown}
      >
        {/* Search bar */}
        <div className="px-3 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => { setQuery(e.target.value); setHighlightIndex(0); }}
              placeholder="Search capabilities..."
              className="w-full pl-8 pr-3 py-1.5 text-[13px] rounded-lg border border-gray-200 bg-gray-50
                focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300
                placeholder:text-gray-400 transition-all"
            />
          </div>
          {/* Shortcut hints */}
          <div className="flex gap-2 mt-1.5 text-[10px] text-gray-400">
            <span className="font-mono bg-gray-100 px-1 rounded">@t:</span>
            <span>tools</span>
            <span className="font-mono bg-gray-100 px-1 rounded">@c:</span>
            <span>connectors</span>
            <span className="font-mono bg-gray-100 px-1 rounded">@s:</span>
            <span>skills</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain" style={{ maxHeight: 340 }}>

          {/* Recently Used */}
          {recentlyUsed.length > 0 && (
            <div className="px-3 pt-2 pb-1.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Recently Used
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentlyUsed.map(chip => {
                  const c = CHIP_COLORS[chip.type];
                  return (
                    <button
                      key={chip.id}
                      onClick={() => onSelect({ type: chip.type, name: chip.name })}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium
                        transition-all hover:shadow-sm hover:scale-[1.03] active:scale-[0.97]"
                      style={{ backgroundColor: c.bg + '16', color: c.bg, border: `1px solid ${c.bg}30` }}
                    >
                      <span className="text-[10px]">{CHIP_ICONS[chip.type]}</span>
                      {chip.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {filteredSections.length === 0 && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-400">No matching capabilities found.</p>
              <p className="text-xs text-gray-300 mt-1">Try a different search term.</p>
            </div>
          )}

          {/* Categorized sections */}
          {filteredSections.map(sec => {
            const sectionStartIndex = runningIndex;
            const isCollapsed = collapsedSections.has(sec.type);
            const colors = CHIP_COLORS[sec.type];

            // Build items for this section
            const sectionItems = isCollapsed ? [] : sec.items;
            const sectionItemElements = sectionItems.map((item, i) => {
              const globalIndex = sectionStartIndex + i;
              return (
                <ItemRow
                  key={item.id}
                  chip={item}
                  isHighlighted={globalIndex === highlightIndex}
                  onSelect={() => onSelect({ type: item.type, name: item.name })}
                  onHover={() => setHighlightIndex(globalIndex)}
                />
              );
            });

            if (!isCollapsed) {
              runningIndex += sec.items.length;
            }

            return (
              <div key={sec.type} className="border-b border-gray-50 last:border-b-0">
                {/* Section header -- sticky */}
                <button
                  className="sticky top-0 z-10 w-full flex items-center gap-2 px-3 py-1.5
                    bg-white/95 backdrop-blur-sm hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(sec.type)}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex-1 text-left">
                    {sec.label}
                  </span>
                  <span className="text-[10px] text-gray-400 tabular-nums">{sec.items.length}</span>
                  <svg
                    className={`w-3 h-3 text-gray-400 transition-transform duration-150 ${isCollapsed ? '-rotate-90' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Items */}
                {!isCollapsed && sectionItemElements}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-100 flex items-center justify-between flex-shrink-0 bg-gray-50/60">
          <button
            className="text-[11px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
            onClick={() => {
              // In a real app this would open a creation dialog
              onClose();
            }}
          >
            + Create new...
          </button>
          <div className="flex gap-3 text-[10px] text-gray-400">
            <span><kbd className="font-mono bg-gray-200 px-1 rounded text-[9px]">&uarr;&darr;</kbd> navigate</span>
            <span><kbd className="font-mono bg-gray-200 px-1 rounded text-[9px]">Enter</kbd> select</span>
            <span><kbd className="font-mono bg-gray-200 px-1 rounded text-[9px]">Esc</kbd> close</span>
          </div>
        </div>
      </div>

      {/* Animation keyframe injection */}
      <style>{`
        @keyframes chipDropdownIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </>
  );
}

export default ChipAutocomplete;
