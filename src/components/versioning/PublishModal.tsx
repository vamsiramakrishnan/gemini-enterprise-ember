/**
 * PublishModal -- Publish flow with semver bump selection, chip-aware
 * diff summary, reviewer assignment, and environment deployment.
 *
 * Triggered from the editor top bar "Publish" button or from the
 * Version History screen's "Publish" action.
 *
 * Maps to the adk-fluent deploy lifecycle:
 *   Draft -> Staging -> Production (with optional canary rollout)
 *   Each promotion is a versioned Artifact Registry entry.
 */

import { useState, useMemo } from 'react';
import { VERSIONS, DIFF_SUMMARY } from '../../data/versions';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipChange, SemverBump } from '../../parser/types';

// ─── Types ───────────────────────────────────────────────────────────

type DeployTarget = 'staging' | 'production' | 'draft';
type ApprovalMode = 'all' | 'any';

interface Reviewer {
  name: string;
  email: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  isGroup?: boolean;
  memberCount?: number;
}

interface PublishModalProps {
  open: boolean;
  onClose: () => void;
  onPublish?: (config: {
    bump: SemverBump;
    target: DeployTarget;
    reviewers: Reviewer[];
    description: string;
    canary: boolean;
    approvalMode: ApprovalMode;
  }) => void;
}

// ─── Constants ───────────────────────────────────────────────────────

const CURRENT_VERSION = '2.1.0';

const SUGGESTED_REVIEWERS: Reviewer[] = [
  { name: 'Priya Sharma', email: 'priya@acme.com', role: 'Admin' },
  { name: 'Security Audit', email: 'security-audit@acme.com', role: 'Admin', isGroup: true, memberCount: 8 },
  { name: 'Wei Chen', email: 'wei@acme.com', role: 'Editor' },
  { name: 'APAC Compliance', email: 'apac-compliance@acme.com', role: 'Viewer', isGroup: true, memberCount: 12 },
  { name: 'Vamsi K', email: 'vamsi@acme.com', role: 'Admin' },
];

const BUMP_OPTIONS: Array<{
  bump: SemverBump;
  label: string;
  description: string;
  badgeColor: string;
  badgeBg: string;
  newVersion: string;
}> = [
  {
    bump: 'patch',
    label: 'Patch',
    description: 'Bug fixes, minor wording changes, no structural changes',
    badgeColor: '#6B7280',
    badgeBg: '#F3F4F6',
    newVersion: '2.1.1',
  },
  {
    bump: 'minor',
    label: 'Minor',
    description: 'New capabilities added, existing behavior preserved',
    badgeColor: '#1E40AF',
    badgeBg: '#DBEAFE',
    newVersion: '2.2.0',
  },
  {
    bump: 'major',
    label: 'Major',
    description: 'Breaking changes, guards removed, logic restructured',
    badgeColor: '#C2410C',
    badgeBg: '#FFEDD5',
    newVersion: '3.0.0',
  },
];

const CANARY_STAGES = [
  { pct: '10%', time: 'T+0' },
  { pct: '50%', time: 'T+1h' },
  { pct: '100%', time: 'T+4h' },
];

// ─── Chip Change Badge ───────────────────────────────────────────────

function ChipChangeBadge({ change }: { change: ChipChange }) {
  const colors = CHIP_COLORS[change.chipType];
  const icon = CHIP_ICONS[change.chipType];

  const glowStyles: Record<string, { bg: string; text: string; shadow: string }> = {
    added:    { bg: '#DCFCE7', text: '#166534', shadow: '0 0 8px rgba(34,197,94,0.3)' },
    removed:  { bg: '#FEE2E2', text: '#991B1B', shadow: '0 0 8px rgba(239,68,68,0.3)' },
    modified: { bg: '#FEF9C3', text: '#854D0E', shadow: '0 0 8px rgba(234,179,8,0.3)' },
  };

  const prefix = change.action === 'added' ? '+' : change.action === 'removed' ? '-' : '~';
  const glow = glowStyles[change.action];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-all duration-200"
      style={{ background: glow.bg, color: glow.text, boxShadow: glow.shadow }}
      title={change.detail || `${change.action} @${change.chipType}(${change.chipName})`}
    >
      <span className="font-bold">{prefix}</span>
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ background: colors.accent }}
      />
      <span>{icon}</span>
      <span>@{change.chipType}({change.chipName})</span>
    </span>
  );
}

// ─── Avatar ──────────────────────────────────────────────────────────

