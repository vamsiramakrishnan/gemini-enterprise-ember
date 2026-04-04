/**
 * VersionHistory — Screen 10: Version timeline + chip-aware diff view.
 *
 * Three-panel layout:
 *   Left: scrollable version timeline with status-colored cards
 *   Center: chip-aware diff with colored inline chips and line-level annotations
 *   Right: change summary, stats, and actions
 */

import { useState, useMemo } from 'react';
import { VERSIONS, DIFF_V21_V22, DIFF_SUMMARY } from '../../data/versions';
import type { VersionEntry, DiffLineEntry } from '../../data/versions';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipChange, VersionStatus } from '../../parser/types';

/* ─── Constants ─────────────────────────────────────────────────────── */

const STATUS_BORDER_COLORS: Record<VersionStatus, string> = {
  production:    '#16A34A',
  staging:       '#2563EB',
  draft:         '#EAB308',
  deprecated:    '#9CA3AF',
  'rolled-back': '#DC2626',
};

const STATUS_STYLES: Record<VersionStatus, { bg: string; text: string; label: string }> = {
  draft:          { bg: '#FEF9C3', text: '#854D0E', label: 'DRAFT' },
  staging:        { bg: '#DBEAFE', text: '#1E40AF', label: 'STAGING' },
  production:     { bg: '#DCFCE7', text: '#166534', label: 'LIVE' },
  'rolled-back':  { bg: '#FEE2E2', text: '#991B1B', label: 'ROLLED BACK' },
  deprecated:     { bg: '#F3F4F6', text: '#6B7280', label: 'DEPRECATED' },
};

const ACTION_STYLES = {
  added:    { prefix: '+', bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
  removed:  { prefix: '\u2212', bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' },
  modified: { prefix: '~', bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
};

/* ─── Status Badge ──────────────────────────────────────────────────── */

function VersionStatusBadge({ status }: { status: VersionStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: 'var(--font-ui)',
        letterSpacing: '0.03em',
        padding: '1px 6px',
        borderRadius: 3,
        background: s.bg,
        color: s.text,
        lineHeight: '16px',
      }}
    >
      {status === 'production' && (
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: '#16A34A',
            animation: 'pulse 2s infinite',
          }}
        />
      )}
      {s.label}
    </span>
  );
}

/* ─── Chip Change Pill ──────────────────────────────────────────────── */

