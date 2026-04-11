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
import { statusColors } from '../../constants/colors';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { TextInput, TextArea, Field } from '../../ui/Input';
import { Badge } from '../../ui/Badge';
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
  colorKey: 'deprecated' | 'staging' | 'rolled-back';
  newVersion: string;
}> = [
  {
    bump: 'patch',
    label: 'Patch',
    description: 'Bug fixes, minor wording changes, no structural changes',
    colorKey: 'deprecated',
    newVersion: '2.1.1',
  },
  {
    bump: 'minor',
    label: 'Minor',
    description: 'New capabilities added, existing behavior preserved',
    colorKey: 'staging',
    newVersion: '2.2.0',
  },
  {
    bump: 'major',
    label: 'Major',
    description: 'Breaking changes, guards removed, logic restructured',
    colorKey: 'rolled-back',
    newVersion: '3.0.0',
  },
];

const CANARY_STAGES = [
  { pct: '10%', time: 'T+0' },
  { pct: '50%', time: 'T+1h' },
  { pct: '100%', time: 'T+4h' },
];

// ─── Chip Change Badge ───────────────────────────────────────────────

const chipChangeColors: Record<string, { bg: string; text: string; shadow: string }> = {
  added:    { bg: statusColors.resolved.bg, text: statusColors.resolved.text, shadow: '0 0 8px rgba(34,197,94,0.3)' },
  removed:  { bg: statusColors.unresolved.bg, text: statusColors.unresolved.text, shadow: '0 0 8px rgba(239,68,68,0.3)' },
  modified: { bg: statusColors.draft.bg, text: statusColors.draft.text, shadow: '0 0 8px rgba(234,179,8,0.3)' },
};

