/**
 * ConnectorHub — Screen 9: All Gemini Enterprise connectors.
 *
 * Grid view showing Google-native + third-party connectors with
 * sync status, entities, actions, and the "governed space expansion" visual.
 */

import { useState, useMemo, useCallback } from 'react';
import { useConnectors, useNotifications } from '../../contexts/AppContext';
import type { ConnectorEntry } from '../../data/connectors';

// ─── SVG Icons ───────────────────────────────────────────────────────

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8.5 1L3 9.5h4.5L6.5 15 13 6.5H8.5L9.5 1H8.5Z" fill="currentColor" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.65 2.35A7.96 7.96 0 0 0 8 0C3.58 0 .01 3.58.01 8S3.58 16 8 16c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 8 14 6 6 0 1 1 8 2c1.66 0 3.14.69 4.22 1.78L9 7h7V0l-2.35 2.35Z" fill="currentColor" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85-.017.016ZM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0Z" fill="currentColor" />
    </svg>
  );
}

function ChevronIcon({ expanded, className }: { expanded: boolean; className?: string }) {
  return (
    <svg
      className={className}
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 150ms ease',
      }}
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="8" height="8" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Letter Abbreviation Map ─────────────────────────────────────────

const CONNECTOR_ABBREVS: Record<string, { abbr: string; bg: string; fg: string }> = {
  'google-drive': { abbr: 'GD', bg: '#E8F0FE', fg: '#1A73E8' },
  'gmail': { abbr: 'GM', bg: '#FCE8E6', fg: '#D93025' },
  'google-calendar': { abbr: 'GC', bg: '#E6F4EA', fg: '#1E8E3E' },
  'bigquery': { abbr: 'BQ', bg: '#E8F0FE', fg: '#1A73E8' },
  'cloud-storage': { abbr: 'CS', bg: '#E8F0FE', fg: '#4285F4' },
  'spanner': { abbr: 'SP', bg: '#FEF7E0', fg: '#F9AB00' },
  'firestore': { abbr: 'FS', bg: '#FEF7E0', fg: '#F9AB00' },
  'bigtable': { abbr: 'BT', bg: '#E8F0FE', fg: '#4285F4' },
  'alloydb': { abbr: 'AD', bg: '#E8EAF6', fg: '#3F51B5' },
  'cloud-sql': { abbr: 'SQ', bg: '#E8F0FE', fg: '#4285F4' },
  'google-sites': { abbr: 'GS', bg: '#E8F0FE', fg: '#4285F4' },
  'google-groups': { abbr: 'GG', bg: '#E8F0FE', fg: '#4285F4' },
  'jira': { abbr: 'J', bg: '#E3F2FD', fg: '#0052CC' },
  'salesforce': { abbr: 'SF', bg: '#E3F2FD', fg: '#00A1E0' },
  'slack': { abbr: 'SL', bg: '#F3E5F5', fg: '#611F69' },
  'confluence': { abbr: 'CF', bg: '#E3F2FD', fg: '#0052CC' },
  'servicenow': { abbr: 'SN', bg: '#E8F5E9', fg: '#2E7D32' },
  'sharepoint': { abbr: 'SP', bg: '#E3F2FD', fg: '#036C70' },
  'onedrive': { abbr: 'OD', bg: '#E3F2FD', fg: '#0078D4' },
  'outlook': { abbr: 'OL', bg: '#E3F2FD', fg: '#0078D4' },
  'box': { abbr: 'BX', bg: '#E3F2FD', fg: '#0061D5' },
  'dropbox': { abbr: 'DB', bg: '#E8F0FE', fg: '#0061FF' },
  'github': { abbr: 'GH', bg: '#F3F4F6', fg: '#24292F' },
  'hubspot': { abbr: 'HS', bg: '#FFF3E0', fg: '#FF7A59' },
  'monday': { abbr: 'MN', bg: '#FFF3E0', fg: '#FF3D57' },
};

