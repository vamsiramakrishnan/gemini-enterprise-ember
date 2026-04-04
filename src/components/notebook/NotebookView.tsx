/**
 * NotebookView - Screen 2: Colab-style cell-based agent development view.
 *
 * A vertical notebook layout with distinct cell types, each with colored
 * left borders matching the chip color system. Cells include: Trigger,
 * Playbook, Tool, Test (with Loop Iteration Visualizer), Skill, Connector,
 * and Code Execution (the escape hatch).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Chip helper
// ---------------------------------------------------------------------------

type ChipKind =
  | 'doc' | 'tool' | 'agent' | 'guard' | 'data'
  | 'schema' | 'connector' | 'skill' | 'trigger';

const CHIP_BG: Record<ChipKind, string> = {
  doc: '#0D9488',
  tool: '#4F46E5',
  agent: '#D97706',
  guard: '#E11D48',
  data: '#059669',
  schema: '#475569',
  connector: '#2563EB',
  skill: '#7C3AED',
  trigger: '#EA580C',
};

function Chip({ kind, label }: { kind: ChipKind; label: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mx-0.5 whitespace-nowrap shadow-sm"
      style={{ background: CHIP_BG[kind], color: '#fff' }}
    >
      @{kind}({label})
    </span>
  );
}

// ---------------------------------------------------------------------------
// Cell wrapper
// ---------------------------------------------------------------------------

function Cell({
  borderColor,
  children,
  warningStripe,
}: {
  borderColor: string;
  children: React.ReactNode;
  warningStripe?: boolean;
}) {
  return (
    <div
      className="rounded-xl bg-white shadow-sm overflow-hidden transition-all hover:shadow-md"
      style={{
        borderLeft: warningStripe
          ? undefined
          : `4px solid ${borderColor}`,
        backgroundImage: warningStripe
          ? `repeating-linear-gradient(135deg, transparent, transparent 6px, ${borderColor}15 6px, ${borderColor}15 12px)`
          : undefined,
        borderLeftWidth: warningStripe ? undefined : 4,
      }}
    >
      {warningStripe && (
        <div
          className="h-1"
          style={{
            background: `repeating-linear-gradient(90deg, ${borderColor}, ${borderColor} 8px, transparent 8px, transparent 16px)`,
          }}
        />
      )}
      <div className={warningStripe ? 'border-l-4' : ''} style={warningStripe ? { borderColor } : {}}>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. Trigger Cell
// ---------------------------------------------------------------------------

const TRIGGERS = [
  { icon: '\u{1F4AC}', name: 'chat', desc: 'Real-time customer conversations via Gemini Enterprise web app', status: 'Active' as const },
  { icon: '\u{1F4E5}', name: 'inbox:claims-queue', desc: 'Async claims submitted via web portal, processed in priority order', status: 'Active' as const },
  { icon: '\u{1F517}', name: 'jira:issue-created', desc: 'New claim ticket created in Jira project CLAIMS', status: 'Active' as const },
  { icon: '\u{1F4C1}', name: 'drive:file-uploaded', desc: 'Supporting documents uploaded to /claims-inbox/', status: 'Active' as const },
  { icon: '\u23F0', name: 'schedule:weekday-9am', desc: 'Daily at 9 AM, process overnight claims backlog', status: 'Paused' as const },
];

function TriggerCell() {
  return (
    <Cell borderColor="#EA580C">
      <div className="px-5 py-4">
        <h3
          className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          <span className="text-base">&#x26A1;</span> Triggers
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
            5 configured
          </span>
        </h3>
        <p className="text-xs text-gray-500 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
          Entry points of the agent loop. Each trigger starts an Observe &rarr; Reason &rarr; Act cycle.
        </p>
        <div className="space-y-2">
          {TRIGGERS.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 hover:bg-orange-50/40 transition-colors group"
            >
              <span className="text-lg flex-shrink-0">{t.icon}</span>
              <Chip kind="trigger" label={t.name} />
              <span
                className="text-xs text-gray-600 flex-1 truncate"
                style={{ fontFamily: 'var(--font-body)' }}
              >
                {t.desc}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  t.status === 'Active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {t.status === 'Active' ? '\u25CF' : '\u25CB'} {t.status}
              </span>
              <button className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-100">
                Test trigger
              </button>
            </div>
          ))}
        </div>
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// 2. Playbook Cell
// ---------------------------------------------------------------------------

function PlaybookCell() {
  return (
    <Cell borderColor="#0D9488">
      <div className="px-5 py-4">
        <h3
          className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          <span className="text-base">&#x1F4C4;</span> Playbook &mdash; Claims Processing Agent
        </h3>
        <div className="playbook-body text-sm leading-relaxed text-gray-700 space-y-3" style={{ fontFamily: 'var(--font-body)' }}>
          <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '0 0 0.5rem' }}>
            Role
          </h2>
          <p>
            You are an insurance claims processing assistant for ACME Insurance, serving customers across APAC markets.
          </p>

          <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '1rem 0 0.5rem' }}>
            Skills
          </h2>
          <p>
            This agent uses <Chip kind="skill" label="customer-empathy" /> for tone and de-escalation patterns, and{' '}
            <Chip kind="skill" label="apac-compliance" /> for regional regulatory awareness.
          </p>

          <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '1rem 0 0.5rem' }}>
            Knowledge Sources
          </h2>
          <p>
            Use <Chip kind="doc" label="claims-policy-2024" /> as the primary policy reference.
            For regional variations, consult <Chip kind="doc" label="apac-regulatory-matrix" />.
          </p>

          <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '1rem 0 0.5rem' }}>
            Connected Systems
          </h2>
          <ul className="list-disc list-inside space-y-1">
            <li><Chip kind="connector" label="salesforce" /> for customer account and policy data</li>
            <li><Chip kind="connector" label="jira" /> to create and track claims tickets</li>
            <li><Chip kind="connector" label="google-drive" /> for supporting document retrieval</li>
            <li><Chip kind="connector" label="slack" /> to notify the claims team channel</li>
          </ul>

          <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '1rem 0 0.5rem' }}>
            Process
          </h2>
          <p>When a customer submits a claim:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Greet the customer and collect their policy number</li>
            <li>Use <Chip kind="tool" label="policy-lookup" /> to retrieve their policy details</li>
            <li>Search <Chip kind="connector" label="salesforce" /> for the customer&apos;s account history</li>
            <li>Use <Chip kind="tool" label="claims-history" /> to check for prior claims in the last 12 months</li>
            <li>Validate the claim against <Chip kind="doc" label="claims-policy-2024" /> coverage rules</li>
          </ol>

          <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: '1rem 0 0.5rem' }}>
            Escalation Rules
          </h3>
          <ul className="list-disc list-inside space-y-1">
            <li>If claim amount exceeds $50,000, route to <Chip kind="agent" label="senior-adjuster" /></li>
            <li>If the policy is flagged, apply <Chip kind="guard" label="fraud-detection" /> before proceeding</li>
            <li>For claims involving <Chip kind="data" label="high-risk-categories" />, require manager approval</li>
            <li>Create a tracking ticket in <Chip kind="connector" label="jira" /> for all escalations</li>
            <li>Notify <Chip kind="connector" label="slack" /> #claims-escalations channel</li>
          </ul>

          <h3 style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: '1rem 0 0.5rem' }}>
            Response Format
          </h3>
          <p>
            All responses must conform to <Chip kind="schema" label="claims-response-v2" /> and include the claim reference number and estimated processing time.
          </p>

          <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: '1rem', fontWeight: 600, color: '#111827', margin: '1rem 0 0.5rem' }}>
            Compliance
          </h2>
          <p>
            All interactions are subject to <Chip kind="guard" label="pii-redaction" /> and{' '}
            <Chip kind="guard" label="apac-compliance-rules" />. Never disclose internal policy thresholds.
          </p>
        </div>
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// 3. Tool Cell
// ---------------------------------------------------------------------------

const TOOL_PARAMS = [
  { name: 'policy_id', type: 'string', required: true, desc: "The customer's policy ID", validation: 'regex: POL-[A-Z]{2}-[0-9]{6}', example: 'POL-SG-001234' },
  { name: 'include_riders', type: 'boolean', required: false, desc: 'Include policy riders/addons', validation: '\u2014', example: 'true' },
  { name: 'effective_date', type: 'date', required: false, desc: 'Check policy as of this date', validation: 'must be \u2264 today', example: '2024-01-15' },
  { name: 'format', type: 'enum', required: false, desc: 'Response format', validation: 'oneOf: summary, full, minimal', example: 'summary' },
];

function ToolCell() {
  return (
    <Cell borderColor="#4F46E5">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-semibold text-gray-900 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <span className="text-base">&#x1F527;</span> Tool: policy-lookup
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              v2.3
            </span>
          </h3>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-green-700 font-medium">Healthy</span>
          </div>
        </div>

        {/* Parameter table */}
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Parameter</th>
                <th className="text-left py-2 pr-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Type</th>
                <th className="text-left py-2 pr-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Required</th>
                <th className="text-left py-2 pr-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Description</th>
                <th className="text-left py-2 pr-3 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Validation</th>
                <th className="text-left py-2 font-semibold text-gray-500 uppercase tracking-wider text-[10px]">Example</th>
              </tr>
            </thead>
            <tbody>
              {TOOL_PARAMS.map((p) => (
                <tr key={p.name} className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors">
                  <td className="py-2 pr-3 font-mono text-indigo-700 font-medium">{p.name}</td>
                  <td className="py-2 pr-3 text-gray-600">{p.type}</td>
                  <td className="py-2 pr-3">
                    {p.required ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">required</span>
                    ) : (
                      <span className="text-gray-400">optional</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-gray-600">{p.desc}</td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-gray-500">{p.validation}</td>
                  <td className="py-2 font-mono text-[10px] text-gray-500">{p.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Endpoint */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Endpoint</span>
          <code className="flex-1 text-[11px] px-3 py-1.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200 font-mono">
            https://us-central1-acme-agents.cloudfunctions.net/policy-lookup
          </code>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors">
            Test
          </button>
          <button className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors">
            Deploy to Cloud Run
          </button>
        </div>
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// 4. Test Cell (Loop Iteration Visualizer)
// ---------------------------------------------------------------------------

interface LoopIteration {
  id: number;
  observe: string;
  reason: string;
  act: { kind: ChipKind; label: string };
  result: string;
  timing: string;
}

const ITERATIONS: LoopIteration[] = [
  {
    id: 1,
    observe: 'Customer: "I need to file a claim for water damage. Policy POL-SG-001234"',
    reason: 'Matched to Process step 1-2: Greet customer, retrieve policy details using policy-lookup tool.',
    act: { kind: 'tool', label: 'policy-lookup' },
    result: '{ policy_id: "POL-SG-001234", coverage: "home-comprehensive", status: "active", holder: "Wei Chen" }',
    timing: '340ms',
  },
  {
    id: 2,
    observe: 'Policy found and active. Checking claim history for risk assessment.',
    reason: 'Process step 4: Check for prior claims in the last 12 months using claims-history tool.',
    act: { kind: 'tool', label: 'claims-history' },
    result: '{ prior_claims: 2, last_claim: "2025-08-14", total_claimed: "$12,400", risk_score: "low" }',
    timing: '280ms',
  },
  {
    id: 3,
    observe: 'History clear (low risk). Validating water damage claim against policy coverage rules.',
    reason: 'Process step 5 + Compliance: Validate against claims-policy-2024, apply pii-redaction and apac-compliance-rules guards.',
    act: { kind: 'doc', label: 'claims-policy-2024' },
    result: 'Final Response: "Your claim has been registered as CLM-2026-04892. Water damage is covered under your home-comprehensive plan. Estimated processing time: 3-5 business days. A claims adjuster will contact you within 24 hours."',
    timing: '520ms',
  },
];

const GUARD_CHECKS = [
  { label: 'pii-redaction', passed: true, timing: '45ms' },
  { label: 'apac-compliance-rules', passed: true, timing: '52ms' },
];

function TestCell() {
  const [expandedIterations, setExpandedIterations] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });

  const toggleIteration = (id: number) => {
    setExpandedIterations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Cell borderColor="#16A34A">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-semibold text-gray-900 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <span className="text-base">&#x25B6;</span> Test Run
          </h3>
          <button className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
            <span>&#x25B6;</span> Run
          </button>
        </div>

        {/* Iterations */}
        <div className="space-y-2">
          {ITERATIONS.map((iter, idx) => (
            <div key={iter.id}>
              {/* Iteration card */}
              <div className="rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden">
                {/* Iteration header */}
                <button
                  onClick={() => toggleIteration(iter.id)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-100 transition-colors"
                >
                  <span
                    className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0"
                  >
                    {iter.id}
                  </span>
                  <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'var(--font-ui)' }}>
                    Loop {iter.id}
                  </span>
                  <span className="text-[10px] text-gray-400 flex-1 truncate">
                    {iter.observe.slice(0, 60)}...
                  </span>
                  <Chip kind={iter.act.kind} label={iter.act.label} />
                  <span className="text-[10px] font-mono text-gray-400">{iter.timing}</span>
                  <span className="text-gray-400 text-xs transition-transform" style={{ transform: expandedIterations[iter.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    &#x25BC;
                  </span>
                </button>

                {/* Expanded content */}
                {expandedIterations[iter.id] && (
                  <div className="px-4 pb-3 pt-1 border-t border-gray-200 space-y-2.5">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-0.5">Observe</div>
                      <p className="text-xs text-gray-700" style={{ fontFamily: 'var(--font-body)' }}>{iter.observe}</p>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-0.5">Reason</div>
                      <p className="text-xs text-gray-700" style={{ fontFamily: 'var(--font-body)' }}>{iter.reason}</p>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 mb-0.5">Act</div>
                      <p className="text-xs text-gray-700">
                        Invoke <Chip kind={iter.act.kind} label={iter.act.label} />
                      </p>
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-green-600 mb-0.5">
                        Result <span className="font-mono text-gray-400 normal-case">({iter.timing})</span>
                      </div>
                      <pre className="text-[11px] text-gray-700 bg-white rounded-md px-3 py-2 border border-gray-200 overflow-x-auto" style={{ fontFamily: 'var(--font-mono)' }}>
                        {iter.result}
                      </pre>
                    </div>
                    {iter.id < 3 && (
                      <div className="text-[10px] text-gray-500 italic flex items-center gap-1">
                        &#x21BB; Decision: <span className="font-semibold text-blue-600">Loop again</span> &mdash; need more data
                      </div>
                    )}
                    {iter.id === 3 && (
                      <div className="text-[10px] text-gray-500 italic flex items-center gap-1">
                        &#x2713; Decision: <span className="font-semibold text-green-600">Respond</span> &mdash; sufficient information gathered
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Guard checks between iterations */}
              {idx < ITERATIONS.length - 1 && (
                <div className="flex items-center gap-2 px-4 py-1.5">
                  {GUARD_CHECKS.map((g) => (
                    <span
                      key={g.label}
                      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200"
                    >
                      &#x2713; <Chip kind="guard" label={g.label} /> <span className="font-mono text-gray-400">{g.timing}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom stats */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200">
          <span className="text-[10px] font-medium text-gray-500">
            <span className="font-semibold text-gray-700">3</span> iterations
          </span>
          <span className="text-[10px] font-medium text-gray-500">
            <span className="font-semibold text-gray-700">1.2s</span> total
          </span>
          <span className="text-[10px] font-medium text-gray-500">
            <span className="font-semibold text-gray-700">847</span> tokens
          </span>
          <span className="text-[10px] font-medium text-green-600">&#x2713; All guards passed</span>
        </div>
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// 5. Skill Cell
// ---------------------------------------------------------------------------

function SkillCell() {
  return (
    <Cell borderColor="#7C3AED">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-semibold text-gray-900 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <span className="text-base">&#x2728;</span> Skill: apac-compliance
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
              Workspace
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              On-Demand
            </span>
          </h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">v1.2.0</span>
        </div>

        {/* Frontmatter */}
        <div className="rounded-lg bg-violet-50/50 border border-violet-200 px-4 py-3 mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 mb-2">Frontmatter</div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold text-gray-500 w-16 flex-shrink-0">name:</span>
              <span className="text-xs text-gray-700" style={{ fontFamily: 'var(--font-mono)' }}>apac-compliance</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold text-gray-500 w-16 flex-shrink-0">description:</span>
              <span className="text-xs text-gray-700" style={{ fontFamily: 'var(--font-body)' }}>
                Use when handling regulatory compliance in APAC markets. Covers MAS, APRA, RBI, OJK, and FSC regulations.
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Instructions</div>
          <div className="text-xs text-gray-700 space-y-2" style={{ fontFamily: 'var(--font-body)' }}>
            <p>
              <strong>Regional Rules:</strong> When handling queries involving Singapore customers, always reference{' '}
              <Chip kind="doc" label="mas-guidelines-2024" /> and apply <Chip kind="guard" label="pdpa-compliance" />.
            </p>
            <p>
              For Australian customers, consult <Chip kind="doc" label="apra-prudential-standards" /> and ensure responses conform to{' '}
              <Chip kind="schema" label="apra-disclosure-format" />.
            </p>
            <p>
              <strong>Connected Data:</strong> Search <Chip kind="connector" label="salesforce" /> for customer jurisdiction data.
              Verify regulatory status via <Chip kind="tool" label="regtech-api" />.
            </p>
            <p>
              <strong>Escalation:</strong> If a query involves cross-border transactions, route to{' '}
              <Chip kind="agent" label="compliance-officer" /> with full context attached.
            </p>
          </div>
        </div>

        {/* Resources */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Resources</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
              <div className="text-[10px] font-semibold text-gray-600 mb-1">scripts/</div>
              <div className="space-y-0.5">
                <div className="text-[10px] text-gray-600 flex items-center gap-1">
                  <span className="text-amber-500">&#x1F40D;</span> validate_kyc.py
                </div>
                <div className="text-[10px] text-gray-600 flex items-center gap-1">
                  <span className="text-blue-500">&#x1F1F9;&#x1F1F8;</span> format_disclosure.ts
                </div>
              </div>
            </div>
            <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
              <div className="text-[10px] font-semibold text-gray-600 mb-1">references/</div>
              <div className="space-y-0.5">
                <div className="text-[10px] text-gray-600 flex items-center gap-1">
                  <span className="text-red-400">&#x1F4D5;</span> mas-guidelines-2024.pdf
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors">
            Test Activation
          </button>
          <button className="text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg transition-colors">
            Publish to Registry
          </button>
        </div>
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// 6. Connector Cell
// ---------------------------------------------------------------------------

const JIRA_ENTITIES = [
  { name: 'Issues', enabled: true },
  { name: 'Comments', enabled: true },
  { name: 'Worklogs', enabled: true },
  { name: 'Attachments', enabled: true },
];

const JIRA_ACTIONS = ['Search Issues', 'Create Issue', 'Add Comment', 'Update Issue'];

function ConnectorCell() {
  return (
    <Cell borderColor="#2563EB">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-semibold text-gray-900 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <span className="text-base">&#x1F517;</span> Connector: Jira Cloud
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              &#x25CF; Active
            </span>
          </h3>
          <span className="text-[10px] text-gray-400">Last sync: 12 min ago</span>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Entities */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Entities</div>
            <div className="space-y-1">
              {JIRA_ENTITIES.map((e) => (
                <div key={e.name} className="flex items-center gap-2 text-xs">
                  <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                    e.enabled ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}>
                    {e.enabled ? '\u2713' : ''}
                  </span>
                  <span className="text-gray-700">{e.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2">Actions</div>
            <div className="space-y-1">
              {JIRA_ACTIONS.map((a) => (
                <div key={a} className="text-xs text-gray-700 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  {a}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Auth */}
        <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-md bg-gray-50 border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-gray-500">Auth:</span>
            <span className="text-xs text-gray-700">Connected as <span className="font-mono text-blue-700">svc-jira@acme.atlassian.net</span></span>
          </div>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">OAuth</span>
        </div>

        {/* Link */}
        <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
          Open in Console &rarr;
        </a>
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// 7. Code Execution Cell (Escape Hatch)
// ---------------------------------------------------------------------------

const SAMPLE_CODE = `import requests
from google.auth import default

# Prototype: Check warehouse return status
credentials, project = default()

def check_return_status(tracking_id: str) -> dict:
    """Check if an item has been returned to warehouse."""
    resp = requests.get(
        f"https://warehouse-api.acme.internal/returns/{tracking_id}",
        headers={"Authorization": f"Bearer {credentials.token}"}
    )
    data = resp.json()
    return {
        "tracking_id": tracking_id,
        "returned": data["status"] == "received",
        "received_date": data.get("received_date"),
        "condition": data.get("condition_grade", "unknown"),
    }

# Test
result = check_return_status("TRK-2026-00471")
print(result)`;

const SAMPLE_OUTPUT = `{
  "tracking_id": "TRK-2026-00471",
  "returned": true,
  "received_date": "2026-03-28",
  "condition": "grade-A"
}`;

function CodeExecutionCell() {
  return (
    <Cell borderColor="#DC2626" warningStripe>
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-sm font-semibold text-gray-900 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <span className="text-base">&#x26A0;&#xFE0F;</span> Unrestricted Code Execution
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
              Dev Only
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
              Not available in production
            </span>
          </h3>
        </div>

        <p className="text-[10px] text-gray-500 mb-3 italic" style={{ fontFamily: 'var(--font-body)' }}>
          The omnipotent harness: prototype any capability before hardening it into a governed @tool or @skill.
        </p>

        {/* Code editor area */}
        <div className="rounded-lg overflow-hidden border border-gray-300 mb-3">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 text-gray-300">
            <span className="text-[10px] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Python 3.12
            </span>
            <span className="text-[10px] text-gray-500">prototype_return_check.py</span>
          </div>
          <pre
            className="text-[11px] leading-relaxed px-4 py-3 bg-gray-900 text-gray-300 overflow-x-auto"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {SAMPLE_CODE}
          </pre>
        </div>

        {/* Output */}
        <div className="rounded-lg overflow-hidden border border-gray-200 mb-4">
          <div className="flex items-center justify-between px-3 py-1 bg-gray-100">
            <span className="text-[10px] font-semibold text-gray-500">Output</span>
            <span className="text-[10px] text-gray-400 font-mono">142ms</span>
          </div>
          <pre
            className="text-[11px] leading-relaxed px-4 py-2.5 bg-white text-green-700 overflow-x-auto"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {SAMPLE_OUTPUT}
          </pre>
        </div>

        {/* Promotion actions */}
        <div className="flex items-center gap-2">
          <button className="text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <span>&#x1F527;</span> Convert to Tool
          </button>
          <button className="text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <span>&#x2728;</span> Convert to Skill
          </button>
          <span className="text-[10px] text-gray-400 ml-2">
            Prototype &rarr; Harden &rarr; Deploy governed
          </span>
        </div>
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// Main NotebookView export
// ---------------------------------------------------------------------------

export function NotebookView() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: '#FAFAF9',
        backgroundImage: 'radial-gradient(circle, #D1D5DB 0.5px, transparent 0.5px)',
        backgroundSize: '20px 20px',
      }}
    >
      {/* Top bar */}
      <header className="border-b border-[var(--color-border)] bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="text-xs text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
            >
              &larr; Home
            </Link>
            <span className="text-gray-300">|</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-green-600 flex items-center justify-center text-white text-[10px] font-bold">
                N
              </div>
              <div>
                <h1 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>
                  Claims Processing Agent
                </h1>
                <span className="text-[10px] text-gray-500">Notebook View &mdash; 7 cells</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              &#x25CF; v2.1 Production
            </span>
            <Link
              to="/editor"
              className="text-xs font-medium text-[var(--color-accent)] hover:underline"
            >
              Open in Editor
            </Link>
          </div>
        </div>
      </header>

      {/* Notebook cells */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
        <TriggerCell />
        <PlaybookCell />
        <ToolCell />
        <TestCell />
        <SkillCell />
        <ConnectorCell />
        <CodeExecutionCell />

        {/* Add cell button */}
        <div className="flex justify-center py-4">
          <button className="text-xs font-medium text-gray-500 bg-white border border-dashed border-gray-300 hover:border-gray-400 hover:text-gray-700 px-6 py-2 rounded-lg transition-all flex items-center gap-1.5">
            <span className="text-base">+</span> Add Cell
          </button>
        </div>
      </div>
    </div>
  );
}
