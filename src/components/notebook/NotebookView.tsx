/**
 * NotebookView - Screen 2: Colab-style cell-based agent development view.
 *
 * A vertical notebook layout with distinct cell types, each with colored
 * left borders matching the chip color system. Cells include: Trigger,
 * Playbook, Tool, Test (with Loop Iteration Visualizer), Skill, Connector,
 * and Code Execution (the escape hatch).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTest, useNotifications, useConnectors } from '../../contexts/AppContext';
import type { SkillActivationResult } from '../../contexts/AppContext';

// ---------------------------------------------------------------------------
// Add Cell Divider — shown between cells on hover
// ---------------------------------------------------------------------------

const CELL_TYPES = [
  { label: 'Playbook', icon: '\u{1F4C4}' },
  { label: 'Tool', icon: '\u{1F527}' },
  { label: 'Test', icon: '\u25B6' },
  { label: 'Skill', icon: '\u2728' },
  { label: 'Connector', icon: '\u{1F517}' },
  { label: 'Schema', icon: '\u{1F4CB}' },
  { label: 'Code', icon: '\u26A0\uFE0F' },
];

function AddCellDivider() {
  const { addNotification } = useNotifications();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  return (
    <div className="relative flex items-center justify-center h-2 group">
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-transparent group-hover:bg-gray-300 transition-colors" />
      <button
        onClick={() => setShowMenu((v) => !v)}
        className="relative z-10 w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-400 text-sm leading-none opacity-0 group-hover:opacity-100 transition-all shadow-sm flex items-center justify-center"
        title="Add cell"
      >
        +
      </button>
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-7 z-50 bg-white rounded-lg border border-gray-200 shadow-lg py-1 min-w-[160px]"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Add cell</div>
          {CELL_TYPES.map((ct) => (
            <button
              key={ct.label}
              onClick={() => {
                setShowMenu(false);
                addNotification({ type: 'info', title: 'Add cell', message: `${ct.label} cell would be inserted here` });
              }}
              className="w-full text-left flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <span>{ct.icon}</span> {ct.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chip helper
// ---------------------------------------------------------------------------

type ChipKind =
  | 'doc' | 'tool' | 'agent' | 'guard' | 'data'
  | 'schema' | 'connector' | 'skill' | 'trigger';

const CHIP_SOFT: Record<ChipKind, { bg: string; text: string; border: string; accent: string }> = {
  doc:       { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4', accent: '#0D9488' },
  tool:      { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', accent: '#4F46E5' },
  agent:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', accent: '#D97706' },
  guard:     { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', accent: '#E11D48' },
  data:      { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', accent: '#059669' },
  schema:    { bg: '#F8FAFC', text: '#334155', border: '#CBD5E1', accent: '#475569' },
  connector: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', accent: '#2563EB' },
  skill:     { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', accent: '#7C3AED' },
  trigger:   { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', accent: '#EA580C' },
};

function Chip({ kind, label }: { kind: ChipKind; label: string }) {
  const c = CHIP_SOFT[kind];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold mx-0.5 whitespace-nowrap"
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.border}` }}
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
  headerLabel,
}: {
  borderColor: string;
  children: React.ReactNode;
  warningStripe?: boolean;
  headerLabel?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="rounded-xl bg-white shadow-sm overflow-hidden transition-all hover:shadow-md group/cell relative"
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
      {/* Drag handle — visual only */}
      <div
        className="absolute left-0 top-0 bottom-0 w-6 flex items-start pt-5 justify-center opacity-0 group-hover/cell:opacity-40 transition-opacity cursor-grab z-10"
        title="Drag to reorder"
        style={{ marginLeft: warningStripe ? 0 : -2 }}
      >
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
          <circle cx="2.5" cy="2" r="1.2" fill="#9CA3AF" />
          <circle cx="7.5" cy="2" r="1.2" fill="#9CA3AF" />
          <circle cx="2.5" cy="6" r="1.2" fill="#9CA3AF" />
          <circle cx="7.5" cy="6" r="1.2" fill="#9CA3AF" />
          <circle cx="2.5" cy="10" r="1.2" fill="#9CA3AF" />
          <circle cx="7.5" cy="10" r="1.2" fill="#9CA3AF" />
          <circle cx="2.5" cy="14" r="1.2" fill="#9CA3AF" />
          <circle cx="7.5" cy="14" r="1.2" fill="#9CA3AF" />
        </svg>
      </div>
      {/* Collapse/expand toggle */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="absolute right-3 top-3.5 z-10 w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all opacity-0 group-hover/cell:opacity-100"
        title={collapsed ? 'Expand cell' : 'Collapse cell'}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="transition-transform"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div className={warningStripe ? 'border-l-4' : ''} style={warningStripe ? { borderColor } : {}}>
        {collapsed ? (
          <div className="px-5 py-3 flex items-center gap-2 cursor-pointer select-none" onClick={() => setCollapsed(false)}>
            <span className="text-xs font-medium text-gray-400" style={{ fontFamily: 'var(--font-ui)' }}>
              {headerLabel || 'Cell'} <span className="text-[10px]">(collapsed)</span>
            </span>
          </div>
        ) : (
          children
        )}
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
  const { addNotification } = useNotifications();

  return (
    <Cell borderColor="#EA580C" headerLabel="Triggers">
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
              <button
                onClick={() => addNotification({ type: 'info', title: 'Trigger simulated', message: `Event dispatched to agent loop from @trigger(${t.name})` })}
                className="text-[10px] font-medium text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-orange-100"
              >
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

// Renders inline text with @type(name) chip references resolved to Chip components
function renderChipText(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /@(\w+)\(([^)]+)\)/g;
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(<span key={key++}>{text.slice(lastIdx, match.index)}</span>);
    }
    const kind = match[1] as ChipKind;
    if (CHIP_SOFT[kind]) {
      parts.push(<Chip key={key++} kind={kind} label={match[2]} />);
    } else {
      parts.push(<span key={key++}>{match[0]}</span>);
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push(<span key={key++}>{text.slice(lastIdx)}</span>);
  }
  return parts;
}

