/**
 * CreateAssetWizard — Multi-step creation wizard for agents, tools, skills,
 * and other @-referenceable assets.
 *
 * Step 1: Pick a type (visual cards)
 * Step 2: Type-specific configuration form
 * Step 3: Review & create
 *
 * Form components live in ./wizard/ subdirectory.
 */

import { useState, useCallback, useEffect } from 'react';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip } from '../../parser/types';
import { getAdkFluentService } from '../../services/adk-fluent';
import type { AssetCodeResult } from '../../services/adk-fluent';

import { wizardStyles, StepIndicator } from './wizard/WizardShared';
import { AgentForm, INITIAL_AGENT_FORM, type AgentFormState } from './wizard/AgentForm';
import { ToolForm, INITIAL_TOOL_FORM, type ToolFormState } from './wizard/ToolForm';
import { SkillForm, INITIAL_SKILL_FORM, type SkillFormState } from './wizard/SkillForm';
import { GuardForm, INITIAL_GUARD_FORM, type GuardFormState } from './wizard/GuardForm';
import { TriggerForm, INITIAL_TRIGGER_FORM, type TriggerFormState } from './wizard/TriggerForm';

// ─── Types ──────────────────────────────────────────────────────────────

export interface CreateAssetWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (partial: Partial<SmartChip> & { type: ChipType; name: string }) => void;
  initialType?: ChipType;
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

// ─── Name & Description Fields ──────────────────────────────────────────

function NameDescriptionFields({
  selectedType, name, setName, description, setDescription, chipColor,
}: {
  selectedType: ChipType; name: string; setName: (s: string) => void;
  description: string; setDescription: (s: string) => void;
  chipColor: { tint: string; text: string };
}) {
  return (
    <>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: '4px 10px 4px 6px', borderRadius: 6,
        background: chipColor.tint, color: chipColor.text,
        fontSize: 11, fontWeight: 600, marginBottom: 16,
      }}>
        <span>{CHIP_ICONS[selectedType]}</span>
        @{selectedType}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={wizardStyles.label}>Name</label>
        <input
          style={wizardStyles.input}
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
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={wizardStyles.label}>Description</label>
        <textarea
          style={wizardStyles.textarea}
          rows={2}
          placeholder="Brief description of this asset..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </>
  );
}

// ─── Review Step ────────────────────────────────────────────────────────

