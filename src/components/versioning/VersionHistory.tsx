/**
 * VersionHistory — Screen 10: Version timeline + chip-aware diff view.
 *
 * Left panel: scrollable version timeline with semantic summaries
 * Center panel: chip-aware diff with colored annotations
 * Right panel: diff stats and chip change list
 */

import { useState, useMemo } from 'react';
import { VERSIONS, DIFF_V21_V22, DIFF_SUMMARY } from '../../data/versions';
import type { VersionEntry, DiffLineEntry } from '../../data/versions';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipChange, VersionStatus } from '../../parser/types';

// ─── Status Badge ─────────────────────────────────────────────────────

const STATUS_STYLES: Record<VersionStatus, { bg: string; text: string; label: string }> = {
  draft:       { bg: '#FEF9C3', text: '#854D0E', label: 'DRAFT' },
  staging:     { bg: '#DBEAFE', text: '#1E40AF', label: 'STAGING' },
  production:  { bg: '#DCFCE7', text: '#166534', label: 'LIVE' },
  'rolled-back': { bg: '#FEE2E2', text: '#991B1B', label: 'ROLLED BACK' },
  deprecated:  { bg: '#F3F4F6', text: '#6B7280', label: 'DEPRECATED' },
};

function VersionStatusBadge({ status }: { status: VersionStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
      style={{ background: s.bg, color: s.text }}
    >
      {status === 'production' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />}
      {s.label}
    </span>
  );
}

// ─── Chip Change Pill ─────────────────────────────────────────────────

function ChipChangePill({ change }: { change: ChipChange }) {
  const colors = CHIP_COLORS[change.chipType];
  const icon = CHIP_ICONS[change.chipType];
  const actionStyles = {
    added:    { prefix: '+', bg: '#DCFCE7', text: '#166534', border: '#86EFAC' },
    removed:  { prefix: '-', bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
    modified: { prefix: '~', bg: '#FEF9C3', text: '#854D0E', border: '#FDE68A' },
  };
  const a = actionStyles[change.action];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
      style={{ background: a.bg, color: a.text, borderColor: a.border }}
      title={change.detail || `${change.action} @${change.chipType}(${change.chipName})`}
    >
      <span>{a.prefix}</span>
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: colors.bg }}
      />
      {icon} @{change.chipType}({change.chipName})
    </span>
  );
}

