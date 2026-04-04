/**
 * RegistryCatalog — Screen 3: Searchable asset catalog for all @-referenceable resources.
 *
 * Grid/list browser with type filters, search, and sort. Each card shows
 * type, name, version, status, owner, usage count, and description.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistry, useNotifications } from '../../contexts/AppContext';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip, ConnectorMetadata, SkillMetadata, TriggerMetadata } from '../../parser/types';

// ─── Type Filter Chips ────────────────────────────────────────────────

const ALL_TYPES: (ChipType | 'all')[] = ['all', 'connector', 'skill', 'trigger', 'doc', 'tool', 'agent', 'guard', 'data', 'schema'];

function TypeFilter({
  active,
  onChange,
}: {
  active: ChipType | 'all';
  onChange: (t: ChipType | 'all') => void;
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {ALL_TYPES.map((t) => {
        const isActive = t === active;
        const bg = t === 'all' ? '#374151' : CHIP_COLORS[t as ChipType].bg;
        const icon = t === 'all' ? null : CHIP_ICONS[t as ChipType];
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '3px 10px',
              borderRadius: 9999,
              fontSize: 11,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              background: isActive ? bg : '#F3F4F6',
              color: isActive ? '#fff' : '#6B7280',
            }}
          >
            {icon && <span style={{ fontSize: 10 }}>{icon}</span>}
            {t === 'all' ? 'All' : `@${t}`}
          </button>
        );
      })}
    </div>
  );
}

// ─── Sort Options ─────────────────────────────────────────────────────

type SortKey = 'relevance' | 'updated' | 'usage' | 'name';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'updated', label: 'Recently Updated' },
  { key: 'usage', label: 'Most Referenced' },
  { key: 'name', label: 'Alphabetical' },
];

function sortChips(chips: SmartChip[], key: SortKey): SmartChip[] {
  const sorted = [...chips];
  switch (key) {
    case 'usage':
      return sorted.sort((a, b) => b.usageCount - a.usageCount);
    case 'updated':
      return sorted.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case 'relevance':
    default: {
      const statusOrder = { resolved: 0, draft: 1, deprecated: 2, unresolved: 3 };
      return sorted.sort(
        (a, b) => (statusOrder[a.status] - statusOrder[b.status]) || (b.usageCount - a.usageCount),
      );
    }
  }
}

// ─── Status Dot ──────────────────────────────────────────────────────

const STATUS_DOT: Record<string, { color: string; label: string }> = {
  resolved:   { color: '#22C55E', label: 'Published' },
  draft:      { color: '#EAB308', label: 'Draft' },
  unresolved: { color: '#EF4444', label: 'Missing' },
  deprecated: { color: '#9CA3AF', label: 'Deprecated' },
};

function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_DOT[status] || STATUS_DOT.deprecated;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontFamily: 'var(--font-ui)',
        color: '#9CA3AF',
      }}
      title={cfg.label}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: cfg.color,
          flexShrink: 0,
        }}
      />
      {cfg.label}
    </span>
  );
}

// ─── Connector Meta Display ───────────────────────────────────────────

function ConnectorMeta({ meta }: { meta: ConnectorMetadata }) {
  const syncColors: Record<string, string> = {
    active: '#059669',
    syncing: '#D97706',
    error: '#DC2626',
    paused: '#9CA3AF',
  };
  return (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      <span
        style={{
          fontSize: 10,
          padding: '1px 6px',
          borderRadius: 4,
          fontWeight: 500,
          fontFamily: 'var(--font-ui)',
          background: (syncColors[meta.syncStatus] || '#9CA3AF') + '18',
          color: syncColors[meta.syncStatus] || '#9CA3AF',
        }}
      >
        {meta.syncStatus === 'active' ? 'Active' : meta.syncStatus}
      </span>
      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: '#6B7280', fontFamily: 'var(--font-ui)' }}>
        {meta.entities.filter(e => e.enabled).length} entities
      </span>
      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: '#6B7280', fontFamily: 'var(--font-ui)' }}>
        {meta.actions.filter(a => a.enabled).length} actions
      </span>
      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: '#6B7280', fontFamily: 'var(--font-ui)' }}>
        {meta.syncMode}
      </span>
    </div>
  );
}

// ─── Skill Meta Display ───────────────────────────────────────────────

function SkillMeta({ meta }: { meta: SkillMetadata }) {
  return (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500, background: '#EDE9FE', color: '#6D28D9', fontFamily: 'var(--font-ui)' }}>
        {meta.scope}
      </span>
      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F5F3FF', color: '#7C3AED', fontFamily: 'var(--font-ui)' }}>
        {meta.activationMode}
      </span>
      {meta.resources.scripts.length > 0 && (
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: '#6B7280', fontFamily: 'var(--font-ui)' }}>
          {meta.resources.scripts.length} scripts
        </span>
      )}
    </div>
  );
}

// ─── Trigger Meta Display ─────────────────────────────────────────────

function TriggerMeta({ meta }: { meta: TriggerMetadata }) {
  return (
    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, fontWeight: 500, background: '#FFF7ED', color: '#C2410C', fontFamily: 'var(--font-ui)' }}>
        {meta.triggerType}
      </span>
      <span
        style={{
          fontSize: 10,
          padding: '1px 6px',
          borderRadius: 4,
          fontWeight: 500,
          fontFamily: 'var(--font-ui)',
          background: meta.status === 'active' ? '#DCFCE7' : '#F3F4F6',
          color: meta.status === 'active' ? '#166534' : '#6B7280',
        }}
      >
        {meta.status}
      </span>
      {meta.humanReadableSchedule && (
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#F3F4F6', color: '#6B7280', fontFamily: 'var(--font-ui)' }}>
          {meta.humanReadableSchedule}
        </span>
      )}
      {meta.sourceConnectorId && (
        <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: '#EFF6FF', color: '#2563EB', fontFamily: 'var(--font-ui)' }}>
          from connector
        </span>
      )}
    </div>
  );
}

// ─── View Toggle Icons (SVG) ──────────────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" fill={active ? '#111827' : '#9CA3AF'} />
      <rect x="8" y="1" width="5" height="5" rx="1" fill={active ? '#111827' : '#9CA3AF'} />
      <rect x="1" y="8" width="5" height="5" rx="1" fill={active ? '#111827' : '#9CA3AF'} />
      <rect x="8" y="8" width="5" height="5" rx="1" fill={active ? '#111827' : '#9CA3AF'} />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  const c = active ? '#111827' : '#9CA3AF';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="2" rx="1" fill={c} />
      <rect x="1" y="6" width="12" height="2" rx="1" fill={c} />
      <rect x="1" y="10" width="12" height="2" rx="1" fill={c} />
    </svg>
  );
}

// ─── Search Icon (SVG) ────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="6" cy="6" r="4.5" stroke="#9CA3AF" strokeWidth="1.5" />
      <path d="M9.5 9.5L12.5 12.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Registry Card ────────────────────────────────────────────────────

function RegistryCard({ chip, onSelect, onOpenEditor, onViewHistory }: { chip: SmartChip; onSelect: (id: string) => void; onOpenEditor: () => void; onViewHistory: () => void }) {
  const colors = CHIP_COLORS[chip.type];
  const icon = CHIP_ICONS[chip.type];
  const [expanded, setExpanded] = useState(false);

  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(chip.lastUpdated).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }, [chip.lastUpdated]);

  return (
    <div
      onClick={() => { setExpanded(!expanded); onSelect(chip.id); }}
      style={{
        background: '#fff',
        border: `1px solid ${expanded ? colors.bg + '50' : 'var(--color-border)'}`,
        borderRadius: 8,
        padding: 14,
        cursor: 'pointer',
        transition: 'box-shadow 150ms ease, border-color 150ms ease',
        boxShadow: 'var(--shadow-xs)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
    >
      {/* Header row: type badge + status dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 3,
            fontSize: 10,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            color: '#fff',
            background: colors.bg,
            padding: '2px 7px',
            borderRadius: 4,
          }}
        >
          {icon} @{chip.type}
        </span>
        <StatusDot status={chip.status} />
      </div>

      {/* Name */}
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'var(--font-ui)',
          color: '#111827',
          marginBottom: 4,
          lineHeight: 1.3,
        }}
      >
        {chip.name}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: 12,
          color: '#6B7280',
          fontFamily: 'var(--font-ui)',
          lineHeight: 1.5,
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 999 : 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {chip.description}
      </div>

      {/* Type-specific metadata */}
      {chip.type === 'connector' && chip.metadata && (
        <ConnectorMeta meta={chip.metadata as unknown as ConnectorMetadata} />
      )}
      {chip.type === 'skill' && chip.metadata && (
        <SkillMeta meta={chip.metadata as unknown as SkillMetadata} />
      )}
      {chip.type === 'trigger' && chip.metadata && (
        <TriggerMeta meta={chip.metadata as unknown as TriggerMetadata} />
      )}

      {/* Footer */}
      <div
        style={{
          marginTop: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 10,
          fontFamily: 'var(--font-ui)',
          color: '#9CA3AF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{chip.owner.split('@')[0]}</span>
          <span style={{ padding: '1px 5px', borderRadius: 3, background: '#F3F4F6', color: '#6B7280', fontWeight: 500 }}>
            v{chip.version}
          </span>
          <span>{timeAgo}</span>
        </div>
        <span style={{ color: '#9CA3AF' }}>
          {chip.usageCount} refs
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: '1px solid #F3F4F6',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 12,
            fontFamily: 'var(--font-ui)',
          }}
        >
          <DetailRow label="Registry ID">
            <code style={{ fontSize: 10, background: '#F9FAFB', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono, monospace)', color: '#4B5563' }}>
              {chip.registryId}
            </code>
          </DetailRow>
          <DetailRow label="Permission">
            <span style={{ color: '#4B5563', textTransform: 'capitalize' }}>{chip.permissions.currentUser}</span>
          </DetailRow>
          {chip.endpoint && (
            <DetailRow label="Endpoint">
              <code style={{ fontSize: 10, background: '#F9FAFB', padding: '2px 6px', borderRadius: 4, fontFamily: 'var(--font-mono, monospace)', color: '#4B5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180, display: 'inline-block' }}>
                {chip.endpoint}
              </code>
            </DetailRow>
          )}
          {chip.healthStatus && (
            <DetailRow label="Health">
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  color:
                    chip.healthStatus === 'healthy' ? '#059669' :
                    chip.healthStatus === 'degraded' ? '#D97706' : '#DC2626',
                }}
              >
                {chip.healthStatus === 'healthy' ? 'Healthy' :
                 chip.healthStatus === 'degraded' ? 'Degraded' : 'Down'}
              </span>
            </DetailRow>
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onOpenEditor(); }}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                background: '#2563EB',
                color: '#fff',
                fontSize: 10,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              Open in Editor
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onViewHistory(); }}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#4B5563',
                fontSize: 10,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              View History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#9CA3AF', width: 76, flexShrink: 0, fontSize: 11 }}>{label}</span>
      {children}
    </div>
  );
}

