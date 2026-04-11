/**
 * GuardForm — Type-specific wizard form for creating guards.
 */

import { Field, wizardStyles } from './WizardShared';

export interface GuardFormState {
  guardKind: string;
  phase: 'pre_model' | 'post_model';
  threshold: string;
}

export const INITIAL_GUARD_FORM: GuardFormState = {
  guardKind: 'pii',
  phase: 'post_model',
  threshold: '',
};

export function GuardForm({ state, onChange }: { state: GuardFormState; onChange: (s: GuardFormState) => void }) {
  return (
    <>
      <Field label="Guard Kind">
        <select
          style={wizardStyles.select}
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
          style={wizardStyles.select}
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
            style={{ ...wizardStyles.input, width: 140 }}
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