function getConnectorVisual(id: string, product: string) {
  const mapped = CONNECTOR_ABBREVS[id];
  if (mapped) return mapped;
  // Fallback: first two uppercase letters
  const words = product.split(/\s+/);
  const abbr = words.length > 1
    ? (words[0][0] + words[1][0]).toUpperCase()
    : product.substring(0, 2).toUpperCase();
  return { abbr, bg: '#F3F4F6', fg: '#6B7280' };
}

// ─── Action Summary Bar ──────────────────────────────────────────────

function ActionSummary({ actionCount, systemCount }: { actionCount: number; systemCount: number }) {
  return (
    <div
      className="flex flex-wrap items-center gap-2 px-4 py-2.5 rounded-lg"
      style={{ border: '1px solid var(--color-border)', background: 'var(--color-surface-1)', fontFamily: 'var(--font-ui)' }}
    >
      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
        Agent can perform{' '}
        <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{actionCount} actions</span>
        {' '}across{' '}
        <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{systemCount} connected systems</span>
      </span>
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ConnectorEntry['status'] }) {
  const configs: Record<string, { dotColor: string; textColor: string; bgColor: string; label: string }> = {
    active: { dotColor: '#059669', textColor: '#059669', bgColor: '#ECFDF5', label: 'Active' },
    available: { dotColor: '#9CA3AF', textColor: '#6B7280', bgColor: '#F3F4F6', label: 'Available' },
    draft: { dotColor: '#D97706', textColor: '#D97706', bgColor: '#FFFBEB', label: 'Configuring' },
    error: { dotColor: '#DC2626', textColor: '#DC2626', bgColor: '#FEF2F2', label: 'Error' },
  };

  const config = configs[status];

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ fontSize: 10, fontWeight: 500, color: config.textColor, background: config.bgColor }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: config.dotColor,
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {config.label}
    </span>
  );
}

// ─── Sync Mode Badge ─────────────────────────────────────────────────

