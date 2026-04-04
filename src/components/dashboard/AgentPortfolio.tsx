import { useState } from 'react';
import { Link } from 'react-router-dom';

// ─── Mock Data ──────────────────────────────────────────────────────────
interface AgentEntry {
  name: string; version: string; status: 'production' | 'staging' | 'draft';
  model: string; convPerDay: number; latencyMs: number; costPerDay: number;
  health: 'healthy' | 'degraded' | 'down'; owner: string;
  satisfaction: number;
  refs: { tools: number; connectors: number; guards: number };
  sparkline: number[];
}

interface Team { name: string; agents: AgentEntry[] }

const TEAMS: Team[] = [
  { name: 'Claims Team', agents: [
    { name: 'Claims Processing Agent', version: 'v2.1.0', status: 'production', model: 'gemini-2.5-pro', convPerDay: 3200, latencyMs: 1800, costPerDay: 89.60, health: 'healthy', owner: 'Vamsi K', satisfaction: 4.6, refs: { tools: 5, connectors: 3, guards: 2 }, sparkline: [2800, 3100, 2900, 3400, 3200, 3500, 3200] },
    { name: 'Senior Adjuster', version: 'v1.3.0', status: 'production', model: 'gemini-2.5-pro', convPerDay: 890, latencyMs: 2400, costPerDay: 34.20, health: 'healthy', owner: 'Priya S', satisfaction: 4.3, refs: { tools: 3, connectors: 2, guards: 3 }, sparkline: [750, 820, 900, 870, 910, 880, 890] },
    { name: 'Fraud Detection', version: 'v3.0.1', status: 'production', model: 'gemini-2.5-pro', convPerDay: 450, latencyMs: 3200, costPerDay: 22.50, health: 'degraded', owner: 'Wei C', satisfaction: 4.1, refs: { tools: 2, connectors: 1, guards: 5 }, sparkline: [400, 420, 380, 460, 430, 470, 450] },
    { name: 'Policy Lookup Assistant', version: 'v0.9.0', status: 'staging', model: 'gemini-2.5-flash', convPerDay: 120, latencyMs: 800, costPerDay: 2.40, health: 'healthy', owner: 'Priya S', satisfaction: 4.7, refs: { tools: 2, connectors: 1, guards: 1 }, sparkline: [80, 95, 110, 105, 130, 115, 120] },
    { name: 'Claims Triage Bot', version: 'v0.2.0', status: 'draft', model: 'gemini-2.5-flash', convPerDay: 0, latencyMs: 0, costPerDay: 0, health: 'healthy', owner: 'Wei C', satisfaction: 0, refs: { tools: 1, connectors: 0, guards: 0 }, sparkline: [0, 0, 0, 0, 0, 0, 0] },
    { name: 'Document Intake Agent', version: 'v0.1.0', status: 'draft', model: 'gemini-2.5-pro', convPerDay: 0, latencyMs: 0, costPerDay: 0, health: 'healthy', owner: 'Vamsi K', satisfaction: 0, refs: { tools: 2, connectors: 2, guards: 1 }, sparkline: [0, 0, 0, 0, 0, 0, 0] },
  ]},
  { name: 'Customer Support', agents: [
    { name: 'Customer Inquiry Router', version: 'v2.0.0', status: 'production', model: 'gemini-2.5-flash', convPerDay: 5400, latencyMs: 600, costPerDay: 43.20, health: 'healthy', owner: 'Aisha M', satisfaction: 4.8, refs: { tools: 3, connectors: 4, guards: 2 }, sparkline: [4800, 5100, 5300, 5200, 5600, 5400, 5400] },
    { name: 'Refund Processor', version: 'v1.1.0', status: 'staging', model: 'gemini-2.5-pro', convPerDay: 340, latencyMs: 2100, costPerDay: 15.30, health: 'healthy', owner: 'Aisha M', satisfaction: 4.2, refs: { tools: 4, connectors: 2, guards: 3 }, sparkline: [280, 310, 330, 360, 340, 350, 340] },
    { name: 'FAQ Bot', version: 'v4.2.0', status: 'production', model: 'gemini-2.5-flash', convPerDay: 8200, latencyMs: 400, costPerDay: 24.60, health: 'healthy', owner: 'Li W', satisfaction: 4.5, refs: { tools: 1, connectors: 0, guards: 1 }, sparkline: [7500, 7800, 8100, 7900, 8300, 8000, 8200] },
    { name: 'Escalation Manager', version: 'v0.5.0', status: 'draft', model: 'gemini-2.5-pro', convPerDay: 0, latencyMs: 0, costPerDay: 0, health: 'healthy', owner: 'Li W', satisfaction: 0, refs: { tools: 2, connectors: 3, guards: 2 }, sparkline: [0, 0, 0, 0, 0, 0, 0] },
  ]},
  { name: 'Compliance', agents: [
    { name: 'APAC Compliance Checker', version: 'v1.4.0', status: 'production', model: 'gemini-2.5-pro', convPerDay: 670, latencyMs: 2800, costPerDay: 28.40, health: 'healthy', owner: 'Priya S', satisfaction: 4.4, refs: { tools: 2, connectors: 2, guards: 4 }, sparkline: [600, 640, 680, 650, 700, 660, 670] },
    { name: 'PII Redaction Validator', version: 'v2.0.0', status: 'production', model: 'gemini-2.5-flash', convPerDay: 12000, latencyMs: 150, costPerDay: 18.00, health: 'healthy', owner: 'Vamsi K', satisfaction: 4.9, refs: { tools: 0, connectors: 0, guards: 2 }, sparkline: [10500, 11200, 11800, 12100, 11900, 12300, 12000] },
    { name: 'Audit Trail Generator', version: 'v0.8.0', status: 'staging', model: 'gemini-2.5-pro', convPerDay: 200, latencyMs: 1500, costPerDay: 8.00, health: 'healthy', owner: 'Wei C', satisfaction: 4.0, refs: { tools: 1, connectors: 3, guards: 1 }, sparkline: [150, 170, 190, 200, 210, 195, 200] },
  ]},
  { name: 'Engineering', agents: [
    { name: 'Code Reviewer', version: 'v0.3.0', status: 'draft', model: 'gemini-2.5-pro', convPerDay: 0, latencyMs: 0, costPerDay: 0, health: 'healthy', owner: 'Li W', satisfaction: 0, refs: { tools: 3, connectors: 1, guards: 0 }, sparkline: [0, 0, 0, 0, 0, 0, 0] },
    { name: 'Incident Responder', version: 'v0.6.0', status: 'staging', model: 'gemini-2.5-pro', convPerDay: 45, latencyMs: 3500, costPerDay: 4.50, health: 'degraded', owner: 'Vamsi K', satisfaction: 3.8, refs: { tools: 4, connectors: 3, guards: 2 }, sparkline: [30, 35, 40, 50, 45, 55, 45] },
  ]},
];

