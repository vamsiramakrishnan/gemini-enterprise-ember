/**
 * CreateAssetWizard — Multi-step creation wizard for agents, tools, skills,
 * and other @-referenceable assets.
 *
 * Step 1: Pick a type (visual cards, not a dropdown)
 * Step 2: Type-specific configuration form
 * Step 3: Review & create
 *
 * Supports pre-selecting a type (e.g. when invoked from ChipAutocomplete
 * with a type filter active, or from an unresolved chip).
 */

import { useState, useCallback, useEffect } from 'react';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip } from '../../parser/types';
import { getAdkFluentService } from '../../services/adk-fluent';
import type { AssetCodeResult } from '../../services/adk-fluent';

// ─── Types ──────────────────────────────────────────────────────────────

export interface CreateAssetWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (partial: Partial<SmartChip> & { type: ChipType; name: string }) => void;
  /** Pre-select a type (skips step 1) */
  initialType?: ChipType;
  /** Pre-fill name (e.g. from unresolved chip) */
  initialName?: string;
}

interface TypeOption {
  type: ChipType;
  label: string;
  description: string;
  icon: string;
}

const TYPE_OPTIONS: TypeOption[] = [
  { type: 'agent', label: 'Agent', description: 'LLM agent with instructions, tools, and callbacks', icon: '◎' },
  { type: 'tool', label: 'Tool', description: 'Function tool, MCP server, or OpenAPI endpoint', icon: '⬡' },
  { type: 'skill', label: 'Skill', description: 'Reusable SKILL.md capability bundle', icon: '✦' },
  { type: 'connector', label: 'Connector', description: 'Enterprise system integration (Jira, Salesforce, etc.)', icon: '◈' },
  { type: 'guard', label: 'Guard', description: 'Policy or safety check (PII, budget, toxicity)', icon: '△' },
  { type: 'doc', label: 'Document', description: 'Knowledge source for grounding', icon: '◇' },
  { type: 'trigger', label: 'Trigger', description: 'Invocation entry point (chat, inbox, event, schedule)', icon: '▸' },
  { type: 'schema', label: 'Schema', description: 'Output shape constraint (Pydantic model)', icon: '▢' },
  { type: 'data', label: 'Data', description: 'Data binding or state transform', icon: '▣' },
];

// ─── Type-specific form state ───────────────────────────────────────────

interface AgentFormState {
  model: string;
  systemPrompt: string;
  tools: string[];
  delegatesTo: string[];
  maxTurns: number;
}

interface ToolFormState {
  toolType: 'function' | 'mcp' | 'openapi';
  endpoint: string;
  parameters: Array<{ name: string; type: string; required: boolean; description: string }>;
  authMethod: 'none' | 'api-key' | 'oauth' | 'service-account';
}

interface SkillFormState {
  scope: 'workspace' | 'user' | 'extension';
  activationMode: 'pinned' | 'on-demand';
  frontmatterDescription: string;
  body: string;
  tags: string;
}

interface GuardFormState {
  guardKind: string;
  phase: 'pre_model' | 'post_model';
  threshold: string;
}

interface TriggerFormState {
  triggerType: 'chat' | 'inbox' | 'event' | 'schedule' | 'webhook';
  cronExpression: string;
  queueName: string;
  eventSource: string;
  eventType: string;
}

// ─── Styles ─────────────────────────────────────────────────────────────

const styles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.35)',
    backdropFilter: 'blur(2px)',
  },
  modal: {
    background: '#fff',
    borderRadius: 14,
    width: 580,
    maxWidth: '92vw',
    maxHeight: '88vh',
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
    fontFamily: 'var(--font-ui, Inter, system-ui, sans-serif)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    padding: '18px 24px 14px',
    borderBottom: '1px solid #F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: {
    padding: '20px 24px',
    flex: 1,
    overflowY: 'auto' as const,
  },
  footer: {
    padding: '14px 24px',
    borderTop: '1px solid #F3F4F6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600 as const,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    transition: 'border-color 0.15s',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 13,
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box' as const,
  },
  btnPrimary: {
    padding: '7px 18px',
    borderRadius: 8,
    border: 'none',
    background: '#2563EB',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  btnSecondary: {
    padding: '7px 18px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    background: '#fff',
    color: '#6B7280',
    fontSize: 12,
    fontWeight: 500 as const,
    cursor: 'pointer',
  },
};