const PLAYBOOK_INITIAL_LINES = [
  '## Role',
  'You are an insurance claims processing assistant for ACME Insurance, serving customers across APAC markets.',
  '',
  '## Skills',
  'This agent uses @skill(customer-empathy) for tone and de-escalation patterns, and @skill(apac-compliance) for regional regulatory awareness.',
  '',
  '## Knowledge Sources',
  'Use @doc(claims-policy-2024) as the primary policy reference. For regional variations, consult @doc(apac-regulatory-matrix).',
  '',
  '## Connected Systems',
  '- @connector(salesforce) for customer account and policy data',
  '- @connector(jira) to create and track claims tickets',
  '- @connector(google-drive) for supporting document retrieval',
  '- @connector(slack) to notify the claims team channel',
  '',
  '## Process',
  'When a customer submits a claim:',
  '1. Greet the customer and collect their policy number',
  '2. Use @tool(policy-lookup) to retrieve their policy details',
  '3. Search @connector(salesforce) for the customer\'s account history',
  '4. Use @tool(claims-history) to check for prior claims in the last 12 months',
  '5. Validate the claim against @doc(claims-policy-2024) coverage rules',
  '',
  '### Escalation Rules',
  '- If claim amount exceeds $50,000, route to @agent(senior-adjuster)',
  '- If the policy is flagged, apply @guard(fraud-detection) before proceeding',
  '- For claims involving @data(high-risk-categories), require manager approval',
  '- Create a tracking ticket in @connector(jira) for all escalations',
  '- Notify @connector(slack) #claims-escalations channel',
  '',
  '### Response Format',
  'All responses must conform to @schema(claims-response-v2) and include the claim reference number and estimated processing time.',
  '',
  '## Compliance',
  'All interactions are subject to @guard(pii-redaction) and @guard(apac-compliance-rules). Never disclose internal policy thresholds.',
];

