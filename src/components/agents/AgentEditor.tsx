/**
 * AgentEditor — Dedicated editor for @agent chip type.
 *
 * Maps to `Agent("name", "model").instruct(...).tool(...).guard(...).build()`
 * in adk-fluent. Provides model selection, instructions editing, linked
 * resource management (tools, guards, delegates), context strategy config,
 * A2A settings, and a test panel for ORA loop simulation.
 */

import { useState, useMemo, useCallback } from 'react';
import { EditorShell, SegmentedControl, CodePreview, TestPanel, ChipLinker } from '../editors';

// ─── Colors ──────────────────────────────────────────────────────────

const C = {
  accent: '#B77D16',
  bg: '#FBF8EE',
  text: '#92610A',
  border: '#F0DCA0',
  tint: '#F5EDDA',
} as const;

// ─── Model options ───────────────────────────────────────────────────

const MODEL_OPTIONS = [
  { value: 'gemini-2.5-pro', label: '2.5 Pro' },
  { value: 'gemini-2.5-flash', label: '2.5 Flash' },
  { value: 'gemini-2.0-flash', label: '2.0 Flash' },
  { value: 'gemini-2.0-flash-lite', label: '2.0 Lite' },
] as const;

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'user_only', label: 'User Only' },
  { value: 'relevant', label: 'Relevant' },
] as const;

const A2A_OPTIONS = [
  { value: 'local', label: 'Local' },
  { value: 'remote', label: 'Remote' },
] as const;

// ─── Mock data ───────────────────────────────────────────────────────

const INITIAL = {
  name: 'senior-adjuster',
  version: '1.3.0',
  description: 'Senior claims adjuster handling complex claims that exceed standard thresholds or require specialist review.',
  model: 'gemini-2.5-pro',
  instructions: `You are a senior claims adjuster at ACME Insurance. You handle complex claims that exceed standard thresholds or require specialist review.

When reviewing a claim:
1. Assess the claim details and policy coverage
2. Cross-reference with claims history for patterns
3. Apply regional compliance rules
4. Make an approval/denial recommendation with reasoning

Always be thorough but concise in your assessments.`,
  maxTurns: 15,
  outputKey: 'adjuster_decision',
  tools: ['tool-policy-lookup', 'tool-claims-history'],
  guards: ['guard-pii-redaction', 'guard-fraud-detection'],
  delegatesTo: ['agent-fraud-specialist'],
  outputSchema: 'schema-claims-response-v2',
  windowSize: 5,
  stateInjections: ['claim_details', 'policy_info'],
  filterMode: 'relevant' as string,
  summarize: true,
  a2aMode: 'local' as string,
  endpointUrl: '',
};

// ─── Styles ──────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  border: '1px solid var(--color-border, #E5E7EB)',
  borderRadius: 12,
  padding: 16,
  background: 'var(--color-bg-surface, #FFFFFF)',
};

const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'var(--color-text-tertiary, #9CA3AF)',
  fontFamily: 'var(--font-ui)',
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: '100%',
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--color-border, #E5E7EB)',
  background: 'var(--color-bg-primary, #F9FAFB)',
  color: 'var(--color-text-primary, #111827)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};

