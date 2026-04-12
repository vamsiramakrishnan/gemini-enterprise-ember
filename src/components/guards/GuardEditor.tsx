/**
 * GuardEditor — Dedicated editor for @guard chip type.
 *
 * Maps to `G.pii("redact") | G.toxicity(0.8) | G.budget(5000)` etc.
 * in adk-fluent. Provides guard kind selection, phase config, kind-specific
 * parameter editing, guard chain composition, and test panel for validation.
 */

import { useState, useMemo, useCallback } from 'react';
import { EditorShell, SegmentedControl, CodePreview, TestPanel, ChipLinker } from '../editors';
import { GUARD_CONFIG, GUARD_KINDS } from '../../config/guardConfig';
import type { GuardKind, GuardPhase } from '../../parser/types';

// ─── Colors ──────────────────────────────────────────────────────────

const C = {
  accent: '#E11D48',
  bg: '#FEF2F2',
  text: '#BE123C',
  border: '#F9C8CC',
  tint: '#FDE4E7',
} as const;

// ─── Options ─────────────────────────────────────────────────────────

const PHASE_OPTIONS = [
  { value: 'pre_agent' as GuardPhase, label: 'Pre-Agent' },
  { value: 'pre_model' as GuardPhase, label: 'Pre-Model' },
  { value: 'post_model' as GuardPhase, label: 'Post-Model' },
  { value: 'context' as GuardPhase, label: 'Context' },
  { value: 'middleware' as GuardPhase, label: 'Middleware' },
];

const PII_ACTION_OPTIONS = [
  { value: 'redact', label: 'Redact' },
  { value: 'block', label: 'Block' },
  { value: 'flag', label: 'Flag' },
];

const PII_DETECTOR_OPTIONS = [
  { value: 'regex', label: 'Regex' },
  { value: 'cloud-dlp', label: 'Cloud DLP' },
];

const TOXICITY_JUDGE_OPTIONS = [
  { value: 'llm', label: 'LLM Judge' },
  { value: 'rule-based', label: 'Rule-based' },
];

// ─── Mock data ───────────────────────────────────────────────────────

interface ChainItem { kind: GuardKind; label: string }

const INITIAL_CHAIN: ChainItem[] = [
  { kind: 'pii', label: 'PII Redaction' },
  { kind: 'toxicity', label: 'Toxicity Check' },
  { kind: 'budget', label: 'Token Budget' },
];

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

