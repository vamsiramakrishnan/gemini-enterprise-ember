/**
 * ParameterTable — Editable table for tool parameters / schema fields.
 *
 * Each row: name, type, required toggle, description, default, validation.
 * Add/remove rows with smooth animations.
 */

import { useCallback } from 'react';

export interface ParameterRow {
  name: string;
  type: string;
  required: boolean;
  description: string;
  default?: string;
  validation?: string;
}

interface ParameterTableProps {
  parameters: ParameterRow[];
  onChange: (params: ParameterRow[]) => void;
  typeOptions?: string[];
  accentColor?: string;
  readOnly?: boolean;
}

function PlusIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M5 1.5v7M1.5 5h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10">
      <path d="M2 3h6M3.5 3V2a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M3 3l.5 5.5a.5.5 0 00.5.5h2a.5.5 0 00.5-.5L7 3" stroke="currentColor" strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </svg>
  );
}

const DEFAULT_TYPES = ['string', 'number', 'boolean', 'object', 'array'];

export function ParameterTable({
  parameters,
  onChange,
  typeOptions = DEFAULT_TYPES,
  accentColor = '#4F46E5',
  readOnly = false,
}: ParameterTableProps) {
  const update = useCallback(
    (index: number, field: keyof ParameterRow, value: string | boolean) => {
      const next = [...parameters];
      next[index] = { ...next[index], [field]: value };
      onChange(next);
    },
    [parameters, onChange],
  );

  const addRow = useCallback(() => {
    onChange([...parameters, { name: '', type: 'string', required: false, description: '' }]);
  }, [parameters, onChange]);

  const removeRow = useCallback(
    (index: number) => {
      onChange(parameters.filter((_, i) => i !== index));
    },
    [parameters, onChange],
  );

  const cellStyle = {
    fontSize: '11px',
    fontFamily: 'var(--font-ui)',
    borderColor: 'var(--color-border, #E5E7EB)',
    background: 'var(--color-bg-primary, #F9FAFB)',
    color: 'var(--color-text-primary, #111827)',
  };

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border, #E5E7EB)' }}>
      {/* Header */}
      <div
        className="grid gap-px px-3 py-2 text-[9px] font-bold uppercase tracking-wider"
        style={{
          gridTemplateColumns: '1.5fr 90px 52px 2fr auto',
          background: 'var(--color-bg-tertiary, #F3F4F6)',
          color: 'var(--color-text-tertiary, #9CA3AF)',
        }}
      >
        <span>Name</span>
        <span>Type</span>
        <span className="text-center">Req</span>
        <span>Description</span>
        {!readOnly && <span />}
      </div>

      {/* Rows */}
      {parameters.map((param, i) => (
        <div
          key={i}
          className="grid gap-px px-3 py-1.5 items-center border-t"
          style={{
            gridTemplateColumns: '1.5fr 90px 52px 2fr auto',
            borderColor: 'var(--color-border, #E5E7EB)',
          }}
        >
          <input
            value={param.name}
            onChange={(e) => update(i, 'name', e.target.value)}
            placeholder="param_name"
            readOnly={readOnly}
            className="px-2 py-1 rounded border text-[11px]"
            style={{ ...cellStyle, fontFamily: 'var(--font-mono)' }}
          />
          <select
            value={param.type}
            onChange={(e) => update(i, 'type', e.target.value)}
            disabled={readOnly}
            className="px-1.5 py-1 rounded border text-[11px]"
            style={cellStyle}
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <label className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={param.required}
              onChange={(e) => update(i, 'required', e.target.checked)}
              disabled={readOnly}
              className="w-3.5 h-3.5 rounded"
              style={{ accentColor }}
            />
          </label>
          <input
            value={param.description}
            onChange={(e) => update(i, 'description', e.target.value)}
            placeholder="Description"
            readOnly={readOnly}
            className="px-2 py-1 rounded border text-[11px]"
            style={cellStyle}
          />
          {!readOnly && (
            <button
              onClick={() => removeRow(i)}
              className="p-1 rounded transition-colors hover:bg-red-50"
              style={{ color: '#DC2626' }}
            >
              <TrashIcon />
            </button>
          )}
        </div>
      ))}

      {/* Add row */}
      {!readOnly && (
        <button
          onClick={addRow}
          className="w-full px-3 py-2 flex items-center gap-1.5 text-[11px] font-medium border-t transition-colors"
          style={{ borderColor: 'var(--color-border, #E5E7EB)', color: accentColor }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary, #F3F4F6)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <PlusIcon />
          Add Parameter
        </button>
      )}

      {/* Empty state */}
      {parameters.length === 0 && (
        <div className="px-3 py-4 text-center text-[11px]" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
          No parameters defined yet
        </div>
      )}
    </div>
  );
}
