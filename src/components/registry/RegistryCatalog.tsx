/**
 * RegistryCatalog — Screen 3: Searchable asset catalog for all @-referenceable resources.
 *
 * Grid/list browser with type filters, search, and sort. Each card shows
 * type, name, version, status, owner, usage count, and description.
 *
 * Refactored to use shared UI primitives (Card, Badge, StatusBadge, Button,
 * TextInput, Select, EmptyState) and CSS custom-property design tokens
 * instead of hardcoded hex colors and inline style objects.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistry } from '../../contexts/AppContext';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip, ConnectorMetadata, SkillMetadata, TriggerMetadata } from '../../parser/types';
import { CreateAssetWizard } from '../shared/CreateAssetWizard';
import { Button, Card, Badge, StatusBadge, TextInput, Select, EmptyState as SharedEmptyState } from '../../ui';
import { CHIP_ACCENTS } from '../../config/chipConfig';
import { statusColors } from '../../constants/colors';

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
        const chipColor = t === 'all' ? null : CHIP_COLORS[t as ChipType];
        const icon = t === 'all' ? null : CHIP_ICONS[t as ChipType];

        if (isActive && chipColor) {
          return (
            <Badge
              key={t}
              bg={chipColor.bg}
              color={chipColor.text}
              variant="outline"
              size="sm"
              icon={icon ? <span className="text-[10px]">{icon}</span> : undefined}
              className="cursor-pointer"
            >
              <span onClick={() => onChange(t)}>@{t}</span>
            </Badge>
          );
        }

        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={[
              'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full',
              'text-[11px] font-medium border border-transparent',
              'cursor-pointer transition-colors duration-150',
              isActive
                ? 'bg-gray-700 text-white'
                : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-3)]',
            ].join(' ')}
          >
            {icon && <span className="text-[10px]">{icon}</span>}
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

// ─── Connector Meta Display ───────────────────────────────────────────

/** Raw hex needed because Badge computes transparent bg from color string */
const SYNC_RAW: Record<string, string> = {
  active: CHIP_ACCENTS.data,      // #059669
  syncing: CHIP_ACCENTS.agent,    // #D97706
  error: CHIP_ACCENTS.guard,      // #E11D48
  paused: CHIP_ACCENTS.schema,    // #475569
};

function ConnectorMeta({ meta }: { meta: ConnectorMetadata }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <Badge
        color={SYNC_RAW[meta.syncStatus] || SYNC_RAW.paused}
        size="xs"
      >
        {meta.syncStatus === 'active' ? 'Active' : meta.syncStatus}
      </Badge>
      <Badge color="var(--color-text-secondary)" bg="var(--color-surface-2)" size="xs">
        {meta.entities.filter(e => e.enabled).length} entities
      </Badge>
      <Badge color="var(--color-text-secondary)" bg="var(--color-surface-2)" size="xs">
        {meta.actions.filter(a => a.enabled).length} actions
      </Badge>
      <Badge color="var(--color-text-secondary)" bg="var(--color-surface-2)" size="xs">
        {meta.syncMode}
      </Badge>
    </div>
  );
}

// ─── Skill Meta Display ───────────────────────────────────────────────

function SkillMeta({ meta }: { meta: SkillMetadata }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <Badge color={CHIP_ACCENTS.skill} size="xs">
        {meta.scope}
      </Badge>
      <Badge color={CHIP_ACCENTS.skill} size="xs">
        {meta.activationMode}
      </Badge>
      {meta.resources.scripts.length > 0 && (
        <Badge color="var(--color-text-secondary)" bg="var(--color-surface-2)" size="xs">
          {meta.resources.scripts.length} scripts
        </Badge>
      )}
    </div>
  );
}

// ─── Trigger Meta Display ─────────────────────────────────────────────

function TriggerMeta({ meta }: { meta: TriggerMetadata }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <Badge color={CHIP_ACCENTS.trigger} size="xs">
        {meta.triggerType}
      </Badge>
      <Badge
        color={meta.status === 'active' ? statusColors.resolved.text : undefined}
        bg={meta.status === 'active' ? statusColors.resolved.bg : 'var(--color-surface-2)'}
        size="xs"
      >
        {meta.status}
      </Badge>
      {meta.humanReadableSchedule && (
        <Badge color="var(--color-text-secondary)" bg="var(--color-surface-2)" size="xs">
          {meta.humanReadableSchedule}
        </Badge>
      )}
      {meta.sourceConnectorId && (
        <Badge color={CHIP_ACCENTS.connector} size="xs">
          from connector
        </Badge>
      )}
    </div>
  );
}

// ─── View Toggle Icons (SVG) ──────────────────────────────────────────

function GridIcon({ active }: { active: boolean }) {
  const fill = active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="5" height="5" rx="1" fill={fill} />
      <rect x="8" y="1" width="5" height="5" rx="1" fill={fill} />
      <rect x="1" y="8" width="5" height="5" rx="1" fill={fill} />
      <rect x="8" y="8" width="5" height="5" rx="1" fill={fill} />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  const fill = active ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)';
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="2" width="12" height="2" rx="1" fill={fill} />
      <rect x="1" y="6" width="12" height="2" rx="1" fill={fill} />
      <rect x="1" y="10" width="12" height="2" rx="1" fill={fill} />
    </svg>
  );
}

