/**
 * SchemaEditor -- Dedicated editor for @schema chip type.
 *
 * Maps to `agent @ OutputSchema` in adk-fluent, where OutputSchema is a
 * Pydantic BaseModel. Provides a visual builder and JSON Schema view for
 * defining the output constraint shape, plus live sample output preview
 * and generated Pydantic class code.
 *
 * Uses EditorShell two-panel layout (60/40 split) with no test panel.
 */

import { useState, useMemo, useCallback } from 'react';
import { EditorShell, SegmentedControl, CodePreview, ParameterTable } from '../editors';
import type { ParameterRow } from '../editors';

// -- Schema-specific color tokens ----------------------------------------

const COLORS = {
  accent: '#475569',
  bg: '#F7F8FA',
  text: '#334155',
  border: '#CDD1D8',
  tint: '#E6E8EC',
} as const;

// -- Extended type options for Pydantic fields ----------------------------

const SCHEMA_TYPE_OPTIONS = [
  'str',
  'int',
  'float',
  'bool',
  'list',
  'dict',
  'Optional',
];

// -- Initial field definitions --------------------------------------------

const INITIAL_FIELDS: ParameterRow[] = [
  {
    name: 'claim_ref',
    type: 'str',
    required: true,
    description: 'Unique claim reference number',
  },
  {
    name: 'status',
    type: 'str',
    required: true,
    description: 'Current claim status',
    validation: 'oneOf: pending,approved,denied,escalated',
  },
  {
    name: 'estimated_time',
    type: 'str',
    required: true,
    description: 'Estimated processing time',
  },
  {
    name: 'next_steps',
    type: 'list',
    required: true,
    description: 'Ordered list of next steps for the customer',
  },
  {
    name: 'customer_message',
    type: 'str',
    required: true,
    description: 'Human-readable message for the customer',
  },
];

// -- Helpers --------------------------------------------------------------

/** Map internal type names to JSON Schema types. */
function toJsonSchemaType(t: string): string {
  switch (t) {
    case 'str':
      return 'string';
    case 'int':
    case 'float':
      return 'number';
    case 'bool':
      return 'boolean';
    case 'list':
      return 'array';
    case 'dict':
      return 'object';
    case 'Optional':
      return 'string';
    default:
      return 'string';
  }
}

/** Map internal type names to Python type annotations. */
function toPythonType(t: string): string {
  switch (t) {
    case 'str':
      return 'str';
    case 'int':
      return 'int';
    case 'float':
      return 'float';
    case 'bool':
      return 'bool';
    case 'list':
      return 'list[str]';
    case 'dict':
      return 'dict[str, Any]';
    case 'Optional':
      return 'Optional[str]';
    default:
      return 'str';
  }
}

/** Generate a realistic sample value for a given type and field name. */
function sampleValue(name: string, type: string, validation?: string): unknown {
  if (validation) {
    const oneOfMatch = validation.match(/oneOf:\s*(.+)/);
    if (oneOfMatch) {
      const opts = oneOfMatch[1].split(',').map((s) => s.trim());
      return opts[0] || 'pending';
    }
  }
  switch (type) {
    case 'int':
      return 42;
    case 'float':
      return 3.14;
    case 'bool':
      return true;
    case 'list':
      if (name.includes('step'))
        return [
          'Review claim documentation',
          'Verify policy coverage',
          'Await adjuster assignment',
        ];
      return ['item_1', 'item_2'];
    case 'dict':
      return { key: 'value' };
    case 'Optional':
      return null;
    default:
      break;
  }
  // String fallback -- generate contextual sample based on field name
  if (name.includes('ref') || name.includes('id'))
    return 'CLM-AU-2026-004817';
  if (name.includes('time'))
    return '3-5 business days';
  if (name.includes('message'))
    return 'Your claim has been received and is currently under review. A claims adjuster will be assigned within 24 hours.';
  if (name.includes('status'))
    return 'pending';
  return 'example_value';
}

/** Convert a PascalCase class name to a display name. */
function classNameToDisplay(className: string): string {
  return className.replace(/([a-z])([A-Z])/g, '$1 $2');
}

// -- Sub-components -------------------------------------------------------