// ─── List Row Variant ─────────────────────────────────────────────────

function RegistryListRow({ chip, onSelect }: { chip: SmartChip; onSelect: (id: string) => void }) {
  const colors = CHIP_COLORS[chip.type];
  const icon = CHIP_ICONS[chip.type];

  return (
    <div
      onClick={() => onSelect(chip.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 14px',
        borderRadius: 8,
        border: '1px solid var(--color-border)',
        background: '#fff',
        transition: 'box-shadow 150ms ease',
        boxShadow: 'var(--shadow-xs)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          fontFamily: 'var(--font-ui)',
          color: '#fff',
          background: colors.bg,
          padding: '2px 7px',
          borderRadius: 4,
          flexShrink: 0,
        }}
      >
        {icon} @{chip.type}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-ui)', color: '#111827', width: 180, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {chip.name}
      </span>
      <span style={{ fontSize: 12, color: '#6B7280', fontFamily: 'var(--font-ui)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {chip.description}
      </span>
      <StatusDot status={chip.status} />
      <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', color: '#9CA3AF', width: 44, textAlign: 'right', flexShrink: 0 }}>
        v{chip.version}
      </span>
      <span style={{ fontSize: 10, fontFamily: 'var(--font-ui)', color: '#9CA3AF', width: 52, textAlign: 'right', flexShrink: 0 }}>
        {chip.usageCount} refs
      </span>
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 20px' }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ marginBottom: 12, opacity: 0.4 }}>
        <circle cx="18" cy="18" r="12" stroke="#9CA3AF" strokeWidth="2" />
        <path d="M27 27L35 35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
        <path d="M14 18H22" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <div style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: '#9CA3AF', marginBottom: 8 }}>
        No assets match your search.
      </div>
      <button
        onClick={onClear}
        style={{
          fontSize: 12,
          fontFamily: 'var(--font-ui)',
          color: '#2563EB',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: 2,
        }}
      >
        Clear filters
      </button>
    </div>
  );
}

