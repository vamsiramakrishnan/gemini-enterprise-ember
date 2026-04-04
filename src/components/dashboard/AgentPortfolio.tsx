import { useState } from 'react';
import { Link } from 'react-router-dom';

// ─── Mock Data ──────────────────────────────────────────────────────────
interface AgentEntry {
  name: string; version: string; status: 'production' | 'staging' | 'draft';
  model: string; convPerDay: number; latencyMs: number; costPerDay: number;
  health: 'healthy' | 'degraded' | 'down'; owner: string;
  refs: { tools: number; connectors: number; guards: number };
  sparkline: number[];
}

interface Team { name: string; agents: AgentEntry[] }

const TEAMS: Team[] = [
  { name: 'Claims Team', agents: [
    { name: 'Claims Processing Agent', version: 'v2.1.0', status: 'production', model: 'gemini-2.5-pro', convPerDay: 3200, latencyMs: 1800, costPerDay: 89.60, health: 'healthy', owner: 'Vamsi K', refs: { tools: 5, connectors: 3, guards: 2 }, sparkline: [2800, 3100, 2900, 3400, 3200, 3500, 3200] },
    { name: 'Senior Adjuster', version: 'v1.3.0', status: 'production', model: 'gemini-2.5-pro', convPerDay: 890, latencyMs: 2400, costPerDay: 34.20, health: 'healthy', owner: 'Priya S', refs: { tools: 3, connectors: 2, guards: 3 }, sparkline: [750, 820, 900, 870, 910, 880, 890] },
    { name: 'Fraud Detection', version: 'v3.0.1', status: 'production', model: 'gemini-2.5-pro', convPerDay: 450, latencyMs: 3200, costPerDay: 22.50, health: 'degraded', owner: 'Wei C', refs: { tools: 2, connectors: 1, guards: 5 }, sparkline: [400, 420, 380, 460, 430, 470, 450] },
    { name: 'Policy Lookup Assistant', version: 'v0.9.0', status: 'staging', model: 'gemini-2.5-flash', convPerDay: 120, latencyMs: 800, costPerDay: 2.40, health: 'healthy', owner: 'Priya S', refs: { tools: 2, connectors: 1, guards: 1 }, sparkline: [80, 95, 110, 105, 130, 115, 120] },
    { name: 'Claims Triage Bot', version: 'v0.2.0', status: 'draft', model: 'gemini-2.5-flash', convPerDay: 0, latencyMs: 0, costPerDay: 0, health: 'healthy', owner: 'Wei C', refs: { tools: 1, connectors: 0, guards: 0 }, sparkline: [0, 0, 0, 0, 0, 0, 0] },
    { name: 'Document Intake Agent', version: 'v0.1.0', status: 'draft', model: 'gemini-2.5-pro', convPerDay: 0, latencyMs: 0, costPerDay: 0, health: 'healthy', owner: 'Vamsi K', refs: { tools: 2, connectors: 2, guards: 1 }, sparkline: [0, 0, 0, 0, 0, 0, 0] },
  ]},
  { name: 'Customer Support', agents: [
    { name: 'Customer Inquiry Router', version: 'v2.0.0', status: 'production', model: 'gemini-2.5-flash', convPerDay: 5400, latencyMs: 600, costPerDay: 43.20, health: 'healthy', owner: 'Aisha M', refs: { tools: 3, connectors: 4, guards: 2 }, sparkline: [4800, 5100, 5300, 5200, 5600, 5400, 5400] },
    { name: 'Refund Processor', version: 'v1.1.0', status: 'staging', model: 'gemini-2.5-pro', convPerDay: 340, latencyMs: 2100, costPerDay: 15.30, health: 'healthy', owner: 'Aisha M', refs: { tools: 4, connectors: 2, guards: 3 }, sparkline: [280, 310, 330, 360, 340, 350, 340] },
    { name: 'FAQ Bot', version: 'v4.2.0', status: 'production', model: 'gemini-2.5-flash', convPerDay: 8200, latencyMs: 400, costPerDay: 24.60, health: 'healthy', owner: 'Li W', refs: { tools: 1, connectors: 0, guards: 1 }, sparkline: [7500, 7800, 8100, 7900, 8300, 8000, 8200] },
    { name: 'Escalation Manager', version: 'v0.5.0', status: 'draft', model: 'gemini-2.5-pro', convPerDay: 0, latencyMs: 0, costPerDay: 0, health: 'healthy', owner: 'Li W', refs: { tools: 2, connectors: 3, guards: 2 }, sparkline: [0, 0, 0, 0, 0, 0, 0] },
  ]},
  { name: 'Compliance', agents: [
    { name: 'APAC Compliance Checker', version: 'v1.4.0', status: 'production', model: 'gemini-2.5-pro', convPerDay: 670, latencyMs: 2800, costPerDay: 28.40, health: 'healthy', owner: 'Priya S', refs: { tools: 2, connectors: 2, guards: 4 }, sparkline: [600, 640, 680, 650, 700, 660, 670] },
    { name: 'PII Redaction Validator', version: 'v2.0.0', status: 'production', model: 'gemini-2.5-flash', convPerDay: 12000, latencyMs: 150, costPerDay: 18.00, health: 'healthy', owner: 'Vamsi K', refs: { tools: 0, connectors: 0, guards: 2 }, sparkline: [10500, 11200, 11800, 12100, 11900, 12300, 12000] },
    { name: 'Audit Trail Generator', version: 'v0.8.0', status: 'staging', model: 'gemini-2.5-pro', convPerDay: 200, latencyMs: 1500, costPerDay: 8.00, health: 'healthy', owner: 'Wei C', refs: { tools: 1, connectors: 3, guards: 1 }, sparkline: [150, 170, 190, 200, 210, 195, 200] },
  ]},
  { name: 'Engineering', agents: [
    { name: 'Code Reviewer', version: 'v0.3.0', status: 'draft', model: 'gemini-2.5-pro', convPerDay: 0, latencyMs: 0, costPerDay: 0, health: 'healthy', owner: 'Li W', refs: { tools: 3, connectors: 1, guards: 0 }, sparkline: [0, 0, 0, 0, 0, 0, 0] },
    { name: 'Incident Responder', version: 'v0.6.0', status: 'staging', model: 'gemini-2.5-pro', convPerDay: 45, latencyMs: 3500, costPerDay: 4.50, health: 'degraded', owner: 'Vamsi K', refs: { tools: 4, connectors: 3, guards: 2 }, sparkline: [30, 35, 40, 50, 45, 55, 45] },
  ]},
];