// ─── Version Timeline Entry ───────────────────────────────────────────

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
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  }, [version.timestamp]);

  return (
    <div
      className={`p-3 rounded-xl border cursor-pointer transition-all ${
        selected
          ? 'border-[var(--color-accent)] bg-blue-50/50 shadow-sm'
          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold text-gray-900">v{version.version}</span>
        <VersionStatusBadge status={version.status} />
        {version.reviewStatus === 'approved' && (
          <span className="text-[10px] text-green-600">✓ Approved</span>
        )}
        {version.reviewStatus === 'pending' && (
          <span className="text-[10px] text-amber-600">⏳ Review pending</span>
        )}
      </div>

      {/* Author + time */}
      <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
        <span className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[8px] text-white font-bold">
          {version.author.name[0]}
        </span>
        <span>{version.author.name}</span>
        <span>·</span>
        <span>{timeAgo}</span>
      </div>

      {/* Summary */}
      <p className="text-xs text-gray-600 mb-2">{version.changeSummary}</p>

      {/* Chip changes */}
      {version.chipChanges.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {version.chipChanges.map((c, i) => (
            <ChipChangePill key={i} change={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Diff Line ────────────────────────────────────────────────────────

function DiffLine({ line }: { line: DiffLineEntry }) {
  const bgColors = {
    added: 'bg-green-50',
    removed: 'bg-red-50',
    modified: 'bg-amber-50',
    unchanged: '',
  };
  const textColors = {
    added: 'text-green-800',
    removed: 'text-red-800 line-through',
    modified: 'text-amber-800',
    unchanged: 'text-gray-600',
  };
  const prefixChar = {
    added: '+',
    removed: '-',
    modified: '~',
    unchanged: ' ',
  };

  // Render inline chips within the line content
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
            line.chipAction === 'added' ? '#22C55E' :
            line.chipAction === 'removed' ? '#EF4444' :
            undefined;
          return (
            <span
              key={i}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-white mx-0.5"
              style={{
                background: colors.bg,
                boxShadow: glowColor ? `0 0 0 2px ${glowColor}40, 0 0 8px ${glowColor}30` : undefined,
                opacity: line.type === 'removed' ? 0.5 : 1,
              }}
            >
              {CHIP_ICONS[type]} {name}
            </span>
          );
        }
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`flex items-start gap-2 px-3 py-1 text-xs font-mono ${bgColors[line.type]}`}>
      <span className={`w-3 shrink-0 ${textColors[line.type]}`}>
        {prefixChar[line.type]}
      </span>
      <span className={textColors[line.type]}>
        {renderContent(line.content)}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────

export function VersionHistory() {
  const [selectedVersion, setSelectedVersion] = useState('2.2.0');

  // Find the selected version and its comparison base
  const selected = VERSIONS.find((v) => v.version === selectedVersion) || VERSIONS[4];
  const compareFrom = VERSIONS.find((v) => v.version === '2.1.0')!;

  // Aggregate chip changes for the diff
  const diffChipChanges = useMemo(() => {
    // Show chip changes of the selected version
    return selected.chipChanges;
  }, [selected]);

  return (
    <div className="h-full bg-[var(--color-surface-0)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Version History</h1>
            <p className="text-[10px] text-gray-500">
              Claims Processing Agent — {VERSIONS.length} versions
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-500">
            <span className="px-2 py-1 rounded bg-gray-100">
              Comparing v{compareFrom.version} → v{selected.version}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6 min-h-[calc(100vh-120px)]">
          {/* Left: Version Timeline */}
          <div className="col-span-3 space-y-1 overflow-y-auto">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
              Timeline
            </h2>
            {[...VERSIONS].reverse().map((v) => (
              <TimelineEntry
                key={v.version}
                version={v}
                selected={v.version === selectedVersion}
                onSelect={() => setSelectedVersion(v.version)}
              />
            ))}
          </div>

          {/* Center: Chip-Aware Diff */}
          <div className="col-span-6">
            <div className="rounded-xl border border-[var(--color-border)] bg-white overflow-hidden">
              {/* Diff header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-gray-700">
                  Chip-Aware Diff: v{compareFrom.version} → v{selected.version}
                </h2>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-400" /> Added
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-400" /> Removed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" /> Modified
                  </span>
                </div>
              </div>

              {/* Diff content */}
              <div className="divide-y divide-gray-50 overflow-auto max-h-[calc(100vh-250px)]">
                {selectedVersion === '2.2.0' ? (
                  DIFF_V21_V22.map((line, i) => <DiffLine key={i} line={line} />)
                ) : (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    <p>Select v2.2.0 to see the pre-computed chip-aware diff.</p>
                    <p className="mt-1 text-gray-300">
                      In the full product, diffs are computed for any version pair.
                    </p>
                  </div>
                )}
              </div>

              {/* Suggested bump */}
              {selectedVersion === '2.2.0' && (
                <div className="px-4 py-3 border-t border-gray-100 bg-blue-50/50">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">
                      {DIFF_SUMMARY.suggestedBump.toUpperCase()}
                    </span>
                    <span className="text-gray-600">{DIFF_SUMMARY.suggestedBumpReason}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Diff Stats + Actions */}
          <div className="col-span-3 space-y-4">
            {/* Version info */}
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                v{selected.version}
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <VersionStatusBadge status={selected.status} />
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <span className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-[9px] text-white font-bold">
                    {selected.author.name[0]}
                  </span>
                  <span>{selected.author.name}</span>
                </div>
                <p className="text-gray-600">{selected.changeSummary}</p>
              </div>
            </div>

            {/* Chip changes */}
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                @Reference Changes ({diffChipChanges.length})
              </h3>
              <div className="space-y-1.5">
                {diffChipChanges.map((c, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <ChipChangePill change={c} />
                    {c.detail && (
                      <span className="text-[10px] text-gray-400 ml-6">{c.detail}</span>
                    )}
                  </div>
                ))}
                {diffChipChanges.length === 0 && (
                  <p className="text-[10px] text-gray-400">No chip changes in this version.</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-xl border border-[var(--color-border)] bg-white p-4 space-y-2">
              <button className="w-full px-3 py-2 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium hover:opacity-90">
                Publish v{selected.version}
              </button>
              <button className="w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200">
                Restore This Version
              </button>
              <button className="w-full px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-xs font-medium hover:bg-gray-200">
                Fork From Here
              </button>
            </div>

            {/* Review */}
            {selected.reviewStatus && (
              <div className="rounded-xl border border-[var(--color-border)] bg-white p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Review
                </h3>
                <div className="flex items-center gap-2 text-xs">
                  {selected.reviewStatus === 'approved' && (
                    <span className="text-green-600 font-medium">✓ Approved</span>
                  )}
                  {selected.reviewStatus === 'pending' && (
                    <span className="text-amber-600 font-medium">⏳ Pending review</span>
                  )}
                </div>
                {selected.reviewers && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {selected.reviewers.map((r) => (
                      <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
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
    </div>
  );
}