/** Identity card showing schema name, description, and class name. */
function SchemaIdentityCard({
  name,
  description,
  className,
  onNameChange,
  onDescriptionChange,
  onClassNameChange,
}: {
  name: string;
  description: string;
  className: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onClassNameChange: (v: string) => void;
}) {
  return (
    <div
      className="rounded-lg border p-4 space-y-3"
      style={{
        borderColor: COLORS.border,
        background: 'var(--color-bg-surface, #FFFFFF)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold"
          style={{
            background: COLORS.tint,
            color: COLORS.accent,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          {'\u25A2'}
        </span>
        <span
          className="text-[10px] font-bold uppercase tracking-wider"
          style={{ color: COLORS.text }}
        >
          Schema Identity
        </span>
      </div>

      {/* Name */}
      <div>
        <label
          className="block text-[10px] font-semibold uppercase tracking-wider mb-1"
          style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
        >
          Schema Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full px-3 py-1.5 rounded-md border text-[12px]"
          style={{
            fontFamily: 'var(--font-mono)',
            borderColor: COLORS.border,
            background: COLORS.bg,
            color: 'var(--color-text-primary, #111827)',
          }}
        />
      </div>

      {/* Description */}
      <div>
        <label
          className="block text-[10px] font-semibold uppercase tracking-wider mb-1"
          style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={2}
          className="w-full px-3 py-1.5 rounded-md border text-[11px] resize-none"
          style={{
            fontFamily: 'var(--font-ui)',
            borderColor: COLORS.border,
            background: COLORS.bg,
            color: 'var(--color-text-primary, #111827)',
          }}
        />
      </div>

      {/* Pydantic class name */}
      <div>
        <label
          className="block text-[10px] font-semibold uppercase tracking-wider mb-1"
          style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
        >
          Pydantic Class Name
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={className}
            onChange={(e) => onClassNameChange(e.target.value)}
            className="flex-1 px-3 py-1.5 rounded-md border text-[12px]"
            style={{
              fontFamily: 'var(--font-mono)',
              borderColor: COLORS.border,
              background: COLORS.bg,
              color: 'var(--color-text-primary, #111827)',
            }}
          />
          <span
            className="text-[10px] px-2 py-1 rounded-md whitespace-nowrap"
            style={{ background: COLORS.tint, color: COLORS.text }}
          >
            {classNameToDisplay(className)}
          </span>
        </div>
      </div>
    </div>
  );
}

/** JSON Schema read-only textarea display. */
function JsonSchemaView({ schema }: { schema: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
        >
          Generated JSON Schema
        </span>
        <span
          className="text-[9px] px-2 py-0.5 rounded-md"
          style={{ background: COLORS.tint, color: COLORS.text }}
        >
          Read-only (derived from fields)
        </span>
      </div>
      <textarea
        readOnly
        value={schema}
        rows={18}
        className="w-full px-4 py-3 rounded-lg border text-[11px] leading-relaxed resize-none"
        style={{
          fontFamily: 'var(--font-mono)',
          borderColor: COLORS.border,
          background: '#1E1E2E',
          color: '#CDD6F4',
        }}
      />
    </div>
  );
}

/** A2UI surface toggle section. */
function A2UISurfaceToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: COLORS.border,
        background: 'var(--color-bg-surface, #FFFFFF)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
            <rect
              x="1"
              y="2"
              width="12"
              height="10"
              rx="1.5"
              stroke={COLORS.accent}
              strokeWidth="1.1"
              fill="none"
            />
            <line
              x1="1"
              y1="5"
              x2="13"
              y2="5"
              stroke={COLORS.accent}
              strokeWidth="0.8"
              opacity="0.5"
            />
            <rect
              x="3"
              y="7"
              width="4"
              height="1.5"
              rx="0.5"
              fill={COLORS.accent}
              opacity="0.4"
            />
            <rect
              x="3"
              y="9.5"
              width="6"
              height="1"
              rx="0.5"
              fill={COLORS.accent}
              opacity="0.25"
            />
          </svg>
          <span
            className="text-[11px] font-medium"
            style={{ color: 'var(--color-text-primary, #111827)' }}
          >
            A2UI Surface Mapping
          </span>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div
            className="w-8 h-4.5 rounded-full peer peer-checked:after:translate-x-3.5 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all"
            style={{
              background: enabled ? COLORS.accent : '#D1D5DB',
            }}
          />
        </label>
      </div>
      <p
        className="text-[10px] mt-2 leading-relaxed"
        style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
      >
        Enable to use this schema as a declarative UI surface definition.
        When active, fields map to A2UI components (text fields, selects,
        buttons) and the schema renders as an interactive form in the chat
        interface via the A2UI protocol.
      </p>
    </div>
  );
}

/** Live sample output preview card. */
function SampleOutputPreview({ sample }: { sample: string }) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: COLORS.border }}
    >
      <div
        className="px-4 py-2.5 flex items-center justify-between border-b"
        style={{
          background: COLORS.tint,
          borderColor: COLORS.border,
        }}
      >
        <div className="flex items-center gap-2">
          <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
            <path
              d="M2 3l3 3-3 3M6.5 9H10"
              stroke={COLORS.accent}
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: COLORS.text }}
          >
            Sample Output
          </span>
        </div>
        <span
          className="text-[9px] px-2 py-0.5 rounded-md"
          style={{ background: '#DCFCE7', color: '#166534' }}
        >
          Valid
        </span>
      </div>
      <pre
        className="px-4 py-3 text-[11px] leading-relaxed whitespace-pre-wrap overflow-x-auto"
        style={{
          fontFamily: 'var(--font-mono)',
          background: '#1E1E2E',
          color: '#CDD6F4',
        }}
      >
        {sample}
      </pre>
    </div>
  );
}