const STATUS_STYLES = {
  production: { border: 'border-l-green-500', badge: 'bg-green-100 text-green-700', label: 'Production' },
  staging: { border: 'border-l-blue-500', badge: 'bg-blue-100 text-blue-700', label: 'Staging' },
  draft: { border: 'border-l-gray-300', badge: 'bg-gray-100 text-gray-500', label: 'Draft' },
};

function Sparkline({ data, color = '#1A73E8', width = 60, height = 20 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.every(d => d === 0)) return <div style={{ width, height }} className="flex items-center justify-center text-[8px] text-gray-300">—</div>;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * width},${height - ((d - min) / range) * (height - 4) - 2}`).join(' ');
  return <svg width={width} height={height}><polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function HealthDot({ health }: { health: string }) {
  const c = health === 'healthy' ? 'bg-green-400' : health === 'degraded' ? 'bg-yellow-400' : 'bg-red-400';
  return <span className={`w-2 h-2 rounded-full ${c} inline-block`} />;
}

// ─── Main Component ─────────────────────────────────────────────────────
export function AgentPortfolio() {
  const [selectedAgent, setSelectedAgent] = useState<AgentEntry | null>(null);
  const [collapsedTeams, setCollapsedTeams] = useState<Set<string>>(new Set());

  const allAgents = TEAMS.flatMap(t => t.agents);
  const prodCount = allAgents.filter(a => a.status === 'production').length;
  const stagingCount = allAgents.filter(a => a.status === 'staging').length;
  const draftCount = allAgents.filter(a => a.status === 'draft').length;
  const totalConv = allAgents.reduce((s, a) => s + a.convPerDay, 0);
  const avgLatency = allAgents.filter(a => a.convPerDay > 0).reduce((s, a) => s + a.latencyMs, 0) / allAgents.filter(a => a.convPerDay > 0).length;
  const totalCost = allAgents.reduce((s, a) => s + a.costPerDay, 0) * 30;

  const toggleTeam = (name: string) => {
    const next = new Set(collapsedTeams);
    next.has(name) ? next.delete(name) : next.add(name);
    setCollapsedTeams(next);
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur-sm px-6 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">← Home</Link>
          <div className="w-px h-4 bg-gray-200" />
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">A</div>
          <div>
            <h1 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>Agent Portfolio</h1>
            <p className="text-[10px] text-gray-400">ACME Insurance — Enterprise Agent Fleet</p>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">{allAgents.length} agents across {TEAMS.length} teams</span>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <div className={`flex-1 p-6 ${selectedAgent ? 'pr-3' : ''}`}>
          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Agents" value={allAgents.length.toString()} sub={`${prodCount} Prod · ${stagingCount} Staging · ${draftCount} Draft`} color="#1A73E8" />
            <StatCard label="Conversations Today" value={totalConv.toLocaleString()} sub="+18% vs yesterday" color="#16A34A" />
            <StatCard label="Avg Response Time" value={`${(avgLatency / 1000).toFixed(1)}s`} sub="p50 across fleet" color="#D97706" />
            <StatCard label="Monthly Cost" value={`$${Math.round(totalCost).toLocaleString()}`} sub="68% of budget" color="#7C3AED"
              bar={{ value: 68, max: 100 }} />
          </div>

          {/* Team Sections */}
          {TEAMS.map(team => (
            <div key={team.name} className="mb-6">
              <button onClick={() => toggleTeam(team.name)}
                className="flex items-center gap-2 mb-3 group">
                <span className="text-[10px] text-gray-400 w-4 text-center">{collapsedTeams.has(team.name) ? '▸' : '▾'}</span>
                <h2 className="text-sm font-semibold text-gray-800" style={{ fontFamily: 'var(--font-ui)' }}>{team.name}</h2>
                <span className="text-[10px] text-gray-400">{team.agents.length} agents</span>
                <span className="text-[10px] text-gray-300">·</span>
                <span className="text-[10px] text-green-600">{team.agents.filter(a => a.status === 'production').length} live</span>
              </button>

              {!collapsedTeams.has(team.name) && (
                <div className="grid grid-cols-1 gap-2">
                  {team.agents.map(agent => {
                    const style = STATUS_STYLES[agent.status];
                    const isSelected = selectedAgent?.name === agent.name;
                    return (
                      <div key={agent.name} onClick={() => setSelectedAgent(agent)}
                        className={`bg-white rounded-lg border border-l-4 ${style.border} ${isSelected ? 'ring-2 ring-blue-200 border-blue-300' : 'border-gray-200'} 
                        p-3 cursor-pointer hover:shadow-sm transition-all flex items-center gap-4`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <HealthDot health={agent.health} />
                            <span className="text-sm font-medium text-gray-900 truncate">{agent.name}</span>
                            <span className="text-[10px] text-gray-400">{agent.version}</span>
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${style.badge}`}>{style.label}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                            <span>{agent.model}</span>
                            <span>·</span>
                            <span>{agent.refs.tools}T {agent.refs.connectors}C {agent.refs.guards}G</span>
                            <span>·</span>
                            <span>{agent.owner}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <div className="text-xs font-medium text-gray-700">{agent.convPerDay > 0 ? `${agent.convPerDay.toLocaleString()}/d` : '—'}</div>
                            <div className="text-[9px] text-gray-400">conv</div>
                          </div>
                          <Sparkline data={agent.sparkline} />
                          <div>
                            <div className={`text-xs font-medium ${agent.latencyMs < 2000 ? 'text-green-600' : agent.latencyMs < 5000 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {agent.latencyMs > 0 ? `${(agent.latencyMs / 1000).toFixed(1)}s` : '—'}
                            </div>
                            <div className="text-[9px] text-gray-400">latency</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-700">{agent.costPerDay > 0 ? `$${agent.costPerDay.toFixed(0)}` : '—'}</div>
                            <div className="text-[9px] text-gray-400">/day</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Right Sidebar — Agent Detail */}
        {selectedAgent && (
          <div className="w-80 border-l border-gray-200 bg-white p-4 sticky top-[53px] h-[calc(100vh-53px)] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">{selectedAgent.name}</h3>
              <button onClick={() => setSelectedAgent(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLES[selectedAgent.status].badge}`}>{STATUS_STYLES[selectedAgent.status].label}</span>
              <span className="text-[10px] text-gray-400">{selectedAgent.version}</span>
              <HealthDot health={selectedAgent.health} />
            </div>

            {/* Volume Chart (mock SVG) */}
            <div className="mb-4">
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Conversation Volume (7d)</h4>
              <div className="bg-gray-50 rounded-lg p-3">
                <Sparkline data={selectedAgent.sparkline} width={240} height={60} />
                <div className="flex justify-between text-[8px] text-gray-400 mt-1">
                  <span>7d ago</span><span>Today</span>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-gray-50 rounded-lg p-2.5">
                <div className="text-[10px] text-gray-500">Conv/day</div>
                <div className="text-lg font-semibold text-gray-900">{selectedAgent.convPerDay.toLocaleString()}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <div className="text-[10px] text-gray-500">Latency</div>
                <div className={`text-lg font-semibold ${selectedAgent.latencyMs < 2000 ? 'text-green-600' : 'text-yellow-600'}`}>
                  {(selectedAgent.latencyMs / 1000).toFixed(1)}s
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <div className="text-[10px] text-gray-500">Cost/day</div>
                <div className="text-lg font-semibold text-gray-900">${selectedAgent.costPerDay.toFixed(2)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5">
                <div className="text-[10px] text-gray-500">Model</div>
                <div className="text-xs font-medium text-gray-700 mt-1">{selectedAgent.model.replace('gemini-', '')}</div>
              </div>
            </div>

            {/* References */}
            <div className="mb-4">
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Agent References</h4>
              <div className="flex gap-2">
                <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium">{selectedAgent.refs.tools} Tools</span>
                <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-medium">{selectedAgent.refs.connectors} Connectors</span>
                <span className="px-2 py-1 rounded bg-rose-50 text-rose-700 text-[10px] font-medium">{selectedAgent.refs.guards} Guards</span>
              </div>
            </div>

            {/* Recent Conversations */}
            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase mb-2">Recent Conversations</h4>
              {[
                { time: '2m ago', summary: 'Policy lookup for POL-SG-004521' },
                { time: '8m ago', summary: 'Claim escalation — amount $67,000' },
                { time: '15m ago', summary: 'Coverage verification for auto policy' },
              ].map((c, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-[9px] text-gray-400 w-12 shrink-0">{c.time}</span>
                  <span className="text-[10px] text-gray-600">{c.summary}</span>
                </div>
              ))}
            </div>

            <Link to="/editor" className="mt-4 block text-center text-xs text-[#1A73E8] hover:underline font-medium">
              Open in Editor →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, bar }: { label: string; value: string; sub: string; color: string; bar?: { value: number; max: number } }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-semibold" style={{ color }}>{value}</div>
      <div className="text-[10px] text-gray-400 mt-0.5">{sub}</div>
      {bar && (
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${bar.value}%`, backgroundColor: color }} />
        </div>
      )}
    </div>
  );
}
