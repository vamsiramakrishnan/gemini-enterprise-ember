/**
 * VersionHistory — Screen 10: Version timeline + chip-aware diff view.
 *
 * Three-panel layout:
 *   Left: scrollable version timeline with status-colored cards
 *   Center: chip-aware diff with colored inline chips and line-level annotations
 *   Right: change summary, stats, and actions
 *
 * Responsive:
 *   Mobile (<768px): panels stack vertically; timeline is horizontal scrolling strip
 *   Tablet (768–1023px): sidebar + main; aside hidden behind toggle
 *   Desktop (1024px+): all three panels side by side
 */

import { useState, useMemo } from 'react';
import { useNotifications, usePlaybook } from '../../contexts/AppContext';
import { VERSIONS, DIFF_V21_V22, DIFF_SUMMARY } from '../../data/versions';
import type { VersionEntry, DiffLineEntry } from '../../data/versions';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipChange, VersionStatus } from '../../parser/types';
import { statusColors, colors } from '../../constants/colors';
import { Button } from '../../ui/Button';
import { Badge } from '../../ui/Badge';
import { Card } from '../../ui/Card';

/* ─── Constants ─────────────────────────────────────────────────────── */

const STATUS_BORDER_COLORS: Record<VersionStatus, string> = {
  production:    'var(--color-success)',
  staging:       'var(--color-accent)',
  draft:         'var(--color-draft)',
  deprecated:    'var(--color-text-tertiary)',
  'rolled-back': 'var(--color-unresolved)',
};

const ACTION_STYLES = {
  added:    { prefix: '+', bg: statusColors.production.bg, text: statusColors.production.text, border: '#BBF7D0' },
  removed:  { prefix: '\u2212', bg: statusColors.unresolved.bg, text: statusColors.unresolved.text, border: '#FECACA' },
  modified: { prefix: '~', bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
};

/* ─── Version Status Badge (maps to StatusBadge) ───────────────────── */

function VersionStatusBadge({ status }: { status: VersionStatus }) {
  const label =
    status === 'production'  ? 'LIVE' :
    status === 'rolled-back' ? 'ROLLED BACK' :
    status.toUpperCase();

  const c = statusColors[status] ?? statusColors.draft;

  return (
    <Badge
      bg={c.bg}
      color={c.text}
      size="xs"
      dot={status === 'production' ? 'var(--color-success)' : undefined}
    >
      {label}
    </Badge>
  );
}

/* ─── Chip Change Pill ──────────────────────────────────────────────── */

function ChipChangePill({ change }: { change: ChipChange }) {
  const chipColors = CHIP_COLORS[change.chipType];
  const icon = CHIP_ICONS[change.chipType];
  const a = ACTION_STYLES[change.action];

  return (
    <Badge
      bg={a.bg}
      color={a.text}
      variant="outline"
      size="xs"
      className="!rounded-full"
      icon={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <span style={{ fontWeight: 700 }}>{a.prefix}</span>
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: chipColors.accent,
              flexShrink: 0,
            }}
          />
        </span>
      }
    >
      {icon} @{change.chipType}({change.chipName})
    </Badge>
  );
}

/* ─── Version Timeline Entry ────────────────────────────────────────── */