const inputStyle: React.CSSProperties = {
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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold mb-2" style={{ color: C.text, fontFamily: 'var(--font-ui)' }}>
      {children}
    </h3>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export function GuardEditor() {
  const [guardKind, setGuardKind] = useState<GuardKind>('pii');
  const [phase, setPhase] = useState<GuardPhase>('post_model');
  // PII
  const [piiAction, setPiiAction] = useState('redact');
  const [piiDetector, setPiiDetector] = useState('cloud-dlp');
  const [piiProjectId, setPiiProjectId] = useState('acme-insurance-prod');
  // Toxicity
  const [toxThreshold, setToxThreshold] = useState(0.8);
  const [toxJudge, setToxJudge] = useState('llm');
  // Budget
  const [budgetMax, setBudgetMax] = useState(5000);
  const [budgetAlert, setBudgetAlert] = useState(4000);
  // Length
  const [lengthMin, setLengthMin] = useState(10);
  const [lengthMax, setLengthMax] = useState(500);
  // Topic
  const [denyTopics, setDenyTopics] = useState('politics, religion, gambling');
  // Grounded
  const [groundedSources, setGroundedSources] = useState(['doc-claims-policy-2024']);
  const [groundedConfidence, setGroundedConfidence] = useState(0.85);
  // Schema refs
  const [schemaRef, setSchemaRef] = useState(['schema-claims-response-v2']);
  // Chain
  const [chain, setChain] = useState<ChainItem[]>(INITIAL_CHAIN);
  // Test
  const [testResult, setTestResult] = useState<unknown[] | null>(null);
  const [testing, setTesting] = useState(false);

  const guardExpression = useMemo(() => {
    return chain.map(c => {
      const cfg = GUARD_CONFIG[c.kind];
      return cfg.adkExpression;
    }).join(' | ');
  }, [chain]);

  const guardPython = useMemo(() => {
    const lines = chain.map(c => {
      if (c.kind === 'pii') return `    G.pii("${piiAction}", detector=G.dlp("${piiProjectId}"))`;
      if (c.kind === 'toxicity') return `    G.toxicity(${toxThreshold}, judge=G.llm_judge())`;
      if (c.kind === 'budget') return `    G.budget(${budgetMax})`;
      if (c.kind === 'length') return `    G.length(min=${lengthMin}, max=${lengthMax})`;
      if (c.kind === 'topic') return `    G.topic(deny=${JSON.stringify(denyTopics.split(', '))})`;
      return `    ${GUARD_CONFIG[c.kind].adkExpression}`;
    });
    return `from adk_fluent import G\n\nguard = (\n${lines.join('\n    | ')}\n)\n\nagent.guard(guard)`;
  }, [chain, piiAction, piiProjectId, toxThreshold, budgetMax, lengthMin, lengthMax, denyTopics]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1400));
    setTestResult([
      { guard: 'PII Redaction', status: 'pass', detail: 'Redacted 2 entities: email, phone number', time: '45ms' },
      { guard: 'Toxicity Check', status: 'pass', detail: 'Score: 0.12 (threshold: 0.8)', time: '120ms' },
      { guard: 'Token Budget', status: 'pass', detail: '1,234 / 5,000 tokens used', time: '2ms' },
    ]);
    setTesting(false);
  }, []);

  const removeFromChain = (idx: number) => setChain(prev => prev.filter((_, i) => i !== idx));
  const addToChain = () => setChain(prev => [...prev, { kind: guardKind, label: GUARD_CONFIG[guardKind].label }]);

  // ─── Kind-specific config ────────────────────────────────────────

  function renderKindConfig() {
    switch (guardKind) {
      case 'pii':
        return (
          <div className="space-y-3">
            <div>
              <div style={label}>Action</div>
              <SegmentedControl options={PII_ACTION_OPTIONS} value={piiAction} onChange={setPiiAction} accentColor={C.accent} size="sm" />
            </div>
            <div>
              <div style={label}>Detector</div>
              <SegmentedControl options={PII_DETECTOR_OPTIONS} value={piiDetector} onChange={setPiiDetector} accentColor={C.accent} size="sm" />
            </div>
            {piiDetector === 'cloud-dlp' && (
              <div>
                <div style={label}>Project ID</div>
                <input type="text" value={piiProjectId} onChange={e => setPiiProjectId(e.target.value)} style={inputStyle} />
              </div>
            )}
          </div>
        );
      case 'toxicity':
        return (
          <div className="space-y-3">
            <div>
              <div style={label}>Threshold (0–1): {toxThreshold}</div>
              <input type="range" min={0} max={1} step={0.05} value={toxThreshold} onChange={e => setToxThreshold(+e.target.value)} className="w-full" style={{ accentColor: C.accent }} />
            </div>
            <div>
              <div style={label}>Judge Type</div>
              <SegmentedControl options={TOXICITY_JUDGE_OPTIONS} value={toxJudge} onChange={setToxJudge} accentColor={C.accent} size="sm" />
            </div>
          </div>
        );
      case 'budget':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div style={label}>Max Tokens</div>
              <input type="number" value={budgetMax} onChange={e => setBudgetMax(+e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={label}>Alert Threshold</div>
              <input type="number" value={budgetAlert} onChange={e => setBudgetAlert(+e.target.value)} style={inputStyle} />
            </div>
          </div>
        );
      case 'length':
        return (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div style={label}>Min Characters</div>
              <input type="number" value={lengthMin} onChange={e => setLengthMin(+e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={label}>Max Characters</div>
              <input type="number" value={lengthMax} onChange={e => setLengthMax(+e.target.value)} style={inputStyle} />
            </div>
          </div>
        );
      case 'topic':
        return (
          <div>
            <div style={label}>Deny List (comma-separated)</div>
            <input type="text" value={denyTopics} onChange={e => setDenyTopics(e.target.value)} style={inputStyle} />
            <div className="flex flex-wrap gap-1 mt-2">
              {denyTopics.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                <span key={t} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: C.tint, color: C.text }}>{t}</span>
              ))}
            </div>
          </div>
        );
      case 'grounded':
        return (
          <div className="space-y-3">
            <ChipLinker filterType="doc" linkedIds={groundedSources} onChange={setGroundedSources} label="Source Documents" />
            <div>
              <div style={label}>Confidence Threshold: {groundedConfidence}</div>
              <input type="range" min={0} max={1} step={0.05} value={groundedConfidence} onChange={e => setGroundedConfidence(+e.target.value)} className="w-full" style={{ accentColor: C.accent }} />
            </div>
          </div>
        );
      case 'output':
      case 'input':
        return (
          <ChipLinker filterType="schema" linkedIds={schemaRef} onChange={setSchemaRef} multiple={false} label="Schema Reference" />
        );
      case 'json':
        return (
          <p className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>
            Validates that the agent output is well-formed JSON. No additional configuration needed.
          </p>
        );
      default: {
        const cfg = GUARD_CONFIG[guardKind];
        return (
          <div>
            <p className="text-[11px] mb-2" style={{ color: 'var(--color-text-secondary)' }}>{cfg.description}</p>
            {cfg.thresholdField && (
              <div>
                <div style={label}>{cfg.thresholdField.label}</div>
                <input type="number" placeholder={cfg.thresholdField.placeholder} step={cfg.thresholdField.step} style={inputStyle} />
              </div>
            )}
          </div>
        );
      }
    }
  }

  // ─── Left Panel ──────────────────────────────────────────────────

  const leftPanel = (
    <>
      {/* Identity */}
      <div style={card}>
        <SectionHeader>Guard Identity</SectionHeader>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-ui)' }}>pii-redaction</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: C.tint, color: C.accent }}>v2.0.0</span>
        </div>
        <div style={label}>Description</div>
        <textarea rows={2} defaultValue="Detect and redact personally identifiable information using Cloud DLP before responses are returned." style={{ ...inputStyle, resize: 'vertical', fontSize: 11 }} />
      </div>

      {/* Kind Selector */}
      <div style={card}>
        <SectionHeader>Guard Kind</SectionHeader>
        <select
          value={guardKind}
          onChange={e => {
            const k = e.target.value as GuardKind;
            setGuardKind(k);
            setPhase(GUARD_CONFIG[k].defaultPhase);
          }}
          style={{ ...inputStyle, cursor: 'pointer' }}
        >
          {GUARD_KINDS.map(k => (
            <option key={k} value={k}>
              {GUARD_CONFIG[k].label} ({GUARD_CONFIG[k].adkExpression.split('(')[0]})
            </option>
          ))}
        </select>
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {GUARD_CONFIG[guardKind].description}
        </p>
      </div>

      {/* Phase */}
      <div style={card}>
        <SectionHeader>Phase</SectionHeader>
        <SegmentedControl options={PHASE_OPTIONS} value={phase} onChange={setPhase} accentColor={C.accent} size="sm" />
      </div>

      {/* Kind-specific config */}
      <div style={card}>
        <SectionHeader>{GUARD_CONFIG[guardKind].label} Configuration</SectionHeader>
        {renderKindConfig()}
      </div>

      {/* Guard Chain */}
      <div style={card}>
        <SectionHeader>Guard Chain</SectionHeader>
        <div className="flex flex-wrap items-center gap-1.5">
          {chain.map((c, i) => (
            <div key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-[11px] font-bold" style={{ color: C.accent }}>|</span>}
              <span className="text-[10px] font-medium px-2 py-1 rounded-lg flex items-center gap-1" style={{ background: C.tint, color: C.text, border: `1px solid ${C.border}` }}>
                {GUARD_CONFIG[c.kind].adkExpression.split('(')[0]}
                <button onClick={() => removeFromChain(i)} className="ml-1 opacity-50 hover:opacity-100" style={{ fontSize: 10 }}>x</button>
              </span>
            </div>
          ))}
        </div>
        <button onClick={addToChain} className="mt-2 text-[10px] font-medium px-2 py-1 rounded-lg" style={{ background: C.tint, color: C.accent, border: `1px solid ${C.border}` }}>
          + Add current guard to chain
        </button>
      </div>
    </>
  );

  // ─── Right Panel ─────────────────────────────────────────────────

  const rightPanel = (
    <>
      {/* Expression Preview */}
      <div style={card}>
        <SectionHeader>Guard Expression</SectionHeader>
        <pre className="text-[10px] p-3 rounded-lg whitespace-pre-wrap" style={{ background: C.tint, color: C.text, fontFamily: 'var(--font-mono, monospace)', lineHeight: 1.6 }}>
          {guardExpression}
        </pre>
      </div>

      {/* Code Preview */}
      <CodePreview expression={guardExpression} python={guardPython} dependencies={['adk-fluent>=0.5.0', 'google-cloud-dlp>=3.0']} accentColor={C.accent} />

      {/* Usage Stats */}
      <div style={card}>
        <SectionHeader>Usage</SectionHeader>
        <div className="space-y-1.5">
          {[
            ['Applied to', '8 agents'],
            ['Last triggered', '1 hour ago'],
            ['Block rate', '3.2%'],
            ['Avg latency', '45ms'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span>{k}</span><span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // ─── Test Panel ──────────────────────────────────────────────────

  const testPanel = (
    <TestPanel
      placeholder="Enter sample text to test guard chain..."
      accentColor={C.accent}
      onRun={handleTest}
      renderResult={() => {
        if (testing) return <div className="text-[11px] py-4 text-center" style={{ color: 'var(--color-text-tertiary)' }}>Running guard chain...</div>;
        if (!testResult) return null;
        return (
          <div className="space-y-1.5 mt-2">
            {(testResult as Array<{ guard: string; status: string; detail: string; time: string }>).map((r, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--color-bg-primary)' }}>
                <span className="text-[11px]">{r.status === 'pass' ? '✓' : '✗'}</span>
                <span className="text-[10px] font-semibold" style={{ color: r.status === 'pass' ? '#059669' : C.accent }}>{r.guard}</span>
                <span className="text-[9px] flex-1" style={{ color: 'var(--color-text-tertiary)' }}>{r.detail}</span>
                <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>{r.time}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] font-bold" style={{ color: '#059669' }}>ALL PASSED</span>
              <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>167ms total</span>
            </div>
          </div>
        );
      }}
    />
  );

  return (
    <EditorShell
      chipType="guard"
      chipName="pii-redaction"
      version="2.0.0"
      leftPanel={leftPanel}
      leftPanelLabel="Configuration"
      rightPanel={rightPanel}
      rightPanelLabel="Preview & Testing"
      testPanel={testPanel}
      onPublish={() => {}}
      onCreateNew={() => {}}
    />
  );
}