// ─── Search Icon (SVG) ────────────────────────────────────────────────

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
      <circle cx="6" cy="6" r="4.5" stroke="var(--color-text-tertiary)" strokeWidth="1.5" />
      <path d="M9.5 9.5L12.5 12.5" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Health label helper ─────────────────────────────────────────────

function healthLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'healthy':  return { label: 'Healthy',  color: CHIP_ACCENTS.data };
    case 'degraded': return { label: 'Degraded', color: CHIP_ACCENTS.agent };
    default:         return { label: 'Down',     color: CHIP_ACCENTS.guard };
  }
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
    <Card
      variant="interactive"
      padding="sm"
      className="p-3.5"
      style={{
        borderColor: expanded ? colors.border : undefined,
      }}
      onClick={() => { setExpanded(!expanded); onSelect(chip.id); }}
    >
      {/* Header row: type badge + status */}
      <div className="flex items-center justify-between mb-2">
        <Badge
          bg={colors.bg}
          color={colors.text}
          variant="outline"
          size="xs"
          icon={<span style={{ color: colors.accent }}>{icon}</span>}
        >
          @{chip.type}
        </Badge>
        <StatusBadge status={chip.status} size="xs" />
      </div>

      {/* Name */}
      <div className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-1 leading-tight">
        {chip.name}
      </div>

      {/* Description */}
      <div
        className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed overflow-hidden"
        style={{
          display: '-webkit-box',
          WebkitLineClamp: expanded ? 999 : 2,
          WebkitBoxOrient: 'vertical',
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
      <div className="mt-2.5 flex items-center justify-between text-[10px] text-[var(--color-text-tertiary)]">
        <div className="flex items-center gap-2.5">
          <span>{chip.owner.split('@')[0]}</span>
          <Badge color="var(--color-text-secondary)" bg="var(--color-surface-2)" size="xs">
            v{chip.version}
          </Badge>
          <span>{timeAgo}</span>
        </div>
        <span className="text-[var(--color-text-tertiary)]">
          {chip.usageCount} refs
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--color-surface-2)] flex flex-col gap-1.5 text-[12px]">
          <DetailRow label="Registry ID">
            <code className="text-[10px] bg-[var(--color-surface-1)] px-1.5 py-0.5 rounded font-mono text-[var(--color-text-secondary)]">
              {chip.registryId}
            </code>
          </DetailRow>
          <DetailRow label="Permission">
            <span className="text-[var(--color-text-secondary)] capitalize">{chip.permissions.currentUser}</span>
          </DetailRow>
          {chip.endpoint && (
            <DetailRow label="Endpoint">
              <code className="text-[10px] bg-[var(--color-surface-1)] px-1.5 py-0.5 rounded font-mono text-[var(--color-text-secondary)] overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px] inline-block">
                {chip.endpoint}
              </code>
            </DetailRow>
          )}
          {chip.healthStatus && (
            <DetailRow label="Health">
              <span
                className="text-[11px] font-medium"
                style={{ color: healthLabel(chip.healthStatus).color }}
              >
                {healthLabel(chip.healthStatus).label}
              </span>
            </DetailRow>
          )}
          <div className="flex gap-1.5 mt-1">
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => { e.stopPropagation(); onOpenEditor(); }}
            >
              Open in Editor
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={(e) => { e.stopPropagation(); onViewHistory(); }}
            >
              View History
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[var(--color-text-tertiary)] w-[76px] shrink-0 text-[11px]">{label}</span>
      {children}
    </div>
  );
}

// ─── List Row Variant ─────────────────────────────────────────────────

function RegistryListRow({ chip, onSelect }: { chip: SmartChip; onSelect: (id: string) => void }) {
  const colors = CHIP_COLORS[chip.type];
  const icon = CHIP_ICONS[chip.type];

  return (
    <Card
      variant="interactive"
      padding="none"
      className="flex items-center gap-3.5 px-3.5 py-2.5"
      onClick={() => onSelect(chip.id)}
    >
      <Badge
        bg={colors.bg}
        color={colors.text}
        variant="outline"
        size="xs"
        icon={<span style={{ color: colors.accent }}>{icon}</span>}
        className="shrink-0"
      >
        @{chip.type}
      </Badge>
      <span className="text-[13px] font-medium text-[var(--color-text-primary)] w-[180px] shrink-0 overflow-hidden text-ellipsis whitespace-nowrap">
        {chip.name}
      </span>
      <span className="text-[12px] text-[var(--color-text-secondary)] flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
        {chip.description}
      </span>
      <StatusBadge status={chip.status} size="xs" />
      <span className="text-[10px] text-[var(--color-text-tertiary)] w-[44px] text-right shrink-0">
        v{chip.version}
      </span>
      <span className="text-[10px] text-[var(--color-text-tertiary)] w-[52px] text-right shrink-0">
        {chip.usageCount} refs
      </span>
    </Card>
  );
}