function Avatar({ name, isGroup, size = 'sm' }: { name: string; isGroup?: boolean; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-8 h-8 text-[11px]';
  const bg = isGroup ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600';
  return (
    <span className={`${dim} ${bg} rounded-full flex items-center justify-center font-bold shrink-0`}>
      {isGroup ? '#' : name.charAt(0)}
    </span>
  );
}

// ─── Reviewer Pill ───────────────────────────────────────────────────

function ReviewerPill({
  reviewer,
  onRemove,
}: {
  reviewer: Reviewer;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:border-gray-300 transition-colors group">
      <Avatar name={reviewer.name} isGroup={reviewer.isGroup} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-gray-800 truncate">{reviewer.name}</span>
          <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded bg-gray-50 shrink-0">
            {reviewer.role}
          </span>
          {reviewer.isGroup && (
            <span className="text-[10px] text-blue-500 shrink-0">
              {reviewer.memberCount} members
            </span>
          )}
        </div>
        <span className="text-[10px] text-gray-400 truncate block">{reviewer.email}</span>
      </div>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all flex items-center justify-center text-xs shrink-0"
        aria-label={`Remove ${reviewer.name}`}
      >
        x
      </button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function PublishModal({ open, onClose, onPublish }: PublishModalProps) {
  const [selectedBump, setSelectedBump] = useState<SemverBump>('minor');
  const [deployTarget, setDeployTarget] = useState<DeployTarget>('staging');
  const [canaryEnabled, setCanaryEnabled] = useState(false);
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>('any');
  const [reviewers, setReviewers] = useState<Reviewer[]>([SUGGESTED_REVIEWERS[0]]);
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get chip changes from the latest staging version (v2.2.0)
  const latestStaging = VERSIONS.find((v) => v.version === '2.2.0');
  const chipChanges = latestStaging?.chipChanges ?? [];

  const selectedBumpConfig = useMemo(
    () => BUMP_OPTIONS.find((b) => b.bump === selectedBump)!,
    [selectedBump],
  );

  const filteredSuggestions = useMemo(() => {
    const addedEmails = new Set(reviewers.map((r) => r.email));
    return SUGGESTED_REVIEWERS.filter(
      (r) =>
        !addedEmails.has(r.email) &&
        (searchQuery === '' ||
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.email.toLowerCase().includes(searchQuery.toLowerCase())),
    );
  }, [searchQuery, reviewers]);

  const addReviewer = (reviewer: Reviewer) => {
    setReviewers((prev) => [...prev, reviewer]);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const removeReviewer = (email: string) => {
    setReviewers((prev) => prev.filter((r) => r.email !== email));
  };

  const handlePublish = () => {
    onPublish?.({
      bump: selectedBump,
      target: deployTarget,
      reviewers,
      description,
      canary: canaryEnabled,
      approvalMode,
    });
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100] transition-opacity duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in"
          style={{
            animation: 'modalSlideUp 0.25s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Publish New Version
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  v{CURRENT_VERSION}{' '}
                  <span className="text-gray-300 mx-1">{'->'}</span>{' '}
                  <span className="font-medium text-gray-700">
                    v{selectedBumpConfig.newVersion}
                  </span>
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Scrollable Content ─────────────────────────────────── */}
          <div className="overflow-y-auto max-h-[calc(100vh-220px)]">

            {/* ── Change Summary ────────────────────────────────────── */}
            <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Change Summary
              </h3>

              {/* Chip change badges */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {chipChanges.map((c, i) => (
                  <ChipChangeBadge key={i} change={c} />
                ))}
              </div>

              {/* Text summary */}
              <p className="text-xs text-gray-600 leading-relaxed">
                {latestStaging?.changeSummary ||
                  'No changes detected.'}
              </p>
            </div>

            {/* ── Semver Bump Selector ──────────────────────────────── */}
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Version Bump
              </h3>

              <div className="space-y-2">
                {BUMP_OPTIONS.map((opt) => {
                  const isSelected = selectedBump === opt.bump;
                  const isSuggested = opt.bump === DIFF_SUMMARY.suggestedBump;

                  return (
                    <label
                      key={opt.bump}
                      className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'border-[#1A73E8] bg-blue-50/50 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                      }`}
                    >
                      {/* Radio circle */}
                      <div className="pt-0.5 shrink-0">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'border-[#1A73E8]'
                              : 'border-gray-300'
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-[#1A73E8]" />
                          )}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[11px] font-bold px-2 py-0.5 rounded"
                            style={{ background: opt.badgeBg, color: opt.badgeColor }}
                          >
                            {opt.label.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-700 font-medium">
                            v{CURRENT_VERSION} {'->'} v{opt.newVersion}
                          </span>
                          {isSuggested && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              Suggested
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">{opt.description}</p>
                        {isSuggested && (
                          <p className="text-[10px] text-green-600 mt-1">
                            {DIFF_SUMMARY.suggestedBumpReason}
                          </p>
                        )}
                      </div>

                      <input
                        type="radio"
                        name="semver-bump"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => setSelectedBump(opt.bump)}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ── Environment Deployment ────────────────────────────── */}
            <div className="px-6 py-4 border-b border-gray-50">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Deploy To
              </h3>

              <div className="flex gap-2 mb-3">
                {(
                  [
                    { key: 'draft', label: 'Draft only', icon: '○', desc: 'Save without deploying' },
                    { key: 'staging', label: 'Staging', icon: '◐', desc: 'Deploy to staging environment' },
                    { key: 'production', label: 'Production', icon: '●', desc: 'Deploy to production' },
                  ] as const
                ).map((t) => {
                  const isSelected = deployTarget === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setDeployTarget(t.key)}
                      className={`flex-1 p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                        isSelected
                          ? 'border-[#1A73E8] bg-blue-50/50 shadow-sm'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <div className="text-base mb-1">{t.icon}</div>
                      <div className="text-xs font-medium text-gray-800">{t.label}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{t.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Production warning */}
              {deployTarget === 'production' && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200 mb-3">
                  <span className="text-amber-500 text-sm shrink-0 mt-0.5">!</span>
                  <div>
                    <p className="text-xs text-amber-800 font-medium">
                      Production deployment requires at least 1 reviewer approval
                    </p>
                    <p className="text-[10px] text-amber-600 mt-0.5">
                      The version will be held in staging until all required approvals are obtained.
                    </p>
                  </div>
                </div>
              )}

              {/* Canary toggle */}
              {deployTarget !== 'draft' && (
                <div className="mt-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs font-medium text-gray-700">Canary rollout</span>
                      <span className="text-[10px] text-gray-400 ml-2">
                        Roll out gradually to minimize risk
                      </span>
                    </div>
                    <button
                      onClick={() => setCanaryEnabled(!canaryEnabled)}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                        canaryEnabled ? 'bg-[#1A73E8]' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                          canaryEnabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {canaryEnabled && (
                    <div className="flex items-center gap-1 mt-2">
                      {CANARY_STAGES.map((stage, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <div className="flex flex-col items-center">
                            <span className="text-[11px] font-bold text-[#1A73E8]">{stage.pct}</span>
                            <span className="text-[9px] text-gray-400">{stage.time}</span>
                          </div>
                          {i < CANARY_STAGES.length - 1 && (
                            <div className="w-8 h-px bg-gray-300 mx-1" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Reviewers ────────────────────────────────────────── */}
            <div className="px-6 py-4 border-b border-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Reviewers
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">Approval policy:</span>
                  <div className="flex rounded-md border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setApprovalMode('any')}
                      className={`px-2 py-1 text-[10px] font-medium transition-colors ${
                        approvalMode === 'any'
                          ? 'bg-[#1A73E8] text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      Any 1
                    </button>
                    <button
                      onClick={() => setApprovalMode('all')}
                      className={`px-2 py-1 text-[10px] font-medium border-l border-gray-200 transition-colors ${
                        approvalMode === 'all'
                          ? 'bg-[#1A73E8] text-white'
                          : 'bg-white text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>

              {/* Search input */}
              <div className="relative mb-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Add people or groups..."
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]/20 bg-white placeholder-gray-400"
                />

                {/* Suggestions dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-10 overflow-hidden">
                    {filteredSuggestions.map((s) => (
                      <button
                        key={s.email}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addReviewer(s);
                        }}
                      >
                        <Avatar name={s.name} isGroup={s.isGroup} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-gray-800">{s.name}</span>
                            <span className="text-[10px] text-gray-400 px-1 py-0.5 rounded bg-gray-50">
                              {s.role}
                            </span>
                            {s.isGroup && (
                              <span className="text-[10px] text-blue-500">
                                {s.memberCount} members
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400">{s.email}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected reviewers */}
              {reviewers.length > 0 ? (
                <div className="space-y-1.5">
                  {reviewers.map((r) => (
                    <ReviewerPill
                      key={r.email}
                      reviewer={r}
                      onRemove={() => removeReviewer(r.email)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 py-2 text-center">
                  No reviewers added. Add at least one reviewer for production deployments.
                </p>
              )}
            </div>

            {/* ── Change Description ───────────────────────────────── */}
            <div className="px-6 py-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Change Description
                <span className="text-gray-300 font-normal ml-1">(optional)</span>
              </h3>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes for reviewers... e.g. 'Added Slack integration per JIRA-1234. Removed legacy filter as it's superseded by apac-compliance-rules guard.'"
                className="w-full px-3 py-2.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#1A73E8] focus:ring-1 focus:ring-[#1A73E8]/20 bg-white placeholder-gray-400 resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
            <div className="text-[10px] text-gray-400">
              {deployTarget === 'production' && reviewers.length === 0 ? (
                <span className="text-amber-600 font-medium">
                  Production deploy requires at least 1 reviewer
                </span>
              ) : (
                <span>
                  Publishing as{' '}
                  <span className="font-medium text-gray-600">Wei Chen</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={deployTarget === 'production' && reviewers.length === 0}
                className={`px-5 py-2 rounded-lg text-xs font-medium text-white transition-all duration-150 ${
                  deployTarget === 'production' && reviewers.length === 0
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-[#1A73E8] hover:bg-[#1557B0] shadow-sm hover:shadow'
                }`}
              >
                Publish v{selectedBumpConfig.newVersion}
                {deployTarget !== 'draft' && ` to ${deployTarget === 'staging' ? 'Staging' : 'Production'}`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal slide-up animation */}
      <style>{`
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </>
  );
}
