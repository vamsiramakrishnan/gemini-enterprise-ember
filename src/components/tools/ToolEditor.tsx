/**
 * ToolEditor — Dedicated editor for @tool chip type.
 *
 * Maps to `FunctionTool(fn)` / `MCPToolset(...)` / `OpenAPIToolset(...)` / `ToolboxToolset(...)`
 * in adk-fluent. Provides tool kind selection, parameter editing, connection config,
 * health monitoring, and a test panel for request/response simulation.
 */

import { useState, useMemo, useCallback } from 'react';
import { EditorShell, SegmentedControl, CodePreview, TestPanel, ParameterTable, HealthIndicator, ConnectionCard } from '../editors';
import type { ParameterRow } from '../editors';

// ─── Colors ──────────────────────────────────────────────────────────

const C = {
  accent: '#4F46E5',
  bg: '#F0F1FE',
  text: '#4338CA',
  border: '#CDCFFC',
  tint: '#E4E5FC',
} as const;

// ─── Options ─────────────────────────────────────────────────────────

const KIND_OPTIONS = [
  { value: 'function', label: 'Function' },
  { value: 'mcp', label: 'MCP' },
  { value: 'openapi', label: 'OpenAPI' },
  { value: 'toolbox', label: 'Toolbox' },
];

const MCP_TRANSPORT_OPTIONS = [
  { value: 'stdio', label: 'stdio' },
  { value: 'sse', label: 'SSE' },
  { value: 'streamable-http', label: 'Streamable HTTP' },
];

// ─── Mock data ───────────────────────────────────────────────────────

const INITIAL_PARAMS: ParameterRow[] = [
  { name: 'policy_id', type: 'string', required: true, description: 'The customer policy ID', validation: 'regex: POL-[A-Z]{2}-[0-9]{6}' },
  { name: 'include_riders', type: 'boolean', required: false, description: 'Include policy riders/addons', default: 'false' },
  { name: 'effective_date', type: 'string', required: false, description: 'Check policy as of this date', validation: 'must be ≤ today' },
  { name: 'format', type: 'string', required: false, description: 'Response format', validation: 'oneOf: summary,full,minimal', default: 'summary' },
];

const MOCK = {
  name: 'policy-lookup',
  version: '2.3.0',
  endpoint: 'https://tools.acme.com/api/v2/policy-lookup',
  authMethod: 'api-key' as const,
  mcpCommand: 'npx',
  mcpArgs: ['-y', '@acme/policy-mcp-server'],
  mcpEnvVars: [{ key: 'API_KEY', value: '***' }, { key: 'REGION', value: 'us-central1' }],
  openapiSpecUrl: 'https://tools.acme.com/api/v2/openapi.json',
  openapiEndpoints: [
    { path: 'GET /policies/{id}', selected: true },
    { path: 'POST /policies/search', selected: true },
    { path: 'DELETE /policies/{id}', selected: false },
    { path: 'GET /policies/{id}/riders', selected: false },
  ],
};

// ─── Styles ──────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  border: '1px solid var(--color-border, #E5E7EB)',
  borderRadius: 12,
  padding: 16,
  background: 'var(--color-bg-surface, #FFFFFF)',
};

