/**
 * DataEditor -- Dedicated editor for @data chip type.
 *
 * Maps to adk-fluent's S namespace:
 *   S.capture(key)                  -- Capture user input into state
 *   S.pick(k1, k2, ...)            -- Project specific keys from state
 *   S.rename({old: new, ...})       -- Rename state keys
 *   S.merge(source)                 -- Merge external data into state
 *
 * Data transforms are zero-cost (no LLM call). They reshape the agent's
 * state between reasoning steps, acting as the plumbing between tools,
 * connectors, and agent reasoning.
 *
 * Layout: EditorShell with 60/40 split.
 *   Left  -- Configuration: identity, transform type, transform config, pipeline, data source
 *   Right -- Preview: before/after state, CodePreview, state key inventory
 */

import { useState, useMemo, useCallback } from 'react';
import { EditorShell, SegmentedControl, CodePreview } from '../../components/editors';

// ---- Color tokens (emerald / data) -----------------------------------

const C = {
  accent:  '#059669',
  bg:      '#F0FAF5',
  text:    '#047857',
  border:  '#B0E5CA',
  tint:    '#DAF4E6',
} as const;

// ---- Types -----------------------------------------------------------

type TransformKind = 'capture' | 'pick' | 'rename' | 'merge';
type CaptureType = 'string' | 'number' | 'boolean' | 'object';
type MergeSource = 'state' | 'bigquery' | 'sheets';

interface RenameRow {
  id: string;
  oldKey: string;
  newKey: string;
}

interface PipelineStep {
  id: string;
  kind: TransformKind;
  label: string;
  expression: string;
}

interface StateEntry {
  key: string;
  value: string;
  type: string;
}

// ---- Mock data -------------------------------------------------------

const AVAILABLE_KEYS = [
  { key: 'policy_id', type: 'string', value: '"POL-SG-001234"' },
  { key: 'claim_amount', type: 'number', value: '72500' },
  { key: 'jurisdiction', type: 'string', value: '"SG"' },
  { key: 'customer_tier', type: 'string', value: '"gold"' },
  { key: 'risk_score', type: 'number', value: '0.42' },
  { key: 'status', type: 'string', value: '"pending_review"' },
] as const satisfies readonly StateEntry[];

const INITIAL_RENAME_ROWS: RenameRow[] = [
  { id: 'r1', oldKey: 'claim_amount', newKey: 'amount_usd' },
  { id: 'r2', oldKey: 'customer_tier', newKey: 'tier' },
  { id: 'r3', oldKey: 'risk_score', newKey: 'fraud_risk' },
];

const INITIAL_PIPELINE: PipelineStep[] = [
  { id: 'p1', kind: 'capture', label: 'Capture claim_data', expression: 'S.capture("claim_data")' },
  { id: 'p2', kind: 'pick', label: 'Pick 3 keys', expression: 'S.pick("policy_id", "claim_amount", "jurisdiction")' },
  { id: 'p3', kind: 'rename', label: 'Rename claim_amount', expression: 'S.rename({"claim_amount": "amount_usd"})' },
];

// ---- Utility icons (SVG) ---------------------------------------------

function ArrowDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
      <path d="M6 2v8M3 7l3 3 3-3" stroke={C.accent} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
      <path d="M3.5 2L7 5L3.5 8" stroke={C.accent} strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PipelineArrow() {
  return (
    <div className="flex items-center justify-center py-1" style={{ color: C.accent }}>
      <svg width="16" height="20" viewBox="0 0 16 20">
        <path d="M8 0v14M4 10l4 6 4-6" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      </svg>
    </div>
  );
}

