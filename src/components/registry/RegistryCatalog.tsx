/**
 * RegistryCatalog — Screen 3: Searchable asset catalog for all @-referenceable resources.
 *
 * Grid/list browser with type filters, search, and sort. Each card shows
 * type, name, version, status, owner, usage count, and description.
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { REGISTRY } from '../../data/registry';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip, ConnectorMetadata, SkillMetadata, TriggerMetadata } from '../../parser/types';
import { StatusBadge } from '../shared/StatusBadge';

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
    <div className="flex flex-wrap gap-1.5">
      {ALL_TYPES.map((t) => {
        const isActive = t === active;
        const bg = t === 'all' ? '#374151' : CHIP_COLORS[t as ChipType].bg;
        const icon = t === 'all' ? '🔍' : CHIP_ICONS[t as ChipType];
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={
              isActive
                ? { background: bg, color: '#fff' }
                : { background: '#F3F4F6', color: '#6B7280' }
            }
          >
            {icon} {t === 'all' ? 'All' : `@${t}`}
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
    default:
      // Status priority: resolved > draft > deprecated > unresolved, then by usage
      const statusOrder = { resolved: 0, draft: 1, deprecated: 2, unresolved: 3 };
      return sorted.sort(
        (a, b) => (statusOrder[a.status] - statusOrder[b.status]) || (b.usageCount - a.usageCount),
      );
  }
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
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span
        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
        style={{ background: syncColors[meta.syncStatus] + '20', color: syncColors[meta.syncStatus] }}
      >
        {meta.syncStatus === 'active' ? '● Active' : meta.syncStatus}
      </span>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
        {meta.entities.filter(e => e.enabled).length} entities
      </span>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
        {meta.actions.filter(a => a.enabled).length} actions
      </span>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
        {meta.syncMode}
      </span>
    </div>
  );
}

// ─── Skill Meta Display ───────────────────────────────────────────────

function SkillMeta({ meta }: { meta: SkillMetadata }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 font-medium">
        {meta.scope}
      </span>
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-50 text-violet-600">
        {meta.activationMode}
      </span>
      {meta.resources.scripts.length > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
          {meta.resources.scripts.length} scripts
        </span>
      )}
    </div>
  );
}

// ─── Trigger Meta Display ─────────────────────────────────────────────

function TriggerMeta({ meta }: { meta: TriggerMetadata }) {
  const typeIcons: Record<string, string> = {
    chat: '💬',
    inbox: '📥',
    event: '⚡',
    schedule: '🕐',
    webhook: '🔗',
  };
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">
        {typeIcons[meta.triggerType]} {meta.triggerType}
      </span>
      <span
        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
        style={{
          background: meta.status === 'active' ? '#DCFCE7' : '#F3F4F6',
          color: meta.status === 'active' ? '#166534' : '#6B7280',
        }}
      >
        {meta.status}
      </span>
      {meta.humanReadableSchedule && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
          {meta.humanReadableSchedule}
        </span>
      )}
      {meta.sourceConnectorId && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
          from connector
        </span>
      )}
    </div>
  );
}

// ─── Registry Card ────────────────────────────────────────────────────

function RegistryCard({ chip }: { chip: SmartChip }) {
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
      className="group rounded-xl border bg-white p-4 transition-all hover:shadow-md cursor-pointer"
      style={{ borderColor: expanded ? colors.bg + '60' : '#E5E7EB' }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded"
            style={{ background: colors.bg }}
          >
            {icon} @{chip.type}
          </span>
          <h3 className="text-sm font-semibold text-gray-900">{chip.name}</h3>
        </div>
        <StatusBadge status={chip.status} />
      </div>

      {/* Description */}
      <p className={`text-xs text-gray-500 leading-relaxed ${expanded ? '' : 'line-clamp-2'}`}>
        {chip.description}
      </p>

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
      <div className="mt-3 flex items-center justify-between text-[10px] text-gray-400">
        <div className="flex items-center gap-3">
          <span>{chip.owner.split('@')[0]}</span>
          <span>v{chip.version}</span>
          <span>{timeAgo}</span>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-gray-50 text-gray-500">
          {chip.usageCount} playbooks
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-20">Registry ID</span>
            <code className="text-[10px] bg-gray-50 px-1.5 py-0.5 rounded font-mono text-gray-600">
              {chip.registryId}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-20">Permission</span>
            <span className="text-gray-600 capitalize">{chip.permissions.currentUser}</span>
          </div>
          {chip.endpoint && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-20">Endpoint</span>
              <code className="text-[10px] bg-gray-50 px-1.5 py-0.5 rounded font-mono text-gray-600 truncate">
                {chip.endpoint}
              </code>
            </div>
          )}
          {chip.healthStatus && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-20">Health</span>
              <span
                className="text-[10px] font-medium"
                style={{
                  color:
                    chip.healthStatus === 'healthy' ? '#059669' :
                    chip.healthStatus === 'degraded' ? '#D97706' : '#DC2626',
                }}
              >
                {chip.healthStatus === 'healthy' ? '● Healthy' :
                 chip.healthStatus === 'degraded' ? '◐ Degraded' : '○ Down'}
              </span>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <button className="px-2.5 py-1 rounded-lg bg-[var(--color-accent)] text-white text-[10px] font-medium hover:opacity-90">
              Open in Editor
            </button>
            <button className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-[10px] font-medium hover:bg-gray-200">
              View History
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Catalog ─────────────────────────────────────────────────────

export function RegistryCatalog() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ChipType | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filtered = useMemo(() => {
    let items = REGISTRY;

    // Type filter
    if (typeFilter !== 'all') {
      items = items.filter((c) => c.type === typeFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.type.includes(q) ||
          c.owner.toLowerCase().includes(q),
      );
    }

    // Sort
    return sortChips(items, sortKey);
  }, [search, typeFilter, sortKey]);

  return (
    <div className="min-h-screen bg-[var(--color-surface-0)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">
            ← Back
          </Link>
          <div className="w-px h-5 bg-gray-200" />
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Registry & Catalog</h1>
            <p className="text-[10px] text-gray-500">
              All @-referenceable assets — {REGISTRY.length} entries
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search + Controls */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search assets by name, type, owner, or description…"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-3 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-xs text-gray-600 focus:outline-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>

            {/* View toggle */}
            <div className="flex items-center rounded-xl border border-[var(--color-border)] overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 text-xs ${viewMode === 'grid' ? 'bg-[var(--color-accent)] text-white' : 'bg-white text-gray-500'}`}
              >
                ▦ Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-xs ${viewMode === 'list' ? 'bg-[var(--color-accent)] text-white' : 'bg-white text-gray-500'}`}
              >
                ☰ List
              </button>
            </div>
          </div>

          {/* Type filters */}
          <TypeFilter active={typeFilter} onChange={setTypeFilter} />
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-sm">No assets match your search.</p>
            <button
              onClick={() => { setSearch(''); setTypeFilter('all'); }}
              className="mt-2 text-xs text-[var(--color-accent)] hover:underline"
            >
              Clear filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((chip) => (
              <RegistryCard key={chip.id} chip={chip} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((chip) => (
              <RegistryListRow key={chip.id} chip={chip} />
            ))}
          </div>
        )}

        {/* Summary bar */}
        <div className="mt-8 p-4 rounded-xl border border-[var(--color-border)] bg-white">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Registry Summary
          </h3>
          <div className="flex flex-wrap gap-3">
            {(['connector', 'skill', 'trigger', 'doc', 'tool', 'agent', 'guard', 'data', 'schema'] as ChipType[]).map((t) => {
              const count = REGISTRY.filter((c) => c.type === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors text-xs"
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: CHIP_COLORS[t].bg }}
                  />
                  <span className="text-gray-600">{count} @{t}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── List Row Variant ─────────────────────────────────────────────────

function RegistryListRow({ chip }: { chip: SmartChip }) {
  const colors = CHIP_COLORS[chip.type];
  const icon = CHIP_ICONS[chip.type];

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[var(--color-border)] bg-white hover:shadow-sm transition-shadow">
      <span
        className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded shrink-0"
        style={{ background: colors.bg }}
      >
        {icon} @{chip.type}
      </span>
      <span className="text-sm font-medium text-gray-900 w-48 truncate">{chip.name}</span>
      <span className="text-xs text-gray-500 flex-1 truncate">{chip.description}</span>
      <StatusBadge status={chip.status} />
      <span className="text-[10px] text-gray-400 w-12 text-right">v{chip.version}</span>
      <span className="text-[10px] text-gray-400 w-20 text-right">
        {chip.usageCount} refs
      </span>
    </div>
  );
}
