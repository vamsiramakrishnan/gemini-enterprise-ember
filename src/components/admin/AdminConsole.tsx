import { useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────
type AdminTab = 'overview' | 'governance' | 'teams' | 'audit';

const TAB_ITEMS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'governance', label: 'Governance' },
  { id: 'teams', label: 'Teams & Access' },
  { id: 'audit', label: 'Audit Log' },
];

// ─── Mock Data ──────────────────────────────────────────────────────────
const ACTIVITY_FEED = [
  { text: 'Wei Chen published Claims Processing Agent v2.2.0 to staging', time: '2h ago', type: 'deploy' as const },
  { text: 'Priya Sharma approved @connector(slack) for Claims Team', time: '4h ago', type: 'permission' as const },
  { text: '@guard(pii-redaction) blocked PII leak in Refund Processor', time: '6h ago', type: 'alert' as const },
  { text: 'Platform Team requested access to @tool(payment-processor)', time: '1d ago', type: 'request' as const },
  { text: 'BigQuery connector sync paused for maintenance 2am-4am', time: '1d ago', type: 'maintenance' as const },
];

const GUARD_POLICIES = [
  { name: '@guard(pii-redaction)', enforcement: 'Required' as const, scope: 'All agents', violations: 0 },
  { name: '@guard(fraud-detection)', enforcement: 'Required' as const, scope: 'Claims Team', violations: 3 },
  { name: '@guard(apac-compliance-rules)', enforcement: 'Required' as const, scope: 'APAC agents', violations: 0 },
  { name: '@guard(toxicity-filter)', enforcement: 'Recommended' as const, scope: 'All agents', violations: 1 },
  { name: '@guard(output-length)', enforcement: 'Optional' as const, scope: 'Customer Support', violations: 0 },
];

