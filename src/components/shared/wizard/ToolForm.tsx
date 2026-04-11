/**
 * ToolForm — Type-specific wizard form for creating tools.
 */

import { Field, wizardStyles } from './WizardShared';

export interface ToolFormState {
  toolType: 'function' | 'mcp' | 'openapi';
  endpoint: string;
  parameters: Array<{ name: string; type: string; required: boolean; description: string }>;
  authMethod: 'none' | 'api-key' | 'oauth' | 'service-account';
}

export const INITIAL_TOOL_FORM: ToolFormState = {
  toolType: 'function',
  endpoint: '',
  parameters: [],
  authMethod: 'none',
};

export function ToolForm({ state, onChange }: { state: ToolFormState; onChange: (s: ToolFormState) => void }) {
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
          style={wizardStyles.select}
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
          style={wizardStyles.input}
          placeholder={state.toolType === 'mcp' ? 'http://localhost:8080/mcp' : 'https://api.example.com/v1/...'}
          value={state.endpoint}
          onChange={(e) => onChange({ ...state, endpoint: e.target.value })}
        />
      </Field>

      <Field label="Authentication">
        <select
          style={wizardStyles.select}
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
          <label style={wizardStyles.label}>Parameters</label>
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
              style={{ ...wizardStyles.input, flex: 2 }}
              placeholder="name"
              value={p.name}
              onChange={(e) => updateParameter(i, 'name', e.target.value)}
            />
            <select
              style={{ ...wizardStyles.select, flex: 1 }}
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