function CheckIcon({ checked }: { checked: boolean }) {
  if (!checked) {
    return (
      <span
        className="w-[14px] h-[14px] rounded border flex-shrink-0"
        style={{ borderColor: '#D1D5DB', background: '#FFFFFF' }}
      />
    );
  }
  return (
    <span
      className="w-[14px] h-[14px] rounded flex items-center justify-center flex-shrink-0"
      style={{ background: C.accent }}
    >
      <svg width="9" height="9" viewBox="0 0 9 9">
        <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="#FFFFFF" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

// ---- Sub-components: section cards -----------------------------------

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: `1px solid ${C.border}`, background: 'var(--color-bg-surface, #FFFFFF)' }}
    >
      <div
        className="px-4 py-2"
        style={{ background: C.tint, borderBottom: `1px solid ${C.border}` }}
      >
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: C.text }}>
          {title}
        </span>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[12px] px-3 py-1.5 rounded-md outline-none transition-colors"
      style={{
        fontFamily: mono ? 'var(--font-mono, monospace)' : 'var(--font-ui, sans-serif)',
        color: 'var(--color-text-primary, #111827)',
        background: 'var(--color-bg-primary, #F9FAFB)',
        border: '1px solid var(--color-border, #E5E7EB)',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border, #E5E7EB)'; }}
    />
  );
}

// ---- Transform-specific config panels --------------------------------

