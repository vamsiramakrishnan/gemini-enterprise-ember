/**
 * SkillEditor — Screen 8: SKILL.md authoring view.
 *
 * Three panels: SKILL.md editor (left), resources (right), test (bottom).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType } from '../../parser/types';

// ─── Chip ────────────────────────────────────────────────────────────────

function Chip({ type, name, unresolved }: { type: ChipType; name: string; unresolved?: boolean }) {
  const c = CHIP_COLORS[type];
  const icon = CHIP_ICONS[type];
  if (unresolved) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border-2 border-dashed mx-0.5"
        style={{ borderColor: '#DC2626', color: '#DC2626', background: '#FEF2F2' }}>
        {icon} {name} ⚠️
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium text-white mx-0.5"
      style={{ background: c.bg }}>
      {icon} {name}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────

export function SkillEditor() {
  const [activationTested, setActivationTested] = useState(false);
  const [scope, setScope] = useState<'workspace' | 'user' | 'extension'>('workspace');
  const [mode, setMode] = useState<'pinned' | 'on-demand'>('on-demand');

  return (
    <div className="min-h-screen bg-[var(--color-surface-0)]">
      {/* Top bar */}
      <header className="border-b border-[var(--color-border)] bg-white/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="px-6 py-3 flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Home</Link>
          <div className="w-px h-5 bg-gray-200" />
          <span className="text-lg">✨</span>
          <h1 className="text-base font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>
            apac-compliance
          </h1>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-violet-100 text-violet-700">v2.0.0</span>

          {/* Scope selector */}
          <div className="flex gap-0.5 ml-4 bg-gray-100 rounded-lg p-0.5">
            {(['workspace', 'user', 'extension'] as const).map(s => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  scope === s ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Activation mode */}
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {(['pinned', 'on-demand'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1 text-[11px] font-medium rounded-md transition-colors ${
                  mode === m ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {m === 'pinned' ? 'Pinned' : 'On-Demand'}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex" style={{ height: 'calc(100vh - 56px)' }}>
        {/* ── Left Panel: SKILL.md Editor ── */}
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {/* Frontmatter card */}
          <div className="bg-violet-50/50 rounded-xl border border-violet-200 p-5 space-y-3">
            <div className="text-[10px] text-violet-500 uppercase tracking-wider font-bold">YAML Frontmatter</div>

            <div>
              <label className="text-xs text-gray-500">name</label>
              <div className="mt-1 px-3 py-2 bg-white rounded-md border border-violet-200 text-sm font-medium text-gray-900">
                apac-compliance
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500">description</label>
              <div className="mt-1 px-3 py-2 bg-white rounded-md border border-violet-200 text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
                Use this skill when the agent handles regulatory compliance questions in APAC markets. Covers MAS, APRA, RBI, OJK, and FSC regulations.
              </div>
            </div>

            <div className="flex gap-6">
              <div>
                <label className="text-xs text-gray-500">version</label>
                <div className="mt-1 font-mono text-sm text-gray-700">2.0.0</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">tags</label>
                <div className="mt-1 flex gap-1">
                  {['compliance', 'apac', 'regulatory'].map(t => (
                    <span key={t} className="px-2 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded-full">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-6">
              <div>
                <label className="text-xs text-gray-500">input</label>
                <div className="mt-1 font-mono text-[11px] text-gray-600">jurisdiction: string, query: string</div>
              </div>
              <div>
                <label className="text-xs text-gray-500">output</label>
                <div className="mt-1 font-mono text-[11px] text-gray-600">compliant: boolean, notes: string</div>
              </div>
            </div>
          </div>

          {/* Body — rich markdown with chips */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-3">Skill Body (Markdown + @chips)</div>

            <div className="space-y-4 text-sm text-gray-700 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
              <h3 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>
                APAC Compliance Skill
              </h3>

              <h4 className="text-base font-semibold text-gray-800">Regional Rules</h4>
              <p>
                When handling queries involving Singapore customers, always reference{' '}
                <Chip type="doc" name="mas-guidelines-2024" /> and apply{' '}
                <Chip type="guard" name="pdpa-compliance" unresolved />.
              </p>
              <p>
                For Australian customers, consult{' '}
                <Chip type="doc" name="apra-prudential-standards" /> and ensure responses conform to{' '}
                <Chip type="schema" name="apra-disclosure-format" unresolved />.
              </p>

              <h4 className="text-base font-semibold text-gray-800">Connected Data</h4>
              <p>
                Search <Chip type="connector" name="salesforce" /> for customer jurisdiction data.
                Verify regulatory status via <Chip type="tool" name="regtech-api" />.
              </p>

              <h4 className="text-base font-semibold text-gray-800">Escalation</h4>
              <p>
                If a query involves cross-border transactions, route to{' '}
                <Chip type="agent" name="compliance-officer" /> with full context attached.
              </p>
            </div>
          </div>

          {/* Eval Cases */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-3">Eval Cases</div>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Prompt</th>
                  <th className="pb-2 font-medium">Expected (contains)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-50">
                  <td className="py-2 text-gray-700">"KYC requirements for Singapore clients?"</td>
                  <td className="py-2 font-mono text-green-600">"MAS"</td>
                </tr>
              </tbody>
            </table>
            <button className="mt-2 text-xs text-violet-600 hover:text-violet-800">+ Add eval case</button>
          </div>
        </div>

        {/* ── Right Panel: Resources + Test ── */}
        <div className="w-80 border-l border-[var(--color-border)] bg-white flex flex-col">
          {/* Resources */}
          <div className="p-5 flex-1 overflow-auto space-y-4">
            <div className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'var(--font-ui)' }}>
              Skill Resources
            </div>

            {/* scripts/ */}
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                📜 scripts/
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="text-blue-500 text-xs">🐍</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-700">validate_kyc.py</div>
                    <div className="text-[10px] text-gray-400">Last audited: Mar 15, 2026</div>
                  </div>
                  <button className="text-[10px] text-violet-600 border border-violet-200 px-2 py-0.5 rounded hover:bg-violet-50">
                    Run Test
                  </button>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="text-blue-500 text-xs">📘</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-700">format_disclosure.ts</div>
                    <div className="text-[10px] text-gray-400">Last audited: Mar 10, 2026</div>
                  </div>
                  <button className="text-[10px] text-violet-600 border border-violet-200 px-2 py-0.5 rounded hover:bg-violet-50">
                    Run Test
                  </button>
                </div>
              </div>
            </div>

            {/* references/ */}
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                📎 references/
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="text-red-500 text-xs">📕</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-700">mas-guidelines-2024.pdf</div>
                    <div className="text-[10px] text-gray-400">2.1 MB</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <span className="text-red-500 text-xs">📕</span>
                  <div className="flex-1">
                    <div className="text-xs font-medium text-gray-700">apra-standards.pdf</div>
                    <div className="text-[10px] text-gray-400">1.8 MB</div>
                  </div>
                </div>
              </div>
            </div>

            {/* assets/ */}
            <div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                🖼️ assets/
              </div>
              <div className="text-[10px] text-gray-300 italic">No assets</div>
            </div>

            <button className="w-full px-3 py-2 text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg hover:text-gray-700 hover:border-gray-400">
              Upload Resource
            </button>
          </div>

          {/* Test Activation */}
          <div className="border-t border-gray-200 p-5 space-y-3">
            <div className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'var(--font-ui)' }}>
              Test Activation
            </div>

            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3" style={{ fontFamily: 'var(--font-body)' }}>
              "What are the KYC requirements for our Singapore clients?"
            </div>

            {activationTested && (
              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Activation confidence</span>
                    <span className="text-[10px] font-bold text-green-600">94%</span>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: '94%' }} />
                  </div>
                </div>

                <div className="text-[10px] text-gray-500">
                  Matched on: <span className="text-gray-700">"regulatory compliance", "APAC markets", "Singapore"</span>
                </div>

                <div className="bg-green-50 rounded-lg p-2 text-[11px] text-gray-700 leading-relaxed">
                  Based on MAS guidelines, KYC requirements for Singapore clients include identity verification...
                </div>

                <div className="text-[10px] text-gray-500 font-mono bg-gray-50 rounded p-1.5">
                  ✓ validate_kyc.py executed → SG jurisdiction → compliant
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setActivationTested(true)}
                className="px-3 py-1.5 text-xs text-white bg-violet-600 rounded-md hover:bg-violet-700"
              >
                Test Activation
              </button>
              <label className="flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer">
                <input type="checkbox" className="accent-violet-600" />
                Activate manually
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