const STATUS_CONFIG: Record<AgentEntry['status'], { dot: string; badge: string; badgeBg: string; label: string }> = {
  production: { dot: 'bg-[#16A34A]', badge: 'text-[#16A34A]', badgeBg: 'bg-[#F0FDF4]', label: 'Active' },
  staging: { dot: 'bg-[#EAB308]', badge: 'text-[#CA8A04]', badgeBg: 'bg-[#FEFCE8]', label: 'Warming' },
  draft: { dot: 'bg-[#9CA3AF]', badge: 'text-[#6B7280]', badgeBg: 'bg-[#F3F4F6]', label: 'Idle' },
};

function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(w => w[0] && w[0] === w[0].toUpperCase())
    .map(w => w[0])
    .slice(0, 2)
    .join('');
}

const INITIAL_COLORS: Record<string, string> = {
  C: '#4F46E5', S: '#D97706', F: '#E11D48', P: '#0D9488',
  D: '#2563EB', R: '#7C3AED', Q: '#059669', E: '#EA580C',
  A: '#1A73E8', I: '#475569',
};

function AgentIcon({ name }: { name: string }) {
  const initials = getInitials(name);
  const color = INITIAL_COLORS[initials[0]] || '#4F46E5';
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: color + '14', color }}
    >
      <span className="text-[11px] font-semibold">{initials}</span>
    </div>
  );
}

