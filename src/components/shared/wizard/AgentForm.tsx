/**
 * AgentForm — Type-specific wizard form for creating agents.
 */

import { Field, wizardStyles } from './WizardShared';

export interface AgentFormState {
  model: string;
  systemPrompt: string;
  tools: string[];
  delegatesTo: string[];
  maxTurns: number;
}

export const INITIAL_AGENT_FORM: AgentFormState = {
  model: 'gemini-2.5-pro',
  systemPrompt: '',
  tools: [],
  delegatesTo: [],
  maxTurns: 10,
};

export function AgentForm({ state, onChange }: { state: AgentFormState; onChange: (s: AgentFormState) => void }) {
  return (
    <>
      <Field label="Model">
        <select
          style={wizardStyles.select}
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
          style={wizardStyles.textarea}
          rows={4}
          placeholder="You are an agent that..."
          value={state.systemPrompt}
          onChange={(e) => onChange({ ...state, systemPrompt: e.target.value })}
        />
      </Field>
      <Field label="Tools (comma-separated @tool names)">
        <input
          style={wizardStyles.input}
          placeholder="e.g. policy-lookup, claims-history"
          value={state.tools.join(', ')}
          onChange={(e) => onChange({ ...state, tools: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
        />
      </Field>
      <Field label="Delegates To (comma-separated @agent names)">
        <input
          style={wizardStyles.input}
          placeholder="e.g. senior-adjuster, fraud-specialist"
          value={state.delegatesTo.join(', ')}
          onChange={(e) => onChange({ ...state, delegatesTo: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
        />
      </Field>
      <Field label="Max Turns">
        <input
          style={{ ...wizardStyles.input, width: 100 }}
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
