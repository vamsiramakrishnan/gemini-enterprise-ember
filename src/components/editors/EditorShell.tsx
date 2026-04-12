/**
 * EditorShell — Shared two-panel layout for all chip type editors.
 *
 * Provides:
 *   - Header with chip name, version badge, type icon, and action slots
 *   - Two-panel body (configurable width split)
 *   - Collapsible bottom test panel
 *
 * Extracted from SkillEditor patterns. Every editor uses this shell.
 */

import { useState, type ReactNode } from 'react';
import { CHIP_CONFIG } from '../../config/chipConfig';
import type { ChipType } from '../../parser/types';

// ─── Icons ────────────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}>
      <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TestBeakerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
      <path d="M5 1h4M5 1v4L2 11.5a1 1 0 001 1.5h8a1 1 0 001-1.5L9 5V1" stroke="currentColor" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 8.5h6" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────────

export interface EditorShellProps {
  chipType: ChipType;
  chipName: string;
  version: string;
  /** Right side of header (scope toggles, extra buttons, etc.) */
  headerControls?: ReactNode;
  /** Left panel content */
  leftPanel: ReactNode;
  leftPanelWidth?: string;
  leftPanelLabel?: string;
  /** Right panel content */
  rightPanel: ReactNode;
  rightPanelLabel?: string;
  /** Optional collapsible bottom test panel */
  testPanel?: ReactNode;
  /** Action buttons */
  onPublish?: () => void;
  onCreateNew?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────

export function EditorShell({
  chipType,
  chipName,
  version,
  headerControls,
  leftPanel,
  leftPanelWidth = '60%',
  leftPanelLabel,
  rightPanel,
  rightPanelLabel,
  testPanel,
  onPublish,
  onCreateNew,
}: EditorShellProps) {
  const [testOpen, setTestOpen] = useState(false);
  const config = CHIP_CONFIG[chipType];
  const colors = config.colors;

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--color-bg-primary, #F9FAFB)' }}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="border-b" style={{ background: 'var(--color-bg-surface, #FFFFFF)', borderColor: 'var(--color-border, #E5E7EB)' }}>
        <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center gap-3">
          {/* Type icon */}
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold"
            style={{ background: colors.tint, color: colors.accent, border: `1px solid ${colors.border}` }}
          >
            {config.icon}
          </span>

          {/* Name */}
          <h1 className="text-[13px] font-semibold" style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-primary, #111827)' }}>
            {chipName}
          </h1>

          {/* Version badge */}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: colors.tint, color: colors.accent }}
          >
            v{version}
          </span>

          {/* Type badge */}
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
          >
            {config.label}
          </span>

          <div className="flex-1" />

          {/* Custom header controls */}
          {headerControls}

          {/* Action buttons */}
          <div className="flex items-center gap-2 ml-2">
            {onCreateNew && (
              <button
                onClick={onCreateNew}
                className="text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors"
                style={{ color: colors.accent, borderColor: colors.border }}
                onMouseEnter={e => (e.currentTarget.style.background = colors.tint)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                + New {config.label}
              </button>
            )}
            {onPublish && (
              <button
                onClick={onPublish}
                className="text-[11px] font-medium text-white px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
                style={{ background: colors.accent }}
              >
                Publish to Registry
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col max-w-[1440px] mx-auto w-full min-h-0">
        <div className="flex-1 flex min-h-0">
          {/* Left Panel */}
          <div className="overflow-y-auto border-r" style={{ width: leftPanelWidth, borderColor: 'var(--color-border, #E5E7EB)' }}>
            {leftPanelLabel && (
              <div className="px-6 pt-4 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
                  {leftPanelLabel}
                </span>
              </div>
            )}
            <div className="p-6 pt-3 space-y-5">
              {leftPanel}
            </div>
          </div>

          {/* Right Panel */}
          <div className="overflow-y-auto" style={{ width: `calc(100% - ${leftPanelWidth})`, background: 'var(--color-bg-surface, #FFFFFF)' }}>
            {rightPanelLabel && (
              <div className="px-5 pt-4 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
                  {rightPanelLabel}
                </span>
              </div>
            )}
            <div className="p-5 pt-3 space-y-5">
              {rightPanel}
            </div>
          </div>
        </div>

        {/* ── Test Panel (collapsible) ──────────────────────────────── */}
        {testPanel && (
          <div className="border-t" style={{ borderColor: 'var(--color-border, #E5E7EB)' }}>
            <button
              onClick={() => setTestOpen(!testOpen)}
              className="w-full px-5 py-2 flex items-center gap-2 text-[11px] font-medium transition-colors"
              style={{ color: 'var(--color-text-secondary, #6B7280)', background: 'var(--color-bg-surface, #FFFFFF)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-secondary, #F3F4F6)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-bg-surface, #FFFFFF)')}
            >
              <ChevronIcon open={testOpen} />
              <TestBeakerIcon />
              Test Panel
            </button>
            {testOpen && (
              <div className="px-5 pb-4" style={{ background: 'var(--color-bg-surface, #FFFFFF)' }}>
                {testPanel}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