// ─── Main Catalog ─────────────────────────────────────────────────────

// ─── Create Modal ────────────────────────────────────────────────────

const CREATABLE_TYPES: ChipType[] = ['tool', 'doc', 'agent', 'guard', 'data', 'schema', 'connector', 'skill', 'trigger'];

function CreateModal({ onClose, onCreate }: { onClose: () => void; onCreate: (partial: { type: ChipType; name: string; description: string }) => void }) {
  const [newType, setNewType] = useState<ChipType>('tool');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.3)',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          width: 420,
          maxWidth: '90vw',
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          fontFamily: 'var(--font-ui)',
        }}
      >
        <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0, marginBottom: 16 }}>
          Create New Asset
        </h2>

        {/* Type selector */}
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 4 }}>Type</label>
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value as ChipType)}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            fontSize: 12,
            marginBottom: 12,
            outline: 'none',
            background: '#fff',
          }}
        >
          {CREATABLE_TYPES.map((t) => (
            <option key={t} value={t}>@{t}</option>
          ))}
        </select>

        {/* Name */}
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 4 }}>Name</label>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="e.g. my-new-tool"
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            fontSize: 12,
            marginBottom: 12,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* Description */}
        <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#6B7280', marginBottom: 4 }}>Description</label>
        <textarea
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          placeholder="Brief description of this asset..."
          rows={3}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid #E5E7EB',
            fontSize: 12,
            marginBottom: 16,
            outline: 'none',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: '1px solid #E5E7EB',
              background: '#fff',
              color: '#6B7280',
              fontSize: 12,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (newName.trim()) {
                onCreate({ type: newType, name: newName.trim(), description: newDesc.trim() });
              }
            }}
            disabled={!newName.trim()}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              background: newName.trim() ? '#2563EB' : '#93C5FD',
              color: '#fff',
              fontSize: 12,
              fontWeight: 500,
              cursor: newName.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Catalog ─────────────────────────────────────────────────────

