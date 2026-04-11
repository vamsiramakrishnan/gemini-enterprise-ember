/**
 * GuardForm — Type-specific wizard form for creating guards.
 *
 * Driven by GUARD_CONFIG — adding a new guard kind requires
 * zero changes to this file.
 */

import { GUARD_CONFIG, GUARD_OPTIONS, GUARD_PHASES } from '../../../config';
import type { GuardKind } from '../../../parser/types';
import { Field, wizardStyles } from './WizardShared';

export interface GuardFormState {
  guardKind: string;
  phase: string;
  threshold: string;
}

export const INITIAL_GUARD_FORM: GuardFormState = {
  guardKind: 'pii',
  phase: 'post_model',
  threshold: '',
};

export function GuardForm({ state, onChange }: { state: GuardFormState; onChange: (s: GuardFormState) => void }) {
  const kindConfig = GUARD_CONFIG[state.guardKind as GuardKind];

  return (
    <>
      <Field label="Guard Kind">
        <select
          style={wizardStyles.select}
          value={state.guardKind}
          onChange={(e) => onChange({ ...state, guardKind: e.target.value, phase: GUARD_CONFIG[e.target.value as GuardKind]?.defaultPhase ?? 'post_model' })}
        >
          {GUARD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Field>
      <Field label="Phase">
        <select
          style={wizardStyles.select}
          value={state.phase}
          onChange={(e) => onChange({ ...state, phase: e.target.value })}
        >
          {GUARD_PHASES.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Field>
      {kindConfig?.thresholdField && (
        <Field label={kindConfig.thresholdField.label}>
          <input
            style={{ ...wizardStyles.input, width: 140 }}
            type="number"
            step={kindConfig.thresholdField.step}
            placeholder={kindConfig.thresholdField.placeholder}
            value={state.threshold}
            onChange={(e) => onChange({ ...state, threshold: e.target.value })}
          />
        </Field>
      )}
    </>
  );
}