function PlaybookCell() {
  const [lines, setLines] = useState<string[]>(PLAYBOOK_INITIAL_LINES);
  const [editingLine, setEditingLine] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const startEdit = useCallback((idx: number) => {
    setEditingLine(idx);
    setEditValue(lines[idx]);
  }, [lines]);

  const commitEdit = useCallback(() => {
    if (editingLine === null) return;
    setLines((prev) => {
      const next = [...prev];
      next[editingLine] = editValue;
      return next;
    });
    setEditingLine(null);
  }, [editingLine, editValue]);

  useEffect(() => {
    if (editingLine !== null && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
    }
  }, [editingLine]);

  const renderLine = (text: string, idx: number) => {
    if (text === '') return <div key={idx} className="h-2" />;

    const isEditing = editingLine === idx;

    // Detect heading levels
    const h2Match = text.match(/^## (.+)/);
    const h3Match = text.match(/^### (.+)/);
    const isListItem = text.match(/^[-*] /);
    const isOrderedItem = text.match(/^\d+\. /);

    if (isEditing) {
      return (
        <div key={idx} className="relative">
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
              if (e.key === 'Escape') { setEditingLine(null); }
            }}
            rows={Math.max(1, Math.ceil(editValue.length / 80))}
            className="w-full text-xs px-3 py-1.5 rounded-md border-2 border-blue-400 bg-blue-50/30 text-gray-800 resize-none focus:outline-none"
            style={{ fontFamily: 'var(--font-mono)', lineHeight: '1.6' }}
          />
          <span className="absolute right-2 bottom-1 text-[9px] text-gray-400">
            Type @ for references &middot; Enter to save &middot; Esc to cancel
          </span>
        </div>
      );
    }

    const hoverClass = 'cursor-text hover:bg-teal-50/40 hover:outline hover:outline-1 hover:outline-teal-200 rounded px-1 -mx-1 transition-colors';

    if (h2Match) {
      return (
        <h2
          key={idx}
          onClick={() => startEdit(idx)}
          className={hoverClass}
          style={{ fontFamily: 'var(--font-ui)', fontSize: '1rem', fontWeight: 600, color: '#111827', margin: idx === 0 ? '0 0 0.5rem' : '1rem 0 0.5rem' }}
        >
          {h2Match[1]}
        </h2>
      );
    }
    if (h3Match) {
      return (
        <h3
          key={idx}
          onClick={() => startEdit(idx)}
          className={hoverClass}
          style={{ fontFamily: 'var(--font-ui)', fontSize: '0.875rem', fontWeight: 600, color: '#374151', margin: '1rem 0 0.5rem' }}
        >
          {h3Match[1]}
        </h3>
      );
    }
    if (isListItem) {
      return (
        <li
          key={idx}
          onClick={() => startEdit(idx)}
          className={`list-disc list-inside ${hoverClass}`}
        >
          {renderChipText(text.replace(/^[-*] /, ''))}
        </li>
      );
    }
    if (isOrderedItem) {
      return (
        <li
          key={idx}
          onClick={() => startEdit(idx)}
          className={`list-decimal list-inside ${hoverClass}`}
        >
          {renderChipText(text.replace(/^\d+\. /, ''))}
        </li>
      );
    }
    return (
      <p key={idx} onClick={() => startEdit(idx)} className={hoverClass}>
        {renderChipText(text)}
      </p>
    );
  };

  return (
    <Cell borderColor="#0D9488" headerLabel="Playbook">
      <div className="px-5 py-4">
        <h3
          className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          <span className="text-base">&#x1F4C4;</span> Playbook &mdash; Claims Processing Agent
          <span className="text-[10px] text-gray-400 font-normal ml-2">Click any line to edit</span>
        </h3>
        <div className="playbook-body text-sm leading-relaxed text-gray-700 space-y-1" style={{ fontFamily: 'var(--font-body)' }}>
          {lines.map((line, idx) => renderLine(line, idx))}
        </div>
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// 3. Tool Cell
// ---------------------------------------------------------------------------

interface ToolParam {
  name: string;
  type: string;
  required: boolean;
  desc: string;
  validation: string;
  example: string;
}

const TOOL_PARAMS_INITIAL: ToolParam[] = [
  { name: 'policy_id', type: 'string', required: true, desc: "The customer's policy ID", validation: 'regex: POL-[A-Z]{2}-[0-9]{6}', example: 'POL-SG-001234' },
  { name: 'include_riders', type: 'boolean', required: false, desc: 'Include policy riders/addons', validation: '\u2014', example: 'true' },
  { name: 'effective_date', type: 'date', required: false, desc: 'Check policy as of this date', validation: 'must be \u2264 today', example: '2024-01-15' },
  { name: 'format', type: 'enum', required: false, desc: 'Response format', validation: 'oneOf: summary, full, minimal', example: 'summary' },
];

// Inline editable text field used inside ToolCell
function InlineEdit({ value, onChange, mono, className }: { value: string; onChange: (v: string) => void; mono?: boolean; className?: string }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing && inputRef.current) inputRef.current.focus(); }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { onChange(draft); setEditing(false); }
          if (e.key === 'Escape') { setDraft(value); setEditing(false); }
        }}
        className={`border-2 border-blue-400 bg-blue-50/30 rounded px-1 py-0.5 text-gray-800 focus:outline-none ${className || ''}`}
        style={{ fontFamily: mono ? 'var(--font-mono)' : undefined, fontSize: 'inherit' }}
      />
    );
  }

  return (
    <span
      onClick={() => { setDraft(value); setEditing(true); }}
      className={`cursor-text hover:bg-indigo-50 hover:outline hover:outline-1 hover:outline-indigo-200 rounded px-1 -mx-1 transition-colors ${className || ''}`}
      style={{ fontFamily: mono ? 'var(--font-mono)' : undefined }}
    >
      {value}
    </span>
  );
}