export function RegistryCatalog() {
  const navigate = useNavigate();
  const { filteredChips: contextFilteredChips, chips: allChips, searchQuery, setSearchQuery, selectChip, createModalOpen, openCreateModal, closeCreateModal, createChip } = useRegistry();
  const { addNotification } = useNotifications();

  const [typeFilter, setTypeFilter] = useState<ChipType | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchFocused, setSearchFocused] = useState(false);

  const filtered = useMemo(() => {
    let items = contextFilteredChips;

    if (typeFilter !== 'all') {
      items = items.filter((c) => c.type === typeFilter);
    }

    return sortChips(items, sortKey);
  }, [contextFilteredChips, typeFilter, sortKey]);

  const handleOpenEditor = () => {
    navigate('/editor');
  };

  const handleViewHistory = () => {
    navigate('/history');
  };

  const handleSelect = (id: string) => {
    selectChip(id);
  };

  const handleCreate = (partial: { type: ChipType; name: string; description: string }) => {
    createChip(partial);
  };

  return (
    <div className="page-container" style={{ overflow: 'auto' }}>
      {/* Header */}
      <header
        className="page-header sticky top-0 z-50"
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.3 }}>
              Registry & Catalog
            </h1>
            <p style={{ fontSize: 10, fontFamily: 'var(--font-ui)', color: 'var(--color-text-tertiary)', margin: 0, marginTop: 1 }}>
              All @-referenceable assets -- {allChips.length} entries
            </p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 11, fontFamily: 'var(--font-ui)', color: 'var(--color-text-tertiary)' }}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={openCreateModal}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                border: 'none',
                background: 'var(--color-accent, #2563EB)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              + Create New
            </button>
          </div>
        </div>
      </header>

      <div className="page-body" style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Search + Controls Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          {/* Search */}
          <div style={{ flex: '1 1 100%', minWidth: 200, position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: 12, display: 'flex', pointerEvents: 'none' }}>
              <SearchIcon />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search assets by name, type, owner, or description..."
              style={{
                width: '100%',
                padding: '8px 32px 8px 34px',
                borderRadius: 8,
                border: `1px solid ${searchFocused ? 'var(--color-accent)' : 'var(--color-border)'}`,
                boxShadow: searchFocused ? '0 0 0 3px rgba(37,99,235,0.08)' : 'none',
                background: '#fff',
                fontSize: 13,
                fontFamily: 'var(--font-ui)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  color: '#9CA3AF',
                  padding: 2,
                  lineHeight: 1,
                }}
              >
                x
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--color-border)',
              background: '#fff',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              color: 'var(--color-text-secondary)',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'auto' as const,
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>

          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              borderRadius: 8,
              background: '#F3F4F6',
              padding: 2,
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px 8px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'grid' ? '#fff' : 'transparent',
                boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 150ms ease',
              }}
              title="Grid view"
            >
              <GridIcon active={viewMode === 'grid'} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px 8px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'list' ? '#fff' : 'transparent',
                boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 150ms ease',
              }}
              title="List view"
            >
              <ListIcon active={viewMode === 'list'} />
            </button>
          </div>
        </div>

        {/* Type filters */}
        <div style={{ marginBottom: 20 }}>
          <TypeFilter active={typeFilter} onChange={setTypeFilter} />
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <EmptyState onClear={() => { setSearchQuery(''); setTypeFilter('all'); }} />
        ) : viewMode === 'grid' ? (
          <div className="grid-auto">
            {filtered.map((chip) => (
              <RegistryCard key={chip.id} chip={chip} onSelect={handleSelect} onOpenEditor={handleOpenEditor} onViewHistory={handleViewHistory} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filtered.map((chip) => (
              <RegistryListRow key={chip.id} chip={chip} onSelect={handleSelect} />
            ))}
          </div>
        )}

        {/* Summary bar */}
        <div
          style={{
            marginTop: 32,
            padding: 14,
            borderRadius: 8,
            border: '1px solid var(--color-border)',
            background: '#fff',
          }}
        >
          <h3
            style={{
              fontSize: 10,
              fontWeight: 600,
              fontFamily: 'var(--font-ui)',
              color: '#9CA3AF',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
              marginBottom: 10,
            }}
          >
            Registry Summary
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(['connector', 'skill', 'trigger', 'doc', 'tool', 'agent', 'guard', 'data', 'schema'] as ChipType[]).map((t) => {
              const count = allChips.filter((c) => c.type === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: typeFilter === t ? CHIP_COLORS[t].bg + '14' : '#F9FAFB',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontFamily: 'var(--font-ui)',
                    color: '#4B5563',
                    transition: 'background 150ms ease',
                  }}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: CHIP_COLORS[t].bg,
                      flexShrink: 0,
                    }}
                  />
                  {count} @{t}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {createModalOpen && (
        <CreateModal onClose={closeCreateModal} onCreate={handleCreate} />
      )}
    </div>
  );
}