// ─── Main Catalog ─────────────────────────────────────────────────────

export function RegistryCatalog() {
  const navigate = useNavigate();
  const { filteredChips: contextFilteredChips, chips: allChips, searchQuery, setSearchQuery, selectChip, createModalOpen, openCreateModal, closeCreateModal, createChip } = useRegistry();

  const [typeFilter, setTypeFilter] = useState<ChipType | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const handleCreate = (partial: Partial<SmartChip> & { type: ChipType; name: string }) => {
    createChip(partial);
  };

  return (
    <div className="page-container" style={{ overflow: 'auto' }}>
      {/* Header */}
      <header className="page-header sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto flex items-center">
          <div>
            <h1 className="text-[13px] font-semibold text-[var(--color-text-primary)] m-0 leading-tight">
              Registry & Catalog
            </h1>
            <p className="text-[10px] text-[var(--color-text-tertiary)] m-0 mt-0.5">
              All @-referenceable assets -- {allChips.length} entries
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-[var(--color-text-tertiary)]">
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </span>
            <Button size="sm" variant="primary" onClick={openCreateModal}>
              + Create New
            </Button>
          </div>
        </div>
      </header>

      <div className="page-body max-w-[1200px] mx-auto">
        {/* Search + Controls Row */}
        <div className="flex flex-wrap items-center gap-2.5 mb-3.5">
          {/* Search */}
          <div className="flex-[1_1_100%] min-w-[200px] relative flex items-center">
            <span className="absolute left-3 flex pointer-events-none">
              <SearchIcon />
            </span>
            <TextInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets by name, type, owner, or description..."
              className="pl-[34px]"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-[var(--color-text-tertiary)] p-0.5"
                onClick={() => setSearchQuery('')}
              >
                x
              </Button>
            )}
          </div>

          {/* Sort */}
          <Select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            inputSize="sm"
            className="w-auto"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </Select>

          {/* View toggle */}
          <div className="flex items-center rounded-lg bg-[var(--color-surface-2)] p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={[
                'flex items-center justify-center px-2 py-1.5 rounded-md border-none cursor-pointer transition-all duration-150',
                viewMode === 'grid'
                  ? 'bg-white shadow-sm'
                  : 'bg-transparent',
              ].join(' ')}
              title="Grid view"
            >
              <GridIcon active={viewMode === 'grid'} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={[
                'flex items-center justify-center px-2 py-1.5 rounded-md border-none cursor-pointer transition-all duration-150',
                viewMode === 'list'
                  ? 'bg-white shadow-sm'
                  : 'bg-transparent',
              ].join(' ')}
              title="List view"
            >
              <ListIcon active={viewMode === 'list'} />
            </button>
          </div>
        </div>

        {/* Type filters */}
        <div className="mb-5">
          <TypeFilter active={typeFilter} onChange={setTypeFilter} />
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <SharedEmptyState
            icon={
              <svg width="24" height="24" viewBox="0 0 40 40" fill="none" style={{ opacity: 0.5 }}>
                <circle cx="18" cy="18" r="12" stroke="var(--color-text-tertiary)" strokeWidth="2" />
                <path d="M27 27L35 35" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" />
                <path d="M14 18H22" stroke="var(--color-text-tertiary)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            }
            title="No assets match your search."
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearchQuery(''); setTypeFilter('all'); }}
                className="underline underline-offset-2 text-[var(--color-accent)]"
              >
                Clear filters
              </Button>
            }
          />
        ) : viewMode === 'grid' ? (
          <div className="grid-auto">
            {filtered.map((chip) => (
              <RegistryCard key={chip.id} chip={chip} onSelect={handleSelect} onOpenEditor={handleOpenEditor} onViewHistory={handleViewHistory} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map((chip) => (
              <RegistryListRow key={chip.id} chip={chip} onSelect={handleSelect} />
            ))}
          </div>
        )}

        {/* Summary bar */}
        <Card variant="default" padding="sm" className="mt-8 p-3.5">
          <h3 className="text-[10px] font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wide m-0 mb-2.5">
            Registry Summary
          </h3>
          <div className="flex flex-wrap gap-2">
            {(['connector', 'skill', 'trigger', 'doc', 'tool', 'agent', 'guard', 'data', 'schema'] as ChipType[]).map((t) => {
              const count = allChips.filter((c) => c.type === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={[
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border-none',
                    'cursor-pointer text-[11px] text-[var(--color-text-secondary)] transition-colors duration-150',
                    typeFilter === t ? '' : 'bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)]',
                  ].join(' ')}
                  style={typeFilter === t ? { background: CHIP_COLORS[t].bg } : undefined}
                >
                  <span
                    className="w-[7px] h-[7px] rounded-full shrink-0"
                    style={{ background: CHIP_COLORS[t].accent }}
                  />
                  {count} @{t}
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Create Asset Wizard */}
      <CreateAssetWizard
        isOpen={createModalOpen}
        onClose={closeCreateModal}
        onCreate={handleCreate}
      />
    </div>
  );
}
