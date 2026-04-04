/**
 * SkillEditor -- Screen 8: SKILL.md Authoring
 *
 * A dedicated editor for creating and managing agent skills.
 * Skills are reusable capability bundles in SKILL.md format.
 *
 * Three panels:
 *   Left  (60%) -- SKILL.md editor (frontmatter card + body with smart chips + eval cases)
 *   Right (40%) -- Skill Resources file browser (scripts, references, assets)
 *   Bottom       -- Test Activation panel
 */

import { useState } from 'react';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType } from '../../parser/types';

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
        {icon} @{type}({name}) ⚠️
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
// Scope selector pills
// ---------------------------------------------------------------------------

type Scope = 'workspace' | 'user' | 'extension';

function ScopeSelector({
  value,
  onChange,
}: {
  value: Scope;
  onChange: (s: Scope) => void;
}) {
  const options: { key: Scope; label: string }[] = [
    { key: 'workspace', label: 'Workspace' },
    { key: 'user', label: 'User' },
    { key: 'extension', label: 'Extension' },
  ];

  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            value === o.key
              ? 'bg-[#1A73E8] text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
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
    <div className="flex rounded-lg overflow-hidden border border-violet-200">
      <button
        onClick={() => onChange('pinned')}
        className={`px-3 py-1 text-xs font-medium transition-colors ${
          value === 'pinned'
            ? 'bg-[#7C3AED] text-white'
            : 'bg-white text-gray-500 hover:bg-violet-50'
        }`}
      >
        Pinned
      </button>
      <button
        onClick={() => onChange('on-demand')}
        className={`px-3 py-1 text-xs font-medium transition-colors ${
          value === 'on-demand'
            ? 'bg-[#7C3AED] text-white'
            : 'bg-white text-gray-500 hover:bg-violet-50'
        }`}
      >
        On-Demand
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Resource file browser
// ---------------------------------------------------------------------------

interface ResourceFile {
  name: string;
  icon: string;
  meta: string;
  hasRunTest?: boolean;
}

interface ResourceFolder {
  name: string;
  expanded: boolean;
  files: ResourceFile[];
  emptyLabel?: string;
}

function ResourceBrowser() {
  const [folders, setFolders] = useState<ResourceFolder[]>([
    {
      name: 'scripts/',
      expanded: true,
      files: [
        {
          name: 'validate_kyc.py',
          icon: '\uD83D\uDC0D',
          meta: 'Last audited: Mar 15, 2026',
          hasRunTest: true,
        },
        {
          name: 'format_disclosure.ts',
          icon: '\uD83D\uDCD8',
          meta: 'Last audited: Mar 10, 2026',
          hasRunTest: true,
        },
      ],
    },
    {
      name: 'references/',
      expanded: true,
      files: [
        { name: 'mas-guidelines-2024.pdf', icon: '\uD83D\uDCD5', meta: '2.1 MB' },
        { name: 'apra-standards.pdf', icon: '\uD83D\uDCD5', meta: '1.8 MB' },
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h3
          className="text-sm font-semibold text-gray-900"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          Skill Resources
        </h3>
        <button className="text-xs font-medium text-[#1A73E8] hover:underline">
          Upload Resource
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {folders.map((folder, fi) => (
          <div key={folder.name}>
            {/* Folder header */}
            <button
              onClick={() => toggleFolder(fi)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
            >
              <span
                className="text-[10px] text-gray-400 transition-transform inline-block"
                style={{
                  transform: folder.expanded ? 'rotate(90deg)' : 'rotate(0)',
                }}
              >
                &#9654;
              </span>
              <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'var(--font-mono)' }}>
                {folder.name}
              </span>
              <span className="text-[10px] text-gray-400 ml-auto">
                {folder.files.length} {folder.files.length === 1 ? 'file' : 'files'}
              </span>
            </button>

            {/* Folder contents */}
            {folder.expanded && (
              <div className="ml-5 space-y-0.5">
                {folder.files.length === 0 && folder.emptyLabel && (
                  <p className="text-[11px] text-gray-400 italic px-2 py-1">
                    {folder.emptyLabel}
                  </p>
                )}
                {folder.files.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors group"
                  >
                    <span className="text-sm">{file.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-medium text-gray-800 truncate"
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {file.name}
                      </p>
                      <p className="text-[10px] text-gray-400">{file.meta}</p>
                    </div>
                    {file.hasRunTest && (
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full hover:bg-violet-100">
                        Run Test
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Visual annotation: dashed connector lines */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          <svg width="24" height="12" viewBox="0 0 24 12" className="flex-shrink-0">
            <line
              x1="0" y1="6" x2="24" y2="6"
              stroke="#7C3AED"
              strokeWidth="1"
              strokeDasharray="3 2"
              opacity="0.5"
            />
            <circle cx="22" cy="6" r="2" fill="#7C3AED" opacity="0.5" />
          </svg>
          <span>Scripts are linked to skill body sections that invoke them</span>
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
        className="text-sm font-semibold text-gray-900 mb-3"
        style={{ fontFamily: 'var(--font-ui)' }}
      >
        Eval Cases
      </h3>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-3/5">
                Prompt
              </th>
              <th className="text-left px-3 py-2 font-medium text-gray-500 w-2/5">
                expect_contains
              </th>
            </tr>
          </thead>
          <tbody>
            {cases.map((c, i) => (
              <tr key={i} className="border-b border-gray-100 last:border-0">
                <td
                  className="px-3 py-2.5 text-gray-700"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  &quot;{c.prompt}&quot;
                </td>
                <td
                  className="px-3 py-2.5 text-gray-700"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  &quot;{c.expectContains}&quot;
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="mt-2 text-xs font-medium text-[#1A73E8] hover:underline flex items-center gap-1">
        <span className="text-sm">+</span> Add eval case
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test Activation panel
// ---------------------------------------------------------------------------

function TestActivation() {
  const [testPrompt, setTestPrompt] = useState(
    'What are the KYC requirements for our Singapore clients?',
  );
  const [hasResult, setHasResult] = useState(true);
  const [manualActivate, setManualActivate] = useState(false);

  return (
    <div className="border-t border-gray-200 bg-white">
      <div className="px-5 py-3 flex items-center justify-between border-b border-gray-100">
        <h3
          className="text-sm font-semibold text-gray-900"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          Test Activation
        </h3>
        <div className="flex items-center gap-3">
          {/* Manual activate toggle */}
          <label className="flex items-center gap-1.5 text-[11px] text-gray-500 cursor-pointer">
            <span>Activate manually</span>
            <button
              onClick={() => setManualActivate(!manualActivate)}
              className={`relative w-8 h-4 rounded-full transition-colors ${
                manualActivate ? 'bg-[#7C3AED]' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform shadow-sm ${
                  manualActivate ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <div className="p-5">
        {/* Input */}
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={testPrompt}
            onChange={(e) => setTestPrompt(e.target.value)}
            placeholder="Enter a test prompt..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 transition-all"
            style={{ fontFamily: 'var(--font-body)' }}
          />
          <button
            onClick={() => setHasResult(true)}
            className="px-4 py-2 text-xs font-medium text-white rounded-lg transition-colors hover:opacity-90"
            style={{ background: '#7C3AED' }}
          >
            Test Activation
          </button>
        </div>

        {/* Results */}
        {hasResult && (
          <div className="space-y-3">
            {/* Confidence bar */}
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-600 w-36 flex-shrink-0">
                Activation confidence:
              </span>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: '94%', background: '#059669' }}
                />
              </div>
              <span className="text-xs font-bold text-green-700 w-10 text-right">
                94%
              </span>
            </div>

            {/* Matched keywords */}
            <div className="flex items-start gap-3">
              <span className="text-xs font-medium text-gray-600 w-36 flex-shrink-0">
                Matched on:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['regulatory compliance', 'APAC markets', 'Singapore'].map(
                  (kw) => (
                    <span
                      key={kw}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200"
                    >
                      {kw}
                    </span>
                  ),
                )}
              </div>
            </div>

            {/* Simulated response */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
                Simulated response
              </p>
              <p
                className="text-sm text-gray-700 leading-relaxed"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                Based on MAS guidelines, KYC requirements for Singapore clients
                include customer identification, verification of identity
                documents, screening against sanctions lists, and ongoing
                monitoring of transactions. Reference:{' '}
                <Chip type="doc" name="mas-guidelines-2024" />
              </p>
            </div>

            {/* Code execution trace */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
              <span className="text-green-600 font-bold text-xs">&#10003;</span>
              <span
                className="text-xs text-green-800"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                validate_kyc.py executed &rarr; SG jurisdiction &rarr; compliant
              </span>
            </div>
          </div>
        )}
      </div>
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

      {/* Dashed annotation line connecting to scripts panel */}
      <div className="relative my-2">
        <svg
          width="100%"
          height="16"
          className="absolute -top-2 left-0 pointer-events-none overflow-visible"
        >
          <line
            x1="70%"
            y1="8"
            x2="100%"
            y2="8"
            stroke="#7C3AED"
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.35"
          />
          <circle cx="70%" cy="8" r="2.5" fill="#7C3AED" opacity="0.35" />
        </svg>
      </div>

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
    <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] font-semibold text-violet-500 uppercase tracking-wider">
          Frontmatter
        </span>
        <span className="text-[10px] text-gray-400">(YAML)</span>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">
          name
        </label>
        <div
          className="w-full px-3 py-1.5 text-sm border border-violet-200 rounded-md bg-white text-gray-900"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          apac-compliance
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-[11px] font-medium text-gray-500 mb-1">
          description
        </label>
        <div
          className="w-full px-3 py-2 text-sm border border-violet-200 rounded-md bg-white text-gray-700 leading-relaxed"
          style={{ fontFamily: 'var(--font-body)' }}
        >
          Use this skill when the agent handles regulatory compliance questions
          in APAC markets. Covers MAS, APRA, RBI, OJK, and FSC regulations.
        </div>
      </div>

      {/* Version + Tags */}
      <div className="flex gap-6">
        <div>
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            version
          </label>
          <span
            className="text-sm text-gray-800"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            2.0.0
          </span>
        </div>

        <div className="flex-1">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            tags
          </label>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <span
                key={t}
                className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200"
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
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            input
          </label>
          <div
            className="text-xs text-gray-600 bg-white rounded-md border border-violet-200 px-3 py-1.5"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            jurisdiction: string, query: string
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-[11px] font-medium text-gray-500 mb-1">
            output
          </label>
          <div
            className="text-xs text-gray-600 bg-white rounded-md border border-violet-200 px-3 py-1.5"
            style={{ fontFamily: 'var(--font-mono)' }}
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
  const [scope, setScope] = useState<Scope>('workspace');
  const [activation, setActivation] = useState<'pinned' | 'on-demand'>(
    'on-demand',
  );

  return (
    <div className="h-full bg-[#FAFAF9] flex flex-col">
      {/* --- Top Bar ---------------------------------------------------- */}
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center gap-4">
          {/* Skill name */}
          <h1
            className="text-sm font-semibold text-gray-900"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            apac-compliance
          </h1>

          {/* Version badge */}
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">
            v2.0.0
          </span>

          <div className="flex-1" />

          {/* Scope selector */}
          <ScopeSelector value={scope} onChange={setScope} />

          {/* Activation toggle */}
          <ActivationToggle value={activation} onChange={setActivation} />

          {/* Actions */}
          <div className="flex items-center gap-2 ml-2">
            <button className="text-xs font-medium text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Install to Workspace
            </button>
            <button
              className="text-xs font-medium text-white px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
              style={{ background: '#7C3AED' }}
            >
              Publish to Registry
            </button>
          </div>
        </div>

        {/* Precedence indicator */}
        <div className="max-w-[1440px] mx-auto px-5 pb-2 flex items-center gap-2">
          <span className="text-[10px] text-gray-400">Precedence:</span>
          {(['Workspace', 'User', 'Extension'] as const).map((level, i) => (
            <span key={level} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-[10px] text-gray-300">&gt;</span>
              )}
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                  level.toLowerCase() === scope
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-gray-400'
                }`}
              >
                {level}
              </span>
            </span>
          ))}
        </div>
      </header>

      {/* --- Main Content ------------------------------------------------ */}
      <div className="flex-1 flex flex-col max-w-[1440px] mx-auto w-full">
        <div className="flex-1 flex min-h-0">
          {/* -- Left Panel (60%): SKILL.md Editor ----------------------- */}
          <div className="w-[60%] border-r border-gray-200 overflow-y-auto">
            <div className="p-6 space-y-6">
              {/* Section 1: Frontmatter */}
              <Frontmatter />

              {/* Section 2: Body */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Skill Body
                  </span>
                  <span className="text-[10px] text-gray-400">(Markdown + Smart Chips)</span>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-5 relative">
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

          {/* -- Right Panel (40%): Skill Resources ---------------------- */}
          <div className="w-[40%] bg-white overflow-y-auto border-l border-gray-100">
            <ResourceBrowser />
          </div>
        </div>

        {/* -- Bottom Panel: Test Activation ----------------------------- */}
        <TestActivation />
      </div>
    </div>
  );
}
