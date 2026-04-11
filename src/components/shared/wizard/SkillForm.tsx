/**
 * SkillForm — Type-specific wizard form for creating skills.
 */

import { Field, wizardStyles } from './WizardShared';

export interface SkillFormState {
  scope: 'workspace' | 'user' | 'extension';
  activationMode: 'pinned' | 'on-demand';
  frontmatterDescription: string;
  body: string;
  tags: string;
}

export const INITIAL_SKILL_FORM: SkillFormState = {
  scope: 'workspace',
  activationMode: 'on-demand',
  frontmatterDescription: '',
  body: '',
  tags: '',
};

export function SkillForm({ state, onChange }: { state: SkillFormState; onChange: (s: SkillFormState) => void }) {
  return (
    <>
      <Field label="Scope">
        <select
          style={wizardStyles.select}
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
              {mode === 'pinned' ? 'Pinned (always active)' : 'On-Demand (auto-activated)'}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Activation Description (determines when LLM auto-activates)">
        <textarea
          style={wizardStyles.textarea}
          rows={3}
          placeholder="Use this skill when the agent handles..."
          value={state.frontmatterDescription}
          onChange={(e) => onChange({ ...state, frontmatterDescription: e.target.value })}
        />
      </Field>

      <Field label="Skill Instructions (SKILL.md body — supports @references)">
        <textarea
          style={{ ...wizardStyles.textarea, fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)', fontSize: 12, lineHeight: 1.6 }}
          rows={6}
          placeholder={"# My Skill\n\n## Instructions\nWhen handling queries about...\n\nUse @doc(my-doc) for reference.\nApply @guard(my-guard) for safety."}
          value={state.body}
          onChange={(e) => onChange({ ...state, body: e.target.value })}
        />
      </Field>

      <Field label="Tags (comma-separated)">
        <input
          style={wizardStyles.input}
          placeholder="e.g. compliance, apac, regulatory"
          value={state.tags}
          onChange={(e) => onChange({ ...state, tags: e.target.value })}
        />
      </Field>
    </>
  );
}