// ─── Section Header ──────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold mb-2" style={{ color: C.text, fontFamily: 'var(--font-ui)' }}>
      {children}
    </h3>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export function AgentEditor() {
  const [model, setModel] = useState(INITIAL.model);
  const [instructions, setInstructions] = useState(INITIAL.instructions);
  const [maxTurns, setMaxTurns] = useState(INITIAL.maxTurns);
  const [outputKey, setOutputKey] = useState(INITIAL.outputKey);
  const [tools, setTools] = useState(INITIAL.tools);
  const [guards, setGuards] = useState(INITIAL.guards);
  const [delegatesTo, setDelegatesTo] = useState(INITIAL.delegatesTo);
  const [outputSchema, setOutputSchema] = useState(INITIAL.outputSchema);
  const [windowSize, setWindowSize] = useState(INITIAL.windowSize);
  const [filterMode, setFilterMode] = useState(INITIAL.filterMode);
  const [summarize, setSummarize] = useState(INITIAL.summarize);
  const [a2aMode, setA2aMode] = useState(INITIAL.a2aMode);
  const [endpointUrl, setEndpointUrl] = useState(INITIAL.endpointUrl);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [testResult, setTestResult] = useState<unknown[] | null>(null);
  const [testing, setTesting] = useState(false);

  const toolNames = useMemo(() => tools.map(t => t.replace('tool-', '')).join(', '), [tools]);
  const guardExpr = useMemo(() => guards.map(g => `G.${g.replace('guard-', '').replace(/-/g, '_')}()`).join(' | '), [guards]);

  const expression = `Agent("${INITIAL.name}", "${model}").instruct("...").tool(${toolNames}).guard(${guardExpr}).build()`;
  const python = `from adk_fluent import Agent, G, C

agent = (
    Agent("${INITIAL.name}", "${model}")
    .instruct("""
${instructions.slice(0, 120)}...
    """)
    .tool(${toolNames})
    .guard(
        ${guardExpr}
    )
    .context(C.window(${windowSize})${summarize ? ' + C.summarize()' : ''})
    .build()
)`;

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1800));
    setTestResult([
      { iter: 1, observe: 'User submitted claim for $75,000 on policy POL-SG-001234', reason: 'Amount exceeds $50k threshold — specialist review needed', act: '@tool(policy-lookup) → 340ms', result: '{ policy_id: "POL-SG-001234", coverage: "$100k", riders: ["flood"] }' },
      { iter: 2, observe: 'Policy found with $100k coverage', reason: 'Claim within coverage. Check claims history for patterns.', act: '@tool(claims-history) → 280ms', result: '{ prior_claims: 2, last_claim: "2025-08-15", total_paid: "$12,400" }' },
      { iter: 3, observe: '2 prior claims, no fraud flags', reason: 'Apply compliance rules, generate recommendation', act: '@guard(pii-redaction) → 45ms ✓', result: 'APPROVE — claim within policy limits, clean history' },
    ]);
    setTesting(false);
  }, []);

  // ─── Left Panel ──────────────────────────────────────────────────

  const leftPanel = (
    <>
      {/* Identity */}
      <div style={card}>
        <SectionHeader>Agent Identity</SectionHeader>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-ui)' }}>
            {INITIAL.name}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: C.tint, color: C.accent }}>
            v{INITIAL.version}
          </span>
        </div>
        <div style={label}>Description</div>
        <textarea
          rows={2}
          defaultValue={INITIAL.description}
          style={{ ...input, resize: 'vertical', fontSize: 11 }}
        />
      </div>

      {/* Model Selector */}
      <div style={card}>
        <SectionHeader>Model</SectionHeader>
        <SegmentedControl
          options={MODEL_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
          value={model}
          onChange={setModel}
          accentColor={C.accent}
        />
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {model === 'gemini-2.5-pro' && 'Best reasoning. Use for complex decisions and multi-step workflows.'}
          {model === 'gemini-2.5-flash' && 'Fast reasoning. Good balance of speed and capability.'}
          {model === 'gemini-2.0-flash' && 'Fastest responses. Ideal for simple lookups and routing.'}
          {model === 'gemini-2.0-flash-lite' && 'Ultra-light. Minimal latency for classification tasks.'}
        </p>
      </div>

      {/* Instructions */}
      <div style={card}>
        <SectionHeader>Instructions (.instruct)</SectionHeader>
        <textarea
          rows={8}
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          style={{ ...input, resize: 'vertical', fontFamily: 'var(--font-mono, monospace)', fontSize: 11, lineHeight: 1.6 }}
        />
        <div className="text-right mt-1">
          <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>{instructions.length} chars</span>
        </div>
      </div>

      {/* Linked Resources */}
      <div style={card}>
        <SectionHeader>Linked Resources</SectionHeader>
        <div className="space-y-3">
          <ChipLinker filterType="tool" linkedIds={tools} onChange={setTools} label="Tools" placeholder="Link tools..." />
          <ChipLinker filterType="guard" linkedIds={guards} onChange={setGuards} label="Guards" placeholder="Link guards..." />
          <ChipLinker filterType="agent" linkedIds={delegatesTo} onChange={setDelegatesTo} label="Delegates To" placeholder="Link sub-agents..." />
          <ChipLinker filterType="schema" linkedIds={outputSchema ? [outputSchema] : []} onChange={ids => setOutputSchema(ids[0] || '')} multiple={false} label="Output Schema" placeholder="Link schema..." />
        </div>
      </div>

      {/* Context Strategy */}
      <div style={card}>
        <SectionHeader>Context Strategy (C namespace)</SectionHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div style={label}>Window Size</div>
            <input type="number" value={windowSize} onChange={e => setWindowSize(+e.target.value)} min={1} max={50} style={input} />
          </div>
          <div>
            <div style={label}>State Injections</div>
            <div className="flex flex-wrap gap-1">
              {INITIAL.stateInjections.map(s => (
                <span key={s} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: C.tint, color: C.text }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div style={label}>Filter Mode</div>
          <SegmentedControl options={FILTER_OPTIONS.map(o => ({ value: o.value, label: o.label }))} value={filterMode} onChange={setFilterMode} accentColor={C.accent} size="sm" />
        </div>
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" checked={summarize} onChange={e => setSummarize(e.target.checked)} className="rounded" />
          <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>Summarize history (C.summarize)</span>
        </label>
      </div>

      {/* Advanced (collapsible) */}
      <div style={card}>
        <button onClick={() => setAdvancedOpen(!advancedOpen)} className="flex items-center gap-2 w-full text-left">
          <svg width="8" height="8" viewBox="0 0 8 8" style={{ transform: advancedOpen ? 'rotate(90deg)' : '', transition: 'transform 150ms' }}>
            <path d="M2 1L6 4L2 7" stroke="currentColor" strokeWidth="1.2" fill="none" />
          </svg>
          <span className="text-[11px] font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Advanced</span>
        </button>
        {advancedOpen && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <div style={label}>Max Turns</div>
              <input type="number" value={maxTurns} onChange={e => setMaxTurns(+e.target.value)} min={1} style={input} />
            </div>
            <div>
              <div style={label}>Output Key</div>
              <input type="text" value={outputKey} onChange={e => setOutputKey(e.target.value)} style={input} />
            </div>
          </div>
        )}
      </div>
    </>
  );

  // ─── Right Panel ─────────────────────────────────────────────────

  const rightPanel = (
    <>
      {/* A2A Config */}
      <div style={card}>
        <SectionHeader>A2A Configuration</SectionHeader>
        <SegmentedControl options={A2A_OPTIONS.map(o => ({ value: o.value, label: o.label }))} value={a2aMode} onChange={setA2aMode} accentColor={C.accent} size="sm" />
        {a2aMode === 'remote' && (
          <div className="mt-3 space-y-2">
            <div>
              <div style={label}>Endpoint URL</div>
              <input type="text" value={endpointUrl} onChange={e => setEndpointUrl(e.target.value)} placeholder="https://agent.acme.com:8001" style={input} />
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 mt-3">
          <span className="w-2 h-2 rounded-full" style={{ background: '#10B981' }} />
          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{a2aMode === 'local' ? 'Running in-process' : 'Remote via A2A protocol'}</span>
        </div>
      </div>

      {/* Topology Preview */}
      <div style={card}>
        <SectionHeader>Agent Topology</SectionHeader>
        <div className="space-y-2">
          {tools.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: '#4F46E5' }} />
              <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Tools: {tools.map(t => t.replace('tool-', '')).join(', ')}</span>
            </div>
          )}
          {guards.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: '#E11D48' }} />
              <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Guards: {guards.map(g => g.replace('guard-', '')).join(', ')}</span>
            </div>
          )}
          {delegatesTo.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: C.accent }} />
              <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Delegates: {delegatesTo.map(d => d.replace('agent-', '')).join(', ')}</span>
            </div>
          )}
          {outputSchema && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: '#475569' }} />
              <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>Schema: {outputSchema.replace('schema-', '')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Code Preview */}
      <CodePreview expression={expression} python={python} dependencies={['adk-fluent>=0.5.0', 'google-cloud-aiplatform>=1.60']} accentColor={C.accent} />

      {/* Usage Stats */}
      <div style={card}>
        <SectionHeader>Usage</SectionHeader>
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
            <span>Referenced in</span><span className="font-semibold">4 playbooks</span>
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
            <span>Created by</span><span className="font-semibold">vamsi@acme.com</span>
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
            <span>Last invoked</span><span className="font-semibold">12 min ago</span>
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
            <span>Avg loop iterations</span><span className="font-semibold">2.8</span>
          </div>
        </div>
      </div>
    </>
  );

  // ─── Test Panel ──────────────────────────────────────────────────

  const testPanel = (
    <TestPanel
      placeholder="Enter a claims scenario to test this agent..."
      accentColor={C.accent}
      onRun={handleTest}
      renderResult={() => {
        if (testing) {
          return <div className="text-[11px] py-4 text-center" style={{ color: 'var(--color-text-tertiary)' }}>Running ORA loop...</div>;
        }
        if (!testResult) return null;
        return (
          <div className="space-y-2 mt-2">
            {(testResult as Array<{ iter: number; observe: string; reason: string; act: string; result: string }>).map(it => (
              <div key={it.iter} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
                <div className="px-3 py-1.5 flex items-center gap-2" style={{ background: C.tint }}>
                  <span className="text-[10px] font-bold" style={{ color: C.accent }}>Loop {it.iter}</span>
                </div>
                <div className="px-3 py-2 space-y-1.5" style={{ background: 'var(--color-bg-surface)' }}>
                  <div className="text-[10px]"><span className="font-semibold" style={{ color: '#2563EB' }}>Observe:</span> <span style={{ color: 'var(--color-text-secondary)' }}>{it.observe}</span></div>
                  <div className="text-[10px]"><span className="font-semibold" style={{ color: '#7C3AED' }}>Reason:</span> <span style={{ color: 'var(--color-text-secondary)' }}>{it.reason}</span></div>
                  <div className="text-[10px]"><span className="font-semibold" style={{ color: '#059669' }}>Act:</span> <span style={{ color: 'var(--color-text-secondary)' }}>{it.act}</span></div>
                  <div className="text-[10px]"><span className="font-semibold" style={{ color: C.accent }}>Result:</span> <span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{it.result}</span></div>
                </div>
              </div>
            ))}
            <div className="flex items-center gap-3 pt-1">
              <span className="text-[10px] font-semibold" style={{ color: '#059669' }}>COMPLETED</span>
              <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>3 iterations | 665ms total | 1,847 tokens</span>
            </div>
          </div>
        );
      }}
    />
  );

  return (
    <EditorShell
      chipType="agent"
      chipName={INITIAL.name}
      version={INITIAL.version}
      leftPanel={leftPanel}
      leftPanelLabel="Configuration"
      rightPanel={rightPanel}
      rightPanelLabel="Preview"
      testPanel={testPanel}
      onPublish={() => {}}
      onCreateNew={() => {}}
    />
  );
}
