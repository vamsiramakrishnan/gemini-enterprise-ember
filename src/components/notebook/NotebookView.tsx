/**
 * NotebookView — Screen 2: Colab-style cell-based development.
 *
 * Cell types: Trigger, Playbook, Tool, Test (loop visualizer),
 * Skill, Connector, Code Execution (escape hatch).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType } from '../../parser/types';

// ─── Inline Chip ─────────────────────────────────────────────────────────

function Chip({ type, name, draft }: { type: ChipType; name: string; draft?: boolean }) {
  const c = CHIP_COLORS[type];
  const icon = CHIP_ICONS[type];
  if (draft) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border-2 border-dashed mx-0.5"
        style={{ borderColor: '#EAB308', color: '#854D0E', background: '#FEF9C3' }}>
        {icon} {name}
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

// ─── Cell Wrapper ────────────────────────────────────────────────────────

function Cell({ borderColor, children }: { borderColor: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm" style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}>
      {children}
    </div>
  );
}

function CellHeader({ title, badge }: { title: string; badge?: React.ReactNode }) {
  return (
    <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
      <span className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'var(--font-ui)' }}>{title}</span>
      {badge}
    </div>
  );
}

// ─── Trigger Cell ────────────────────────────────────────────────────────

function TriggerCell() {
  const triggers = [
    { icon: '💬', name: 'chat', desc: 'Real-time customer conversations via Gemini Enterprise', status: 'Active' },
    { icon: '📥', name: 'inbox:claims-queue', desc: 'Async claims from web portal, priority order', status: 'Active' },
    { icon: '🔗', name: 'jira:issue-created', desc: 'New claim ticket in Jira CLAIMS project', status: 'Active' },
    { icon: '📁', name: 'drive:file-uploaded', desc: 'Documents uploaded to /claims-inbox/', status: 'Active' },
    { icon: '⏰', name: 'schedule:weekday-9am', desc: 'Daily 9am SGT, process overnight backlog', status: 'Active' },
  ];

  return (
    <Cell borderColor="#EA580C">
      <CellHeader title="⚡ Triggers" />
      <div className="divide-y divide-gray-50">
        {triggers.map((t) => (
          <div key={t.name} className="px-5 py-3 flex items-center gap-3">
            <span className="text-lg">{t.icon}</span>
            <Chip type="trigger" name={t.name} />
            <span className="text-xs text-gray-500 flex-1">{t.desc}</span>
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700">{t.status}</span>
            <button className="px-2.5 py-1 text-[11px] text-orange-600 border border-orange-200 rounded-md hover:bg-orange-50">
              Test trigger
            </button>
          </div>
        ))}
      </div>
    </Cell>
  );
}

// ─── Playbook Cell ───────────────────────────────────────────────────────

function PlaybookCell() {
  return (
    <Cell borderColor="#0D9488">
      <CellHeader title="📄 Playbook — Claims Processing Agent" />
      <div className="px-5 py-4 text-sm text-gray-700 leading-relaxed space-y-3" style={{ fontFamily: 'var(--font-body)' }}>
        <p className="text-base font-semibold text-gray-900">Role</p>
        <p>You are an insurance claims processing assistant for ACME Insurance, serving customers across APAC markets.</p>

        <p className="text-base font-semibold text-gray-900 pt-2">Skills</p>
        <p>Uses <Chip type="skill" name="customer-empathy" /> for tone and <Chip type="skill" name="apac-compliance" /> for regulatory awareness.</p>

        <p className="text-base font-semibold text-gray-900 pt-2">Knowledge</p>
        <p>Reference <Chip type="doc" name="claims-policy-2024" /> and <Chip type="doc" name="apac-regulatory-matrix" />.</p>

        <p className="text-base font-semibold text-gray-900 pt-2">Process</p>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Greet customer and collect policy number</li>
          <li>Use <Chip type="tool" name="policy-lookup" /> to retrieve policy details</li>
          <li>Search <Chip type="connector" name="salesforce" /> for account history</li>
          <li>Use <Chip type="tool" name="claims-history" /> for prior claims</li>
          <li>Validate against <Chip type="doc" name="claims-policy-2024" /> coverage rules</li>
        </ol>

        <p className="text-sm font-semibold text-gray-900 pt-2">Escalation</p>
        <p>If claim &gt; $50k → <Chip type="agent" name="senior-adjuster" />. If flagged → <Chip type="guard" name="fraud-detection" />. Create ticket in <Chip type="connector" name="jira" /> and notify <Chip type="connector" name="slack" />.</p>

        <p className="text-sm font-semibold text-gray-900 pt-2">Output</p>
        <p>Conform to <Chip type="schema" name="claims-response-v2" />. Subject to <Chip type="guard" name="pii-redaction" /> and <Chip type="guard" name="apac-compliance-rules" />.</p>
      </div>
    </Cell>
  );
}

// ─── Tool Cell ───────────────────────────────────────────────────────────

function ToolCell() {
  const params = [
    { name: 'policy_id', type: 'string', required: true, desc: "Customer's policy ID", validation: 'regex: POL-[A-Z]{2}-[0-9]{6}', example: 'POL-SG-001234' },
    { name: 'include_riders', type: 'boolean', required: false, desc: 'Include policy riders/addons', validation: '—', example: 'true' },
    { name: 'effective_date', type: 'date', required: false, desc: 'Check as of this date', validation: 'must be ≤ today', example: '2024-01-15' },
    { name: 'format', type: 'enum', required: false, desc: 'Response format', validation: 'summary | full | minimal', example: 'summary' },
  ];

  return (
    <Cell borderColor="#4F46E5">
      <CellHeader title="🔧 Tool: policy-lookup" badge={
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 text-indigo-700">v2.3</span>
      } />
      <div className="px-5 py-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-100">
              <th className="pb-2 font-medium">Parameter</th>
              <th className="pb-2 font-medium">Type</th>
              <th className="pb-2 font-medium">Req</th>
              <th className="pb-2 font-medium">Description</th>
              <th className="pb-2 font-medium">Validation</th>
              <th className="pb-2 font-medium">Example</th>
            </tr>
          </thead>
          <tbody>
            {params.map(p => (
              <tr key={p.name} className="border-b border-gray-50">
                <td className="py-2 font-mono text-indigo-700 font-medium">{p.name}</td>
                <td className="py-2 text-gray-600">{p.type}</td>
                <td className="py-2">{p.required ? <span className="text-red-500 font-bold">*</span> : '—'}</td>
                <td className="py-2 text-gray-600">{p.desc}</td>
                <td className="py-2 font-mono text-[10px] text-gray-400">{p.validation}</td>
                <td className="py-2 font-mono text-gray-500">{p.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            Healthy
          </div>
          <span className="text-xs font-mono text-gray-400 flex-1">https://tools.acme.internal/mcp/policy-lookup</span>
          <button className="px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50">Test</button>
          <button className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Deploy to Cloud Run</button>
        </div>
      </div>
    </Cell>
  );
}

// ─── Test Cell (Loop Iteration Visualizer) ───────────────────────────────

function TestCell() {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true });

  const iterations = [
    {
      observe: 'Customer: "I need to file a claim for water damage to my kitchen. My policy number is POL-SG-001234."',
      reason: 'Matched to Process step 1-2: collect policy number → use @tool(policy-lookup)',
      act: { type: 'tool' as ChipType, name: 'policy-lookup', params: '{ policy_id: "POL-SG-001234" }' },
      result: '340ms → { policy_id: "POL-SG-001234", coverage: "home-comprehensive", status: "active", deductible: 500 }',
      decision: 'Loop again — need to check claims history',
    },
    {
      observe: 'Policy found: home-comprehensive, active. Need to check prior claims.',
      reason: 'Matched to Process step 4: use @tool(claims-history)',
      act: { type: 'tool' as ChipType, name: 'claims-history', params: '{ policy_id: "POL-SG-001234", months: 12 }' },
      result: '280ms → { prior_claims: 2, total_paid: 3200, last_claim: "2025-08-14" }',
      decision: 'Loop again — need to validate against policy',
    },
    {
      observe: 'History clear (2 prior claims, low risk). Validating against policy document.',
      reason: 'Matched to Process step 5 + Compliance: validate against @doc(claims-policy-2024)',
      act: { type: 'doc' as ChipType, name: 'claims-policy-2024', params: 'coverage: "water damage"' },
      result: 'Final Response: "Your claim for water damage has been registered as CLM-2026-04834. Based on your home-comprehensive policy, water damage is covered with a $500 deductible..."',
      decision: 'Respond — all validations passed',
    },
  ];

  const guards = [
    { name: 'pii-redaction', passed: true, time: '45ms' },
    { name: 'apac-compliance-rules', passed: true, time: '52ms' },
  ];

  return (
    <Cell borderColor="#16A34A">
      <CellHeader title="▶ Test Run" badge={
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[10px] text-gray-400">3 iterations · 1.2s · 847 tokens</span>
          <button className="px-3 py-1.5 text-xs text-white bg-green-600 rounded-md hover:bg-green-700">Run</button>
        </div>
      } />

      {/* Input */}
      <div className="px-5 py-3 bg-green-50/30 border-b border-gray-100">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Test Input</div>
        <div className="text-sm text-gray-700" style={{ fontFamily: 'var(--font-body)' }}>
          "I need to file a claim for water damage to my kitchen. My policy number is POL-SG-001234."
        </div>
      </div>

      {/* Iterations */}
      <div className="px-5 py-4 space-y-3">
        {iterations.map((iter, idx) => (
          <div key={idx}>
            {/* Guard checks (between iterations) */}
            {idx > 0 && (
              <div className="mb-3 space-y-1">
                {guards.map((g, gi) => (
                  <div key={gi} className="flex items-center gap-2 px-3 py-1.5 rounded bg-green-50 text-xs">
                    <span className="text-green-600 font-bold">✓</span>
                    <Chip type="guard" name={g.name} />
                    <span className="text-gray-400">passed — {g.time}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Iteration card */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpanded(e => ({ ...e, [idx]: !e[idx] }))}
                className="w-full px-4 py-2.5 bg-gray-50 flex items-center gap-2 text-left hover:bg-gray-100 transition-colors"
              >
                <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-xs font-medium text-gray-700 flex-1">
                  Loop {idx + 1}: {iter.act.name}
                </span>
                <Chip type={iter.act.type} name={iter.act.name} />
                <span className="text-gray-400 text-xs">{expanded[idx] ? '▼' : '▶'}</span>
              </button>

              {expanded[idx] && (
                <div className="px-4 py-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Observe</div>
                    <div className="text-gray-600 leading-relaxed">{iter.observe}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-violet-600 uppercase tracking-wider mb-1">Reason</div>
                    <div className="text-gray-600 leading-relaxed">{iter.reason}</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider mb-1">Act</div>
                    <div className="flex items-center gap-1">
                      <Chip type={iter.act.type} name={iter.act.name} />
                      <span className="font-mono text-gray-400 text-[10px]">{iter.act.params}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Result</div>
                    <div className="text-gray-600 font-mono text-[10px] leading-relaxed">{iter.result}</div>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Decision: </span>
                    <span className="text-[10px] text-gray-600">{iter.decision}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Cell>
  );
}

// ─── Skill Cell ──────────────────────────────────────────────────────────

function SkillCell() {
  return (
    <Cell borderColor="#7C3AED">
      <CellHeader title="✨ Skill: apac-compliance" badge={
        <>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-700">Workspace</span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-violet-100 text-violet-700">On-Demand</span>
        </>
      } />
      <div className="px-5 py-4 space-y-3">
        {/* Frontmatter */}
        <div className="p-3 bg-violet-50/50 rounded-lg border border-violet-100">
          <div className="text-[10px] text-violet-500 uppercase tracking-wider mb-1">Frontmatter</div>
          <div className="text-xs">
            <span className="text-gray-500">name:</span> <span className="font-medium">apac-compliance</span>
          </div>
          <div className="text-xs mt-1">
            <span className="text-gray-500">description:</span> <span className="text-gray-700">Use when handling regulatory compliance in APAC markets. Covers MAS, APRA, RBI, OJK, and FSC regulations.</span>
          </div>
        </div>

        {/* Body */}
        <div className="text-xs text-gray-700 leading-relaxed" style={{ fontFamily: 'var(--font-body)' }}>
          <p>When handling Singapore customers, reference <Chip type="doc" name="mas-guidelines-2024" /> and apply <Chip type="guard" name="pdpa-compliance" draft />.</p>
          <p className="mt-1.5">For Australian customers, consult <Chip type="doc" name="apra-prudential-standards" />. Verify via <Chip type="tool" name="regtech-api" />.</p>
          <p className="mt-1.5">Cross-border queries → route to <Chip type="agent" name="compliance-officer" />.</p>
        </div>

        {/* Resources */}
        <div className="text-xs text-gray-500">
          <div className="font-medium text-gray-700 mb-1">Resources:</div>
          <div className="flex gap-4">
            <span>📜 scripts/ (validate_kyc.py, format_disclosure.ts)</span>
            <span>📎 references/ (mas-guidelines-2024.pdf)</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs text-violet-600 border border-violet-200 rounded-md hover:bg-violet-50">Test Activation</button>
          <button className="px-3 py-1.5 text-xs text-white bg-violet-600 rounded-md hover:bg-violet-700">Publish to Registry</button>
        </div>
      </div>
    </Cell>
  );
}

// ─── Connector Cell ──────────────────────────────────────────────────────

function ConnectorCell() {
  return (
    <Cell borderColor="#2563EB">
      <CellHeader title="🔗 Connector: Jira Cloud" badge={
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700">Active</span>
      } />
      <div className="px-5 py-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Entities</div>
            {['Issues ✓', 'Comments ✓', 'Worklogs ✓', 'Attachments ✓'].map(e => (
              <div key={e} className="text-gray-600">{e}</div>
            ))}
          </div>
          <div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Actions</div>
            {['Search Issues', 'Create Issue', 'Add Comment', 'Update Issue'].map(a => (
              <div key={a} className="text-gray-600">{a}</div>
            ))}
          </div>
        </div>
        <div className="text-xs text-gray-500">
          Auth: Connected as <span className="font-mono">svc-jira@acme.atlassian.net</span>
        </div>
        <button className="text-xs text-blue-600 hover:text-blue-800">Open in Console →</button>
      </div>
    </Cell>
  );
}

// ─── Code Execution Cell (Escape Hatch) ──────────────────────────────────

function CodeCell() {
  return (
    <Cell borderColor="#DC2626">
      <div className="px-5 py-3 bg-red-50/50 border-b border-red-100 flex items-center gap-2">
        <span className="text-sm font-semibold text-red-800" style={{ fontFamily: 'var(--font-ui)' }}>⚠️ Unrestricted Code Execution</span>
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-red-100 text-red-700">Dev Only</span>
        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-500">Not in production</span>
      </div>
      <div className="px-5 py-4">
        {/* Code editor mock */}
        <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-green-400 leading-relaxed">
          <div className="text-gray-500"># Prototype: check warehouse return status</div>
          <div><span className="text-purple-400">import</span> requests</div>
          <div />
          <div><span className="text-blue-400">def</span> <span className="text-yellow-400">check_return</span>(order_id: <span className="text-green-300">str</span>):</div>
          <div>    resp = requests.get(</div>
          <div>        <span className="text-orange-300">f"https://warehouse.acme.internal/returns/{'{'}order_id{'}'}"</span>,</div>
          <div>        headers={'{'}...auth_headers{'}'}</div>
          <div>    )</div>
          <div>    <span className="text-purple-400">return</span> resp.json()</div>
          <div />
          <div className="text-gray-500"># Test it</div>
          <div>result = check_return(<span className="text-orange-300">"ORD-2026-7834"</span>)</div>
          <div><span className="text-blue-400">print</span>(result)</div>
        </div>

        {/* Output */}
        <div className="mt-3 bg-gray-100 rounded-lg p-3 font-mono text-xs text-gray-600">
          <div className="text-[10px] text-gray-400 mb-1">Output:</div>
          {'{ "order_id": "ORD-2026-7834", "return_status": "received", "warehouse": "SG-01", "received_at": "2026-04-02" }'}
        </div>

        {/* Promote buttons */}
        <div className="mt-3 flex gap-2">
          <button className="px-3 py-1.5 text-xs text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50">
            Convert to Tool →
          </button>
          <button className="px-3 py-1.5 text-xs text-violet-600 border border-violet-200 rounded-md hover:bg-violet-50">
            Convert to Skill →
          </button>
          <span className="text-[10px] text-gray-400 flex items-center ml-2">
            Prototype → harden → deploy the constrained version
          </span>
        </div>
      </div>
    </Cell>
  );
}

// ─── Main Notebook View ──────────────────────────────────────────────────

export function NotebookView() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-0)]" style={{ backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Home</Link>
          <div className="w-px h-5 bg-gray-200" />
          <span className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>
            📓 Notebook — Claims Processing Agent
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-green-100 text-green-700">v2.1</span>
          <div className="flex-1" />
          <Link to="/editor" className="text-xs text-[var(--color-accent)] hover:underline">
            Switch to Editor →
          </Link>
        </div>
      </header>

      {/* Cells */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <TriggerCell />
        <PlaybookCell />
        <ToolCell />
        <TestCell />
        <SkillCell />
        <ConnectorCell />
        <CodeCell />

        {/* Add cell button */}
        <div className="flex justify-center py-4">
          <button className="px-4 py-2 text-xs text-gray-400 border border-dashed border-gray-300 rounded-lg hover:text-gray-600 hover:border-gray-400 transition-colors">
            + Add cell
          </button>
        </div>
      </div>
    </div>
  );
}