const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'var(--color-text-tertiary, #9CA3AF)',
  fontFamily: 'var(--font-ui)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--color-border, #E5E7EB)',
  background: 'var(--color-bg-primary, #F9FAFB)',
  color: 'var(--color-text-primary, #111827)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold mb-2" style={{ color: C.text, fontFamily: 'var(--font-ui)' }}>
      {children}
    </h3>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export function ToolEditor() {
  const [toolKind, setToolKind] = useState('function');
  const [params, setParams] = useState<ParameterRow[]>(INITIAL_PARAMS);
  const [mcpTransport, setMcpTransport] = useState('stdio');
  const [mcpCommand, setMcpCommand] = useState(MOCK.mcpCommand);
  const [openapiEndpoints, setOpenapiEndpoints] = useState(MOCK.openapiEndpoints);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testing, setTesting] = useState(false);

  const codeExpression = useMemo(() => {
    if (toolKind === 'function') return `FunctionTool(policy_lookup)`;
    if (toolKind === 'mcp') return `MCPToolset(transport="${mcpTransport}", command="${mcpCommand}")`;
    if (toolKind === 'openapi') return `OpenAPIToolset(spec_url="${MOCK.openapiSpecUrl}")`;
    return `ToolboxToolset(url="${MOCK.endpoint}")`;
  }, [toolKind, mcpTransport, mcpCommand]);

  const codePython = useMemo(() => {
    if (toolKind === 'function') {
      return `from adk_fluent import FunctionTool

def policy_lookup(policy_id: str, include_riders: bool = False,
                  effective_date: str = None, format: str = "summary"):
    """Retrieve policy details by ID."""
    ...

tool = FunctionTool(policy_lookup)
agent.tool(tool)`;
    }
    if (toolKind === 'mcp') {
      return `from adk_fluent import MCPToolset
from mcp import StdioServerParameters

toolset = MCPToolset(
    server_params=StdioServerParameters(
        command="${mcpCommand}",
        args=${JSON.stringify(MOCK.mcpArgs)},
        env={"API_KEY": "***", "REGION": "us-central1"},
    ),
)
agent.tool(toolset)`;
    }
    if (toolKind === 'openapi') {
      const selected = openapiEndpoints.filter(e => e.selected).map(e => `"${e.path}"`).join(', ');
      return `from adk_fluent import OpenAPIToolset

toolset = OpenAPIToolset(
    spec_url="${MOCK.openapiSpecUrl}",
    selected_endpoints=[${selected}],
)
agent.tool(toolset)`;
    }
    return `from adk_fluent import ToolboxToolset

toolset = ToolboxToolset(url="${MOCK.endpoint}")
agent.tool(toolset)`;
  }, [toolKind, mcpCommand, openapiEndpoints]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1200));
    setTestResult({
      status: 200,
      timing: '145ms',
      request: { policy_id: 'POL-SG-001234', include_riders: true, format: 'summary' },
      response: { policy_id: 'POL-SG-001234', holder: 'Jane Chen', coverage: '$100,000', riders: ['flood', 'earthquake'], status: 'active', expiry: '2027-03-15' },
    });
    setTesting(false);
  }, []);

  // ─── Left Panel ──────────────────────────────────────────────────

  const leftPanel = (
    <>
      {/* Identity */}
      <div style={card}>
        <SectionHeader>Tool Identity</SectionHeader>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-ui)' }}>{MOCK.name}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: C.tint, color: C.accent }}>v{MOCK.version}</span>
        </div>
        <div style={label}>Description</div>
        <textarea rows={2} defaultValue="Retrieve customer policy details including coverage, riders, and claim history." style={{ ...inputStyle, resize: 'vertical', fontSize: 11 }} />
      </div>

      {/* Kind Selector */}
      <div style={card}>
        <SectionHeader>Tool Kind</SectionHeader>
        <SegmentedControl options={KIND_OPTIONS} value={toolKind} onChange={setToolKind} accentColor={C.accent} />
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {toolKind === 'function' && 'Python function wrapped as a tool. Schema auto-inferred from type hints.'}
          {toolKind === 'mcp' && 'Model Context Protocol server. External tool server via stdio, SSE, or HTTP.'}
          {toolKind === 'openapi' && 'Tools auto-generated from an OpenAPI/Swagger specification.'}
          {toolKind === 'toolbox' && 'ADK Toolbox — managed tool hosting with health monitoring.'}
        </p>
      </div>

      {/* Connection */}
      <ConnectionCard endpoint={MOCK.endpoint} onEndpointChange={() => {}} authMethod={MOCK.authMethod} onAuthMethodChange={() => {}} readOnly />

      {/* Kind-specific config */}
      {toolKind === 'function' && (
        <div style={card}>
          <SectionHeader>Parameters ({params.length})</SectionHeader>
          <ParameterTable parameters={params} onChange={setParams} accentColor={C.accent} />
        </div>
      )}

      {toolKind === 'mcp' && (
        <div style={card}>
          <SectionHeader>MCP Server Configuration</SectionHeader>
          <div style={label}>Transport</div>
          <SegmentedControl options={MCP_TRANSPORT_OPTIONS} value={mcpTransport} onChange={setMcpTransport} accentColor={C.accent} size="sm" />
          <div className="mt-3">
            <div style={label}>Command</div>
            <input type="text" value={mcpCommand} onChange={e => setMcpCommand(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-mono, monospace)' }} />
          </div>
          <div className="mt-3">
            <div style={label}>Arguments</div>
            <div className="flex flex-wrap gap-1">
              {MOCK.mcpArgs.map((a, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded" style={{ background: C.tint, color: C.text, fontFamily: 'var(--font-mono)' }}>{a}</span>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <div style={label}>Environment Variables</div>
            <div className="space-y-1">
              {MOCK.mcpEnvVars.map((ev, i) => (
                <div key={i} className="flex gap-2">
                  <input type="text" defaultValue={ev.key} style={{ ...inputStyle, width: '40%', fontFamily: 'var(--font-mono)' }} readOnly />
                  <input type="text" defaultValue={ev.value} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} readOnly />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {toolKind === 'openapi' && (
        <div style={card}>
          <SectionHeader>OpenAPI Configuration</SectionHeader>
          <div style={label}>Spec URL</div>
          <div className="flex gap-2">
            <input type="text" defaultValue={MOCK.openapiSpecUrl} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} readOnly />
            <button className="text-[10px] font-medium px-3 py-1 rounded-lg whitespace-nowrap" style={{ background: C.tint, color: C.accent, border: `1px solid ${C.border}` }}>
              Fetch
            </button>
          </div>
          <div className="mt-3">
            <div style={label}>Endpoints</div>
            <div className="space-y-1">
              {openapiEndpoints.map((ep, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ep.selected}
                    onChange={() => setOpenapiEndpoints(prev => prev.map((e, j) => j === i ? { ...e, selected: !e.selected } : e))}
                    className="rounded"
                  />
                  <span className="text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: ep.selected ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{ep.path}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {toolKind === 'toolbox' && (
        <div style={card}>
          <SectionHeader>Toolbox Configuration</SectionHeader>
          <div style={label}>Connection String</div>
          <input type="text" defaultValue={MOCK.endpoint} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
          <button className="mt-2 text-[10px] font-medium px-3 py-1.5 rounded-lg" style={{ background: C.tint, color: C.accent, border: `1px solid ${C.border}` }}>
            Test Connection
          </button>
        </div>
      )}
    </>
  );

  // ─── Right Panel ─────────────────────────────────────────────────

  const rightPanel = (
    <>
      {/* Health */}
      <div style={card}>
        <SectionHeader>Health Status</SectionHeader>
        <HealthIndicator status="healthy" latencyP50={145} latencyP99={890} lastChecked="2 min ago" />
      </div>

      {/* Usage Stats */}
      <div style={card}>
        <SectionHeader>Usage</SectionHeader>
        <div className="space-y-1.5">
          {[
            ['Referenced in', '12 playbooks'],
            ['Last invoked', '5 min ago'],
            ['Avg response time', '145ms'],
            ['Error rate', '0.2%'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span>{k}</span><span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Preview */}
      <CodePreview expression={codeExpression} python={codePython} dependencies={['adk-fluent>=0.5.0', 'google-cloud-aiplatform>=1.60']} accentColor={C.accent} />
    </>
  );

  // ─── Test Panel ──────────────────────────────────────────────────

  const testPanel = (
    <TestPanel
      placeholder='Enter JSON request, e.g. {"policy_id": "POL-SG-001234"}'
      accentColor={C.accent}
      onRun={handleTest}
      renderResult={() => {
        if (testing) return <div className="text-[11px] py-4 text-center" style={{ color: 'var(--color-text-tertiary)' }}>Executing tool...</div>;
        if (!testResult) return null;
        const r = testResult as { status: number; timing: string; request: Record<string, unknown>; response: Record<string, unknown> };
        return (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#DCFCE7', color: '#166534' }}>{r.status} OK</span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{r.timing}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div style={label}>Request</div>
                <pre className="text-[10px] p-2 rounded-lg overflow-auto" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', maxHeight: 120 }}>
                  {JSON.stringify(r.request, null, 2)}
                </pre>
              </div>
              <div>
                <div style={label}>Response</div>
                <pre className="text-[10px] p-2 rounded-lg overflow-auto" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', maxHeight: 120 }}>
                  {JSON.stringify(r.response, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        );
      }}
    />
  );

  return (
    <EditorShell
      chipType="tool"
      chipName={MOCK.name}
      version={MOCK.version}
      leftPanel={leftPanel}
      leftPanelLabel="Configuration"
      rightPanel={rightPanel}
      rightPanelLabel="Status & Preview"
      testPanel={testPanel}
      onPublish={() => {}}
      onCreateNew={() => {}}
    />
  );
}
