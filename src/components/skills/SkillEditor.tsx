/**
 * SkillEditor -- Screen 8: SKILL.md Authoring
 *
 * A dedicated editor for creating and managing agent skills.
 * Skills are reusable capability bundles in SKILL.md format.
 *
 * Two-panel layout:
 *   Left  (60%) -- SKILL.md editor (frontmatter card + body with smart chips + eval cases)
 *   Right (40%) -- Skill Resources file browser (scripts, references, assets)
 *   Bottom       -- Test Activation panel (collapsible)
 */

import { useState, useCallback } from 'react';
import { useNotifications } from '../../contexts/AppContext';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType } from '../../parser/types';

// ---------------------------------------------------------------------------
// SVG icon helpers (no emoji, no HTML entities)
// ---------------------------------------------------------------------------

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      className="flex-shrink-0"
      style={{
        transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 150ms ease',
      }}
    >
      <path d="M3 1.5L7 5L3 8.5" stroke="#9CA3AF" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
      <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
      <path d="M6 8V2M3 4l3-3 3 3M2 10h8" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
      <path d="M2.5 6.5L5 9L9.5 3" stroke="#059669" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
      <path d="M2 1.5L8.5 5L2 8.5V1.5Z" fill="currentColor" />
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

function FileCodeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
      <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="#7C3AED" strokeWidth="1" fill="none" />
      <path d="M5.5 5.5L4 7l1.5 1.5M8.5 5.5L10 7l-1.5 1.5" stroke="#7C3AED" strokeWidth="0.9" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FilePdfIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
      <rect x="2" y="1" width="10" height="12" rx="1.5" stroke="#DC2626" strokeWidth="1" fill="none" />
      <path d="M5 5h4M5 7.5h3M5 10h2" stroke="#DC2626" strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
      <path d="M1 3.5V10a1 1 0 001 1h8a1 1 0 001-1V4.5a1 1 0 00-1-1H6L5 2H2a1 1 0 00-1 1.5z" stroke="#9CA3AF" strokeWidth="1" fill="none" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Inline SmartChip renderer
// ---------------------------------------------------------------------------