/** Validation stats card. */
function ValidationStats({ fields }: { fields: ParameterRow[] }) {
  const total = fields.length;
  const required = fields.filter((f) => f.required).length;
  const optional = total - required;

  return (
    <div
      className="rounded-lg border p-4"
      style={{
        borderColor: COLORS.border,
        background: 'var(--color-bg-surface, #FFFFFF)',
      }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
      >
        Validation Summary
      </span>
      <div className="flex items-center gap-4 mt-3">
        <StatBlock label="Fields" value={total} color={COLORS.accent} />
        <div
          className="w-px h-8"
          style={{ background: COLORS.border }}
        />
        <StatBlock label="Required" value={required} color="#059669" />
        <div
          className="w-px h-8"
          style={{ background: COLORS.border }}
        />
        <StatBlock label="Optional" value={optional} color="#9CA3AF" />
      </div>
      {fields.some((f) => f.validation) && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: COLORS.border }}>
          <span
            className="text-[10px] font-medium"
            style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
          >
            Constraints defined:
          </span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {fields
              .filter((f) => f.validation)
              .map((f) => (
                <span
                  key={f.name}
                  className="text-[10px] px-2 py-0.5 rounded-md"
                  style={{
                    background: COLORS.tint,
                    color: COLORS.text,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {f.name}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className="text-[18px] font-bold tabular-nums"
        style={{ color, fontFamily: 'var(--font-ui)' }}
      >
        {value}
      </span>
      <span
        className="text-[9px] font-medium uppercase tracking-wider"
        style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
      >
        {label}
      </span>
    </div>
  );
}

// -- Main component -------------------------------------------------------

export function SchemaEditor() {
  // -- State ---------------------------------------------------------------

  const [schemaName, setSchemaName] = useState('claims-response-v2');
  const [description, setDescription] = useState(
    'Standard response schema for claims processing agent. Constrains all claim-related outputs to include a reference number, status, timeline, actionable next steps, and a human-readable message.',
  );
  const [pydanticClassName, setPydanticClassName] = useState('ClaimsResponseV2');
  const [viewMode, setViewMode] = useState<'visual' | 'json'>('visual');
  const [fields, setFields] = useState<ParameterRow[]>(INITIAL_FIELDS);
  const [a2uiEnabled, setA2uiEnabled] = useState(false);

  // -- Derived values ------------------------------------------------------

  const handleFieldsChange = useCallback((next: ParameterRow[]) => {
    setFields(next);
  }, []);

  /** Generate JSON Schema from field definitions. */
  const jsonSchema = useMemo(() => {
    const properties: Record<string, Record<string, unknown>> = {};
    const requiredFields: string[] = [];

    for (const f of fields) {
      const prop: Record<string, unknown> = {
        type: toJsonSchemaType(f.type),
        description: f.description,
      };

      if (f.type === 'list') {
        prop.items = { type: 'string' };
      }

      if (f.validation) {
        const oneOfMatch = f.validation.match(/oneOf:\s*(.+)/);
        if (oneOfMatch) {
          prop.enum = oneOfMatch[1].split(',').map((s) => s.trim());
        }
      }

      if (f.default !== undefined && f.default !== '') {
        prop.default = f.default;
      }

      properties[f.name] = prop;

      if (f.required) {
        requiredFields.push(f.name);
      }
    }

    const schema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: pydanticClassName,
      description,
      type: 'object' as const,
      properties,
      required: requiredFields,
      additionalProperties: false,
    };

    return JSON.stringify(schema, null, 2);
  }, [fields, pydanticClassName, description]);

  /** Generate sample output JSON. */
  const sampleOutput = useMemo(() => {
    const sample: Record<string, unknown> = {};
    for (const f of fields) {
      sample[f.name] = sampleValue(f.name, f.type, f.validation);
    }
    return JSON.stringify(sample, null, 2);
  }, [fields]);

  /** Generate Pydantic class definition. */
  const pydanticCode = useMemo(() => {
    const lines: string[] = [
      'from pydantic import BaseModel, Field',
      'from typing import Optional, Any',
      '',
      '',
      `class ${pydanticClassName}(BaseModel):`,
      `    """${description}"""`,
      '',
    ];

    for (const f of fields) {
      const pyType = toPythonType(f.type);
      const fieldArgs: string[] = [];

      if (f.description) {
        fieldArgs.push(`description="${f.description}"`);
      }
      if (f.validation) {
        const oneOfMatch = f.validation.match(/oneOf:\s*(.+)/);
        if (oneOfMatch) {
          // Use Literal type for enum-like constraints
          const opts = oneOfMatch[1]
            .split(',')
            .map((s) => `"${s.trim()}"`)
            .join(', ');
          lines.push(
            `    ${f.name}: Literal[${opts}] = Field(${fieldArgs.join(', ')})`,
          );
          continue;
        }
      }

      if (!f.required && f.default !== undefined && f.default !== '') {
        fieldArgs.unshift(`default="${f.default}"`);
      } else if (!f.required) {
        fieldArgs.unshift('default=None');
      }

      const fieldSuffix =
        fieldArgs.length > 0 ? ` = Field(${fieldArgs.join(', ')})` : '';
      lines.push(`    ${f.name}: ${pyType}${fieldSuffix}`);
    }

    return lines.join('\n');
  }, [fields, pydanticClassName, description]);

  const expressionStr = `agent @ ${pydanticClassName}`;

  // -- Layout via EditorShell ----------------------------------------------

  const leftPanel = (
    <>
      {/* 1. Schema identity */}
      <SchemaIdentityCard
        name={schemaName}
        description={description}
        className={pydanticClassName}
        onNameChange={setSchemaName}
        onDescriptionChange={setDescription}
        onClassNameChange={setPydanticClassName}
      />

      {/* 2. View toggle */}
      <div className="flex items-center gap-3">
        <SegmentedControl
          options={[
            { value: 'visual' as const, label: 'Visual Builder' },
            { value: 'json' as const, label: 'JSON Schema' },
          ]}
          value={viewMode}
          onChange={setViewMode}
          accentColor={COLORS.accent}
        />
        <span
          className="text-[10px]"
          style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
        >
          {viewMode === 'visual'
            ? 'Edit fields visually'
            : 'View generated JSON Schema'}
        </span>
      </div>

      {/* 3/4. Visual Builder or JSON Schema view */}
      {viewMode === 'visual' ? (
        <ParameterTable
          parameters={fields}
          onChange={handleFieldsChange}
          typeOptions={SCHEMA_TYPE_OPTIONS}
          accentColor={COLORS.accent}
        />
      ) : (
        <JsonSchemaView schema={jsonSchema} />
      )}

      {/* 5. A2UI surface section */}
      <A2UISurfaceToggle enabled={a2uiEnabled} onToggle={setA2uiEnabled} />
    </>
  );

  const rightPanel = (
    <>
      {/* 1. Live sample output */}
      <SampleOutputPreview sample={sampleOutput} />

      {/* 2. Pydantic class code preview */}
      <CodePreview
        expression={expressionStr}
        python={pydanticCode}
        dependencies={['pydantic>=2.0', 'adk-fluent']}
        accentColor={COLORS.accent}
      />

      {/* 3. Validation stats */}
      <ValidationStats fields={fields} />
    </>
  );

  return (
    <EditorShell
      chipType="schema"
      chipName={schemaName}
      version="2.0"
      leftPanel={leftPanel}
      leftPanelWidth="60%"
      leftPanelLabel="Configuration"
      rightPanel={rightPanel}
      rightPanelLabel="Preview"
      onPublish={() => {}}
      onCreateNew={() => {}}
    />
  );
}