function SyncModeBadge({ mode }: { mode?: 'federated' | 'ingested' }) {
  if (!mode) return null;

  if (mode === 'federated') {
    return (
      <span className="inline-flex items-center gap-1" style={{ fontSize: 10, color: '#2563EB' }}>
        <LightningIcon className="text-[#2563EB]" />
        Real-time
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1" style={{ fontSize: 10, color: '#9CA3AF' }}>
      <RefreshIcon className="text-[#9CA3AF]" />
      Periodic sync
    </span>
  );
}

// ─── Connector Card ──────────────────────────────────────────────────

function ConnectorCard({ connector, onSelect, onToggle, onSync, onOpenConsole, onTestQuery }: {
  connector: ConnectorEntry;
  onSelect: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onSync: (id: string) => void;
  onOpenConsole: () => void;
  onTestQuery: (id: string, query: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [queryResults, setQueryResults] = useState<string[] | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const visual = getConnectorVisual(connector.id, connector.product);

  const enabledEntities = connector.entities.filter((e) => e.enabled).length;
  const enabledActions = connector.actions.filter((a) => a.enabled).length;

  const timeSinceSync = useMemo(() => {
    if (!connector.lastSync) return null;
    const mins = Math.floor((Date.now() - new Date(connector.lastSync).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (mins < 1440) return `${Math.floor(mins / 60)}h ago`;
    return `${Math.floor(mins / 1440)}d ago`;
  }, [connector.lastSync]);

  return (
    <div
      className="rounded-lg border bg-white transition-all cursor-pointer"
      style={{
        borderColor: expanded ? 'var(--color-accent)' : 'var(--color-border)',
        boxShadow: expanded
          ? '0 1px 3px 0 rgba(37, 99, 235, 0.08)'
          : 'var(--shadow-xs)',
        opacity: connector.status === 'available' ? 0.72 : 1,
        fontFamily: 'var(--font-ui)',
      }}
      onMouseEnter={(e) => {
        if (!expanded) {
          e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.08)';
        }
        if (connector.status === 'available') {
          e.currentTarget.style.opacity = '1';
        }
      }}
      onMouseLeave={(e) => {
        if (!expanded) {
          e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.03)';
        }
        if (connector.status === 'available') {
          e.currentTarget.style.opacity = '0.72';
        }
      }}
      onClick={() => { setExpanded(!expanded); onSelect(connector.id); }}
    >
      <div className="p-3">
        {/* Header row */}
        <div className="flex items-center gap-2.5">
          {/* Letter circle */}
          <div
            className="flex items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              background: visual.bg,
              color: visual.fg,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}
          >
            {visual.abbr}
          </div>

          {/* Name + status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 style={{ fontSize: 13, fontWeight: 600, color: '#111827', margin: 0, lineHeight: 1.3 }}>
                {connector.product}
              </h3>
              <StatusBadge status={connector.status} />
            </div>
            {/* Meta line: sync mode + entity/action counts */}
            {connector.status === 'active' && (
              <div className="flex items-center gap-2 mt-0.5">
                <SyncModeBadge mode={connector.syncMode} />
                {(enabledEntities > 0 || enabledActions > 0) && (
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                    {enabledEntities > 0 && `${enabledEntities} entities`}
                    {enabledEntities > 0 && enabledActions > 0 && ' / '}
                    {enabledActions > 0 && `${enabledActions} actions`}
                  </span>
                )}
                {timeSinceSync && (
                  <span style={{ fontSize: 10, color: '#9CA3AF' }}>
                    Synced {timeSinceSync}
                  </span>
                )}
              </div>
            )}
            {connector.status === 'available' && (
              <span style={{ fontSize: 10, color: '#2563EB', fontWeight: 500 }}>
                Connect to get started
              </span>
            )}
          </div>

          {/* Expand indicator */}
          {connector.status === 'active' && (
            <ChevronIcon expanded={expanded} className="text-[#9CA3AF] flex-shrink-0" />
          )}
        </div>

        {/* Referenced count */}
        {connector.referencedInPlaybooks > 0 && connector.status !== 'available' && (
          <div className="mt-2 ml-[42px]" style={{ fontSize: 10, color: '#9CA3AF' }}>
            Referenced in {connector.referencedInPlaybooks} playbook{connector.referencedInPlaybooks > 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Expanded detail */}
      {expanded && connector.status === 'active' && (
        <div className="px-3 pb-3 border-t border-[#F3F4F6] pt-3 space-y-3 ml-[42px]">
          {/* Entities */}
          {connector.entities.length > 0 && (
            <div>
              <h4
                className="mb-1.5"
                style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Entities
              </h4>
              <div className="space-y-1">
                {connector.entities.map((e) => (
                  <div key={e.name} className="flex items-center justify-between" style={{ fontSize: 12 }}>
                    <div className="flex items-center gap-2">
                      <span
                        className="flex items-center justify-center rounded"
                        style={{
                          width: 14,
                          height: 14,
                          border: e.enabled ? '1px solid #2563EB' : '1px solid #D1D5DB',
                          background: e.enabled ? '#2563EB' : 'transparent',
                          color: '#fff',
                        }}
                      >
                        {e.enabled && <CheckIcon />}
                      </span>
                      <span style={{ color: '#374151' }}>{e.name}</span>
                    </div>
                    {e.count > 0 && (
                      <span style={{ color: '#9CA3AF', fontSize: 10 }}>{e.count.toLocaleString()}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {connector.actions.length > 0 && (
            <div>
              <h4
                className="mb-1.5"
                style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Actions
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {connector.actions.map((a) => (
                  <span
                    key={a.name}
                    className="rounded-full"
                    style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      background: a.enabled ? '#EFF6FF' : '#F9FAFB',
                      color: a.enabled ? '#2563EB' : '#9CA3AF',
                      textDecoration: a.enabled ? 'none' : 'line-through',
                    }}
                  >
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Auth & region */}
          <div className="flex flex-wrap gap-3" style={{ fontSize: 10, color: '#9CA3AF' }}>
            <span>Auth: {connector.authMethod}</span>
            {connector.authUser && <span>User: {connector.authUser}</span>}
            {connector.region && <span>Region: {connector.region}</span>}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="hover:underline"
              style={{ fontSize: 10, color: '#2563EB', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); onOpenConsole(); }}
            >
              Open in Gemini Enterprise Console
            </button>
            <button
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid #E5E7EB',
                background: syncing ? '#F3F4F6' : '#fff',
                color: syncing ? '#9CA3AF' : '#374151',
                cursor: syncing ? 'not-allowed' : 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (syncing) return;
                setSyncing(true);
                onSync(connector.id);
                setTimeout(() => setSyncing(false), 1200);
              }}
            >
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              style={{
                fontSize: 10,
                fontWeight: 500,
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: connector.status === 'active' ? '#DC2626' : '#059669',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                e.stopPropagation();
                onToggle(connector.id, connector.status !== 'active');
              }}
            >
              {connector.status === 'active' ? 'Disconnect' : 'Connect'}
            </button>
          </div>

          {/* Mini query tester */}
          <div style={{ marginTop: 4 }}>
            <h4
              className="mb-1.5"
              style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Query Tester
            </h4>
            <div className="flex gap-2">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder={`Search ${connector.product}...`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 px-2 py-1.5 text-[11px] border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-300"
                style={{ borderColor: '#E5E7EB', fontFamily: 'var(--font-ui)' }}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!queryInput.trim() || queryLoading) return;
                  setQueryLoading(true);
                  setQueryResults(null);
                  // Simulate the async query
                  const product = connector.product;
                  setTimeout(() => {
                    setQueryResults([
                      `${product} result 1 for "${queryInput}"`,
                      `${product} result 2 for "${queryInput}"`,
                      `${product} result 3 for "${queryInput}"`,
                    ]);
                    setQueryLoading(false);
                  }, 400 + Math.random() * 600);
                  onTestQuery(connector.id, queryInput);
                }}
                disabled={!queryInput.trim() || queryLoading}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  padding: '3px 10px',
                  borderRadius: 6,
                  border: 'none',
                  background: queryInput.trim() && !queryLoading ? '#2563EB' : '#93C5FD',
                  color: '#fff',
                  cursor: queryInput.trim() && !queryLoading ? 'pointer' : 'not-allowed',
                }}
              >
                {queryLoading ? 'Querying...' : 'Test'}
              </button>
            </div>
            {queryResults && (
              <div className="mt-2 space-y-1">
                {queryResults.map((r, i) => (
                  <div key={i} className="text-[10px] px-2 py-1 rounded" style={{ background: '#F9FAFB', color: '#374151', fontFamily: 'var(--font-mono)' }}>
                    {r}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <h2
      className="mb-3"
      style={{
        fontSize: 10,
        fontWeight: 600,
        color: '#9CA3AF',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontFamily: 'var(--font-ui)',
        margin: 0,
        marginBottom: 12,
      }}
    >
      {label} ({count})
    </h2>
  );
}

// ─── Main Hub ────────────────────────────────────────────────────────

export function ConnectorHub() {
  const [search, setSearch] = useState('');
  const { connectors, actionCount, selectConnector, toggleConnector, syncConnector, testQuery } = useConnectors();
  const { addNotification } = useNotifications();

  const filterBySearch = useCallback((list: ConnectorEntry[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (c) =>
        c.product.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.actions.some((a) => a.name.toLowerCase().includes(q)),
    );
  }, [search]);

  const googleConnectors = useMemo(() => connectors.filter((c) => c.provider === 'google'), [connectors]);
  const thirdPartyConnectors = useMemo(() => connectors.filter((c) => c.provider === 'third-party'), [connectors]);
  const googleFiltered = useMemo(() => filterBySearch(googleConnectors), [filterBySearch, googleConnectors]);
  const thirdPartyFiltered = useMemo(() => filterBySearch(thirdPartyConnectors), [filterBySearch, thirdPartyConnectors]);
  const activeCount = connectors.filter((c) => c.status === 'active').length;
  const activeSystemCount = connectors.filter((c) => c.status === 'active').length;

  const handleAddConnector = () => {
    addNotification({ type: 'info', title: 'Open Gemini Enterprise Console', message: 'Configure new connectors in the admin console' });
  };

  const handleOpenConsole = () => {
    addNotification({ type: 'info', title: 'Opening Console...', message: 'Redirecting to Gemini Enterprise admin' });
  };

  const handleToggle = (id: string, enabled: boolean) => {
    toggleConnector(id, enabled);
  };

  const handleSync = (id: string) => {
    syncConnector(id);
  };

  const handleTestQuery = (id: string, query: string) => {
    testQuery(id, query);
  };

  const handleSelect = (id: string) => {
    selectConnector(id);
  };

  return (
    <div className="page-container" style={{ overflow: 'auto' }}>
      {/* Header */}
      <header
        className="page-header sticky top-0 z-50 flex items-center justify-between"
      >
        <div style={{ fontFamily: 'var(--font-ui)' }}>
          <h1 style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, lineHeight: 1.3 }}>
            Connected Systems
          </h1>
          <p style={{ fontSize: 10, color: 'var(--color-text-tertiary)', margin: 0, marginTop: 1 }}>
            {activeCount} active connection{activeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleAddConnector}
          className="rounded-lg"
          style={{
            fontSize: 12,
            fontWeight: 500,
            padding: '6px 14px',
            background: 'var(--color-accent)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-accent-hover)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--color-accent)'; }}
        >
          Add Connector
        </button>
      </header>

      <div className="page-body space-y-5">
        {/* Action summary bar */}
        <ActionSummary actionCount={actionCount} systemCount={activeSystemCount} />

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search connectors by name, description, or action..."
            className="w-full rounded-lg border focus:outline-none"
            style={{
              padding: '8px 12px 8px 34px',
              fontSize: 12,
              border: '1px solid #E5E7EB',
              background: '#fff',
              color: '#111827',
              fontFamily: 'var(--font-ui)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#2563EB';
              e.currentTarget.style.boxShadow = '0 0 0 1px #2563EB';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#E5E7EB';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Google Sources */}
        <div>
          <SectionHeader label="Google" count={googleFiltered.length} />
          <div className="grid-auto">
            {googleFiltered.map((c) => (
              <ConnectorCard key={c.id} connector={c} onSelect={handleSelect} onToggle={handleToggle} onSync={handleSync} onOpenConsole={handleOpenConsole} onTestQuery={handleTestQuery} />
            ))}
          </div>
        </div>

        {/* Third-party */}
        <div>
          <SectionHeader label="Third-Party" count={thirdPartyFiltered.length} />
          <div className="grid-auto">
            {thirdPartyFiltered.map((c) => (
              <ConnectorCard key={c.id} connector={c} onSelect={handleSelect} onToggle={handleToggle} onSync={handleSync} onOpenConsole={handleOpenConsole} onTestQuery={handleTestQuery} />
            ))}
          </div>
        </div>

        {/* Code execution contrast note */}
        <div
          className="rounded-lg"
          style={{
            padding: '12px 16px',
            border: '1px dashed var(--color-border-strong)',
            background: 'var(--color-surface-1)',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            fontFamily: 'var(--font-ui)',
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: '#374151' }}>Without connectors</strong>, the agent could write raw code to call these APIs.
          Connectors provide the same capabilities with governance, authentication, sync, and audit built in.
          They are <em>cached, governed expansions</em> of the omnipotent code execution space.
        </div>
      </div>
    </div>
  );
}