function ChipChangePill({ change }: { change: ChipChange }) {
  const colors = CHIP_COLORS[change.chipType];
  const icon = CHIP_ICONS[change.chipType];
  const a = ACTION_STYLES[change.action];

  return (
    <span
      title={change.detail || `${change.action} @${change.chipType}(${change.chipName})`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '1px 7px',
        borderRadius: 9999,
        fontSize: 10,
        fontWeight: 500,
        fontFamily: 'var(--font-ui)',
        background: a.bg,
        color: a.text,
        border: `1px solid ${a.border}`,
        lineHeight: '16px',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontWeight: 700 }}>{a.prefix}</span>
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: colors.bg,
          flexShrink: 0,
        }}
      />
      {icon} @{change.chipType}({change.chipName})
    </span>
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
      style={{
        padding: '10px 12px',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'background 150ms ease, border-color 150ms ease',
        background: selected ? '#EFF6FF' : 'transparent',
        outline: selected ? '1px solid #2563EB' : '1px solid transparent',
        marginBottom: 2,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = '#F9FAFB';
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
            color: '#111827',
            fontFamily: 'var(--font-ui)',
          }}
        >
          v{version.version}
        </span>
        <VersionStatusBadge status={version.status} />
        {version.reviewStatus === 'approved' && (
          <span style={{ fontSize: 10, color: '#16A34A', fontFamily: 'var(--font-ui)' }}>
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
          color: '#9CA3AF',
          fontFamily: 'var(--font-ui)',
          marginBottom: 6,
        }}
      >
        <span
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: '#D1D5DB',
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
        <span style={{ color: '#D1D5DB' }}>/</span>
        <span>{timeAgo}</span>
      </div>

      {/* Summary */}
      <p
        style={{
          fontSize: 11,
          color: '#6B7280',
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
  unchanged: '#FFFFFF',
};

const LINE_TEXT: Record<DiffLineEntry['type'], string> = {
  added:     '#166534',
  removed:   '#991B1B',
  modified:  '#92400E',
  unchanged: '#6B7280',
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
        const colors = CHIP_COLORS[type];
        if (colors) {
          const glowColor =
            line.chipAction === 'added'   ? '#22C55E' :
            line.chipAction === 'removed' ? '#EF4444' :
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
                color: '#fff',
                background: colors.bg,
                margin: '0 2px',
                lineHeight: '18px',
                boxShadow: glowColor
                  ? `0 0 0 2px ${glowColor}40, 0 0 6px ${glowColor}25`
                  : undefined,
                opacity: line.type === 'removed' ? 0.5 : 1,
                textDecoration: line.type === 'removed' ? 'line-through' : undefined,
              }}
            >
              {CHIP_ICONS[type]} {name}
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
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        background: LINE_BG[line.type],
        borderBottom: '1px solid #F9FAFB',
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
          color: '#D1D5DB',
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
        color: '#9CA3AF',
        fontFamily: 'var(--font-ui)',
        background: '#FAFAFA',
        borderTop: '1px solid #F3F4F6',
        borderBottom: '1px solid #F3F4F6',
        cursor: 'pointer',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = '#6B7280'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
    >
      Show {count} unchanged line{count !== 1 ? 's' : ''}
    </div>
  );
}

/* ─── Main Component ────────────────────────────────────────────────── */