function ToolCell() {
  const { runToolTest, running } = useTest();
  const { addNotification } = useNotifications();
  const [toolTestResult, setToolTestResult] = useState<string | null>(null);
  const [deploying, setDeploying] = useState(false);
  const [toolDesc] = useState('Retrieve customer policy details from the ACME policy management system');
  const [params, setParams] = useState<ToolParam[]>(TOOL_PARAMS_INITIAL);
  const [endpoint, setEndpoint] = useState('https://us-central1-acme-agents.cloudfunctions.net/policy-lookup');

  const updateParam = (idx: number, field: keyof ToolParam, value: string) => {
    setParams((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleTestTool = () => {
    setToolTestResult(null);
    runToolTest('tool-policy-lookup', { policy_id: 'POL-SG-001234', include_riders: false, format: 'summary' });
    setTimeout(() => {
      setToolTestResult('{ "policy_id": "POL-SG-001234", "coverage": "auto-comprehensive", "status": "active", "holder": "Sarah Chen" }');
    }, 1200);
  };

  const handleDeploy = () => {
    setDeploying(true);
    addNotification({ type: 'info', title: 'Deploy initiated', message: 'Deploying policy-lookup to Cloud Run...' });
    setTimeout(() => {
      setDeploying(false);
      addNotification({ type: 'success', title: 'Deploy complete', message: 'policy-lookup deployed to us-central1' });
    }, 2000);
  };

  return (
    <Cell borderColor="#4F46E5" headerLabel="Tool: policy-lookup">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-2">
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

        {/* Editable description */}
        <p className="text-xs text-gray-500 mb-4" style={{ fontFamily: 'var(--font-body)' }}>
          <InlineEdit value={toolDesc} onChange={() => {}} />
        </p>

        {/* Parameter table — editable cells */}
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
              {params.map((p, idx) => (
                <tr key={p.name} className="border-b border-gray-100 hover:bg-indigo-50/30 transition-colors">
                  <td className="py-2 pr-3 font-mono text-indigo-700 font-medium">
                    <InlineEdit value={p.name} onChange={(v) => updateParam(idx, 'name', v)} mono />
                  </td>
                  <td className="py-2 pr-3 text-gray-600">
                    <InlineEdit value={p.type} onChange={(v) => updateParam(idx, 'type', v)} />
                  </td>
                  <td className="py-2 pr-3">
                    {p.required ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">required</span>
                    ) : (
                      <span className="text-gray-400">optional</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-gray-600">
                    <InlineEdit value={p.desc} onChange={(v) => updateParam(idx, 'desc', v)} />
                  </td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-gray-500">
                    <InlineEdit value={p.validation} onChange={(v) => updateParam(idx, 'validation', v)} mono />
                  </td>
                  <td className="py-2 font-mono text-[10px] text-gray-500">
                    <InlineEdit value={p.example} onChange={(v) => updateParam(idx, 'example', v)} mono />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Editable Endpoint */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">Endpoint</span>
          <input
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            className="flex-1 text-[11px] px-3 py-1.5 rounded-md bg-gray-50 text-gray-700 border border-gray-200 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 hover:border-gray-300 transition-colors"
          />
        </div>

        {/* Tool test result */}
        {toolTestResult && (
          <div className="mb-4 rounded-lg overflow-hidden border border-green-200">
            <div className="flex items-center justify-between px-3 py-1 bg-green-50">
              <span className="text-[10px] font-semibold text-green-700">Test Result</span>
              <button onClick={() => setToolTestResult(null)} className="text-[10px] text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <pre className="text-[11px] leading-relaxed px-4 py-2.5 bg-white text-gray-700 overflow-x-auto" style={{ fontFamily: 'var(--font-mono)' }}>
              {toolTestResult}
            </pre>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestTool}
            disabled={running}
            className="text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {running ? <span className="inline-block w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> : null}
            Test
          </button>
          <button
            onClick={handleDeploy}
            disabled={deploying}
            className="text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {deploying ? <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
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
  const { runTest, running, currentResult } = useTest();
  const [expandedIterations, setExpandedIterations] = useState<Record<number, boolean>>({ 1: true, 2: true, 3: true });
  const [testInput, setTestInput] = useState('I was in a car accident last week. My policy number is POL-SG-004521. I need to file a claim for vehicle damage, estimated around $12,000.');
  const [hasRun, setHasRun] = useState(false);

  const toggleIteration = (id: number) => {
    setExpandedIterations((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleRun = () => {
    if (!testInput.trim() || running) return;
    setHasRun(true);
    runTest(testInput);
  };

  // Decide what to show: live context result if we ran, otherwise fallback static data
  const displayIterations = hasRun && currentResult
    ? currentResult.iterations.map((it) => ({
        id: it.index,
        observe: it.observe,
        reason: it.reason,
        act: { kind: it.act.chipType as ChipKind, label: it.act.chipName },
        result: it.result,
        timing: `${it.durationMs}ms`,
        decision: it.decision,
        decisionReason: it.decisionReason,
        guardChecks: it.guardChecks,
      }))
    : ITERATIONS.map((it) => ({ ...it, decision: it.id < 3 ? 'loop' as const : 'respond' as const, decisionReason: undefined as string | undefined, guardChecks: undefined as undefined }));

  const displayStats = hasRun && currentResult
    ? { iterations: currentResult.iterations.length, totalMs: currentResult.totalDurationMs, tokens: currentResult.tokenCount, allPassed: true }
    : { iterations: 3, totalMs: 1200, tokens: 847, allPassed: true };

  const displayFinalResponse = hasRun && currentResult?.status === 'complete' ? currentResult.finalResponse : null;

  return (
    <Cell borderColor="#16A34A" headerLabel="Test Run">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-sm font-semibold text-gray-900 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <span className="text-base">&#x25B6;</span> Test Run
          </h3>
          <button
            onClick={handleRun}
            disabled={running}
            className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {running ? (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>&#x25B6;</span>
            )}
            {running ? 'Running...' : 'Run'}
          </button>
        </div>

        {/* Input field */}
        <div className="mb-4">
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            rows={2}
            placeholder="Enter a test message to simulate the agent loop (e.g., 'I need to file a claim...')"
            className="w-full text-xs px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>

        {/* Iterations */}
        <div className="space-y-2">
          {displayIterations.map((iter, idx) => (
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
                    {iter.decision === 'loop' && (
                      <div className="text-[10px] text-gray-500 italic flex items-center gap-1">
                        &#x21BB; Decision: <span className="font-semibold text-blue-600">Loop again</span> &mdash; {iter.decisionReason || 'need more data'}
                      </div>
                    )}
                    {iter.decision === 'respond' && (
                      <div className="text-[10px] text-gray-500 italic flex items-center gap-1">
                        &#x2713; Decision: <span className="font-semibold text-green-600">Respond</span> &mdash; {iter.decisionReason || 'sufficient information gathered'}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Guard checks between iterations */}
              {iter.guardChecks && iter.guardChecks.length > 0 && idx < displayIterations.length - 1 && (
                <div className="flex items-center gap-2 px-4 py-1.5 flex-wrap">
                  {iter.guardChecks.map((g) => (
                    <span
                      key={g.chipName}
                      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        g.passed ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {g.passed ? '\u2713' : '\u2717'} <Chip kind="guard" label={g.chipName} /> <span className="font-mono text-gray-400">{g.durationMs}ms</span>
                    </span>
                  ))}
                </div>
              )}
              {/* Fallback guard checks for static data */}
              {!iter.guardChecks && idx < displayIterations.length - 1 && (
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

        {/* Running indicator */}
        {running && hasRun && (
          <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
            <span className="inline-block w-3 h-3 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-green-700 font-medium">Agent loop running...</span>
          </div>
        )}

        {/* Final response */}
        {displayFinalResponse && (
          <div className="mt-3 px-4 py-3 rounded-lg bg-green-50 border border-green-200">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-green-700 mb-1">Final Response</div>
            <p className="text-xs text-gray-700" style={{ fontFamily: 'var(--font-body)' }}>{displayFinalResponse}</p>
          </div>
        )}

        {/* Bottom stats */}
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-200">
          <span className="text-[10px] font-medium text-gray-500">
            <span className="font-semibold text-gray-700">{displayStats.iterations}</span> iterations
          </span>
          <span className="text-[10px] font-medium text-gray-500">
            <span className="font-semibold text-gray-700">{displayStats.totalMs >= 1000 ? `${(displayStats.totalMs / 1000).toFixed(1)}s` : `${displayStats.totalMs}ms`}</span> total
          </span>
          <span className="text-[10px] font-medium text-gray-500">
            <span className="font-semibold text-gray-700">{displayStats.tokens}</span> tokens
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
  const { runSkillActivation } = useTest();
  const { addNotification } = useNotifications();
  const [activationResult, setActivationResult] = useState<SkillActivationResult | null>(null);
  const [testingSkill, setTestingSkill] = useState(false);
  const [skillDescription, setSkillDescription] = useState(
    'Use when handling regulatory compliance in APAC markets. Covers MAS, APRA, RBI, OJK, and FSC regulations.'
  );
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(skillDescription);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const [skillInstructions, setSkillInstructions] = useState(
    `**Regional Rules:** When handling queries involving Singapore customers, always reference @doc(mas-guidelines-2024) and apply @guard(pdpa-compliance).

For Australian customers, consult @doc(apra-prudential-standards) and ensure responses conform to @schema(apra-disclosure-format).

**Connected Data:** Search @connector(salesforce) for customer jurisdiction data. Verify regulatory status via @tool(regtech-api).

**Escalation:** If a query involves cross-border transactions, route to @agent(compliance-officer) with full context attached.`
  );
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instrDraft, setInstrDraft] = useState(skillInstructions);
  const instrRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { if (editingDesc && descRef.current) descRef.current.focus(); }, [editingDesc]);
  useEffect(() => { if (editingInstructions && instrRef.current) instrRef.current.focus(); }, [editingInstructions]);

  const handleTestActivation = async () => {
    setTestingSkill(true);
    setActivationResult(null);
    try {
      const result = await runSkillActivation('apac-compliance', 'What are the KYC requirements for our Singapore clients?');
      setActivationResult(result);
    } finally {
      setTestingSkill(false);
    }
  };

  const handlePublish = () => {
    addNotification({ type: 'success', title: 'Skill published', message: 'apac-compliance v1.2.0 published to registry' });
  };

  // Render skill instruction text — supports **bold** and @chip references
  const renderInstructionText = (text: string) => {
    const paragraphs = text.split('\n\n');
    return paragraphs.map((para, pi) => {
      // Bold rendering
      const parts: React.ReactNode[] = [];
      const boldRegex = /\*\*(.+?)\*\*/g;
      let lastIdx = 0;
      let match: RegExpExecArray | null;
      let key = 0;
      const withChips = (s: string) => renderChipText(s);
      while ((match = boldRegex.exec(para)) !== null) {
        if (match.index > lastIdx) parts.push(<span key={`t${pi}-${key++}`}>{withChips(para.slice(lastIdx, match.index))}</span>);
        parts.push(<strong key={`b${pi}-${key++}`}>{withChips(match[1])}</strong>);
        lastIdx = boldRegex.lastIndex;
      }
      if (lastIdx < para.length) parts.push(<span key={`e${pi}-${key++}`}>{withChips(para.slice(lastIdx))}</span>);
      return <p key={pi}>{parts}</p>;
    });
  };

  return (
    <Cell borderColor="#7C3AED" headerLabel="Skill: apac-compliance">
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

        {/* Frontmatter — editable description */}
        <div className="rounded-lg bg-violet-50/50 border border-violet-200 px-4 py-3 mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 mb-2">Frontmatter</div>
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold text-gray-500 w-16 flex-shrink-0">name:</span>
              <span className="text-xs text-gray-700" style={{ fontFamily: 'var(--font-mono)' }}>apac-compliance</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-semibold text-gray-500 w-16 flex-shrink-0">description:</span>
              {editingDesc ? (
                <textarea
                  ref={descRef}
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={() => { setSkillDescription(descDraft); setEditingDesc(false); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setSkillDescription(descDraft); setEditingDesc(false); }
                    if (e.key === 'Escape') { setDescDraft(skillDescription); setEditingDesc(false); }
                  }}
                  rows={2}
                  className="flex-1 text-xs px-2 py-1 rounded border-2 border-blue-400 bg-blue-50/30 text-gray-800 resize-none focus:outline-none"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              ) : (
                <span
                  onClick={() => { setDescDraft(skillDescription); setEditingDesc(true); }}
                  className="text-xs text-gray-700 cursor-text hover:bg-violet-100/50 hover:outline hover:outline-1 hover:outline-violet-300 rounded px-1 -mx-1 transition-colors"
                  style={{ fontFamily: 'var(--font-body)' }}
                >
                  {skillDescription}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body — editable instructions */}
        <div className="mb-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-2">
            Instructions
            <span className="text-[9px] font-normal text-gray-400">Click to edit</span>
          </div>
          {editingInstructions ? (
            <div className="relative">
              <textarea
                ref={instrRef}
                value={instrDraft}
                onChange={(e) => setInstrDraft(e.target.value)}
                onBlur={() => { setSkillInstructions(instrDraft); setEditingInstructions(false); }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') { setInstrDraft(skillInstructions); setEditingInstructions(false); }
                }}
                rows={10}
                className="w-full text-xs px-3 py-2 rounded-md border-2 border-blue-400 bg-blue-50/30 text-gray-800 resize-y focus:outline-none"
                style={{ fontFamily: 'var(--font-mono)', lineHeight: '1.6' }}
              />
              <span className="absolute right-2 bottom-2 text-[9px] text-gray-400">
                Type @ for references &middot; Click outside to save &middot; Esc to cancel
              </span>
            </div>
          ) : (
            <div
              onClick={() => { setInstrDraft(skillInstructions); setEditingInstructions(true); }}
              className="text-xs text-gray-700 space-y-2 cursor-text hover:bg-violet-50/30 rounded-md p-2 -m-2 transition-colors hover:outline hover:outline-1 hover:outline-violet-200"
              style={{ fontFamily: 'var(--font-body)' }}
            >
              {renderInstructionText(skillInstructions)}
            </div>
          )}
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

        {/* Activation result */}
        {activationResult && (
          <div className={`mb-4 rounded-lg px-4 py-3 border ${activationResult.activated ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold ${activationResult.activated ? 'text-green-700' : 'text-yellow-700'}`}>
                {activationResult.activated ? '\u2713 Skill Activated' : '\u25CB Skill Not Activated'}
              </span>
              <span className="text-[10px] font-mono text-gray-500">
                confidence: {activationResult.confidence}
              </span>
            </div>
            {activationResult.response && (
              <p className="text-xs text-gray-700" style={{ fontFamily: 'var(--font-body)' }}>{activationResult.response}</p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestActivation}
            disabled={testingSkill}
            className="text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {testingSkill ? <span className="inline-block w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> : null}
            Test Activation
          </button>
          <button
            onClick={handlePublish}
            className="text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg transition-colors"
          >
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
  const { syncConnector, testQuery } = useConnectors();
  const [queryInput, setQueryInput] = useState('');
  const [queryResults, setQueryResults] = useState<{ results: string[]; latencyMs: number } | null>(null);
  const [querying, setQuerying] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    syncConnector('connector-jira');
    setTimeout(() => setSyncing(false), 500);
  };

  const handleQuery = async () => {
    if (!queryInput.trim() || querying) return;
    setQuerying(true);
    setQueryResults(null);
    try {
      const result = await testQuery('connector-jira', queryInput);
      setQueryResults(result);
    } finally {
      setQuerying(false);
    }
  };

  return (
    <Cell borderColor="#2563EB" headerLabel="Connector: Jira Cloud">
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

        {/* Query tester */}
        <div className="mb-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Query Tester</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
              placeholder="Try a natural language query..."
              className="flex-1 text-xs px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            />
            <button
              onClick={handleQuery}
              disabled={querying || !queryInput.trim()}
              className="text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {querying ? <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : null}
              Query
            </button>
          </div>
          {queryResults && (
            <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2">
              <div className="text-[10px] text-blue-600 font-medium mb-1">
                {queryResults.results.length} results ({queryResults.latencyMs}ms)
              </div>
              {queryResults.results.map((r, i) => (
                <div key={i} className="text-xs text-gray-700 py-0.5">{r}</div>
              ))}
            </div>
          )}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
          >
            {syncing ? <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : null}
            Sync Now
          </button>
          <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors">
            Open in Console &rarr;
          </a>
        </div>
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// 7. Schema Cell (with A2UI Preview)
// ---------------------------------------------------------------------------

const SCHEMA_JSON = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ClaimsResponseV2",
  "type": "object",
  "required": ["claim_reference", "status", "estimated_processing_time", "summary"],
  "properties": {
    "claim_reference": {
      "type": "string",
      "pattern": "^CLM-[0-9]{4}-[0-9]{2}-[0-9]{5}$",
      "description": "Unique claim reference number"
    },
    "status": {
      "type": "string",
      "enum": ["Under Review", "Approved", "Denied", "Escalated"],
      "description": "Current claim status"
    },
    "estimated_processing_time": {
      "type": "string",
      "description": "Human-readable estimated processing duration"
    },
    "summary": {
      "type": "string",
      "maxLength": 500,
      "description": "Brief summary of the claim assessment"
    }
  }
}`;

function SchemaCell() {
  const [activeView, setActiveView] = useState<'json' | 'form'>('json');

  return (
    <Cell borderColor="#475569" headerLabel="Schema: claims-response-v2">
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3
            className="text-sm font-semibold text-gray-900 flex items-center gap-2"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            <span className="text-base">&#x1F4CB;</span> Schema: claims-response-v2
            <Chip kind="schema" label="claims-response-v2" />
          </h3>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">v2.0</span>
        </div>

        {/* Toggle bar */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 mb-4">
          <button
            onClick={() => setActiveView('json')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
              activeView === 'json'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            JSON Schema
          </button>
          <button
            onClick={() => setActiveView('form')}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
              activeView === 'form'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Preview as Form
          </button>
        </div>

        {/* JSON Schema View */}
        {activeView === 'json' && (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-3 py-1.5 bg-gray-100 border-b border-gray-200">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">JSON Schema</span>
              <span className="text-[10px] text-gray-400">draft-07</span>
            </div>
            <pre
              className="text-[11px] leading-relaxed px-4 py-3 bg-white text-gray-700 overflow-x-auto"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {SCHEMA_JSON}
            </pre>
          </div>
        )}

        {/* A2UI Form Preview */}
        {activeView === 'form' && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-4">
              {/* Claim Reference Number */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
                  Claim Reference Number
                </label>
                <input
                  type="text"
                  readOnly
                  value="CLM-2026-04-00847"
                  className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 bg-gray-100 text-gray-700 cursor-default"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
                  Status
                </label>
                <select className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 cursor-pointer">
                  <option>Under Review</option>
                  <option>Approved</option>
                  <option>Denied</option>
                  <option>Escalated</option>
                </select>
              </div>

              {/* Estimated Processing Time */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
                  Estimated Processing Time
                </label>
                <input
                  type="text"
                  defaultValue="3-5 business days"
                  className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
                  Summary
                </label>
                <textarea
                  rows={3}
                  defaultValue={"Water damage claim for residential property under policy POL-SG-001234. Coverage verified under home-comprehensive plan. No prior related claims in the last 12 months. Risk assessment: low."}
                  className="w-full text-sm px-3 py-2 rounded-md border border-gray-300 bg-white text-gray-700 resize-none"
                  style={{ fontFamily: 'var(--font-body)' }}
                />
              </div>

              {/* Submit button */}
              <button className="text-sm font-medium text-white bg-[#1A73E8] hover:bg-[#1557B0] px-5 py-2 rounded-lg transition-colors">
                Submit Response
              </button>
            </div>

            {/* A2UI annotation */}
            <p className="text-[10px] text-gray-400 mt-4 pt-3 border-t border-slate-200 italic" style={{ fontFamily: 'var(--font-body)' }}>
              A2UI Surface &mdash; rendered from @schema definition. Agent output conforms to this structure.
            </p>
          </div>
        )}
      </div>
    </Cell>
  );
}

// ---------------------------------------------------------------------------
// 8. Code Execution Cell (Escape Hatch)
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
  const { addNotification } = useNotifications();
  const [code, setCode] = useState(SAMPLE_CODE);
  const [output, setOutput] = useState(SAMPLE_OUTPUT);
  const [executionTime, setExecutionTime] = useState('142ms');
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = () => {
    setIsRunning(true);
    setOutput('');
    setTimeout(() => {
      setOutput(SAMPLE_OUTPUT);
      setExecutionTime('138ms');
      setIsRunning(false);
    }, 800);
  };

  const handleConvertToTool = () => {
    addNotification({ type: 'success', title: 'Converted to Tool', message: 'New tool definition cell created from prototype code' });
  };

  const handleConvertToSkill = () => {
    addNotification({ type: 'success', title: 'Converted to Skill', message: 'New SKILL.md created with bundled script' });
  };

  return (
    <Cell borderColor="#DC2626" warningStripe headerLabel="Code Execution">
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
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="text-xs font-semibold text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {isRunning ? (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>&#x25B6;</span>
            )}
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>

        <p className="text-[10px] text-gray-500 mb-3 italic" style={{ fontFamily: 'var(--font-body)' }}>
          The omnipotent harness: prototype any capability before hardening it into a governed @tool or @skill.
        </p>

        {/* Code editor area — editable textarea */}
        <div className="rounded-lg overflow-hidden border border-gray-300 mb-3">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800 text-gray-300">
            <span className="text-[10px] font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Python 3.12
            </span>
            <span className="text-[10px] text-gray-500">prototype_return_check.py</span>
          </div>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            spellCheck={false}
            className="w-full text-[11px] leading-relaxed px-4 py-3 bg-gray-900 text-gray-300 resize-y focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 min-h-[120px]"
            style={{ fontFamily: 'var(--font-mono)' }}
            rows={Math.max(8, code.split('\n').length)}
            placeholder="# Write Python code here..."
          />
        </div>

        {/* Output */}
        <div className="rounded-lg overflow-hidden border border-gray-200 mb-4">
          <div className="flex items-center justify-between px-3 py-1 bg-gray-100">
            <span className="text-[10px] font-semibold text-gray-500">Output</span>
            <span className="text-[10px] text-gray-400 font-mono">{executionTime}</span>
          </div>
          <pre
            className="text-[11px] leading-relaxed px-4 py-2.5 bg-white text-green-700 overflow-x-auto min-h-[40px]"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {isRunning ? <span className="text-gray-400 animate-pulse">Executing...</span> : (output || <span className="text-gray-400">No output yet</span>)}
          </pre>
        </div>

        {/* Promotion actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleConvertToTool}
            className="text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
            <span>&#x1F527;</span> Convert to Tool
          </button>
          <button
            onClick={handleConvertToSkill}
            className="text-xs font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
          >
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
      className="h-full"
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
            <div>
              <h1 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>
                Claims Processing Agent
              </h1>
              <span className="text-[10px] text-gray-500">Notebook View &mdash; 8 cells</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
              v2.1 Production
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
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-1">
        <TriggerCell />
        <AddCellDivider />
        <PlaybookCell />
        <AddCellDivider />
        <ToolCell />
        <AddCellDivider />
        <TestCell />
        <AddCellDivider />
        <SkillCell />
        <AddCellDivider />
        <ConnectorCell />
        <AddCellDivider />
        <SchemaCell />
        <AddCellDivider />
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
