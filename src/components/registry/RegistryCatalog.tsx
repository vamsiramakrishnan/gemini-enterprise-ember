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

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRegistry } from '../../contexts/AppContext';
import { useWorkspace, type WorkspaceAccessReason } from '../../contexts/WorkspaceContext';
import { useScrollStagger } from '../../hooks';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip, ConnectorMetadata, SkillMetadata, TriggerMetadata } from '../../parser/types';
import { CreateAssetWizard } from '../shared/CreateAssetWizard';
import { Button, Card, Badge, StatusBadge, TextInput, Select, EmptyState as SharedEmptyState, SkeletonCard } from '../../ui';
import { CHIP_ACCENTS, CHIP_CONFIG } from '../../config/chipConfig';
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
            className="inline-flex items-center gap-1 cursor-pointer"
            style={{
              padding: '3px 10px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 11,
              fontWeight: 500,
              border: isActive ? '1px solid var(--color-text-primary)' : '1px solid transparent',
              background: isActive ? 'var(--color-text-primary)' : 'var(--color-surface-2)',
              color: isActive ? 'white' : 'var(--color-text-secondary)',
              fontFamily: 'var(--font-ui)',
              transition: 'all 150ms ease-out',
              letterSpacing: '-0.01em',
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

// ─── Origin Badge (who owns this chip + how it reached us) ───────────

const REASON_LABEL: Record<WorkspaceAccessReason, string> = {
  'owned':       'Mine',
  'shared':      'Shared',
  'granted':     'Shared',
  'org-catalog': 'Org',
  'published':   'Public',
};

const REASON_COLOR: Record<WorkspaceAccessReason, string> = {
  'owned':       CHIP_ACCENTS.connector,  // blue — this workspace owns it
  'shared':      CHIP_ACCENTS.skill,      // violet — cross-workspace grant
  'granted':     CHIP_ACCENTS.skill,
  'org-catalog': CHIP_ACCENTS.data,       // green — org-wide
  'published':   CHIP_ACCENTS.agent,      // amber — marketplace
};

function OriginBadge({ origin }: { origin: OriginInfo }) {
  if (!origin.reason) return null;
  const label = REASON_LABEL[origin.reason];
  const color = REASON_COLOR[origin.reason];
  const title =
    origin.reason === 'owned'
      ? `Owned by ${origin.ownerName}`
      : `From ${origin.ownerName} · ${label}`;
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1"
      style={{
        fontSize: 9.5,
        fontWeight: 600,
        padding: '2px 6px',
        borderRadius: 'var(--radius-xs)',
        background: `${color}14`,
        color,
        fontFamily: 'var(--font-ui)',
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        border: `1px solid ${color}30`,
      }}
    >
      <span style={{ fontSize: 9 }}>{origin.ownerIcon}</span>
      {label}
    </span>
  );
}

// ─── Registry Card ────────────────────────────────────────────────────

interface OriginInfo {
  reason: WorkspaceAccessReason | null;
  ownerName: string;
  ownerIcon: string;
  ownerColor: string;
}

function RegistryCard({ chip, origin, onSelect, onOpenEditor, onViewHistory }: { chip: SmartChip; origin: OriginInfo; onSelect: (id: string) => void; onOpenEditor: (chip: SmartChip) => void; onViewHistory: () => void }) {
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
      className="cursor-pointer"
      style={{
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-surface-0)',
        border: expanded ? `1px solid ${colors.border}` : '1px solid var(--color-border)',
        boxShadow: expanded ? `var(--shadow-md), 0 0 0 1px ${colors.accent}10` : 'var(--shadow-xs)',
        transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
        overflow: 'hidden',
      }}
      onClick={() => { setExpanded(!expanded); onSelect(chip.id); }}
      onMouseEnter={(e) => {
        if (!expanded) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
          e.currentTarget.style.borderColor = 'var(--color-border-strong)';
        }
      }}
      onMouseLeave={(e) => {
        if (!expanded) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
          e.currentTarget.style.borderColor = 'var(--color-border)';
        }
      }}
    >
      {/* Accent top edge */}
      <div
        style={{
          height: 2,
          background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent}40)`,
          opacity: expanded ? 1 : 0.5,
          transition: 'opacity 200ms ease-out',
        }}
      />
      <div style={{ padding: '14px 16px' }}>
        {/* Header row: type badge + status */}
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <Badge
            bg={colors.bg}
            color={colors.text}
            variant="outline"
            size="xs"
            icon={<span style={{ color: colors.accent }}>{icon}</span>}
          >
            @{chip.type}
          </Badge>
          <div className="flex items-center gap-1.5">
            <OriginBadge origin={origin} />
            <StatusBadge status={chip.status} size="xs" />
          </div>
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 620,
            color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-ui)',
            letterSpacing: '-0.01em',
            marginBottom: 4,
            lineHeight: 1.3,
          }}
        >
          {chip.name}
        </div>

        {/* Description */}
        <div
          className="overflow-hidden"
          style={{
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-ui)',
            lineHeight: 1.55,
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
        <div
          className="flex items-center justify-between"
          style={{
            marginTop: 10,
            fontSize: 10,
            color: 'var(--color-text-tertiary)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <div className="flex items-center gap-2">
            <span>{chip.owner.split('@')[0]}</span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                background: 'var(--color-surface-1)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-xs)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              v{chip.version}
            </span>
            <span>{timeAgo}</span>
          </div>
          <span>{chip.usageCount} refs</span>
        </div>

        {/* Expanded detail */}
        {expanded && (
          <div
            className="flex flex-col gap-1.5"
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--color-border-subtle)',
              fontSize: 12,
            }}
          >
            <DetailRow label="Registry ID">
              <code
                style={{
                  fontSize: 10,
                  background: 'var(--color-surface-1)',
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-xs)',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {chip.registryId}
              </code>
            </DetailRow>
            <DetailRow label="Permission">
              <span className="capitalize" style={{ color: 'var(--color-text-secondary)' }}>{chip.permissions.currentUser}</span>
            </DetailRow>
            {chip.endpoint && (
              <DetailRow label="Endpoint">
                <code
                  className="overflow-hidden text-ellipsis whitespace-nowrap max-w-[180px] inline-block"
                  style={{
                    fontSize: 10,
                    background: 'var(--color-surface-1)',
                    padding: '2px 6px',
                    borderRadius: 'var(--radius-xs)',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  {chip.endpoint}
                </code>
              </DetailRow>
            )}
            {chip.healthStatus && (
              <DetailRow label="Health">
                <span
                  style={{ fontSize: 11, fontWeight: 500, color: healthLabel(chip.healthStatus).color }}
                >
                  {healthLabel(chip.healthStatus).label}
                </span>
              </DetailRow>
            )}
            <div className="flex gap-1.5 mt-1">
              <Button
                size="sm"
                variant="primary"
                onClick={(e) => { e.stopPropagation(); onOpenEditor(chip); }}
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
      </div>
    </div>
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

function RegistryListRow({ chip, origin, onSelect }: { chip: SmartChip; origin: OriginInfo; onSelect: (id: string) => void }) {
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
      <OriginBadge origin={origin} />
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

type ScopeFilter = 'all' | 'mine' | 'shared' | 'org';

const SCOPE_TABS: { key: ScopeFilter; label: string; hint: string }[] = [
  { key: 'all',    label: 'All',     hint: 'Every asset visible in this workspace' },
  { key: 'mine',   label: 'Mine',    hint: 'Owned by this workspace' },
  { key: 'shared', label: 'Shared',  hint: 'Shared from other workspaces' },
  { key: 'org',    label: 'Org',     hint: 'Org-wide catalog (Platform + published)' },
];

export function RegistryCatalog() {
  const navigate = useNavigate();
  const { filteredChips: contextFilteredChips, chips: visibleChips, searchQuery, setSearchQuery, selectChip, createModalOpen, openCreateModal, closeCreateModal, createChip } = useRegistry();
  const { current: currentWorkspace, getChipAccess } = useWorkspace();

  const [typeFilter, setTypeFilter] = useState<ChipType | 'all'>('all');
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('relevance');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const gridStaggerRef = useScrollStagger<HTMLDivElement>({ staggerMs: 50 });

  // Simulate initial data fetch
  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  // Compute workspace-access metadata for every visible chip
  const chipOrigins = useMemo(() => {
    const map = new Map<string, OriginInfo>();
    for (const chip of contextFilteredChips) {
      const access = getChipAccess(chip);
      map.set(chip.id, {
        reason: access.reason,
        ownerName: access.ownerWorkspace?.name ?? 'Unknown',
        ownerIcon: access.ownerWorkspace?.icon ?? '•',
        ownerColor: access.ownerWorkspace?.color ?? '#64748B',
      });
    }
    return map;
  }, [contextFilteredChips, getChipAccess]);

  // Count chips per scope tab (before type filter) for the tab badges
  const scopeCounts = useMemo(() => {
    const counts = { all: 0, mine: 0, shared: 0, org: 0 };
    for (const chip of contextFilteredChips) {
      counts.all += 1;
      const reason = chipOrigins.get(chip.id)?.reason;
      if (reason === 'owned') counts.mine += 1;
      else if (reason === 'shared' || reason === 'granted') counts.shared += 1;
      else if (reason === 'org-catalog' || reason === 'published') counts.org += 1;
    }
    return counts;
  }, [contextFilteredChips, chipOrigins]);

  const filtered = useMemo(() => {
    let items = contextFilteredChips;

    if (scopeFilter !== 'all') {
      items = items.filter((c) => {
        const reason = chipOrigins.get(c.id)?.reason;
        if (scopeFilter === 'mine') return reason === 'owned';
        if (scopeFilter === 'shared') return reason === 'shared' || reason === 'granted';
        if (scopeFilter === 'org') return reason === 'org-catalog' || reason === 'published';
        return true;
      });
    }

    if (typeFilter !== 'all') {
      items = items.filter((c) => c.type === typeFilter);
    }

    return sortChips(items, sortKey);
  }, [contextFilteredChips, chipOrigins, scopeFilter, typeFilter, sortKey]);

  const handleOpenEditor = (chip: SmartChip) => {
    const route = CHIP_CONFIG[chip.type]?.createRoute;
    if (route) {
      navigate(`${route}/${chip.id}`);
    } else {
      navigate('/editor');
    }
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
      <header
        className="sticky top-0 z-50"
        style={{
          padding: '14px var(--space-page-x)',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(16px) saturate(180%)',
          WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        }}
      >
        <div className="max-w-[1200px] mx-auto flex items-center">
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--color-surface-2), var(--color-surface-3))',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1.2"/>
                <rect x="8" y="1.5" width="4.5" height="4.5" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1.2"/>
                <rect x="1.5" y="8" width="4.5" height="4.5" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1.2"/>
                <rect x="8" y="8" width="4.5" height="4.5" rx="1" stroke="var(--color-text-secondary)" strokeWidth="1.2"/>
              </svg>
            </div>
            <div>
              <h1
                style={{
                  fontSize: 14,
                  fontWeight: 650,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '-0.015em',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                Registry & Catalog
              </h1>
              <p style={{ fontSize: 10.5, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-ui)', margin: '1px 0 0' }}>
                {currentWorkspace?.name ?? 'Workspace'} &middot; {visibleChips.length} visible {visibleChips.length === 1 ? 'asset' : 'assets'}
                {scopeCounts.shared + scopeCounts.org > 0 && (
                  <> &middot; {scopeCounts.shared + scopeCounts.org} shared in</>
                )}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span
              style={{
                fontSize: 11,
                color: 'var(--color-text-tertiary)',
                fontFamily: 'var(--font-ui)',
                padding: '3px 10px',
                background: 'var(--color-surface-1)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
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
          <div
            className="flex items-center"
            style={{
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface-2)',
              padding: 2,
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="flex items-center justify-center"
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'grid' ? 'var(--color-surface-0)' : 'transparent',
                boxShadow: viewMode === 'grid' ? 'var(--shadow-xs)' : 'none',
                transition: 'all 150ms ease-out',
              }}
              title="Grid view"
            >
              <GridIcon active={viewMode === 'grid'} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center justify-center"
              style={{
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'list' ? 'var(--color-surface-0)' : 'transparent',
                boxShadow: viewMode === 'list' ? 'var(--shadow-xs)' : 'none',
                transition: 'all 150ms ease-out',
              }}
              title="List view"
            >
              <ListIcon active={viewMode === 'list'} />
            </button>
          </div>
        </div>

        {/* Workspace scope tabs — Mine / Shared / Org / All */}
        <div
          className="flex items-center mb-3"
          style={{
            gap: 2,
            padding: 3,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface-2)',
            width: 'fit-content',
          }}
        >
          {SCOPE_TABS.map((tab) => {
            const isActive = scopeFilter === tab.key;
            const count = scopeCounts[tab.key];
            return (
              <button
                key={tab.key}
                onClick={() => setScopeFilter(tab.key)}
                title={tab.hint}
                className="inline-flex items-center gap-1.5"
                style={{
                  padding: '5px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 11.5,
                  fontWeight: isActive ? 600 : 500,
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '-0.01em',
                  background: isActive ? 'var(--color-surface-0)' : 'transparent',
                  color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  boxShadow: isActive ? 'var(--shadow-xs)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out',
                }}
              >
                {tab.label}
                <span
                  style={{
                    fontSize: 9.5,
                    padding: '1px 5px',
                    borderRadius: 'var(--radius-xs)',
                    background: isActive ? 'var(--color-accent-light)' : 'var(--color-surface-1)',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Type filters */}
        <div className="mb-5">
          <TypeFilter active={typeFilter} onChange={setTypeFilter} />
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="grid-auto">
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
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
          <div ref={gridStaggerRef} className="grid-auto">
            {filtered.map((chip) => (
              <RegistryCard
                key={chip.id}
                chip={chip}
                origin={chipOrigins.get(chip.id) ?? { reason: null, ownerName: 'Unknown', ownerIcon: '•', ownerColor: '#64748B' }}
                onSelect={handleSelect}
                onOpenEditor={handleOpenEditor}
                onViewHistory={handleViewHistory}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map((chip) => (
              <RegistryListRow
                key={chip.id}
                chip={chip}
                origin={chipOrigins.get(chip.id) ?? { reason: null, ownerName: 'Unknown', ownerIcon: '•', ownerColor: '#64748B' }}
                onSelect={handleSelect}
              />
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
              const count = visibleChips.filter((c) => c.type === t).length;
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
