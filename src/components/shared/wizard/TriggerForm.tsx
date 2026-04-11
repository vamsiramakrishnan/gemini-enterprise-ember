/**
 * TriggerForm — Type-specific wizard form for creating triggers.
 *
 * Driven by TRIGGER_CONFIG — adding a new trigger type requires
 * zero changes to this file. Form fields are declared in the config.
 */

import { TRIGGER_CONFIG, TRIGGER_OPTIONS } from '../../../config';
import type { TriggerType } from '../../../config';
import { Field, wizardStyles } from './WizardShared';

export interface TriggerFormState {
  triggerType: string;
  [key: string]: string; // dynamic fields from config
}

export const INITIAL_TRIGGER_FORM: TriggerFormState = {
  triggerType: 'chat',
  cronExpression: '',
  queueName: '',
  eventSource: '',
  eventType: '',
};

export function TriggerForm({ state, onChange }: { state: TriggerFormState; onChange: (s: TriggerFormState) => void }) {
  const triggerType = state.triggerType as TriggerType;
  const config = TRIGGER_CONFIG[triggerType];

  return (
    <>
      <Field label="Trigger Type">
        <select
          style={wizardStyles.select}
          value={state.triggerType}
          onChange={(e) => onChange({ ...state, triggerType: e.target.value })}
        >
          {TRIGGER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </Field>
      {config?.formFields.map((field) => (
        <Field key={field.key} label={field.label}>
          <input
            style={wizardStyles.input}
            type={field.type ?? 'text'}
            placeholder={field.placeholder}
            value={state[field.key] ?? ''}
            onChange={(e) => onChange({ ...state, [field.key]: e.target.value })}
          />
        </Field>
      ))}
    </>
  );
}