function ReviewStep({
  selectedType, name, description, chipColor,
  agentForm, toolForm, skillForm, guardForm, triggerForm,
  codePreview, codeLoading, showCode, setShowCode,
  hasTypeSpecificForm,
}: {
  selectedType: ChipType; name: string; description: string;
  chipColor: { accent: string; bg: string; border: string; text: string; tint: string };
  agentForm: AgentFormState; toolForm: ToolFormState; skillForm: SkillFormState;
  guardForm: GuardFormState; triggerForm: TriggerFormState;
  codePreview: AssetCodeResult | null; codeLoading: boolean;
  showCode: boolean; setShowCode: (v: boolean) => void;
  hasTypeSpecificForm: boolean;
}) {
  return (
    <div>
      <div style={{ padding: 16, borderRadius: 10, background: '#FAFAF9', border: '1px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 28, height: 28, borderRadius: 7,
            background: chipColor.accent, color: '#fff', fontSize: 14,
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
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 14,
        padding: '8px 10px', borderRadius: 8,
        background: '#F0F9FF', border: '1px solid #BAE6FD',
      }}>
        <span style={{ fontSize: 12 }}>&#9432;</span>
        <span style={{ fontSize: 11, color: '#0369A1' }}>
          This asset will be created as a <strong>draft</strong>. You can publish it from the Registry after testing.
        </span>
      </div>

      {/* adk-fluent Code Preview */}
      <div style={{ marginTop: 14 }}>
        <button
          onClick={() => setShowCode(!showCode)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            padding: '8px 10px', borderRadius: 8,
            border: '1px solid #E5E7EB',
            background: showCode ? '#F9FAFB' : '#fff',
            cursor: 'pointer', fontSize: 11, fontWeight: 600, color: '#374151',
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 14 }}>{showCode ? '\u25BE' : '\u25B8'}</span>
          <span style={{ fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)', color: '#7C3AED' }}>adk-fluent</span>
          <span>Python Code Preview</span>
          {codePreview && (
            <span style={{
              marginLeft: 'auto', fontSize: 9, padding: '2px 6px', borderRadius: 4,
              background: '#ECFDF5', color: '#047857', fontWeight: 500,
            }}>
              {codePreview.dependencies.join(' + ')}
            </span>
          )}
        </button>
        {showCode && (
          <div style={{ marginTop: 6, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            {codeLoading ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 11, color: '#9CA3AF' }}>
                Generating adk-fluent code...
              </div>
            ) : codePreview ? (
              <>
                <div style={{
                  padding: '8px 12px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase' }}>Expression</span>
                  <code style={{
                    fontSize: 11, fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    color: '#7C3AED', background: '#F5F3FF', padding: '2px 6px', borderRadius: 4,
                  }}>
                    {codePreview.expression}
                  </code>
                </div>
                <pre style={{
                  margin: 0, padding: '12px', background: '#1E1E2E', color: '#CDD6F4',
                  fontSize: 11, lineHeight: 1.6,
                  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                  overflowX: 'auto', maxHeight: 260, overflowY: 'auto',
                }}>
                  {codePreview.python}
                </pre>
                {codePreview.skillMd && (
                  <>
                    <div style={{
                      padding: '6px 12px', background: '#F5F3FF',
                      borderTop: '1px solid #E5E7EB',
                      fontSize: 10, fontWeight: 600, color: '#6D28D9', textTransform: 'uppercase',
                    }}>
                      SKILL.md
                    </div>
                    <pre style={{
                      margin: 0, padding: '12px', background: '#1E1E2E', color: '#CDD6F4',
                      fontSize: 11, lineHeight: 1.6,
                      fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                      overflowX: 'auto', maxHeight: 200, overflowY: 'auto',
                    }}>
                      {codePreview.skillMd}
                    </pre>
                  </>
                )}
                <div style={{
                  padding: '8px 12px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB',
                  display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#6B7280',
                }}>
                  <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>Playbook ref</span>
                  <code style={{
                    fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
                    color: chipColor.text, background: chipColor.bg,
                    padding: '2px 6px', borderRadius: 4, border: `1px solid ${chipColor.border}`,
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
  const [agentForm, setAgentForm] = useState<AgentFormState>({ ...INITIAL_AGENT_FORM });
  const [toolForm, setToolForm] = useState<ToolFormState>({ ...INITIAL_TOOL_FORM });
  const [skillForm, setSkillForm] = useState<SkillFormState>({ ...INITIAL_SKILL_FORM });
  const [guardForm, setGuardForm] = useState<GuardFormState>({ ...INITIAL_GUARD_FORM });
  const [triggerForm, setTriggerForm] = useState<TriggerFormState>({ ...INITIAL_TRIGGER_FORM });

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
    if (selectedType === 'agent') Object.assign(meta, agentForm);
    else if (selectedType === 'tool') Object.assign(meta, toolForm);
    else if (selectedType === 'skill') Object.assign(meta, {
      scope: skillForm.scope, activationMode: skillForm.activationMode,
      frontmatter: { name: name.trim(), description: skillForm.frontmatterDescription },
      body: skillForm.body, tags: skillForm.tags.split(',').map((s: string) => s.trim()).filter(Boolean),
    });
    else if (selectedType === 'guard') Object.assign(meta, guardForm);
    else if (selectedType === 'trigger') Object.assign(meta, triggerForm);

    getAdkFluentService()
      .generateAssetCode({ type: selectedType, name: name.trim(), description: description.trim(), metadata: meta })
      .then((result) => { setCodePreview(result); setCodeLoading(false); })
      .catch(() => setCodeLoading(false));
  }, [step, isOpen, name, description, selectedType, agentForm, toolForm, skillForm, guardForm, triggerForm, hasInitialType, totalSteps]);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;

    const metadata: Record<string, unknown> = {};

    if (selectedType === 'agent') {
      Object.assign(metadata, agentForm);
    } else if (selectedType === 'tool') {
      Object.assign(metadata, toolForm);
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
      Object.assign(metadata, guardForm);
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

    onCreate({ type: selectedType, name: name.trim(), description: description.trim(), metadata });
    onClose();
  }, [name, description, selectedType, agentForm, toolForm, skillForm, guardForm, triggerForm, onCreate, onClose]);

  if (!isOpen) return null;

  const chipColor = CHIP_COLORS[selectedType];
  const isLastStep = step === totalSteps - 1;
  const canProceed = step === 0 ? true : name.trim().length > 0;
  const hasTypeSpecificForm = ['agent', 'tool', 'skill', 'guard', 'trigger'].includes(selectedType);

  return (
    <div style={wizardStyles.overlay} onClick={onClose}>
      <div style={wizardStyles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={wizardStyles.header}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', margin: 0 }}>
              {step === 0 ? 'Create New Asset' : `New @${selectedType}`}
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
        <div style={wizardStyles.body}>
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
                      padding: '14px 12px', borderRadius: 10,
                      border: `2px solid ${isSelected ? c.accent : '#E5E7EB'}`,
                      background: isSelected ? c.bg : '#fff',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 24, height: 24, borderRadius: 6,
                        background: isSelected ? c.accent : c.tint,
                        color: isSelected ? '#fff' : c.text, fontSize: 12, fontWeight: 600,
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
              <NameDescriptionFields
                selectedType={selectedType} name={name} setName={setName}
                description={description} setDescription={setDescription}
                chipColor={chipColor}
              />
              {selectedType === 'agent' && <AgentForm state={agentForm} onChange={setAgentForm} />}
              {selectedType === 'tool' && <ToolForm state={toolForm} onChange={setToolForm} />}
              {selectedType === 'skill' && <SkillForm state={skillForm} onChange={setSkillForm} />}
              {selectedType === 'guard' && <GuardForm state={guardForm} onChange={setGuardForm} />}
              {selectedType === 'trigger' && <TriggerForm state={triggerForm} onChange={setTriggerForm} />}
            </>
          )}

          {/* Step 2: Review */}
          {step === totalSteps - 1 && step !== (hasInitialType ? 0 : 1) && (
            <ReviewStep
              selectedType={selectedType} name={name} description={description}
              chipColor={chipColor}
              agentForm={agentForm} toolForm={toolForm} skillForm={skillForm}
              guardForm={guardForm} triggerForm={triggerForm}
              codePreview={codePreview} codeLoading={codeLoading}
              showCode={showCode} setShowCode={setShowCode}
              hasTypeSpecificForm={hasTypeSpecificForm}
            />
          )}
        </div>

        {/* Footer */}
        <div style={wizardStyles.footer}>
          <button
            onClick={() => {
              if (step === 0 || (hasInitialType && step === 0)) onClose();
              else setStep((s) => s - 1);
            }}
            style={wizardStyles.btnSecondary}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <button
            onClick={() => {
              if (isLastStep) handleCreate();
              else setStep((s) => s + 1);
            }}
            disabled={!canProceed}
            style={{
              ...wizardStyles.btnPrimary,
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