function Chip({
  type,
  name,
  resolved = true,
}: {
  type: ChipType;
  name: string;
  resolved?: boolean;
}) {
  const colors = CHIP_COLORS[type];
  const icon = CHIP_ICONS[type];

  if (!resolved) {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border-2 border-dashed"
        style={{ borderColor: '#DC2626', color: '#DC2626', background: '#FEF2F2' }}
        title={`Unresolved: @${type}(${name})`}
      >
        {icon} @{type}({name})
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white cursor-pointer hover:opacity-90 transition-opacity"
      style={{ background: colors.bg }}
      title={`@${type}(${name})`}
    >
      {icon} {name}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Segmented control (shared by scope and activation)
// ---------------------------------------------------------------------------

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex rounded-lg p-0.5" style={{ background: '#F3F4F6' }}>
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className="px-3 py-1 text-[11px] font-medium rounded-md transition-all"
          style={
            value === o.key
              ? { background: '#FFFFFF', color: '#111827', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }
              : { background: 'transparent', color: '#9CA3AF' }
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scope selector
// ---------------------------------------------------------------------------

type Scope = 'workspace' | 'user' | 'extension';

function ScopeSelector({
  value,
  onChange,
}: {
  value: Scope;
  onChange: (s: Scope) => void;
}) {
  return (
    <SegmentedControl
      options={[
        { key: 'workspace' as Scope, label: 'Workspace' },
        { key: 'user' as Scope, label: 'User' },
        { key: 'extension' as Scope, label: 'Extension' },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

// ---------------------------------------------------------------------------
// Activation mode toggle
// ---------------------------------------------------------------------------

function ActivationToggle({
  value,
  onChange,
}: {
  value: 'pinned' | 'on-demand';
  onChange: (v: 'pinned' | 'on-demand') => void;
}) {
  return (
    <SegmentedControl
      options={[
        { key: 'pinned' as const, label: 'Pinned' },
        { key: 'on-demand' as const, label: 'On-Demand' },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

// ---------------------------------------------------------------------------
// Resource file browser
// ---------------------------------------------------------------------------

interface ResourceFile {
  name: string;
  type: 'code' | 'pdf' | 'other';
  meta: string;
  hasRunTest?: boolean;
}

interface ResourceFolder {
  name: string;
  expanded: boolean;
  files: ResourceFile[];
  emptyLabel?: string;
}

function ResourceBrowser({ onUpload }: { onUpload: () => void }) {
  const [folders, setFolders] = useState<ResourceFolder[]>([
    {
      name: 'scripts/',
      expanded: true,
      files: [
        {
          name: 'validate_kyc.py',
          type: 'code',
          meta: 'Last audited: Mar 15, 2026',
          hasRunTest: true,
        },
        {
          name: 'format_disclosure.ts',
          type: 'code',
          meta: 'Last audited: Mar 10, 2026',
          hasRunTest: true,
        },
      ],
    },
    {
      name: 'references/',
      expanded: true,
      files: [
        { name: 'mas-guidelines-2024.pdf', type: 'pdf', meta: '2.1 MB' },
        { name: 'apra-standards.pdf', type: 'pdf', meta: '1.8 MB' },
      ],
    },
    {
      name: 'assets/',
      expanded: true,
      files: [],
      emptyLabel: 'No assets',
    },
  ]);

  const toggleFolder = (idx: number) => {
    setFolders((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, expanded: !f.expanded } : f)),
    );
  };

  const fileIcon = (type: ResourceFile['type']) => {
    switch (type) {
      case 'code': return <FileCodeIcon />;
      case 'pdf': return <FilePdfIcon />;
      default: return <FolderIcon />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#E5E7EB' }}>
        <h3
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ fontFamily: 'var(--font-ui)', color: '#374151' }}
        >
          Resources
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {folders.map((folder, fi) => (
          <div key={folder.name}>
            <button
              onClick={() => toggleFolder(fi)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-[#F9FAFB] transition-colors"
            >
              <ChevronIcon open={folder.expanded} />
              <span
                className="text-[11px] font-semibold"
                style={{ fontFamily: 'var(--font-mono)', color: '#374151' }}
              >
                {folder.name}
              </span>
              <span className="text-[10px] ml-auto" style={{ color: '#9CA3AF' }}>
                {folder.files.length}
              </span>
            </button>

            {folder.expanded && (
              <div className="ml-5 space-y-0.5">
                {folder.files.length === 0 && folder.emptyLabel && (
                  <p className="text-[11px] italic px-2 py-1" style={{ color: '#9CA3AF' }}>
                    {folder.emptyLabel}
                  </p>
                )}
                {folder.files.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#F9FAFB] transition-colors group cursor-pointer"
                  >
                    {fileIcon(file.type)}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[12px] font-medium truncate"
                        style={{ fontFamily: 'var(--font-mono)', color: '#374151' }}
                      >
                        {file.name}
                      </p>
                      <p className="text-[10px]" style={{ color: '#9CA3AF' }}>{file.meta}</p>
                    </div>
                    {file.hasRunTest && (
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium px-2 py-0.5 rounded-md border flex items-center gap-1" style={{ color: '#7C3AED', borderColor: '#DDD6FE', background: '#F5F3FF' }}>
                        <PlayIcon /> Run
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Upload button */}
      <div className="px-3 pb-3">
        <button
          onClick={onUpload}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium rounded-lg border border-dashed transition-colors hover:bg-[#F9FAFB]"
          style={{ color: '#9CA3AF', borderColor: '#D1D5DB' }}
        >
          <UploadIcon /> Upload Resource
        </button>
      </div>

      {/* Annotation */}
      <div className="px-4 py-2.5 border-t" style={{ borderColor: '#F3F4F6' }}>
        <div className="flex items-center gap-2 text-[10px]" style={{ color: '#9CA3AF' }}>
          <svg width="24" height="12" viewBox="0 0 24 12" className="flex-shrink-0">
            <line x1="0" y1="6" x2="24" y2="6" stroke="#7C3AED" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
            <circle cx="22" cy="6" r="2" fill="#7C3AED" opacity="0.5" />
          </svg>
          <span>Scripts linked to skill body instructions</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Eval Cases table
// ---------------------------------------------------------------------------

interface EvalCase {
  prompt: string;
  expectContains: string;
}

function EvalCases() {
  const [cases] = useState<EvalCase[]>([
    { prompt: 'KYC requirements for Singapore clients?', expectContains: 'MAS' },
  ]);

  return (
    <div className="mt-6">
      <h3
        className="text-[10px] font-semibold uppercase tracking-wider mb-3"
        style={{ fontFamily: 'var(--font-ui)', color: '#9CA3AF' }}
      >
        Eval Cases
      </h3>
      <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b" style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}>
              <th className="text-left px-3 py-2 text-[10px] font-medium uppercase tracking-wider w-3/5" style={{ color: '#9CA3AF' }}>
                Prompt
              </th>
              <th className="text-left px-3 py-2 text-[10px] font-medium uppercase tracking-wider w-2/5" style={{ color: '#9CA3AF' }}>
                expect_contains
              </th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c, i) => (
              <tr key={i} className="border-b last:border-0" style={{ borderColor: '#F3F4F6' }}>
                <td className="px-3 py-2.5 text-[12px]" style={{ fontFamily: 'var(--font-mono)', color: '#374151' }}>
                  "{c.prompt}"
                </td>
                <td className="px-3 py-2.5 text-[12px]" style={{ fontFamily: 'var(--font-mono)', color: '#374151' }}>
                  "{c.expectContains}"
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="mt-2 text-[11px] font-medium hover:underline flex items-center gap-1" style={{ color: '#1A73E8' }}>
        <PlusIcon /> Add eval case
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test Activation panel (collapsible bottom drawer)
// ---------------------------------------------------------------------------

function TestActivation({ onRunTest }: { onRunTest: (prompt: string) => Promise<{ activated: boolean; confidence: number; response?: string }> }) {
  const [testPrompt, setTestPrompt] = useState(
    'What are the KYC requirements for our Singapore clients?',
  );
  const [hasResult, setHasResult] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [activationResult, setActivationResult] = useState<{ activated: boolean; confidence: number; response?: string } | null>(null);
  const [manualActivate, setManualActivate] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border-t bg-white" style={{ borderColor: '#E5E7EB' }}>
      {/* Collapsible header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-2.5 flex items-center justify-between hover:bg-[#F9FAFB] transition-colors"
      >
        <div className="flex items-center gap-2">
          <TestBeakerIcon />
          <h3
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ fontFamily: 'var(--font-ui)', color: '#374151' }}
          >
            Test Activation
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <label
            className="flex items-center gap-1.5 text-[11px] cursor-pointer"
            style={{ color: '#9CA3AF' }}
            onClick={(e) => e.stopPropagation()}
          >
            <span>Activate manually</span>
            <button
              onClick={(e) => { e.stopPropagation(); setManualActivate(!manualActivate); }}
              className="relative w-7 h-[14px] rounded-full transition-colors"
              style={{ background: manualActivate ? '#7C3AED' : '#D1D5DB' }}
            >
              <span
                className="absolute top-[2px] left-[2px] w-[10px] h-[10px] rounded-full bg-white transition-transform"
                style={{
                  transform: manualActivate ? 'translateX(13px)' : 'translateX(0)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                }}
              />
            </button>
          </label>
          <ChevronIcon open={isOpen} />
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-4">
          {/* Input */}
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter a test prompt..."
              className="flex-1 px-3 py-2 text-[12px] border rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
              style={{ fontFamily: 'var(--font-body)', borderColor: '#E5E7EB', background: '#F9FAFB' }}
            />
            <button
              onClick={async () => {
                if (!testPrompt.trim() || testRunning) return;
                setTestRunning(true);
                setHasResult(false);
                try {
                  const result = await onRunTest(testPrompt);
                  setActivationResult(result);
                  setHasResult(true);
                } finally {
                  setTestRunning(false);
                }
              }}
              disabled={!testPrompt.trim() || testRunning}
              className="px-4 py-2 text-[11px] font-medium text-white rounded-lg transition-colors hover:opacity-90"
              style={{ background: testRunning ? '#93C5FD' : '#1A73E8', cursor: testRunning ? 'not-allowed' : 'pointer' }}
            >
              {testRunning ? 'Testing...' : 'Test'}
            </button>
          </div>

          {/* Results */}
          {hasResult && activationResult && (
            <div className="space-y-3">
              {/* Activation status */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium w-32 flex-shrink-0" style={{ color: '#6B7280' }}>
                  Activated
                </span>
                <span className="text-[11px] font-semibold" style={{ color: activationResult.activated ? '#059669' : '#DC2626' }}>
                  {activationResult.activated ? 'Yes' : 'No'}
                </span>
              </div>

              {/* Confidence bar */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium w-32 flex-shrink-0" style={{ color: '#6B7280' }}>
                  Activation confidence
                </span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${activationResult.confidence}%`,
                      background: activationResult.confidence > 70 ? '#059669' : activationResult.confidence > 40 ? '#D97706' : '#DC2626',
                    }}
                  />
                </div>
                <span
                  className="text-[11px] font-semibold w-10 text-right"
                  style={{ color: activationResult.confidence > 70 ? '#059669' : activationResult.confidence > 40 ? '#D97706' : '#DC2626' }}
                >
                  {activationResult.confidence}%
                </span>
              </div>

              {/* Matched keywords */}
              <div className="flex items-start gap-3">
                <span className="text-[11px] font-medium w-32 flex-shrink-0" style={{ color: '#6B7280' }}>
                  Matched on
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {['regulatory compliance', 'APAC markets', 'Singapore'].map(
                    (kw) => (
                      <span
                        key={kw}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
                        style={{ background: '#F5F3FF', color: '#7C3AED', borderColor: '#DDD6FE' }}
                      >
                        {kw}
                      </span>
                    ),
                  )}
                </div>
              </div>

              {/* Simulated response */}
              {activationResult.response && (
                <div className="rounded-lg border p-3" style={{ borderColor: '#E5E7EB', background: '#F9FAFB' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9CA3AF' }}>
                    Simulated response
                  </p>
                  <p
                    className="text-[12px] leading-relaxed"
                    style={{ fontFamily: 'var(--font-body)', color: '#374151' }}
                  >
                    {activationResult.response}{' '}
                    <Chip type="doc" name="mas-guidelines-2024" />
                  </p>
                </div>
              )}

              {/* Code execution trace */}
              {activationResult.activated && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ background: '#F0FDF4', borderColor: '#BBF7D0' }}>
                  <CheckIcon />
                  <span
                    className="text-[11px]"
                    style={{ fontFamily: 'var(--font-mono)', color: '#166534' }}
                  >
                    validate_kyc.py executed &rarr; SG jurisdiction &rarr; compliant
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skill body with inline smart chips
// ---------------------------------------------------------------------------

function SkillBody() {
  return (
    <div className="playbook-body space-y-4">
      <h1>APAC Compliance Skill</h1>

      <h2>Regional Rules</h2>
      <p>
        When handling queries involving Singapore customers, always reference{' '}
        <Chip type="doc" name="mas-guidelines-2024" /> and apply{' '}
        <Chip type="guard" name="pdpa-compliance" resolved={false} />.
      </p>
      <p>
        For Australian customers, consult{' '}
        <Chip type="doc" name="apra-prudential-standards" /> and ensure
        responses conform to{' '}
        <Chip type="schema" name="apra-disclosure-format" resolved={false} />.
      </p>

      <h2>Connected Data</h2>
      <p>
        Search <Chip type="connector" name="salesforce" /> for customer
        jurisdiction data. Verify regulatory status via{' '}
        <Chip type="tool" name="regtech-api" />.
      </p>

      <h2>Escalation</h2>
      <p>
        If a query involves cross-border transactions, route to{' '}
        <Chip type="agent" name="compliance-officer" /> with full context
        attached.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Frontmatter card
// ---------------------------------------------------------------------------

function Frontmatter() {
  const tags = ['compliance', 'apac', 'regulatory'];

  return (
    <div className="rounded-lg border bg-white p-5 space-y-4" style={{ borderColor: '#E5E7EB', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
      <div className="flex items-center gap-2 mb-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: '#9CA3AF' }}
        >
          Frontmatter
        </span>
        <span className="text-[10px]" style={{ color: '#D1D5DB' }}>(YAML)</span>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
          name
        </label>
        <div
          className="w-full px-3 py-1.5 text-[13px] border rounded-md"
          style={{ fontFamily: 'var(--font-mono)', borderColor: '#E5E7EB', background: '#F9FAFB', color: '#111827' }}
        >
          apac-compliance
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
          description
        </label>
        <div
          className="w-full px-3 py-2 text-[12px] border rounded-md leading-relaxed"
          style={{ fontFamily: 'var(--font-body)', borderColor: '#E5E7EB', background: '#F9FAFB', color: '#374151' }}
        >
          Use this skill when the agent handles regulatory compliance questions
          in APAC markets. Covers MAS, APRA, RBI, OJK, and FSC regulations.
        </div>
      </div>

      {/* Version + Tags */}
      <div className="flex gap-6">
        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
            version
          </label>
          <span
            className="text-[12px]"
            style={{ fontFamily: 'var(--font-mono)', color: '#374151' }}
          >
            2.0.0
          </span>
        </div>

        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
            tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md border"
                style={{ background: '#F9FAFB', color: '#6B7280', borderColor: '#E5E7EB' }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Input / Output schemas */}
      <div className="flex gap-6">
        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
            input
          </label>
          <div
            className="text-[11px] rounded-md border px-3 py-1.5"
            style={{ fontFamily: 'var(--font-mono)', borderColor: '#E5E7EB', background: '#F9FAFB', color: '#374151' }}
          >
            jurisdiction: string, query: string
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#9CA3AF' }}>
            output
          </label>
          <div
            className="text-[11px] rounded-md border px-3 py-1.5"
            style={{ fontFamily: 'var(--font-mono)', borderColor: '#E5E7EB', background: '#F9FAFB', color: '#374151' }}
          >
            compliant: boolean, notes: string
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// Main SkillEditor component
// ===========================================================================

export function SkillEditor() {
  const { addNotification } = useNotifications();
  const [scope, setScope] = useState<Scope>('workspace');
  const [activation, setActivation] = useState<'pinned' | 'on-demand'>(
    'on-demand',
  );

  const handleUploadResource = useCallback(() => {
    addNotification({ type: 'info', title: 'Upload', message: 'File picker would open here' });
  }, [addNotification]);

  const handleInstallToWorkspace = useCallback(() => {
    addNotification({ type: 'success', title: 'Skill installed', message: 'Installed to workspace scope' });
  }, [addNotification]);

  const handlePublishToRegistry = useCallback(() => {
    addNotification({ type: 'success', title: 'Published', message: 'Skill published to registry' });
  }, [addNotification]);

  const handleRunSkillActivation = useCallback(async (prompt: string): Promise<{ activated: boolean; confidence: number; response?: string }> => {
    // Simulate skill activation test with realistic delay
    await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 600));

    // Simple keyword matching to simulate activation confidence
    const keywords = ['compliance', 'apac', 'regulatory', 'singapore', 'kyc', 'mas', 'apra', 'rbi'];
    const promptLower = prompt.toLowerCase();
    const matchCount = keywords.filter((kw) => promptLower.includes(kw)).length;
    const confidence = Math.min(99, Math.round(40 + (matchCount / keywords.length) * 55 + Math.random() * 5));
    const activated = confidence > 50;

    return {
      activated,
      confidence,
      response: activated
        ? 'Based on MAS guidelines, KYC requirements for Singapore clients include customer identification, verification of identity documents, screening against sanctions lists, and ongoing monitoring of transactions. Reference:'
        : undefined,
    };
  }, []);

  return (
    <div className="h-full flex flex-col" style={{ background: '#F9FAFB' }}>
      {/* --- Header -------------------------------------------------------- */}
      <header className="bg-white border-b" style={{ borderColor: '#E5E7EB' }}>
        <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center gap-3">
          {/* Skill name */}
          <h1
            className="text-[13px] font-semibold"
            style={{ fontFamily: 'var(--font-ui)', color: '#111827' }}
          >
            apac-compliance
          </h1>

          {/* Version badge */}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
            style={{ background: '#EDE9FE', color: '#6D28D9' }}
          >
            v2.0.0
          </span>

          <div className="flex-1" />

          {/* Scope selector */}
          <ScopeSelector value={scope} onChange={setScope} />

          {/* Activation toggle */}
          <ActivationToggle value={activation} onChange={setActivation} />

          {/* Actions */}
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={handleInstallToWorkspace}
              className="text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-[#F9FAFB]"
              style={{ color: '#6B7280', borderColor: '#E5E7EB' }}
            >
              Install to Workspace
            </button>
            <button
              onClick={handlePublishToRegistry}
              className="text-[11px] font-medium text-white px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
              style={{ background: '#7C3AED' }}
            >
              Publish to Registry
            </button>
          </div>
        </div>

        {/* Precedence indicator */}
        <div className="max-w-[1440px] mx-auto px-5 pb-2 flex items-center gap-1">
          <span className="text-[10px]" style={{ color: '#9CA3AF' }}>Precedence:</span>
          {(['Workspace', 'User', 'Extension'] as const).map((level, i) => (
            <span key={level} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-[10px]" style={{ color: '#D1D5DB' }}>&gt;</span>
              )}
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                style={
                  level.toLowerCase() === scope
                    ? { background: '#EDE9FE', color: '#6D28D9' }
                    : { color: '#9CA3AF' }
                }
              >
                {level}
              </span>
            </span>
          ))}
        </div>
      </header>

      {/* --- Main Content -------------------------------------------------- */}
      <div className="flex-1 flex flex-col max-w-[1440px] mx-auto w-full min-h-0">
        <div className="flex-1 flex min-h-0">
          {/* -- Left Panel (60%): SKILL.md Editor ------------------------- */}
          <div className="w-[60%] border-r overflow-y-auto" style={{ borderColor: '#E5E7EB' }}>
            <div className="p-6 space-y-6">
              {/* Section 1: Frontmatter */}
              <Frontmatter />

              {/* Section 2: Body */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: '#9CA3AF' }}
                  >
                    Skill Body
                  </span>
                  <span className="text-[10px]" style={{ color: '#D1D5DB' }}>(Markdown + Smart Chips)</span>
                </div>
                <div className="rounded-lg border bg-white p-5 relative" style={{ borderColor: '#E5E7EB' }}>
                  {/* Violet left border accent */}
                  <div
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                    style={{ background: '#7C3AED' }}
                  />
                  <div className="pl-4">
                    <SkillBody />
                  </div>
                </div>
              </div>

              {/* Section 3: Eval Cases */}
              <EvalCases />
            </div>
          </div>

          {/* -- Right Panel (40%): Skill Resources ----------------------- */}
          <div className="w-[40%] bg-white overflow-y-auto border-l" style={{ borderColor: '#E5E7EB' }}>
            <ResourceBrowser onUpload={handleUploadResource} />
          </div>
        </div>

        {/* -- Bottom Panel: Test Activation ------------------------------- */}
        <TestActivation onRunTest={handleRunSkillActivation} />
      </div>
    </div>
  );
}