function TimelineEntry({
  version,
  selected,
  onSelect,
}: {
  version: VersionEntry;
  selected: boolean;
  onSelect: () => void;
}) {
  const timeAgo = useMemo(() => {
    const diff = Date.now() - new Date(version.timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }, [version.timestamp]);

  const borderColor = STATUS_BORDER_COLORS[version.status];

  return (
    <div
      onClick={onSelect}
      className="vh-timeline-entry"
      style={{
        padding: '10px 12px',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'background 150ms ease, border-color 150ms ease',
        background: selected ? 'var(--color-accent-light)' : 'transparent',
        outline: selected ? `1px solid var(--color-accent)` : '1px solid transparent',
        marginBottom: 2,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'var(--color-surface-1)';
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: colors.textPrimary,
            fontFamily: 'var(--font-ui)',
          }}
        >
          v{version.version}
        </span>
        <VersionStatusBadge status={version.status} />
        {version.reviewStatus === 'approved' && (
          <span style={{ fontSize: 10, color: 'var(--color-success)', fontFamily: 'var(--font-ui)' }}>
            Approved
          </span>
        )}
        {version.reviewStatus === 'pending' && (
          <span style={{ fontSize: 10, color: '#D97706', fontFamily: 'var(--font-ui)' }}>
            Pending
          </span>
        )}
      </div>

      {/* Author + time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontSize: 10,
          color: colors.textTertiary,
          fontFamily: 'var(--font-ui)',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'var(--color-border-strong)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 8,
            fontWeight: 700,
            color: '#fff',
            flexShrink: 0,
          }}
        >
          {version.author.name[0]}
        </span>
        <span>{version.author.name}</span>
        <span style={{ color: 'var(--color-border-strong)' }}>/</span>
        <span>{timeAgo}</span>
      </div>

      {/* Summary */}
      <p
        style={{
          fontSize: 11,
          color: colors.textSecondary,
          fontFamily: 'var(--font-ui)',
          lineHeight: '15px',
          margin: 0,
          marginBottom: version.chipChanges.length > 0 ? 8 : 0,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {version.changeSummary}
      </p>

      {/* Chip changes */}
      {version.chipChanges.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {version.chipChanges.map((c, i) => (
            <ChipChangePill key={i} change={c} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Diff Line ─────────────────────────────────────────────────────── */

const LINE_BG: Record<DiffLineEntry['type'], string> = {
  added:     '#F0FDF4',
  removed:   '#FEF2F2',
  modified:  '#FFFBEB',
  unchanged: 'var(--color-surface-0)',
};

const LINE_TEXT: Record<DiffLineEntry['type'], string> = {
  added:     statusColors.production.text,
  removed:   statusColors.unresolved.text,
  modified:  '#92400E',
  unchanged: colors.textSecondary,
};

const LINE_PREFIX: Record<DiffLineEntry['type'], string> = {
  added:     '+',
  removed:   '\u2212',
  modified:  '~',
  unchanged: ' ',
};

function DiffLine({ line, lineNum }: { line: DiffLineEntry; lineNum: number }) {
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w+\([^)]+\))/g);
    return parts.map((part, i) => {
      const chipMatch = part.match(/@(\w+)\(([^)]+)\)/);
      if (chipMatch) {
        const type = chipMatch[1] as keyof typeof CHIP_COLORS;
        const name = chipMatch[2];
        const chipColors = CHIP_COLORS[type];
        if (chipColors) {
          const glowColor =
            line.chipAction === 'added'   ? 'var(--color-success)' :
            line.chipAction === 'removed' ? 'var(--color-unresolved)' :
            undefined;
          return (
            <span
              key={i}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 2,
                padding: '0 6px',
                borderRadius: 9999,
                fontSize: 10,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
                color: chipColors.text,
                background: chipColors.bg,
                border: `1px solid ${chipColors.border}`,
                margin: '0 2px',
                lineHeight: '18px',
                boxShadow: glowColor
                  ? `0 0 0 2px color-mix(in srgb, ${glowColor} 25%, transparent), 0 0 6px color-mix(in srgb, ${glowColor} 15%, transparent)`
                  : undefined,
                opacity: line.type === 'removed' ? 0.5 : 1,
                textDecoration: line.type === 'removed' ? 'line-through' : undefined,
              }}
            >
              <span style={{ color: chipColors.accent }}>{CHIP_ICONS[type]}</span> {name}
            </span>
          );
        }
      }
      return (
        <span
          key={i}
          style={{
            textDecoration: line.type === 'removed' ? 'line-through' : undefined,
          }}
        >
          {part}
        </span>
      );
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 0,
        fontSize: 12,
        fontFamily: 'var(--font-mono)',
        background: LINE_BG[line.type],
        borderBottom: `1px solid var(--color-surface-1)`,
        minHeight: 26,
        lineHeight: '22px',
      }}
    >
      {/* Line number */}
      <span
        style={{
          width: 36,
          textAlign: 'right',
          paddingRight: 8,
          fontSize: 10,
          color: 'var(--color-border-strong)',
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {lineNum}
      </span>
      {/* Prefix */}
      <span
        style={{
          width: 16,
          textAlign: 'center',
          color: LINE_TEXT[line.type],
          fontWeight: 600,
          flexShrink: 0,
          userSelect: 'none',
        }}
      >
        {LINE_PREFIX[line.type]}
      </span>
      {/* Content */}
      <span
        style={{
          color: LINE_TEXT[line.type],
          padding: '2px 8px 2px 0',
          flex: 1,
          minWidth: 0,
          overflowWrap: 'break-word',
        }}
      >
        {renderContent(line.content)}
      </span>
    </div>
  );
}

/* ─── Unchanged Lines Collapse ──────────────────────────────────────── */

function CollapsedUnchanged({ count, onExpand }: { count: number; onExpand: () => void }) {
  return (
    <div
      onClick={onExpand}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4px 0',
        fontSize: 10,
        color: colors.textTertiary,
        fontFamily: 'var(--font-ui)',
        background: '#FAFAFA',
        borderTop: `1px solid var(--color-surface-2)`,
        borderBottom: `1px solid var(--color-surface-2)`,
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = colors.textSecondary; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = colors.textTertiary; }}
    >
      Show {count} unchanged line{count !== 1 ? 's' : ''}
    </div>
  );
}

/* ─── Summary Panel (extracted for reuse in collapsible mobile view) ── */

function SummaryPanel({
  selected,
  selectedVersion,
  diffStats,
  diffChipChanges,
}: {
  selected: VersionEntry;
  selectedVersion: string;
  diffStats: { added: number; removed: number; unchanged: number };
  diffChipChanges: ChipChange[];
}) {
  const { addNotification } = useNotifications();
  const { restoreVersion, openPublishModal } = usePlaybook();
  return (
    <div
      style={{
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {/* Version info card */}
      <Card padding="sm">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: colors.textPrimary,
              fontFamily: 'var(--font-ui)',
            }}
          >
            v{selected.version}
          </span>
          <VersionStatusBadge status={selected.status} />
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            color: colors.textTertiary,
            fontFamily: 'var(--font-ui)',
            marginBottom: 6,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: 'var(--color-border-strong)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {selected.author.name[0]}
          </span>
          <span>{selected.author.name}</span>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            color: colors.textSecondary,
            fontFamily: 'var(--font-ui)',
            lineHeight: '15px',
          }}
        >
          {selected.changeSummary}
        </p>
      </Card>

      {/* Diff stats */}
      {selectedVersion === '2.2.0' && (
        <Card padding="sm">
          <h3
            className="text-section-label"
            style={{
              margin: '0 0 8px',
            }}
          >
            Diff Stats
          </h3>
          <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-ui)' }}>
            <span style={{ color: statusColors.production.text }}>+{diffStats.added} added</span>
            <span style={{ color: statusColors.unresolved.text }}>{diffStats.removed > 0 ? `\u2212${diffStats.removed}` : '0'} removed</span>
          </div>
          <div
            style={{
              marginTop: 6,
              fontSize: 10,
              color: colors.textTertiary,
              fontFamily: 'var(--font-ui)',
            }}
          >
            {diffStats.unchanged} unchanged lines
          </div>
        </Card>
      )}

      {/* Chip changes */}
      <Card padding="sm">
        <h3
          className="text-section-label"
          style={{
            margin: '0 0 8px',
          }}
        >
          @Reference Changes ({diffChipChanges.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {diffChipChanges.map((c, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ChipChangePill change={c} />
              {c.detail && (
                <span
                  style={{
                    fontSize: 10,
                    color: colors.textTertiary,
                    fontFamily: 'var(--font-ui)',
                    marginLeft: 20,
                  }}
                >
                  {c.detail}
                </span>
              )}
            </div>
          ))}
          {diffChipChanges.length === 0 && (
            <p style={{ margin: 0, fontSize: 10, color: colors.textTertiary, fontFamily: 'var(--font-ui)' }}>
              No chip changes in this version.
            </p>
          )}
        </div>
      </Card>

      {/* Actions */}
      <Card padding="sm" className="flex flex-col gap-1.5">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => openPublishModal()}
        >
          Publish v{selected.version}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => {
            restoreVersion(selected.version);
            addNotification({ type: 'success', title: `Restored to v${selected.version}` });
          }}
        >
          Restore This Version
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="w-full"
          onClick={() => {
            addNotification({ type: 'info', title: 'Fork created', message: `Forked from v${selected.version} as a new draft` });
          }}
        >
          Fork From Here
        </Button>
      </Card>

      {/* Review status */}
      {selected.reviewStatus && (
        <Card padding="sm">
          <h3
            className="text-section-label"
            style={{
              margin: '0 0 8px',
            }}
          >
            Review
          </h3>
          <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)' }}>
            {selected.reviewStatus === 'approved' && (
              <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Approved</span>
            )}
            {selected.reviewStatus === 'pending' && (
              <span style={{ color: '#D97706', fontWeight: 600 }}>Pending review</span>
            )}
          </div>
          {selected.reviewers && (
            <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {selected.reviewers.map((r) => (
                <Badge
                  key={r}
                  bg="var(--color-surface-2)"
                  color="var(--color-text-secondary)"
                  size="xs"
                >
                  {r.split('@')[0]}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */

export function VersionHistory() {
  const [selectedVersion, setSelectedVersion] = useState('2.2.0');
  const [expandedUnchanged, setExpandedUnchanged] = useState(false);
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  const selected = VERSIONS.find((v) => v.version === selectedVersion) || VERSIONS[4];
  const compareFrom = VERSIONS.find((v) => v.version === '2.1.0')!;

  const diffChipChanges = useMemo(() => selected.chipChanges, [selected]);

  // Diff stats
  const diffStats = useMemo(() => {
    if (selectedVersion !== '2.2.0') return { added: 0, removed: 0, unchanged: 0 };
    return DIFF_V21_V22.reduce(
      (acc, l) => {
        if (l.type === 'added') acc.added++;
        else if (l.type === 'removed') acc.removed++;
        else acc.unchanged++;
        return acc;
      },
      { added: 0, removed: 0, unchanged: 0 },
    );
  }, [selectedVersion]);

  // Group diff lines: collapse consecutive unchanged lines
  const diffGroups = useMemo(() => {
    if (selectedVersion !== '2.2.0') return [];
    const groups: Array<
      | { kind: 'lines'; lines: Array<{ line: DiffLineEntry; lineNum: number }> }
      | { kind: 'collapsed'; count: number; lines: Array<{ line: DiffLineEntry; lineNum: number }> }
    > = [];
    let lineNum = 0;
    let unchangedBuffer: Array<{ line: DiffLineEntry; lineNum: number }> = [];

    const flushUnchanged = () => {
      if (unchangedBuffer.length === 0) return;
      if (unchangedBuffer.length <= 2 || expandedUnchanged) {
        groups.push({ kind: 'lines', lines: [...unchangedBuffer] });
      } else {
        // Show first and last, collapse middle
        groups.push({ kind: 'lines', lines: [unchangedBuffer[0]] });
        groups.push({
          kind: 'collapsed',
          count: unchangedBuffer.length - 2,
          lines: unchangedBuffer.slice(1, -1),
        });
        groups.push({ kind: 'lines', lines: [unchangedBuffer[unchangedBuffer.length - 1]] });
      }
      unchangedBuffer = [];
    };

    for (const dl of DIFF_V21_V22) {
      lineNum++;
      if (dl.type === 'unchanged') {
        unchangedBuffer.push({ line: dl, lineNum });
      } else {
        flushUnchanged();
        if (groups.length > 0 && groups[groups.length - 1].kind === 'lines') {
          (groups[groups.length - 1] as { kind: 'lines'; lines: Array<{ line: DiffLineEntry; lineNum: number }> }).lines.push({ line: dl, lineNum });
        } else {
          groups.push({ kind: 'lines', lines: [{ line: dl, lineNum }] });
        }
      }
    }
    flushUnchanged();
    return groups;
  }, [selectedVersion, expandedUnchanged]);

  return (
    <div className="page-container">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: colors.textPrimary,
              fontFamily: 'var(--font-ui)',
            }}
          >
            Version History
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: colors.textTertiary,
              fontFamily: 'var(--font-ui)',
              marginTop: 1,
            }}
          >
            Claims Processing Agent — {VERSIONS.length} versions
          </p>
        </div>
        <Badge
          bg="var(--color-surface-2)"
          color="var(--color-text-secondary)"
          size="md"
        >
          v{compareFrom.version} → v{selected.version}
        </Badge>
      </header>

      {/* ── Three-Panel Layout ──────────────────────────────────────── */}
      <div className="layout-triple page-body" style={{ padding: 0 }}>
        {/* ── Left: Version Timeline ──────────────────────────────── */}
        <div
          className="panel-sidebar vh-timeline"
          style={{
            padding: '12px 8px',
          }}
        >
          <h2
            className="text-section-label"
            style={{
              margin: '0 0 10px 12px',
            }}
          >
            Timeline
          </h2>
          {[...VERSIONS].reverse().map((v) => (
            <TimelineEntry
              key={v.version}
              version={v}
              selected={v.version === selectedVersion}
              onSelect={() => {
                setSelectedVersion(v.version);
                setExpandedUnchanged(false);
              }}
            />
          ))}
        </div>

        {/* ── Center: Chip-Aware Diff ─────────────────────────────── */}
        <div
          className="panel-main"
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Diff sub-header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              borderBottom: `1px solid var(--color-surface-2)`,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: colors.textPrimary,
                fontFamily: 'var(--font-ui)',
              }}
            >
              Chip-Aware Diff
            </span>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 10,
                color: colors.textTertiary,
                fontFamily: 'var(--font-ui)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80' }} />
                Added
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#F87171' }} />
                Removed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#FBBF24' }} />
                Modified
              </span>
            </div>
          </div>

          {/* Diff body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {selectedVersion === '2.2.0' ? (
              <>
                {diffGroups.map((group, gi) => {
                  if (group.kind === 'lines') {
                    return group.lines.map(({ line, lineNum }) => (
                      <DiffLine key={`${gi}-${lineNum}`} line={line} lineNum={lineNum} />
                    ));
                  }
                  return (
                    <CollapsedUnchanged
                      key={`c-${gi}`}
                      count={group.count}
                      onExpand={() => setExpandedUnchanged(true)}
                    />
                  );
                })}
              </>
            ) : (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 48,
                  color: colors.textTertiary,
                  fontSize: 12,
                  fontFamily: 'var(--font-ui)',
                  textAlign: 'center',
                  height: '100%',
                }}
              >
                <p style={{ margin: 0 }}>Select v2.2.0 to view the pre-computed chip-aware diff.</p>
                <p style={{ margin: '4px 0 0', color: 'var(--color-border-strong)', fontSize: 11 }}>
                  In the full product, diffs are computed for any version pair.
                </p>
              </div>
            )}
          </div>

          {/* Suggested bump footer */}
          {selectedVersion === '2.2.0' && (
            <div
              style={{
                padding: '8px 16px',
                borderTop: `1px solid var(--color-border)`,
                background: 'var(--color-accent-light)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                fontFamily: 'var(--font-ui)',
                flexShrink: 0,
              }}
            >
              <Badge
                bg={statusColors.staging.bg}
                color={statusColors.staging.text}
                size="xs"
              >
                {DIFF_SUMMARY.suggestedBump.toUpperCase()}
              </Badge>
              <span style={{ color: colors.textSecondary }}>{DIFF_SUMMARY.suggestedBumpReason}</span>
            </div>
          )}

          {/* Mobile/tablet: toggle button for summary panel */}
          <Button
            variant="ghost"
            size="sm"
            className="vh-aside-toggle"
            onClick={() => setShowMobileSummary((prev) => !prev)}
          >
            {showMobileSummary ? 'Hide' : 'Show'} Change Summary
            <span style={{ fontSize: 14 }}>{showMobileSummary ? '\u25B2' : '\u25BC'}</span>
          </Button>

          {/* Mobile/tablet: collapsible summary */}
          {showMobileSummary && (
            <div
              className="show-below-lg"
              style={{
                flexDirection: 'column',
                overflowY: 'auto',
                borderTop: `1px solid var(--color-border)`,
                maxHeight: 400,
              }}
            >
              <SummaryPanel
                selected={selected}
                selectedVersion={selectedVersion}
                diffStats={diffStats}
                diffChipChanges={diffChipChanges}
              />
            </div>
          )}
        </div>

        {/* ── Right: Change Summary & Actions (desktop only) ────── */}
        <div
          className="panel-aside hide-below-lg"
          style={{
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <SummaryPanel
            selected={selected}
            selectedVersion={selectedVersion}
            diffStats={diffStats}
            diffChipChanges={diffChipChanges}
          />
        </div>
      </div>
    </div>
  );
}