function CaptureConfig({
  captureKey,
  captureType,
  onKeyChange,
  onTypeChange,
}: {
  captureKey: string;
  captureType: CaptureType;
  onKeyChange: (v: string) => void;
  onTypeChange: (v: CaptureType) => void;
}) {
  const typeOptions: CaptureType[] = ['string', 'number', 'boolean', 'object'];
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Key Name</FieldLabel>
        <TextInput value={captureKey} onChange={onKeyChange} placeholder="e.g. claim_data" mono />
      </div>
      <div>
        <FieldLabel>Value Type</FieldLabel>
        <select
          value={captureType}
          onChange={e => onTypeChange(e.target.value as CaptureType)}
          className="w-full text-[12px] px-3 py-1.5 rounded-md outline-none"
          style={{
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--color-text-primary, #111827)',
            background: 'var(--color-bg-primary, #F9FAFB)',
            border: '1px solid var(--color-border, #E5E7EB)',
          }}
        >
          {typeOptions.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PickConfig({
  selectedKeys,
  onToggle,
}: {
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
}) {
  return (
    <div className="space-y-1">
      {AVAILABLE_KEYS.map(k => {
        const checked = selectedKeys.has(k.key);
        return (
          <button
            key={k.key}
            onClick={() => onToggle(k.key)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-left transition-colors"
            style={{
              background: checked ? C.tint : 'transparent',
              border: checked ? `1px solid ${C.border}` : '1px solid transparent',
            }}
            onMouseEnter={e => {
              if (!checked) e.currentTarget.style.background = 'var(--color-bg-secondary, #F3F4F6)';
            }}
            onMouseLeave={e => {
              if (!checked) e.currentTarget.style.background = 'transparent';
            }}
          >
            <CheckIcon checked={checked} />
            <span
              className="text-[12px] font-medium"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: checked ? C.text : 'var(--color-text-primary, #111827)',
              }}
            >
              {k.key}
            </span>
            <span
              className="ml-auto text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--color-bg-tertiary, #F3F4F6)',
                color: 'var(--color-text-tertiary, #9CA3AF)',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {k.type}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function RenameConfig({
  rows,
  onUpdateRow,
}: {
  rows: RenameRow[];
  onUpdateRow: (id: string, field: 'oldKey' | 'newKey', value: string) => void;
}) {
  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider flex-1" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
          Current Key
        </span>
        <span className="w-6 flex-shrink-0" />
        <span className="text-[10px] font-semibold uppercase tracking-wider flex-1" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
          New Key
        </span>
      </div>
      {rows.map(row => (
        <div key={row.id} className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={row.oldKey}
              onChange={e => onUpdateRow(row.id, 'oldKey', e.target.value)}
              className="w-full text-[11px] px-2.5 py-1.5 rounded-md outline-none"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-text-primary, #111827)',
                background: 'var(--color-bg-primary, #F9FAFB)',
                border: '1px solid var(--color-border, #E5E7EB)',
              }}
            />
          </div>
          <ChevronRightIcon />
          <div className="flex-1">
            <input
              type="text"
              value={row.newKey}
              onChange={e => onUpdateRow(row.id, 'newKey', e.target.value)}
              className="w-full text-[11px] px-2.5 py-1.5 rounded-md outline-none"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: C.text,
                background: C.bg,
                border: `1px solid ${C.border}`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MergeConfig({
  mergeSource,
  onSourceChange,
  sourceRef,
  onRefChange,
}: {
  mergeSource: MergeSource;
  onSourceChange: (v: MergeSource) => void;
  sourceRef: string;
  onRefChange: (v: string) => void;
}) {
  const sourceOptions: { value: MergeSource; label: string }[] = [
    { value: 'state', label: 'State' },
    { value: 'bigquery', label: 'BigQuery' },
    { value: 'sheets', label: 'Sheets' },
  ];

  const placeholders: Record<MergeSource, string> = {
    state: 'e.g. parent_context',
    bigquery: 'e.g. project.dataset.table',
    sheets: 'e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
  };

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>Source Type</FieldLabel>
        <select
          value={mergeSource}
          onChange={e => onSourceChange(e.target.value as MergeSource)}
          className="w-full text-[12px] px-3 py-1.5 rounded-md outline-none"
          style={{
            fontFamily: 'var(--font-ui, sans-serif)',
            color: 'var(--color-text-primary, #111827)',
            background: 'var(--color-bg-primary, #F9FAFB)',
            border: '1px solid var(--color-border, #E5E7EB)',
          }}
        >
          {sourceOptions.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>
      <div>
        <FieldLabel>Source Reference</FieldLabel>
        <TextInput value={sourceRef} onChange={onRefChange} placeholder={placeholders[mergeSource]} mono />
      </div>
    </div>
  );
}

// ---- Pipeline step pill ----------------------------------------------

const TRANSFORM_PILL_COLORS: Record<TransformKind, { bg: string; text: string; border: string }> = {
  capture: { bg: '#FEF9C3', text: '#854D0E', border: '#FDE68A' },
  pick:    { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
  rename:  { bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' },
  merge:   { bg: C.tint, text: C.text, border: C.border },
};

function PipelineStepCard({ step }: { step: PipelineStep }) {
  const pill = TRANSFORM_PILL_COLORS[step.kind];
  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-lg"
      style={{ background: 'var(--color-bg-primary, #F9FAFB)', border: '1px solid var(--color-border, #E5E7EB)' }}
    >
      <span
        className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex-shrink-0"
        style={{ background: pill.bg, color: pill.text, border: `1px solid ${pill.border}` }}
      >
        {step.kind}
      </span>
      <code
        className="text-[11px] flex-1 truncate"
        style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-primary, #111827)' }}
      >
        {step.expression}
      </code>
    </div>
  );
}

// ---- Before / After preview table ------------------------------------

function StatePreviewTable({
  beforeEntries,
  afterEntries,
}: {
  beforeEntries: StateEntry[];
  afterEntries: StateEntry[];
}) {
  return (
    <div className="flex gap-3 items-stretch">
      {/* Before */}
      <div className="flex-1 rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border, #E5E7EB)' }}>
        <div
          className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: 'var(--color-bg-tertiary, #F3F4F6)', color: 'var(--color-text-tertiary, #9CA3AF)', borderBottom: '1px solid var(--color-border, #E5E7EB)' }}
        >
          Before (full state)
        </div>
        <div className="divide-y" style={{ divideColor: 'var(--color-border, #E5E7EB)' }}>
          {beforeEntries.map(e => (
            <div key={e.key} className="flex items-center px-3 py-1.5 gap-2">
              <span className="text-[11px] font-medium" style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-secondary, #6B7280)' }}>
                {e.key}
              </span>
              <span className="flex-1" />
              <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-tertiary, #9CA3AF)' }}>
                {e.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Arrow */}
      <div className="flex items-center justify-center flex-shrink-0 px-1">
        <div className="flex flex-col items-center gap-1">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M5 12h14M14 7l5 5-5 5" stroke={C.accent} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: C.accent }}>
            S.pipe
          </span>
        </div>
      </div>

      {/* After */}
      <div className="flex-1 rounded-lg overflow-hidden" style={{ border: `1px solid ${C.border}` }}>
        <div
          className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ background: C.tint, color: C.text, borderBottom: `1px solid ${C.border}` }}
        >
          After (transformed)
        </div>
        <div className="divide-y" style={{ divideColor: C.border }}>
          {afterEntries.map(e => (
            <div key={e.key} className="flex items-center px-3 py-1.5 gap-2">
              <span className="text-[11px] font-medium" style={{ fontFamily: 'var(--font-mono, monospace)', color: C.text }}>
                {e.key}
              </span>
              <span className="flex-1" />
              <span className="text-[10px]" style={{ fontFamily: 'var(--font-mono, monospace)', color: C.accent }}>
                {e.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- State keys card -------------------------------------------------

function StateKeysCard({ keys }: { keys: { key: string; type: string }[] }) {
  const typeBadgeColor: Record<string, { bg: string; text: string }> = {
    string:  { bg: '#DBEAFE', text: '#1E40AF' },
    number:  { bg: '#FEF9C3', text: '#854D0E' },
    boolean: { bg: '#F3E8FF', text: '#6B21A8' },
    object:  { bg: '#FFE4E6', text: '#9F1239' },
  };

  return (
    <SectionCard title="Defined State Keys">
      <div className="space-y-1">
        {keys.map(k => {
          const badge = typeBadgeColor[k.type] ?? { bg: '#F3F4F6', text: '#6B7280' };
          return (
            <div key={k.key} className="flex items-center gap-2 px-2 py-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: C.accent }}
              />
              <span className="text-[11px] font-medium flex-1" style={{ fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-text-primary, #111827)' }}>
                {k.key}
              </span>
              <span
                className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded"
                style={{ background: badge.bg, color: badge.text }}
              >
                {k.type}
              </span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ======================================================================
// DataEditor -- Main component
// ======================================================================

export function DataEditor() {
  // -- Identity state --------------------------------------------------
  const [name, setName] = useState('high-risk-categories');
  const [description, setDescription] = useState(
    'Captures and reshapes claim data from the agent state, projecting relevant keys and normalizing field names for downstream processing by @tool(claims-engine).'
  );

  // -- Transform type --------------------------------------------------
  const [transformKind, setTransformKind] = useState<TransformKind>('pick');

  // -- Capture config --------------------------------------------------
  const [captureKey, setCaptureKey] = useState('claim_data');
  const [captureType, setCaptureType] = useState<CaptureType>('object');

  // -- Pick config -----------------------------------------------------
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    new Set(['policy_id', 'claim_amount', 'jurisdiction'])
  );

  const toggleKey = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // -- Rename config ---------------------------------------------------
  const [renameRows, setRenameRows] = useState<RenameRow[]>(INITIAL_RENAME_ROWS);

  const updateRenameRow = useCallback((id: string, field: 'oldKey' | 'newKey', value: string) => {
    setRenameRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }, []);

  // -- Merge config ----------------------------------------------------
  const [mergeSource, setMergeSource] = useState<MergeSource>('bigquery');
  const [mergeRef, setMergeRef] = useState('acme-insurance.claims.risk_categories');

  // -- Data source connection ------------------------------------------
  const [dataSource, setDataSource] = useState<'bigquery' | 'sheets' | 'state' | 'none'>('none');
  const [dataSourceRef, setDataSourceRef] = useState('');

  // -- Pipeline --------------------------------------------------------
  const pipeline = INITIAL_PIPELINE;

  // -- Computed: after-state -------------------------------------------
  const afterEntries = useMemo<StateEntry[]>(() => {
    // Simulate the pipeline: capture -> pick -> rename
    // After pick: only policy_id, claim_amount, jurisdiction
    // After rename: claim_amount -> amount_usd
    return [
      { key: 'policy_id', type: 'string', value: '"POL-SG-001234"' },
      { key: 'amount_usd', type: 'number', value: '72500' },
      { key: 'jurisdiction', type: 'string', value: '"SG"' },
    ];
  }, []);

  // -- Computed: code preview ------------------------------------------
  const expression = useMemo(() => {
    return 'S.capture("claim_data") >> S.pick("policy_id", "claim_amount", "jurisdiction") >> S.rename({"claim_amount": "amount_usd"})';
  }, []);

  const pythonCode = useMemo(() => {
    return `from adk_fluent import S

# Define the state transform pipeline
transform = (
    S.capture("claim_data")           # Capture incoming claim data
    >> S.pick(                        # Project only needed keys
        "policy_id",
        "claim_amount",
        "jurisdiction",
    )
    >> S.rename({                     # Normalize field names
        "claim_amount": "amount_usd",
    })
)

# Apply to agent
agent.state_transform(transform)`;
  }, []);

  // -- Computed: state keys inventory ----------------------------------
  const stateKeys = useMemo(() => [
    { key: 'policy_id', type: 'string' },
    { key: 'amount_usd', type: 'number' },
    { key: 'jurisdiction', type: 'string' },
    { key: 'claim_data', type: 'object' },
  ], []);

  // -- Transform type options ------------------------------------------
  const transformOptions: { value: TransformKind; label: string }[] = [
    { value: 'capture', label: 'Capture' },
    { value: 'pick', label: 'Pick' },
    { value: 'rename', label: 'Rename' },
    { value: 'merge', label: 'Merge' },
  ];

  const dataSourceOptions: { value: typeof dataSource; label: string }[] = [
    { value: 'bigquery', label: 'BigQuery' },
    { value: 'sheets', label: 'Sheets' },
    { value: 'state', label: 'State' },
    { value: 'none', label: 'None' },
  ];

  // ====================================================================
  // Left Panel
  // ====================================================================

  const leftPanel = (
    <>
      {/* 1. Identity card */}
      <SectionCard title="Data Identity">
        <div>
          <FieldLabel>Name</FieldLabel>
          <TextInput value={name} onChange={setName} placeholder="e.g. high-risk-categories" mono />
        </div>
        <div>
          <FieldLabel>Description</FieldLabel>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="w-full text-[12px] px-3 py-2 rounded-md outline-none resize-none leading-relaxed"
            style={{
              fontFamily: 'var(--font-ui, sans-serif)',
              color: 'var(--color-text-primary, #111827)',
              background: 'var(--color-bg-primary, #F9FAFB)',
              border: '1px solid var(--color-border, #E5E7EB)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = C.accent; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border, #E5E7EB)'; }}
          />
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ background: C.tint, color: C.text, border: `1px solid ${C.border}` }}
          >
            Zero-cost transform
          </span>
          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
            No LLM call -- pure state reshaping
          </span>
        </div>
      </SectionCard>

      {/* 2. Transform type selector */}
      <SectionCard title="Transform Type">
        <SegmentedControl
          options={transformOptions}
          value={transformKind}
          onChange={setTransformKind}
          accentColor={C.accent}
        />

        {/* 3. Transform-specific config */}
        <div
          className="mt-3 pt-3"
          style={{ borderTop: '1px solid var(--color-border, #E5E7EB)' }}
        >
          {transformKind === 'capture' && (
            <CaptureConfig
              captureKey={captureKey}
              captureType={captureType}
              onKeyChange={setCaptureKey}
              onTypeChange={setCaptureType}
            />
          )}
          {transformKind === 'pick' && (
            <PickConfig selectedKeys={selectedKeys} onToggle={toggleKey} />
          )}
          {transformKind === 'rename' && (
            <RenameConfig rows={renameRows} onUpdateRow={updateRenameRow} />
          )}
          {transformKind === 'merge' && (
            <MergeConfig
              mergeSource={mergeSource}
              onSourceChange={setMergeSource}
              sourceRef={mergeRef}
              onRefChange={setMergeRef}
            />
          )}
        </div>
      </SectionCard>

      {/* 4. Transform pipeline builder */}
      <SectionCard title="Transform Pipeline">
        <div className="space-y-0">
          {pipeline.map((step, i) => (
            <div key={step.id}>
              <PipelineStepCard step={step} />
              {i < pipeline.length - 1 && <PipelineArrow />}
            </div>
          ))}
        </div>
        <div
          className="mt-2 pt-3 flex items-center gap-2"
          style={{ borderTop: '1px solid var(--color-border, #E5E7EB)' }}
        >
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
            Pipeline expression:
          </span>
          <code
            className="text-[10px] flex-1 truncate"
            style={{ fontFamily: 'var(--font-mono, monospace)', color: C.accent }}
          >
            {'capture >> pick >> rename'}
          </code>
        </div>
      </SectionCard>

      {/* 5. Data source connection */}
      <SectionCard title="Data Source Connection">
        <SegmentedControl
          options={dataSourceOptions}
          value={dataSource}
          onChange={setDataSource}
          accentColor={C.accent}
        />
        {dataSource !== 'none' && (
          <div className="mt-2">
            <FieldLabel>
              {dataSource === 'bigquery' ? 'Table Reference' : dataSource === 'sheets' ? 'Spreadsheet ID' : 'State Path'}
            </FieldLabel>
            <TextInput
              value={dataSourceRef}
              onChange={setDataSourceRef}
              placeholder={
                dataSource === 'bigquery'
                  ? 'project.dataset.table'
                  : dataSource === 'sheets'
                    ? '1BxiMVs0XRA5...'
                    : 'parent.context_key'
              }
              mono
            />
            <div className="mt-2 flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: dataSourceRef ? C.accent : '#EAB308' }}
              />
              <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
                {dataSourceRef ? 'Source configured' : 'Provide a reference to connect'}
              </span>
            </div>
          </div>
        )}
      </SectionCard>
    </>
  );

  // ====================================================================
  // Right Panel
  // ====================================================================

  const rightPanel = (
    <>
      {/* 1. Before / After preview */}
      <SectionCard title="State Transform Preview">
        <StatePreviewTable
          beforeEntries={AVAILABLE_KEYS.map(k => ({ key: k.key, type: k.type, value: k.value }))}
          afterEntries={afterEntries}
        />
        <div className="flex items-center gap-2 mt-1">
          <ArrowDownIcon />
          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
            6 keys reduced to 3 keys, 1 key renamed
          </span>
        </div>
      </SectionCard>

      {/* 2. Code preview */}
      <CodePreview
        expression={expression}
        python={pythonCode}
        dependencies={['adk-fluent>=0.4.0']}
        accentColor={C.accent}
      />

      {/* 3. State keys card */}
      <StateKeysCard keys={stateKeys} />
    </>
  );

  // ====================================================================
  // Render
  // ====================================================================

  return (
    <EditorShell
      chipType="data"
      chipName={name}
      version="1.0.0"
      leftPanel={leftPanel}
      leftPanelWidth="60%"
      leftPanelLabel="Configuration"
      rightPanel={rightPanel}
      rightPanelLabel="Preview"
      onPublish={() => {}}
      onCreateNew={() => {}}
    />
  );
}