function ChipChangeBadge({ change }: { change: ChipChange }) {
  const colors = CHIP_COLORS[change.chipType];
  const icon = CHIP_ICONS[change.chipType];

  const prefix = change.action === 'added' ? '+' : change.action === 'removed' ? '-' : '~';
  const glow = chipChangeColors[change.action];

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
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--color-border)] bg-white hover:border-[var(--color-border-strong)] transition-colors group">
      <Avatar name={reviewer.name} isGroup={reviewer.isGroup} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-[var(--color-text-primary)] truncate">{reviewer.name}</span>
          <Badge size="xs" color="var(--color-text-tertiary)">
            {reviewer.role}
          </Badge>
          {reviewer.isGroup && (
            <span className="text-[10px] text-blue-500 shrink-0">
              {reviewer.memberCount} members
            </span>
          )}
        </div>
        <span className="text-[10px] text-[var(--color-text-tertiary)] truncate block">{reviewer.email}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 !p-0 w-5 h-5 !rounded-full hover:!bg-red-50 !text-[var(--color-text-tertiary)] hover:!text-red-500"
        aria-label={`Remove ${reviewer.name}`}
      >
        x
      </Button>
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

  const footerContent = (
    <>
      <div className="text-[10px] text-[var(--color-text-tertiary)]">
        {deployTarget === 'production' && reviewers.length === 0 ? (
          <span className="text-amber-600 font-medium">
            Production deploy requires at least 1 reviewer
          </span>
        ) : (
          <span>
            Publishing as{' '}
            <span className="font-medium text-[var(--color-text-secondary)]">Wei Chen</span>
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="lg" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={handlePublish}
          disabled={deployTarget === 'production' && reviewers.length === 0}
        >
          Publish v{selectedBumpConfig.newVersion}
          {deployTarget !== 'draft' && ` to ${deployTarget === 'staging' ? 'Staging' : 'Production'}`}
        </Button>
      </div>
    </>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Publish New Version"
      subtitle={`v${CURRENT_VERSION} -> v${selectedBumpConfig.newVersion}`}
      footer={footerContent}
    >
      {/* ── Change Summary ────────────────────────────────────────── */}
      <div className="px-0 py-3 border-b border-[var(--color-surface-2)] mb-4" style={{ background: 'var(--color-surface-1)', margin: '-20px -24px 16px', padding: '16px 24px' }}>
        <h3 className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mb-3">
          Change Summary
        </h3>

        {/* Chip change badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {chipChanges.map((c, i) => (
            <ChipChangeBadge key={i} change={c} />
          ))}
        </div>

        {/* Text summary */}
        <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
          {latestStaging?.changeSummary ||
            'No changes detected.'}
        </p>
      </div>

      {/* ── Semver Bump Selector ──────────────────────────────────── */}
      <Field label="Version Bump">
        <div className="space-y-2">
          {BUMP_OPTIONS.map((opt) => {
            const isSelected = selectedBump === opt.bump;
            const isSuggested = opt.bump === DIFF_SUMMARY.suggestedBump;
            const bumpColors = statusColors[opt.colorKey];

            return (
              <label
                key={opt.bump}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-light)] shadow-sm'
                    : 'border-[var(--color-surface-2)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-1)]'
                }`}
              >
                {/* Radio circle */}
                <div className="pt-0.5 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-[var(--color-accent)]'
                        : 'border-[var(--color-border-strong)]'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      size="sm"
                      bg={bumpColors.bg}
                      color={bumpColors.text}
                      className="font-bold"
                    >
                      {opt.label.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-[var(--color-text-primary)] font-medium">
                      v{CURRENT_VERSION} {'->'} v{opt.newVersion}
                    </span>
                    {isSuggested && (
                      <Badge size="xs" bg={statusColors.resolved.bg} color={statusColors.resolved.text}>
                        Suggested
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">{opt.description}</p>
                  {isSuggested && (
                    <p className="text-[10px] mt-1" style={{ color: statusColors.resolved.text }}>
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
      </Field>

      {/* ── Environment Deployment ────────────────────────────────── */}
      <Field label="Deploy To">
        <div className="flex gap-2 mb-3">
          {(
            [
              { key: 'draft', label: 'Draft only', icon: '\u25CB', desc: 'Save without deploying' },
              { key: 'staging', label: 'Staging', icon: '\u25D0', desc: 'Deploy to staging environment' },
              { key: 'production', label: 'Production', icon: '\u25CF', desc: 'Deploy to production' },
            ] as const
          ).map((t) => {
            const isSelected = deployTarget === t.key;
            return (
              <Button
                key={t.key}
                variant={isSelected ? 'secondary' : 'ghost'}
                onClick={() => setDeployTarget(t.key)}
                className={`!flex-1 !p-3 !rounded-xl !border-2 !text-left !items-start !flex-col !h-auto ${
                  isSelected
                    ? '!border-[var(--color-accent)] !bg-[var(--color-accent-light)] shadow-sm'
                    : '!border-[var(--color-surface-2)] hover:!border-[var(--color-border)]'
                }`}
              >
                <div className="text-base mb-1">{t.icon}</div>
                <div className="text-xs font-medium text-[var(--color-text-primary)]">{t.label}</div>
                <div className="text-[10px] text-[var(--color-text-tertiary)] mt-0.5">{t.desc}</div>
              </Button>
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
          <div className="mt-3 p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-xs font-medium text-[var(--color-text-primary)]">Canary rollout</span>
                <span className="text-[10px] text-[var(--color-text-tertiary)] ml-2">
                  Roll out gradually to minimize risk
                </span>
              </div>
              <button
                onClick={() => setCanaryEnabled(!canaryEnabled)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
                  canaryEnabled ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'
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
                      <span className="text-[11px] font-bold text-[var(--color-accent)]">{stage.pct}</span>
                      <span className="text-[9px] text-[var(--color-text-tertiary)]">{stage.time}</span>
                    </div>
                    {i < CANARY_STAGES.length - 1 && (
                      <div className="w-8 h-px bg-[var(--color-border-strong)] mx-1" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Field>

      {/* ── Reviewers ────────────────────────────────────────────── */}
      <div className="mb-3.5">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
            Reviewers
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--color-text-tertiary)]">Approval policy:</span>
            <div className="flex rounded-md border border-[var(--color-border)] overflow-hidden">
              <Button
                variant={approvalMode === 'any' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setApprovalMode('any')}
                className="!rounded-none !border-none"
              >
                Any 1
              </Button>
              <Button
                variant={approvalMode === 'all' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setApprovalMode('all')}
                className="!rounded-none !border-none !border-l !border-l-[var(--color-border)]"
              >
                All
              </Button>
            </div>
          </div>
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <TextInput
            inputSize="sm"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder="Add people or groups..."
          />

          {/* Suggestions dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-[var(--color-border)] shadow-lg z-10 overflow-hidden">
              {filteredSuggestions.map((s) => (
                <button
                  key={s.email}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[var(--color-surface-1)] transition-colors text-left"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    addReviewer(s);
                  }}
                >
                  <Avatar name={s.name} isGroup={s.isGroup} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-[var(--color-text-primary)]">{s.name}</span>
                      <Badge size="xs" color="var(--color-text-tertiary)">
                        {s.role}
                      </Badge>
                      {s.isGroup && (
                        <span className="text-[10px] text-blue-500">
                          {s.memberCount} members
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--color-text-tertiary)]">{s.email}</span>
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
          <p className="text-[11px] text-[var(--color-text-tertiary)] py-2 text-center">
            No reviewers added. Add at least one reviewer for production deployments.
          </p>
        )}
      </div>

      {/* ── Change Description ───────────────────────────────────── */}
      <Field
        label="Change Description"
        hint="Optional"
      >
        <TextArea
          inputSize="sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add notes for reviewers... e.g. 'Added Slack integration per JIRA-1234. Removed legacy filter as it's superseded by apac-compliance-rules guard.'"
          rows={3}
          className="!resize-none"
        />
      </Field>
    </Modal>
  );
}