function Sparkline({ data, color = '#2563EB', width = 64, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.every(d => d === 0)) {
    return (
      <div style={{ width, height }} className="flex items-center justify-center">
        <span className="text-[9px] text-[#D1D5DB]">--</span>
      </div>
    );
  }
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const padding = 2;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((d - min) / range) * (height - padding * 2) - padding;
      return `${x},${y}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} className="block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatusDot({ status }: { status: AgentEntry['status'] }) {
  return <span className={`w-[7px] h-[7px] rounded-full ${STATUS_CONFIG[status].dot} inline-block shrink-0`} />;
}

// ─── Main Component ─────────────────────────────────────────────────────
export function AgentPortfolio() {
  const [selectedAgent, setSelectedAgent] = useState<AgentEntry | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());

  const allAgents = TEAMS.flatMap(t => t.agents);
  const activeCount = allAgents.filter(a => a.status === 'production').length;
  const activeAgentsWithSat = allAgents.filter(a => a.satisfaction > 0);
  const avgSatisfaction = activeAgentsWithSat.length > 0
    ? activeAgentsWithSat.reduce((s, a) => s + a.satisfaction, 0) / activeAgentsWithSat.length
    : 0;
  const totalConv = allAgents.reduce((s, a) => s + a.convPerDay, 0);

  const toggleTeam = (name: string) => {
    const next = new Set(collapsedTeams);
    next.has(name) ? next.delete(name) : next.add(name);
    setCollapsedTeams(next);
  };

  return (
    <div className="page-container">
      {/* Header */}
      <header
        className="page-header sticky top-0 z-50"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="font-semibold"
              style={{ fontSize: 13, fontFamily: 'var(--font-ui)', color: 'var(--color-text-primary)' }}
            >
              Agent Portfolio
            </h1>
            <p className="text-[10px]" style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-tertiary)' }}>
              ACME Insurance — Enterprise Agent Fleet
            </p>
          </div>
          <div className="text-[10px] hidden sm:block" style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-tertiary)' }}>
            {allAgents.length} agents across {TEAMS.length} teams
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* Main Content */}
        <div className={`flex-1 overflow-y-auto p-4 md:p-6 ${selectedAgent ? 'md:pr-3' : ''}`}>
          {/* Summary Stats Row */}
          <div className="grid-stats mb-6">
            <SummaryStatCard
              label="Total Agents"
              value={allAgents.length.toString()}
              color="#2563EB"
            />
            <SummaryStatCard
              label="Active"
              value={activeCount.toString()}
              color="#16A34A"
            />
            <SummaryStatCard
              label="Avg Satisfaction"
              value={avgSatisfaction.toFixed(1)}
              color="#111827"
            />
            <SummaryStatCard
              label="Total Conversations"
              value={totalConv.toLocaleString()}
              color="#111827"
            />
          </div>

          {/* Team Sections */}
          {TEAMS.map(team => {
            const isCollapsed = collapsedTeams.has(team.name);
            return (
              <div key={team.name} className="mb-5">
                <button
                  onClick={() => toggleTeam(team.name)}
                  className="flex items-center gap-2 mb-2 group w-full text-left"
                >
                  <svg
                    width={10}
                    height={10}
                    viewBox="0 0 10 10"
                    className={`text-[#9CA3AF] transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                  >
                    <path d="M3 1.5L7 5L3 8.5" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span
                    className="font-semibold text-[#374151]"
                    style={{ fontSize: 12, fontFamily: 'var(--font-ui)' }}
                  >
                    {team.name}
                  </span>
                  <span
                    className="text-[10px] font-medium text-[#6B7280] rounded-full px-1.5 py-0.5"
                    style={{ backgroundColor: '#F3F4F6' }}
                  >
                    {team.agents.length}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="grid grid-cols-1 gap-2 ml-4">
                    {team.agents.map(agent => {
                      const statusCfg = STATUS_CONFIG[agent.status];
                      const isSelected = selectedAgent?.name === agent.name;
                      return (
                        <div
                          key={agent.name}
                          onClick={() => setSelectedAgent(agent)}
                          className={`bg-white rounded-lg cursor-pointer transition-all duration-150 flex items-center gap-3 px-3 py-2.5 ${
                            isSelected
                              ? 'ring-1 ring-[#2563EB] border border-[#BFDBFE]'
                              : 'border border-[#E5E7EB] hover:border-[#D1D5DB] hover:shadow-sm'
                          }`}
                          style={{ boxShadow: isSelected ? undefined : '0 1px 2px 0 rgba(0,0,0,0.03)' }}
                        >
                          <AgentIcon name={agent.name} />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="font-semibold text-[#111827] truncate"
                                style={{ fontSize: 13, fontFamily: 'var(--font-ui)' }}
                              >
                                {agent.name}
                              </span>
                              <StatusDot status={agent.status} />
                              <span
                                className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${statusCfg.badgeBg} ${statusCfg.badge}`}
                              >
                                {agent.version}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[#9CA3AF]">
                              <span>{agent.owner}</span>
                              <span className="text-[#D1D5DB]">|</span>
                              <span>{agent.refs.tools}T {agent.refs.connectors}C {agent.refs.guards}G</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <div className="text-[12px] font-medium text-[#111827]">
                                {agent.convPerDay > 0 ? `${agent.convPerDay.toLocaleString()}` : '--'}
                              </div>
                              <div className="text-[9px] text-[#9CA3AF]">conv/day</div>
                            </div>
                            <Sparkline data={agent.sparkline} />
                            {agent.satisfaction > 0 && (
                              <div className="text-right">
                                <div className="text-[12px] font-medium text-[#111827]">{agent.satisfaction.toFixed(1)}</div>
                                <div className="text-[9px] text-[#9CA3AF]">CSAT</div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detail Sidebar — overlay on mobile, side panel on desktop */}
        {selectedAgent && (
          <div
            className="fixed inset-0 z-40 bg-white overflow-y-auto md:static md:inset-auto md:z-auto md:w-80 md:shrink-0"
            style={{ borderLeft: '1px solid var(--color-border)' }}
          >
            {/* Sidebar Header */}
            <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <AgentIcon name={selectedAgent.name} />
                  <div>
                    <h3
                      className="font-semibold text-[#111827]"
                      style={{ fontSize: 13, fontFamily: 'var(--font-ui)' }}
                    >
                      {selectedAgent.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusDot status={selectedAgent.status} />
                      <span className="text-[10px] text-[#6B7280]">{STATUS_CONFIG[selectedAgent.status].label}</span>
                      <span className="text-[10px] text-[#9CA3AF]">{selectedAgent.version}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors p-0.5"
                >
                  <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
                    <path d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <MetricCell label="Conversations/day" value={selectedAgent.convPerDay > 0 ? selectedAgent.convPerDay.toLocaleString() : '--'} />
                <MetricCell label="Satisfaction" value={selectedAgent.satisfaction > 0 ? selectedAgent.satisfaction.toFixed(1) : '--'} />
                <MetricCell label="Avg Latency" value={selectedAgent.latencyMs > 0 ? `${(selectedAgent.latencyMs / 1000).toFixed(1)}s` : '--'} />
                <MetricCell label="Cost/day" value={selectedAgent.costPerDay > 0 ? `$${selectedAgent.costPerDay.toFixed(2)}` : '--'} />
              </div>

              {/* Sparkline Chart */}
              <div className="mb-4">
                <div className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide mb-2" style={{ fontFamily: 'var(--font-ui)' }}>
                  Conversation Volume (7d)
                </div>
                <div className="bg-[#F9FAFB] rounded-lg p-3 border border-[#E5E7EB]">
                  <Sparkline data={selectedAgent.sparkline} width={240} height={56} />
                  <div className="flex justify-between text-[9px] text-[#9CA3AF] mt-1.5">
                    <span>7d ago</span>
                    <span>Today</span>
                  </div>
                </div>
              </div>

              {/* References */}
              <div className="mb-4">
                <div className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide mb-2" style={{ fontFamily: 'var(--font-ui)' }}>
                  Agent References
                </div>
                <div className="flex gap-2">
                  <RefBadge label="Tools" count={selectedAgent.refs.tools} color="#4F46E5" bg="#EEF2FF" />
                  <RefBadge label="Connectors" count={selectedAgent.refs.connectors} color="#2563EB" bg="#EFF6FF" />
                  <RefBadge label="Guards" count={selectedAgent.refs.guards} color="#E11D48" bg="#FFF1F2" />
                </div>
              </div>

              {/* Model */}
              <div className="mb-4">
                <div className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide mb-2" style={{ fontFamily: 'var(--font-ui)' }}>
                  Model
                </div>
                <div className="text-[12px] text-[#374151] font-medium">{selectedAgent.model}</div>
              </div>

              {/* Recent Conversations */}
              <div className="mb-4">
                <div className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wide mb-2" style={{ fontFamily: 'var(--font-ui)' }}>
                  Recent Conversations
                </div>
                <div className="space-y-0">
                  {[
                    { time: '2m ago', summary: 'Policy lookup for POL-SG-004521' },
                    { time: '8m ago', summary: 'Claim escalation — amount $67,000' },
                    { time: '15m ago', summary: 'Coverage verification for auto policy' },
                  ].map((c, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 py-2"
                      style={{ borderBottom: i < 2 ? '1px solid #F3F4F6' : 'none' }}
                    >
                      <span className="text-[9px] text-[#9CA3AF] w-12 shrink-0 pt-px">{c.time}</span>
                      <span className="text-[11px] text-[#4B5563] leading-snug">{c.summary}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Open in Editor */}
              <Link
                to="/editor"
                className="block w-full text-center text-[12px] font-medium text-white rounded-md py-2 transition-colors"
                style={{ backgroundColor: '#2563EB' }}
                onMouseOver={e => (e.currentTarget.style.backgroundColor = '#1D4ED8')}
                onMouseOut={e => (e.currentTarget.style.backgroundColor = '#2563EB')}
              >
                Open in Editor
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryStatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="bg-white rounded-lg px-4 py-3"
      style={{ border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-xs)' }}
    >
      <div
        className="font-semibold"
        style={{ fontSize: 20, color, fontFamily: 'var(--font-ui)' }}
      >
        {value}
      </div>
      <div className="text-[10px] mt-0.5" style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-tertiary)' }}>
        {label}
      </div>
    </div>
  );
}

function MetricCell({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{ backgroundColor: 'var(--color-surface-1)', border: '1px solid var(--color-border)' }}
    >
      <div className="text-[10px]" style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-tertiary)' }}>{label}</div>
      <div className="text-[16px] font-semibold mt-0.5" style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-primary)' }}>{value}</div>
    </div>
  );
}

function RefBadge({ label, count, color, bg }: { label: string; count: number; color: string; bg: string }) {
  return (
    <span
      className="text-[10px] font-medium px-2 py-1 rounded"
      style={{ color, backgroundColor: bg }}
    >
      {count} {label}
    </span>
  );
}