export function VersionHistory() {
  const [selectedVersion, setSelectedVersion] = useState('2.2.0');
  const [expandedUnchanged, setExpandedUnchanged] = useState(false);

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
    <div style={{ height: '100%', background: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 20px',
          borderBottom: '1px solid #E5E7EB',
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: '#111827',
              fontFamily: 'var(--font-ui)',
            }}
          >
            Version History
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: 10,
              color: '#9CA3AF',
              fontFamily: 'var(--font-ui)',
              marginTop: 1,
            }}
          >
            Claims Processing Agent — {VERSIONS.length} versions
          </p>
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#6B7280',
            fontFamily: 'var(--font-ui)',
            padding: '3px 10px',
            borderRadius: 4,
            background: '#F3F4F6',
          }}
        >
          v{compareFrom.version} → v{selected.version}
        </div>
      </header>

      {/* ── Three-Panel Layout ──────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* ── Left: Version Timeline ──────────────────────────────── */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            borderRight: '1px solid #E5E7EB',
            overflowY: 'auto',
            padding: '12px 8px',
          }}
        >
          <h2
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#9CA3AF',
              fontFamily: 'var(--font-ui)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
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
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}
        >
          {/* Diff sub-header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 16px',
              borderBottom: '1px solid #F3F4F6',
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#374151',
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
                color: '#9CA3AF',
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
                  color: '#9CA3AF',
                  fontSize: 12,
                  fontFamily: 'var(--font-ui)',
                  textAlign: 'center',
                  height: '100%',
                }}
              >
                <p style={{ margin: 0 }}>Select v2.2.0 to view the pre-computed chip-aware diff.</p>
                <p style={{ margin: '4px 0 0', color: '#D1D5DB', fontSize: 11 }}>
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
                borderTop: '1px solid #E5E7EB',
                background: '#F0F9FF',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 11,
                fontFamily: 'var(--font-ui)',
                flexShrink: 0,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 8px',
                  borderRadius: 3,
                  background: '#DBEAFE',
                  color: '#1E40AF',
                }}
              >
                {DIFF_SUMMARY.suggestedBump.toUpperCase()}
              </span>
              <span style={{ color: '#6B7280' }}>{DIFF_SUMMARY.suggestedBumpReason}</span>
            </div>
          )}
        </div>

        {/* ── Right: Change Summary & Actions ────────────────────── */}
        <div
          style={{
            width: 260,
            flexShrink: 0,
            borderLeft: '1px solid #E5E7EB',
            overflowY: 'auto',
            padding: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* Version info card */}
          <div
            style={{
              padding: 12,
              border: '1px solid #E5E7EB',
              borderRadius: 6,
            }}
          >
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
                  color: '#111827',
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
                color: '#9CA3AF',
                fontFamily: 'var(--font-ui)',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#D1D5DB',
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
                color: '#6B7280',
                fontFamily: 'var(--font-ui)',
                lineHeight: '15px',
              }}
            >
              {selected.changeSummary}
            </p>
          </div>

          {/* Diff stats */}
          {selectedVersion === '2.2.0' && (
            <div
              style={{
                padding: 12,
                border: '1px solid #E5E7EB',
                borderRadius: 6,
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#9CA3AF',
                  fontFamily: 'var(--font-ui)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Diff Stats
              </h3>
              <div style={{ display: 'flex', gap: 12, fontSize: 11, fontFamily: 'var(--font-ui)' }}>
                <span style={{ color: '#166534' }}>+{diffStats.added} added</span>
                <span style={{ color: '#991B1B' }}>{diffStats.removed > 0 ? `\u2212${diffStats.removed}` : '0'} removed</span>
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 10,
                  color: '#9CA3AF',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {diffStats.unchanged} unchanged lines
              </div>
            </div>
          )}

          {/* Chip changes */}
          <div
            style={{
              padding: 12,
              border: '1px solid #E5E7EB',
              borderRadius: 6,
            }}
          >
            <h3
              style={{
                margin: '0 0 8px',
                fontSize: 10,
                fontWeight: 600,
                color: '#9CA3AF',
                fontFamily: 'var(--font-ui)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
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
                        color: '#9CA3AF',
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
                <p style={{ margin: 0, fontSize: 10, color: '#9CA3AF', fontFamily: 'var(--font-ui)' }}>
                  No chip changes in this version.
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              padding: 12,
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <button
              style={{
                width: '100%',
                padding: '7px 0',
                borderRadius: 5,
                border: 'none',
                background: '#1A73E8',
                color: '#FFFFFF',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              Publish v{selected.version}
            </button>
            <button
              style={{
                width: '100%',
                padding: '7px 0',
                borderRadius: 5,
                border: '1px solid #E5E7EB',
                background: '#F9FAFB',
                color: '#374151',
                fontSize: 11,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              Restore This Version
            </button>
            <button
              style={{
                width: '100%',
                padding: '7px 0',
                borderRadius: 5,
                border: '1px solid #E5E7EB',
                background: '#F9FAFB',
                color: '#374151',
                fontSize: 11,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
                cursor: 'pointer',
              }}
            >
              Fork From Here
            </button>
          </div>

          {/* Review status */}
          {selected.reviewStatus && (
            <div
              style={{
                padding: 12,
                border: '1px solid #E5E7EB',
                borderRadius: 6,
              }}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: 10,
                  fontWeight: 600,
                  color: '#9CA3AF',
                  fontFamily: 'var(--font-ui)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Review
              </h3>
              <div style={{ fontSize: 11, fontFamily: 'var(--font-ui)' }}>
                {selected.reviewStatus === 'approved' && (
                  <span style={{ color: '#16A34A', fontWeight: 600 }}>Approved</span>
                )}
                {selected.reviewStatus === 'pending' && (
                  <span style={{ color: '#D97706', fontWeight: 600 }}>Pending review</span>
                )}
              </div>
              {selected.reviewers && (
                <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {selected.reviewers.map((r) => (
                    <span
                      key={r}
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 3,
                        background: '#F3F4F6',
                        color: '#6B7280',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      {r.split('@')[0]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
