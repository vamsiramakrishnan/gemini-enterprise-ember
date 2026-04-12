/**
 * ConnectorEditor — Dedicated editor for @connector chip type.
 *
 * Maps to `BigQueryToolset(...)` / `ApplicationIntegrationToolset(...)`
 * in adk-fluent. Provides entity/action toggle management, connection config,
 * sync status monitoring, and a query tester.
 */

import { useState, useMemo, useCallback } from 'react';
import { EditorShell, CodePreview, TestPanel, HealthIndicator, ConnectionCard } from '../editors';

// ─── Colors ──────────────────────────────────────────────────────────

const C = {
  accent: '#2563EB',
  bg: '#F0F4FF',
  text: '#1D4ED8',
  border: '#C4D5FB',
  tint: '#DCEAFF',
} as const;

// ─── Mock data ───────────────────────────────────────────────────────

interface Entity { name: string; enabled: boolean; documentCount: number; syncMode: 'federated' | 'ingested' }
interface Action { name: string; enabled: boolean; authRequired: boolean }

const INITIAL_ENTITIES: Entity[] = [
  { name: 'Accounts', enabled: true, documentCount: 15420, syncMode: 'federated' },
  { name: 'Contacts', enabled: true, documentCount: 45230, syncMode: 'federated' },
  { name: 'Opportunities', enabled: true, documentCount: 8750, syncMode: 'ingested' },
  { name: 'Cases', enabled: true, documentCount: 23100, syncMode: 'ingested' },
  { name: 'Leads', enabled: false, documentCount: 0, syncMode: 'ingested' },
  { name: 'Campaigns', enabled: false, documentCount: 0, syncMode: 'ingested' },
];

const INITIAL_ACTIONS: Action[] = [
  { name: 'Search Records', enabled: true, authRequired: true },
  { name: 'Create Record', enabled: true, authRequired: true },
  { name: 'Update Record', enabled: true, authRequired: true },
  { name: 'Delete Record', enabled: false, authRequired: true },
  { name: 'Bulk Export', enabled: false, authRequired: true },
];

const SYNC_HISTORY = [
  { time: '12:45 PM', entities: 'Accounts, Contacts', records: 234 },
  { time: '12:30 PM', entities: 'Opportunities', records: 45 },
  { time: '12:15 PM', entities: 'Cases', records: 127 },
  { time: '12:00 PM', entities: 'Accounts', records: 189 },
];

const MOCK = {
  name: 'salesforce',
  version: '2.1.0',
  product: 'Salesforce',
  provider: 'Third-party',
  authMethod: 'oauth' as const,
  authUser: 'admin@acme.salesforce.com',
  dataStoreId: 'ds-salesforce-v2',
  dataStoreRegion: 'us-central1',
  vpcPerimeter: 'apac-finance-perimeter',
  syncSchedule: 'Every 15 minutes',
  fullSyncSchedule: 'Weekly (Sunday 2:00 AM)',
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

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold mb-2" style={{ color: C.text, fontFamily: 'var(--font-ui)' }}>
      {children}
    </h3>
  );
}