// ─── Helper: field row ──────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  );
}

// ─── Step indicator ─────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 4,
            background: i === current ? '#2563EB' : i < current ? '#93C5FD' : '#E5E7EB',
            transition: 'all 0.2s',
          }}
        />
      ))}
    </div>
  );
}

// ─── Type-specific forms ────────────────────────────────────────────────

function AgentForm({ state, onChange }: { state: AgentFormState; onChange: (s: AgentFormState) => void }) {
  return (
    <>
      <Field label="Model">
        <select
          style={styles.select}
          value={state.model}
          onChange={(e) => onChange({ ...state, model: e.target.value })}
        >
          <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
          <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
          <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash Lite</option>
        </select>
      </Field>
      <Field label="System Instructions">
        <textarea
          style={styles.textarea}
          rows={4}
          placeholder="You are an agent that..."
          value={state.systemPrompt}
          onChange={(e) => onChange({ ...state, systemPrompt: e.target.value })}
        />
      </Field>
      <Field label="Tools (comma-separated @tool names)">
        <input
          style={styles.input}
          placeholder="e.g. policy-lookup, claims-history"
          value={state.tools.join(', ')}
          onChange={(e) => onChange({ ...state, tools: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
        />
      </Field>
      <Field label="Delegates To (comma-separated @agent names)">
        <input
          style={styles.input}
          placeholder="e.g. senior-adjuster, fraud-specialist"
          value={state.delegatesTo.join(', ')}
          onChange={(e) => onChange({ ...state, delegatesTo: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
        />
      </Field>
      <Field label="Max Turns">
        <input
          style={{ ...styles.input, width: 100 }}
          type="number"
          min={1}
          max={100}
          value={state.maxTurns}
          onChange={(e) => onChange({ ...state, maxTurns: parseInt(e.target.value) || 10 })}
        />
      </Field>
    </>
  );
}

function ToolForm({ state, onChange }: { state: ToolFormState; onChange: (s: ToolFormState) => void }) {
  const addParameter = () => {
    onChange({
      ...state,
      parameters: [...state.parameters, { name: '', type: 'string', required: false, description: '' }],
    });
  };

  const updateParameter = (idx: number, field: string, value: string | boolean) => {
    const params = [...state.parameters];
    params[idx] = { ...params[idx], [field]: value };
    onChange({ ...state, parameters: params });
  };

  const removeParameter = (idx: number) => {
    onChange({ ...state, parameters: state.parameters.filter((_, i) => i !== idx) });
  };

  return (
    <>
      <Field label="Tool Type">
        <select
          style={styles.select}
          value={state.toolType}
          onChange={(e) => onChange({ ...state, toolType: e.target.value as ToolFormState['toolType'] })}
        >
          <option value="function">Function Tool</option>
          <option value="mcp">MCP Server</option>
          <option value="openapi">OpenAPI Endpoint</option>
        </select>
      </Field>

      <Field label={state.toolType === 'mcp' ? 'MCP Server URL' : state.toolType === 'openapi' ? 'OpenAPI Spec URL' : 'Endpoint URL'}>
        <input
          style={styles.input}
          placeholder={state.toolType === 'mcp' ? 'http://localhost:8080/mcp' : 'https://api.example.com/v1/...'}
          value={state.endpoint}
          onChange={(e) => onChange({ ...state, endpoint: e.target.value })}
        />
      </Field>

      <Field label="Authentication">
        <select
          style={styles.select}
          value={state.authMethod}
          onChange={(e) => onChange({ ...state, authMethod: e.target.value as ToolFormState['authMethod'] })}
        >
          <option value="none">None</option>
          <option value="api-key">API Key</option>
          <option value="oauth">OAuth 2.0</option>
          <option value="service-account">Service Account</option>
        </select>
      </Field>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <label style={styles.label}>Parameters</label>
          <button
            onClick={addParameter}
            style={{ fontSize: 11, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            + Add Parameter
          </button>
        </div>
        {state.parameters.length === 0 && (
          <div style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 0' }}>No parameters defined yet.</div>
        )}
        {state.parameters.map((p, i) => (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <input
              style={{ ...styles.input, flex: 2 }}
              placeholder="name"
              value={p.name}
              onChange={(e) => updateParameter(i, 'name', e.target.value)}
            />
            <select
              style={{ ...styles.select, flex: 1 }}
              value={p.type}
              onChange={(e) => updateParameter(i, 'type', e.target.value)}
            >
              <option value="string">string</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="object">object</option>
              <option value="array">array</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>
              <input
                type="checkbox"
                checked={p.required}
                onChange={(e) => updateParameter(i, 'required', e.target.checked)}
              />
              Req
            </label>
            <button
              onClick={() => removeParameter(i)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, lineHeight: 1, padding: '0 2px' }}
              title="Remove parameter"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

function SkillForm({ state, onChange }: { state: SkillFormState; onChange: (s: SkillFormState) => void }) {
  return (
    <>
      <Field label="Scope">
        <select
          style={styles.select}
          value={state.scope}
          onChange={(e) => onChange({ ...state, scope: e.target.value as SkillFormState['scope'] })}
        >
          <option value="workspace">Workspace (available to all playbooks)</option>
          <option value="user">User (personal skill)</option>
          <option value="extension">Extension (third-party)</option>
        </select>
      </Field>

      <Field label="Activation Mode">
        <div style={{ display: 'flex', gap: 8 }}>
          {(['pinned', 'on-demand'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onChange({ ...state, activationMode: mode })}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 8,
                border: `1.5px solid ${state.activationMode === mode ? '#7C3AED' : '#E5E7EB'}`,
                background: state.activationMode === mode ? '#F5F3FF' : '#fff',
                color: state.activationMode === mode ? '#6D28D9' : '#6B7280',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {mode === 'pinned' ? '📌 Pinned (always active)' : '🔍 On-Demand (auto-activated)'}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Activation Description (determines when LLM auto-activates)">
        <textarea
          style={styles.textarea}
          rows={3}
          placeholder="Use this skill when the agent handles..."
          value={state.frontmatterDescription}
          onChange={(e) => onChange({ ...state, frontmatterDescription: e.target.value })}
        />
      </Field>

      <Field label="Skill Instructions (SKILL.md body — supports @references)">
        <textarea
          style={{ ...styles.textarea, fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)', fontSize: 12, lineHeight: 1.6 }}
          rows={6}
          placeholder={"# My Skill\n\n## Instructions\nWhen handling queries about...\n\nUse @doc(my-doc) for reference.\nApply @guard(my-guard) for safety."}
          value={state.body}
          onChange={(e) => onChange({ ...state, body: e.target.value })}
        />
      </Field>

      <Field label="Tags (comma-separated)">
        <input
          style={styles.input}
          placeholder="e.g. compliance, apac, regulatory"
          value={state.tags}
          onChange={(e) => onChange({ ...state, tags: e.target.value })}
        />
      </Field>
    </>
  );
}

function GuardForm({ state, onChange }: { state: GuardFormState; onChange: (s: GuardFormState) => void }) {
  return (
    <>
      <Field label="Guard Kind">
        <select
          style={styles.select}
          value={state.guardKind}
          onChange={(e) => onChange({ ...state, guardKind: e.target.value })}
        >
          <option value="pii">PII Detection (G.pii)</option>
          <option value="toxicity">Toxicity Check (G.toxicity)</option>
          <option value="budget">Token Budget (G.budget)</option>
          <option value="json">JSON Validation (G.json)</option>
          <option value="length">Output Length (G.length)</option>
          <option value="topic">Topic Blocking (G.topic)</option>
          <option value="grounded">Hallucination Check (G.grounded)</option>
          <option value="output">Schema Validation (G.output)</option>
        </select>
      </Field>
      <Field label="Phase">
        <select
          style={styles.select}
          value={state.phase}
          onChange={(e) => onChange({ ...state, phase: e.target.value as GuardFormState['phase'] })}
        >
          <option value="pre_model">Before Model (pre_model)</option>
          <option value="post_model">After Model (post_model)</option>
        </select>
      </Field>
      {(state.guardKind === 'toxicity' || state.guardKind === 'budget' || state.guardKind === 'length') && (
        <Field label={state.guardKind === 'budget' ? 'Max Tokens' : state.guardKind === 'length' ? 'Max Characters' : 'Threshold (0-1)'}>
          <input
            style={{ ...styles.input, width: 140 }}
            type="number"
            step={state.guardKind === 'toxicity' ? '0.1' : '1'}
            placeholder={state.guardKind === 'toxicity' ? '0.8' : '5000'}
            value={state.threshold}
            onChange={(e) => onChange({ ...state, threshold: e.target.value })}
          />
        </Field>
      )}
    </>
  );
}

function TriggerForm({ state, onChange }: { state: TriggerFormState; onChange: (s: TriggerFormState) => void }) {
  return (
    <>
      <Field label="Trigger Type">
        <select
          style={styles.select}
          value={state.triggerType}
          onChange={(e) => onChange({ ...state, triggerType: e.target.value as TriggerFormState['triggerType'] })}
        >
          <option value="chat">Chat (real-time streaming)</option>
          <option value="inbox">Inbox (async queue)</option>
          <option value="event">Event (webhook from connector)</option>
          <option value="schedule">Schedule (cron)</option>
          <option value="webhook">Webhook (custom endpoint)</option>
        </select>
      </Field>
      {state.triggerType === 'schedule' && (
        <Field label="Cron Expression">
          <input
            style={styles.input}
            placeholder="0 9 * * 1-5 (weekdays at 9am)"
            value={state.cronExpression}
            onChange={(e) => onChange({ ...state, cronExpression: e.target.value })}
          />
        </Field>
      )}
      {state.triggerType === 'inbox' && (
        <Field label="Queue Name">
          <input
            style={styles.input}
            placeholder="e.g. claims-queue"
            value={state.queueName}
            onChange={(e) => onChange({ ...state, queueName: e.target.value })}
          />
        </Field>
      )}
      {state.triggerType === 'event' && (
        <>
          <Field label="Source Connector">
            <input
              style={styles.input}
              placeholder="e.g. slack, jira, google-drive"
              value={state.eventSource}
              onChange={(e) => onChange({ ...state, eventSource: e.target.value })}
            />
          </Field>
          <Field label="Event Type">
            <input
              style={styles.input}
              placeholder="e.g. message-posted, issue-created, file-uploaded"
              value={state.eventType}
              onChange={(e) => onChange({ ...state, eventType: e.target.value })}
            />
          </Field>
        </>
      )}
    </>
  );
}

// ─── Main Wizard Component ──────────────────────────────────────────────

export function CreateAssetWizard({ isOpen, onClose, onCreate, initialType, initialName }: CreateAssetWizardProps) {
  const hasInitialType = !!initialType;
  const totalSteps = hasInitialType ? 2 : 3;
  const [step, setStep] = useState(hasInitialType ? 1 : 0);
  const [selectedType, setSelectedType] = useState<ChipType>(initialType ?? 'tool');
  const [name, setName] = useState(initialName ?? '');
  const [description, setDescription] = useState('');

  // Type-specific form states
  const [agentForm, setAgentForm] = useState<AgentFormState>({
    model: 'gemini-2.5-pro',
    systemPrompt: '',
    tools: [],
    delegatesTo: [],
    maxTurns: 10,
  });
  const [toolForm, setToolForm] = useState<ToolFormState>({
    toolType: 'function',
    endpoint: '',
    parameters: [],
    authMethod: 'none',
  });
  const [skillForm, setSkillForm] = useState<SkillFormState>({
    scope: 'workspace',
    activationMode: 'on-demand',
    frontmatterDescription: '',
    body: '',
    tags: '',
  });
  const [guardForm, setGuardForm] = useState<GuardFormState>({
    guardKind: 'pii',
    phase: 'post_model',
    threshold: '',
  });
  const [triggerForm, setTriggerForm] = useState<TriggerFormState>({
    triggerType: 'chat',
    cronExpression: '',
    queueName: '',
    eventSource: '',
    eventType: '',
  });

  // adk-fluent code preview
  const [codePreview, setCodePreview] = useState<AssetCodeResult | null>(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [showCode, setShowCode] = useState(false);

  // Generate code when entering the review step
  useEffect(() => {
    if (!isOpen) return;
    const isReviewStep = step === totalSteps - 1 && step !== (hasInitialType ? 0 : 1);
    if (!isReviewStep || !name.trim()) {
      setCodePreview(null);
      return;
    }

    setCodeLoading(true);
    const meta: Record<string, unknown> = {};
    if (selectedType === 'agent') Object.assign(meta, { model: agentForm.model, systemPrompt: agentForm.systemPrompt, tools: agentForm.tools, delegatesTo: agentForm.delegatesTo, maxTurns: agentForm.maxTurns });
    else if (selectedType === 'tool') Object.assign(meta, { toolType: toolForm.toolType, endpoint: toolForm.endpoint, parameters: toolForm.parameters, authMethod: toolForm.authMethod });
    else if (selectedType === 'skill') Object.assign(meta, { scope: skillForm.scope, activationMode: skillForm.activationMode, frontmatter: { name: name.trim(), description: skillForm.frontmatterDescription }, body: skillForm.body, tags: skillForm.tags.split(',').map((s: string) => s.trim()).filter(Boolean) });
    else if (selectedType === 'guard') Object.assign(meta, { guardKind: guardForm.guardKind, phase: guardForm.phase, threshold: guardForm.threshold });
    else if (selectedType === 'trigger') Object.assign(meta, { triggerType: triggerForm.triggerType, cronExpression: triggerForm.cronExpression, queueName: triggerForm.queueName, eventSource: triggerForm.eventSource, eventType: triggerForm.eventType });

    getAdkFluentService()
      .generateAssetCode({ type: selectedType, name: name.trim(), description: description.trim(), metadata: meta })
      .then((result) => { setCodePreview(result); setCodeLoading(false); })
      .catch(() => setCodeLoading(false));
  }, [step, isOpen, name, description, selectedType, agentForm, toolForm, skillForm, guardForm, triggerForm, hasInitialType]);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;

    const metadata: Record<string, unknown> = {};

    if (selectedType === 'agent') {
      metadata.model = agentForm.model;
      metadata.systemPrompt = agentForm.systemPrompt;
      metadata.tools = agentForm.tools;
      metadata.delegatesTo = agentForm.delegatesTo;
      metadata.maxTurns = agentForm.maxTurns;
    } else if (selectedType === 'tool') {
      metadata.toolType = toolForm.toolType;
      metadata.endpoint = toolForm.endpoint;
      metadata.parameters = toolForm.parameters;
      metadata.authMethod = toolForm.authMethod;
    } else if (selectedType === 'skill') {
      metadata.scope = skillForm.scope;
      metadata.activationMode = skillForm.activationMode;
      metadata.frontmatter = { name: name.trim(), description: skillForm.frontmatterDescription };
      metadata.body = skillForm.body;
      metadata.tags = skillForm.tags.split(',').map((s) => s.trim()).filter(Boolean);
      metadata.resources = { scripts: [], references: [], assets: [] };
      metadata.referencedChips = [];
      metadata.precedenceLevel = skillForm.scope === 'workspace' ? 1 : skillForm.scope === 'user' ? 2 : 3;
    } else if (selectedType === 'guard') {
      metadata.guardKind = guardForm.guardKind;
      metadata.phase = guardForm.phase;
      metadata.threshold = guardForm.threshold;
    } else if (selectedType === 'trigger') {
      metadata.triggerType = triggerForm.triggerType;
      metadata.status = 'active';
      if (triggerForm.triggerType === 'schedule') metadata.cronExpression = triggerForm.cronExpression;
      if (triggerForm.triggerType === 'inbox') metadata.queueName = triggerForm.queueName;
      if (triggerForm.triggerType === 'event') {
        metadata.eventSource = triggerForm.eventSource;
        metadata.eventType = triggerForm.eventType;
      }
      metadata.gcpService = triggerForm.triggerType === 'schedule'
        ? 'cloud-scheduler'
        : triggerForm.triggerType === 'inbox'
        ? 'pubsub'
        : triggerForm.triggerType === 'event'
        ? 'eventarc'
        : 'gemini-enterprise';
    }

    onCreate({
      type: selectedType,
      name: name.trim(),
      description: description.trim(),
      metadata,
    });
    onClose();
  }, [name, description, selectedType, agentForm, toolForm, skillForm, guardForm, triggerForm, onCreate, onClose]);

  if (!isOpen) return null;

  const chipColor = CHIP_COLORS[selectedType];
  const isLastStep = step === totalSteps - 1;
  const canProceed = step === 0 ? true : name.trim().length > 0;

  // Types that have dedicated config forms
  const hasTypeSpecificForm = ['agent', 'tool', 'skill', 'guard', 'trigger'].includes(selectedType);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
              {step === 0
                ? 'Create New Asset'
                : `New @${selectedType}`}
            </h2>
            {step > 0 && (
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                {step === (hasInitialType ? 0 : 1) ? 'Configure your asset' : 'Review & create'}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <StepIndicator current={step} total={totalSteps} />
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: 18, lineHeight: 1 }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Step 0: Type Selection */}
          {step === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {TYPE_OPTIONS.map((opt) => {
                const c = CHIP_COLORS[opt.type];
                const isSelected = selectedType === opt.type;
                return (
                  <button
                    key={opt.type}
                    onClick={() => setSelectedType(opt.type)}
                    style={{
                      padding: '14px 12px',
                      borderRadius: 10,
                      border: `2px solid ${isSelected ? c.accent : '#E5E7EB'}`,
                      background: isSelected ? c.bg : '#fff',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: isSelected ? c.accent : c.tint,
                        color: isSelected ? '#fff' : c.text,
                        fontSize: 12,
                        fontWeight: 600,
                      }}>
                        {opt.icon}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: isSelected ? c.text : '#374151' }}>
                        {opt.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9CA3AF', lineHeight: 1.4 }}>
                      {opt.description}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 1: Configuration */}
          {step === (hasInitialType ? 0 : 1) && (
            <>
              {/* Chip type badge */}
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '4px 10px 4px 6px',
                borderRadius: 6,
                background: chipColor.tint,
                color: chipColor.text,
                fontSize: 11,
                fontWeight: 600,
                marginBottom: 16,
              }}>
                <span>{CHIP_ICONS[selectedType]}</span>
                @{selectedType}
              </div>

              <Field label="Name">
                <input
                  style={styles.input}
                  placeholder={`e.g. my-${selectedType}-name`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                {name && (
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                    Reference: <code style={{ background: '#F3F4F6', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>
                      @{selectedType}({name})
                    </code>
                  </div>
                )}
              </Field>

              <Field label="Description">
                <textarea
                  style={styles.textarea}
                  rows={2}
                  placeholder="Brief description of this asset..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>

              {/* Type-specific configuration */}
              {selectedType === 'agent' && <AgentForm state={agentForm} onChange={setAgentForm} />}
              {selectedType === 'tool' && <ToolForm state={toolForm} onChange={setToolForm} />}
              {selectedType === 'skill' && <SkillForm state={skillForm} onChange={setSkillForm} />}
              {selectedType === 'guard' && <GuardForm state={guardForm} onChange={setGuardForm} />}
              {selectedType === 'trigger' && <TriggerForm state={triggerForm} onChange={setTriggerForm} />}
            </>
          )}

          {/* Step 2: Review */}
          {step === totalSteps - 1 && step !== (hasInitialType ? 0 : 1) && (
            <div>
              <div style={{
                padding: 16,
                borderRadius: 10,
                background: '#FAFAF9',
                border: '1px solid #E5E7EB',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: chipColor.accent,
                    color: '#fff',
                    fontSize: 14,
                  }}>
                    {CHIP_ICONS[selectedType]}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                      @{selectedType}({name})
                    </div>
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>v0.1.0 &middot; Draft</div>
                  </div>
                </div>
                {description && (
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 10px', lineHeight: 1.5 }}>
                    {description}
                  </p>
                )}

                {/* Type-specific review summary */}
                <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 10, marginTop: 6 }}>
                  {selectedType === 'agent' && (
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      <div>Model: <strong>{agentForm.model}</strong></div>
                      {agentForm.tools.length > 0 && <div>Tools: {agentForm.tools.map((t) => `@tool(${t})`).join(', ')}</div>}
                      {agentForm.delegatesTo.length > 0 && <div>Delegates: {agentForm.delegatesTo.map((a) => `@agent(${a})`).join(', ')}</div>}
                      <div>Max turns: {agentForm.maxTurns}</div>
                    </div>
                  )}
                  {selectedType === 'tool' && (
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      <div>Type: <strong>{toolForm.toolType}</strong></div>
                      {toolForm.endpoint && <div>Endpoint: {toolForm.endpoint}</div>}
                      <div>Auth: {toolForm.authMethod}</div>
                      <div>Parameters: {toolForm.parameters.length}</div>
                    </div>
                  )}
                  {selectedType === 'skill' && (
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      <div>Scope: <strong>{skillForm.scope}</strong> &middot; Activation: <strong>{skillForm.activationMode}</strong></div>
                      {skillForm.tags && <div>Tags: {skillForm.tags}</div>}
                    </div>
                  )}
                  {selectedType === 'guard' && (
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      <div>Kind: <strong>G.{guardForm.guardKind}()</strong> &middot; Phase: {guardForm.phase}</div>
                    </div>
                  )}
                  {selectedType === 'trigger' && (
                    <div style={{ fontSize: 11, color: '#6B7280' }}>
                      <div>Type: <strong>{triggerForm.triggerType}</strong></div>
                      {triggerForm.triggerType === 'schedule' && triggerForm.cronExpression && (
                        <div>Cron: {triggerForm.cronExpression}</div>
                      )}
                    </div>
                  )}
                  {!hasTypeSpecificForm && (
                    <div style={{ fontSize: 11, color: '#9CA3AF' }}>Ready to create as draft.</div>
                  )}
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginTop: 14,
                padding: '8px 10px',
                borderRadius: 8,
                background: '#F0F9FF',
                border: '1px solid #BAE6FD',
              }}>
                <span style={{ fontSize: 12 }}>&#9432;</span>
                <span style={{ fontSize: 11, color: '#0369A1' }}>
                  This asset will be created as a <strong>draft</strong>. You can publish it from the Registry after testing.
                </span>
              </div>

              {/* adk-fluent Code Preview */}
              <div style={{ marginTop: 14 }}>
                <button
                  onClick={() => setShowCode((v) => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #E5E7EB',
                    background: showCode ? '#F9FAFB' : '#fff',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#374151',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 14 }}>{showCode ? '\u25BE' : '\u25B8'}</span>
                  <span style={{ fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)', color: '#7C3AED' }}>adk-fluent</span>
                  <span>Python Code Preview</span>
                  {codePreview && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 9,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: '#ECFDF5',
                      color: '#047857',
                      fontWeight: 500,
                    }}>
                      {codePreview.dependencies.join(' + ')}
                    </span>
                  )}
                </button>
                {showCode && (
                  <div style={{
                    marginTop: 6,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid #E5E7EB',
                  }}>
                    {codeLoading ? (
                      <div style={{ padding: '20px', textAlign: 'center', fontSize: 11, color: '#9CA3AF' }}>
                        Generating adk-fluent code...
                      </div>
                    ) : codePreview ? (
                      <>
                        {/* Expression one-liner */}
                        <div style={{
                          padding: '8px 12px',
                          background: '#F9FAFB',
                          borderBottom: '1px solid #E5E7EB',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Expression</span>
                          <code style={{
                            fontSize: 11,
                            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                            color: '#7C3AED',
                            background: '#F5F3FF',
                            padding: '2px 6px',
                            borderRadius: 4,
                          }}>
                            {codePreview.expression}
                          </code>
                        </div>
                        {/* Full Python code */}
                        <pre style={{
                          margin: 0,
                          padding: '12px',
                          background: '#1E1E2E',
                          color: '#CDD6F4',
                          fontSize: 11,
                          lineHeight: 1.6,
                          fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                          overflowX: 'auto',
                          maxHeight: 260,
                          overflowY: 'auto',
                        }}>
                          {codePreview.python}
                        </pre>
                        {/* SKILL.md preview for skills */}
                        {codePreview.skillMd && (
                          <>
                            <div style={{
                              padding: '6px 12px',
                              background: '#F5F3FF',
                              borderTop: '1px solid #E5E7EB',
                              fontSize: 10,
                              fontWeight: 600,
                              color: '#6D28D9',
                              textTransform: 'uppercase',
                            }}>
                              SKILL.md
                            </div>
                            <pre style={{
                              margin: 0,
                              padding: '12px',
                              background: '#1E1E2E',
                              color: '#CDD6F4',
                              fontSize: 11,
                              lineHeight: 1.6,
                              fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                              overflowX: 'auto',
                              maxHeight: 200,
                              overflowY: 'auto',
                            }}>
                              {codePreview.skillMd}
                            </pre>
                          </>
                        )}
                        {/* Playbook reference */}
                        <div style={{
                          padding: '8px 12px',
                          background: '#F9FAFB',
                          borderTop: '1px solid #E5E7EB',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontSize: 10,
                          color: '#6B7280',
                        }}>
                          <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>Playbook ref</span>
                          <code style={{
                            fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                            color: chipColor.text,
                            background: chipColor.bg,
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: `1px solid ${chipColor.border}`,
                            fontSize: 11,
                          }}>
                            {codePreview.playbookRef}
                          </code>
                          <span style={{ marginLeft: 'auto', color: '#9CA3AF' }}>Use this reference in your playbook</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '12px', fontSize: 11, color: '#9CA3AF' }}>
                        Code preview not available.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button
            onClick={() => {
              if (step === 0 || (hasInitialType && step === 0)) {
                onClose();
              } else {
                setStep((s) => s - 1);
              }
            }}
            style={styles.btnSecondary}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={() => {
              if (isLastStep) {
                handleCreate();
              } else {
                setStep((s) => s + 1);
              }
            }}
            disabled={!canProceed}
            style={{
              ...styles.btnPrimary,
              background: canProceed ? (isLastStep ? chipColor.accent : '#2563EB') : '#93C5FD',
              cursor: canProceed ? 'pointer' : 'not-allowed',
            }}
          >
            {isLastStep ? `Create @${selectedType}` : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateAssetWizard;
