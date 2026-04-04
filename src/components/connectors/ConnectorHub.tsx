/**
 * ConnectorHub — Screen 9: All Gemini Enterprise connectors.
 *
 * Grid view showing Google-native + third-party connectors with
 * sync status, entities, actions, and the "governed space expansion" visual.
 */

import { useState, useMemo } from 'react';
import { GOOGLE_CONNECTORS, THIRD_PARTY_CONNECTORS, ALL_CONNECTORS } from '../../data/connectors';
import type { ConnectorEntry } from '../../data/connectors';

// ─── Action Counter ───────────────────────────────────────────────────

function ActionSummary() {
  const activeConnectors = ALL_CONNECTORS.filter((c) => c.status === 'active');
  const totalActions = activeConnectors.reduce((sum, c) => sum + c.actions.filter((a) => a.enabled).length, 0);
  const totalSystems = activeConnectors.length;

  return (
    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-700">{totalActions}</div>
        <div className="text-[10px] text-blue-500 uppercase tracking-wider">Actions</div>
      </div>
      <div className="w-px h-8 bg-blue-200" />
      <div className="text-center">
        <div className="text-2xl font-bold text-indigo-700">{totalSystems}</div>
        <div className="text-[10px] text-indigo-500 uppercase tracking-wider">Systems</div>
      </div>
      <div className="flex-1 text-xs text-blue-600 ml-2">
        Agent can perform <strong>{totalActions} actions</strong> across{' '}
        <strong>{totalSystems} connected systems</strong>
      </div>
    </div>
  );
}

// ─── Connector Card ───────────────────────────────────────────────────

function ConnectorCard({ connector }: { connector: ConnectorEntry }) {
  const [expanded, setExpanded] = useState(false);

  const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    active: { color: '#059669', bg: '#DCFCE7', label: '● Active' },
    available: { color: '#6B7280', bg: '#F3F4F6', label: 'Available — Connect →' },
    draft: { color: '#D97706', bg: '#FEF9C3', label: '◐ Configuring' },
    error: { color: '#DC2626', bg: '#FEE2E2', label: '● Error' },
  };

  const status = statusConfig[connector.status];
  const totalEntities = connector.entities.reduce((sum, e) => sum + e.count, 0);

  const timeSinceSync = useMemo(() => {
    if (!connector.lastSync) return null;
    const mins = Math.floor((Date.now() - new Date(connector.lastSync).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  }, [connector.lastSync]);

  return (
    <div
      className={`rounded-xl border bg-white transition-all cursor-pointer hover:shadow-md ${
        connector.status === 'available' ? 'opacity-70 hover:opacity-100' : ''
      }`}
      style={{
        borderColor: expanded ? '#2563EB60' : '#E5E7EB',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{connector.icon}</span>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">{connector.product}</h3>
              <span className="text-[10px] text-gray-400">
                {connector.provider === 'google' ? 'Google' : 'Third-party'}
              </span>
            </div>
          </div>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: status.bg, color: status.color }}
          >
            {status.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 mb-3">{connector.description}</p>

        {/* Quick stats */}
        {connector.status === 'active' && (
          <div className="flex flex-wrap gap-1.5">
            {connector.entities.filter((e) => e.enabled).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                {connector.entities.filter((e) => e.enabled).length} entities
              </span>
            )}
            {connector.actions.filter((a) => a.enabled).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600">
                {connector.actions.filter((a) => a.enabled).length} actions
              </span>
            )}
            {totalEntities > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                {totalEntities.toLocaleString()} docs
              </span>
            )}
            {connector.syncMode === 'federated' && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                ⚡ Real-time
              </span>
            )}
            {connector.syncMode === 'ingested' && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200">
                🔄 Periodic sync
              </span>
            )}
            {timeSinceSync && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">
                synced {timeSinceSync}
              </span>
            )}
          </div>
        )}

        {/* Referenced count */}
        {connector.referencedInPlaybooks > 0 && (
          <div className="mt-2 text-[10px] text-gray-400">
            Referenced in {connector.referencedInPlaybooks} playbook{connector.referencedInPlaybooks > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && connector.status === 'active' && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Entities */}
          {connector.entities.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Entities
              </h4>
              <div className="space-y-1">
                {connector.entities.map((e) => (
                  <div key={e.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded border ${e.enabled ? 'bg-blue-500 border-blue-500 text-white text-[8px] flex items-center justify-center' : 'border-gray-300'}`}>
                        {e.enabled ? '✓' : ''}
                      </span>
                      <span className="text-gray-700">{e.name}</span>
                    </div>
                    {e.count > 0 && (
                      <span className="text-gray-400">{e.count.toLocaleString()}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {connector.actions.length > 0 && (
            <div>
              <h4 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Actions
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {connector.actions.map((a) => (
                  <span
                    key={a.name}
                    className={`text-[10px] px-2 py-0.5 rounded-full ${
                      a.enabled
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-400 line-through'
                    }`}
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Auth & region */}
          <div className="flex flex-wrap gap-3 text-[10px] text-gray-400">
            <span>Auth: {connector.authMethod}</span>
            {connector.authUser && <span>User: {connector.authUser}</span>}
            {connector.region && <span>Region: {connector.region}</span>}
          </div>

          <button className="text-[10px] text-blue-600 hover:underline">
            Open in Gemini Enterprise Console →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Hub ─────────────────────────────────────────────────────────

export function ConnectorHub() {
  const [search, setSearch] = useState('');

  const filterBySearch = (list: ConnectorEntry[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.product.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.actions.some((a) => a.name.toLowerCase().includes(q)),
    );
  };

  const googleFiltered = useMemo(() => filterBySearch(GOOGLE_CONNECTORS), [search]);
  const thirdPartyFiltered = useMemo(() => filterBySearch(THIRD_PARTY_CONNECTORS), [search]);

  return (
    <div className="h-full bg-[var(--color-surface-0)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <div>
            <h1 className="text-sm font-semibold text-gray-900">Connector Hub</h1>
            <p className="text-[10px] text-gray-500">
              Gemini Enterprise data sources — {ALL_CONNECTORS.filter((c) => c.status === 'active').length} active connections
            </p>
          </div>
          <div className="ml-auto">
            <button className="px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white text-xs font-medium hover:opacity-90">
              + Add Connector
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Action summary */}
        <ActionSummary />

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search connectors by name, description, or action…"
          className="w-full px-4 py-2.5 rounded-xl border border-[var(--color-border)] bg-white text-sm focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
        />

        {/* Google Sources */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-blue-100 flex items-center justify-center text-[10px]">G</span>
            Google Sources ({googleFiltered.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {googleFiltered.map((c) => (
              <ConnectorCard key={c.id} connector={c} />
            ))}
          </div>
        </div>

        {/* Third-party */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center text-[10px]">3P</span>
            Third-Party Sources ({thirdPartyFiltered.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {thirdPartyFiltered.map((c) => (
              <ConnectorCard key={c.id} connector={c} />
            ))}
          </div>
        </div>

        {/* Code execution contrast note */}
        <div className="p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500">
          <strong className="text-gray-700">Without connectors</strong>, the agent could write raw code to call these APIs.
          Connectors provide the same capabilities with governance, authentication, sync, and audit built in.
          They are <em>cached, governed expansions</em> of the omnipotent code execution space.
        </div>
      </div>
    </div>
  );
}