// ─── Toggle Component ────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-8 h-4.5 rounded-full transition-colors"
      style={{
        width: 32,
        height: 18,
        background: checked ? C.accent : 'var(--color-border, #D1D5DB)',
        borderRadius: 9,
        cursor: 'pointer',
        border: 'none',
        padding: 0,
      }}
    >
      <span
        className="absolute top-0.5 rounded-full bg-white transition-transform"
        style={{
          width: 14,
          height: 14,
          top: 2,
          left: checked ? 16 : 2,
          background: '#fff',
          borderRadius: 7,
          transition: 'left 150ms ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export function ConnectorEditor() {
  const [entities, setEntities] = useState<Entity[]>(INITIAL_ENTITIES);
  const [actions, setActions] = useState<Action[]>(INITIAL_ACTIONS);
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testing, setTesting] = useState(false);

  const enabledEntities = useMemo(() => entities.filter(e => e.enabled), [entities]);
  const enabledActions = useMemo(() => actions.filter(a => a.enabled), [actions]);
  const totalDocs = useMemo(() => enabledEntities.reduce((s, e) => s + e.documentCount, 0), [enabledEntities]);

  const toggleEntity = (idx: number) => {
    setEntities(prev => prev.map((e, i) => i === idx ? { ...e, enabled: !e.enabled } : e));
  };

  const toggleAction = (idx: number) => {
    setActions(prev => prev.map((a, i) => i === idx ? { ...a, enabled: !a.enabled } : a));
  };

  const entityOps = useMemo(() => {
    const ops: Record<string, string[]> = {};
    for (const e of enabledEntities) {
      ops[e.name] = ['List', 'Get', 'Search'];
    }
    return ops;
  }, [enabledEntities]);

  const codePython = useMemo(() => {
    const opsStr = Object.entries(entityOps)
      .map(([k, v]) => `        "${k}": ${JSON.stringify(v)}`)
      .join(',\n');
    return `from google.adk.tools import ApplicationIntegrationToolset

salesforce = ApplicationIntegrationToolset(
    project="acme-insurance-prod",
    location="${MOCK.dataStoreRegion}",
    integration="salesforce-v2",
    entity_operations={
${opsStr},
    },
)

agent.tool(salesforce)`;
  }, [entityOps]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1300));
    setTestResult({
      query: 'Find all accounts in Singapore with annual revenue > $1M',
      soql: "SELECT Id, Name, BillingCountry, AnnualRevenue FROM Account WHERE BillingCountry = 'Singapore' AND AnnualRevenue > 1000000",
      results: [
        { id: 'ACC-001', name: 'TechCorp Asia', country: 'Singapore', revenue: '$2.4M' },
        { id: 'ACC-002', name: 'FinServ Pte Ltd', country: 'Singapore', revenue: '$5.1M' },
        { id: 'ACC-003', name: 'MediCare SG', country: 'Singapore', revenue: '$1.8M' },
      ],
      timing: '230ms',
      count: 3,
    });
    setTesting(false);
  }, []);

  // ─── Left Panel ──────────────────────────────────────────────────

  const leftPanel = (
    <>
      {/* Provider Badge & Identity */}
      <div style={card}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-bold" style={{ background: C.tint, color: C.accent, border: `1px solid ${C.border}` }}>
            SF
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-ui)' }}>{MOCK.product}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: C.tint, color: C.accent }}>v{MOCK.version}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: '#F3F4F6', color: '#6B7280' }}>{MOCK.provider}</span>
              <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>Last sync: 2 min ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Connection */}
      <ConnectionCard endpoint={`https://${MOCK.authUser?.split('@')[1]}`} onEndpointChange={() => {}} authMethod={MOCK.authMethod} onAuthMethodChange={() => {}} authUser={MOCK.authUser} readOnly />

      {/* Entity Toggles */}
      <div style={card}>
        <div className="flex items-center justify-between mb-2">
          <SectionHeader>Entities</SectionHeader>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: C.tint, color: C.accent }}>
            {enabledEntities.length}/{entities.length} enabled
          </span>
        </div>
        <div className="space-y-0">
          <div className="flex items-center gap-3 px-2 py-1.5 text-[9px] font-semibold uppercase" style={{ color: 'var(--color-text-tertiary)' }}>
            <span className="w-24">Entity</span>
            <span className="w-12 text-center">Enabled</span>
            <span className="w-16 text-center">Sync</span>
            <span className="flex-1 text-right">Documents</span>
          </div>
          {entities.map((e, i) => (
            <div key={e.name} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50" style={{ opacity: e.enabled ? 1 : 0.5 }}>
              <span className="w-24 text-[11px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{e.name}</span>
              <span className="w-12 flex justify-center"><Toggle checked={e.enabled} onChange={() => toggleEntity(i)} /></span>
              <span className="w-16 text-center">
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: e.syncMode === 'federated' ? '#DCFCE7' : C.tint, color: e.syncMode === 'federated' ? '#166534' : C.text }}>
                  {e.syncMode}
                </span>
              </span>
              <span className="flex-1 text-right text-[10px]" style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {e.documentCount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Action Toggles */}
      <div style={card}>
        <div className="flex items-center justify-between mb-2">
          <SectionHeader>Actions</SectionHeader>
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded" style={{ background: C.tint, color: C.accent }}>
            {enabledActions.length}/{actions.length} enabled
          </span>
        </div>
        <div className="space-y-0">
          {actions.map((a, i) => (
            <div key={a.name} className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-gray-50" style={{ opacity: a.enabled ? 1 : 0.5 }}>
              <span className="flex-1 text-[11px] font-medium" style={{ color: 'var(--color-text-primary)' }}>{a.name}</span>
              {a.authRequired && <span className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>🔒</span>}
              <Toggle checked={a.enabled} onChange={() => toggleAction(i)} />
            </div>
          ))}
        </div>
      </div>

      {/* Infrastructure */}
      <div style={card}>
        <SectionHeader>Infrastructure</SectionHeader>
        <div className="space-y-1.5">
          {[
            ['Region', MOCK.dataStoreRegion],
            ['Data Store', MOCK.dataStoreId],
            ['Sync Schedule', MOCK.syncSchedule],
            ['Full Sync', MOCK.fullSyncSchedule],
            ['VPC Perimeter', MOCK.vpcPerimeter],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span>{k}</span>
              <span className="font-medium" style={{ fontFamily: k === 'VPC Perimeter' ? 'var(--font-mono)' : 'var(--font-ui)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // ─── Right Panel ─────────────────────────────────────────────────

  const rightPanel = (
    <>
      {/* Sync Status */}
      <div style={card}>
        <SectionHeader>Sync Status</SectionHeader>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981' }} />
          <span className="text-[11px] font-semibold" style={{ color: '#059669' }}>Active</span>
          <span className="flex-1" />
          <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{totalDocs.toLocaleString()} total documents</span>
        </div>
        <div style={label}>Recent Syncs</div>
        <div className="space-y-1">
          {SYNC_HISTORY.map((s, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded" style={{ background: i === 0 ? C.tint : 'transparent' }}>
              <span style={{ color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>{s.time}</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{s.entities}</span>
              <span className="flex-1" />
              <span className="font-medium" style={{ color: 'var(--color-text-tertiary)' }}>{s.records} records</span>
            </div>
          ))}
        </div>
      </div>

      {/* Health */}
      <div style={card}>
        <SectionHeader>Health</SectionHeader>
        <HealthIndicator status="healthy" latencyP50={230} latencyP99={1200} lastChecked="2 min ago" />
      </div>

      {/* Code Preview */}
      <CodePreview
        expression={`ApplicationIntegrationToolset("salesforce-v2")`}
        python={codePython}
        dependencies={['google-cloud-aiplatform>=1.60', 'google-cloud-integration>=0.1']}
        accentColor={C.accent}
      />

      {/* Usage */}
      <div style={card}>
        <SectionHeader>Usage</SectionHeader>
        <div className="space-y-1.5">
          {[
            ['Referenced in', '8 playbooks'],
            ['Queries/day', '1,247'],
            ['Error rate', '0.3%'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span>{k}</span><span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // ─── Test Panel ──────────────────────────────────────────────────

  const testPanel = (
    <TestPanel
      placeholder='Enter a natural language query, e.g. "Find all accounts in Singapore with revenue > $1M"'
      accentColor={C.accent}
      onRun={handleTest}
      renderResult={() => {
        if (testing) return <div className="text-[11px] py-4 text-center" style={{ color: 'var(--color-text-tertiary)' }}>Querying connector...</div>;
        if (!testResult) return null;
        const r = testResult as { query: string; soql: string; results: Array<Record<string, string>>; timing: string; count: number };
        return (
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#DCFCE7', color: '#166534' }}>{r.count} results</span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{r.timing}</span>
            </div>
            <div>
              <div style={label}>Parsed Query</div>
              <pre className="text-[9px] p-2 rounded-lg" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
                {r.soql}
              </pre>
            </div>
            <div>
              <div style={label}>Results</div>
              <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <div className="flex text-[9px] font-semibold uppercase px-2 py-1" style={{ background: 'var(--color-bg-primary)', color: 'var(--color-text-tertiary)' }}>
                  <span className="w-16">ID</span>
                  <span className="flex-1">Name</span>
                  <span className="w-20">Country</span>
                  <span className="w-16 text-right">Revenue</span>
                </div>
                {r.results.map((row, i) => (
                  <div key={i} className="flex text-[10px] px-2 py-1.5" style={{ borderTop: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <span className="w-16" style={{ fontFamily: 'var(--font-mono)' }}>{row.id}</span>
                    <span className="flex-1 font-medium">{row.name}</span>
                    <span className="w-20">{row.country}</span>
                    <span className="w-16 text-right font-semibold">{row.revenue}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }}
    />
  );

  return (
    <EditorShell
      chipType="connector"
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