const MODEL_POLICIES = [
  { team: 'Claims Team', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { team: 'Customer Support', models: ['gemini-2.5-flash'] },
  { team: 'Compliance', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
  { team: 'Engineering', models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'] },
];

const TEAMS_DATA = [
  { name: 'Claims Team', members: 8, agents: 6, connectors: ['Salesforce', 'Jira', 'Slack'], roles: { admin: 1, editor: 3, invoker: 4 } },
  { name: 'Customer Support', members: 12, agents: 4, connectors: ['Salesforce', 'Zendesk', 'Slack'], roles: { admin: 2, editor: 4, invoker: 6 } },
  { name: 'Compliance', members: 5, agents: 3, connectors: ['BigQuery', 'Drive'], roles: { admin: 1, editor: 2, invoker: 2 } },
  { name: 'Engineering', members: 15, agents: 2, connectors: ['GitHub', 'Jira', 'Slack', 'PagerDuty'], roles: { admin: 3, editor: 5, invoker: 7 } },
  { name: 'Executives', members: 3, agents: 0, connectors: [], roles: { admin: 0, editor: 0, invoker: 3 } },
];

const AUDIT_LOG = [
  { time: '2026-04-04 10:23', actor: 'Wei Chen', action: 'Published version', resource: 'Claims Processing Agent v2.2.0', result: 'success' as const },
  { time: '2026-04-04 08:15', actor: 'Priya Sharma', action: 'Approved connector', resource: '@connector(slack)', result: 'success' as const },
  { time: '2026-04-04 06:42', actor: 'System', action: 'Guard violation', resource: '@guard(pii-redaction) → Refund Processor', result: 'blocked' as const },
  { time: '2026-04-03 16:30', actor: 'Platform Team', action: 'Access request', resource: '@tool(payment-processor)', result: 'pending' as const },
  { time: '2026-04-03 14:20', actor: 'Vamsi K', action: 'Created agent', resource: 'Document Intake Agent v0.1.0', result: 'success' as const },
  { time: '2026-04-03 11:00', actor: 'System', action: 'Connector sync', resource: '@connector(salesforce)', result: 'success' as const },
  { time: '2026-04-03 09:15', actor: 'Aisha M', action: 'Modified guard', resource: '@guard(toxicity-filter) threshold 0.7→0.8', result: 'success' as const },
  { time: '2026-04-02 17:45', actor: 'Li W', action: 'Deployed to staging', resource: 'FAQ Bot v4.2.0-rc1', result: 'success' as const },
  { time: '2026-04-02 15:30', actor: 'Wei Chen', action: 'Revoked access', resource: 'Contractor group → Claims agents', result: 'success' as const },
  { time: '2026-04-02 10:00', actor: 'System', action: 'Guard violation', resource: '@guard(fraud-detection) → Claims Processing', result: 'blocked' as const },
];

const ACTIVITY_BORDER: Record<string, string> = {
  deploy: '#2563EB',
  permission: '#16A34A',
  alert: '#E11D48',
  request: '#9CA3AF',
  maintenance: '#D97706',
};

// ─── Main Component ─────────────────────────────────────────────────────
export function AdminConsole() {
  const [tab, setTab] = useState<AdminTab>('overview');

  return (
    <div className="h-full bg-[#F9FAFB] flex flex-col">
      {/* Header */}
      <div
        className="px-6 pt-5 pb-3 bg-white"
        style={{ borderBottom: '1px solid #E5E7EB', fontFamily: 'var(--font-ui)' }}
      >
        <div className="text-[13px] font-semibold" style={{ color: '#111827' }}>
          Admin Console
        </div>
        <div className="text-[10px]" style={{ color: '#9CA3AF' }}>
          ACME Insurance
        </div>
      </div>

      {/* Tab Bar */}
      <div
        className="px-6 bg-white flex gap-6"
        style={{ borderBottom: '1px solid #E5E7EB' }}
      >
        {TAB_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className="relative pb-2.5 pt-3 transition-colors"
            style={{
              fontSize: '12px',
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              color: tab === item.id ? '#2563EB' : '#9CA3AF',
              borderBottom: tab === item.id ? '2px solid #2563EB' : '2px solid transparent',
              marginBottom: '-1px',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'governance' && <GovernanceTab />}
        {tab === 'teams' && <TeamsTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────────────
function OverviewTab() {
  return (
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Agents', value: '47', color: '#1A73E8' },
          { label: 'Active Users', value: '156', color: '#16A34A' },
          { label: 'API Calls Today', value: '245K', color: '#7C3AED' },
          { label: 'Policy Violations', value: '3', color: '#E11D48' },
        ].map(s => (
          <div
            key={s.label}
            className="bg-white rounded-lg border border-gray-200 p-4"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
          >
            <div className="text-[10px] text-gray-500 mb-1">{s.label}</div>
            <div className="text-2xl font-semibold" style={{ color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Agents by Status */}
      <div
        className="bg-white rounded-lg border border-gray-200 p-4 mb-6"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        <h3 className="text-xs font-semibold text-gray-700 mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
          Agents by Status
        </h3>
        <div className="flex items-center gap-4">
          {[
            { label: 'Production', count: 12, color: '#16A34A', pct: 25 },
            { label: 'Staging', count: 8, color: '#2563EB', pct: 17 },
            { label: 'Draft', count: 27, color: '#9CA3AF', pct: 58 },
          ].map(s => (
            <div key={s.label} className="flex-1">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-gray-600">{s.label}</span>
                <span className="font-medium" style={{ color: s.color }}>{s.count}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${s.pct}%`, backgroundColor: s.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div
        className="bg-white rounded-lg border border-gray-200 p-4"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        <h3 className="text-xs font-semibold text-gray-700 mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
          Recent Activity
        </h3>
        <div className="space-y-0.5">
          {ACTIVITY_FEED.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-3 py-2 pl-3"
              style={{ borderLeft: `2px solid ${ACTIVITY_BORDER[a.type] || '#D1D5DB'}` }}
            >
              <div className="flex-1">
                <div className="text-[12px] text-gray-700">{a.text}</div>
                <div className="text-[10px]" style={{ color: '#9CA3AF' }}>{a.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Governance Tab ─────────────────────────────────────────────────────
function GovernanceTab() {
  return (
    <div>
      {/* Guard Policies */}
      <div
        className="bg-white rounded-lg border border-gray-200 mb-6 overflow-hidden"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        <div className="px-4 pt-4 pb-3">
          <h3 className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'var(--font-ui)' }}>
            Guard Policies
          </h3>
        </div>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] text-gray-500 uppercase" style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th className="text-left py-2 px-4 font-medium">Guard</th>
              <th className="text-left py-2 px-4 font-medium">Enforcement</th>
              <th className="text-left py-2 px-4 font-medium">Scope</th>
              <th className="text-right py-2 px-4 font-medium">Violations</th>
            </tr>
          </thead>
          <tbody>
            {GUARD_POLICIES.map((g, i) => (
              <tr key={i} className="hover:bg-gray-50/50" style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td className="py-2.5 px-4">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-rose-500 text-white">
                    {g.name}
                  </span>
                </td>
                <td className="py-2.5 px-4">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    g.enforcement === 'Required' ? 'bg-red-100 text-red-700'
                    : g.enforcement === 'Recommended' ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-500'
                  }`}>
                    {g.enforcement}
                  </span>
                </td>
                <td className="py-2.5 px-4 text-gray-600">{g.scope}</td>
                <td className="py-2.5 px-4 text-right">
                  {g.violations > 0 ? (
                    <span className="text-red-600 font-medium">{g.violations} blocked</span>
                  ) : (
                    <span className="text-green-600">0</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Model Policies */}
      <div
        className="bg-white rounded-lg border border-gray-200 p-4 mb-6"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        <h3 className="text-xs font-semibold text-gray-700 mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
          Model Access Policies
        </h3>
        <div className="space-y-2">
          {MODEL_POLICIES.map(p => (
            <div key={p.team} className="flex items-center gap-3 py-2" style={{ borderBottom: '1px solid #F3F4F6' }}>
              <span className="text-[12px] font-medium text-gray-700 w-40">{p.team}</span>
              <div className="flex gap-1.5">
                {p.models.map(m => (
                  <span key={m} className="text-[9px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Token Budgets */}
      <div
        className="bg-white rounded-lg border border-gray-200 p-4"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        <h3 className="text-xs font-semibold text-gray-700 mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
          Token Budgets (Monthly)
        </h3>
        {[
          { team: 'Claims Team', used: 12.4, budget: 20, pct: 62 },
          { team: 'Customer Support', used: 8.1, budget: 10, pct: 81 },
          { team: 'Compliance', used: 3.2, budget: 8, pct: 40 },
          { team: 'Engineering', used: 1.8, budget: 5, pct: 36 },
        ].map(t => (
          <div key={t.team} className="mb-3">
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-gray-600">{t.team}</span>
              <span className="text-gray-500">{t.used}M / {t.budget}M tokens ({t.pct}%)</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${t.pct}%`,
                  backgroundColor: t.pct > 80 ? '#EF4444' : t.pct > 60 ? '#EAB308' : '#22C55E',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Teams Tab ──────────────────────────────────────────────────────────
function TeamsTab() {
  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {TEAMS_DATA.map(t => {
          const total = t.roles.admin + t.roles.editor + t.roles.invoker;
          return (
            <div
              key={t.name}
              className="bg-white rounded-lg border border-gray-200 p-4"
              style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>
                  {t.name}
                </h3>
                <span className="text-[10px]" style={{ color: '#9CA3AF' }}>{t.members} members</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div className="bg-[#F9FAFB] rounded-lg p-2">
                  <div className="text-lg font-semibold text-gray-900">{t.agents}</div>
                  <div className="text-[9px] text-gray-400">Agents</div>
                </div>
                <div className="bg-[#F9FAFB] rounded-lg p-2">
                  <div className="text-lg font-semibold text-gray-900">{t.connectors.length}</div>
                  <div className="text-[9px] text-gray-400">Connectors</div>
                </div>
                <div className="bg-[#F9FAFB] rounded-lg p-2">
                  <div className="text-lg font-semibold text-gray-900">{t.members}</div>
                  <div className="text-[9px] text-gray-400">Members</div>
                </div>
              </div>
              {/* Role Distribution */}
              <div className="mb-3">
                <div className="text-[10px] text-gray-500 mb-1">Role Distribution</div>
                <div className="flex h-2 rounded-full overflow-hidden">
                  {t.roles.admin > 0 && <div className="bg-red-400" style={{ width: `${(t.roles.admin / total) * 100}%` }} />}
                  <div className="bg-blue-400" style={{ width: `${(t.roles.editor / total) * 100}%` }} />
                  <div className="bg-gray-300" style={{ width: `${(t.roles.invoker / total) * 100}%` }} />
                </div>
                <div className="flex gap-3 mt-1 text-[9px] text-gray-400">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />Admin {t.roles.admin}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Editor {t.roles.editor}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />Invoker {t.roles.invoker}
                  </span>
                </div>
              </div>
              {/* Connectors */}
              {t.connectors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {t.connectors.map(c => (
                    <span key={c} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">{c}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Audit Tab ──────────────────────────────────────────────────────────
function AuditTab() {
  const [filter, setFilter] = useState('all');
  const filtered = filter === 'all' ? AUDIT_LOG : AUDIT_LOG.filter(a => a.result === filter);

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[10px] text-gray-500 mr-2" style={{ fontFamily: 'var(--font-ui)' }}>Filter:</div>
        {['all', 'success', 'blocked', 'pending'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="transition-all"
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-ui)',
              padding: '3px 10px',
              borderRadius: '9999px',
              backgroundColor: filter === f ? '#2563EB' : '#F3F4F6',
              color: filter === f ? '#FFFFFF' : '#6B7280',
              fontWeight: 500,
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Audit Table */}
      <div
        className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
      >
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] text-gray-500 uppercase font-medium" style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
              <th className="text-left py-2.5 px-4">Timestamp</th>
              <th className="text-left py-2.5 px-4">Actor</th>
              <th className="text-left py-2.5 px-4">Action</th>
              <th className="text-left py-2.5 px-4">Resource</th>
              <th className="text-right py-2.5 px-4">Result</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a, i) => (
              <tr key={i} className="hover:bg-gray-50/50" style={{ borderBottom: '1px solid #E5E7EB' }}>
                <td className="py-2.5 px-4 text-gray-500 font-mono text-[10px]">{a.time}</td>
                <td className="py-2.5 px-4 text-gray-700">{a.actor}</td>
                <td className="py-2.5 px-4 text-gray-600">{a.action}</td>
                <td className="py-2.5 px-4 text-gray-700 font-medium">{a.resource}</td>
                <td className="py-2.5 px-4 text-right">
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                    a.result === 'success' ? 'bg-green-100 text-green-700'
                    : a.result === 'blocked' ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {a.result}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
