import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from 'react-router-dom';
import { PlaybookEditor } from './components/editor/PlaybookEditor';
import { RegistryCatalog } from './components/registry/RegistryCatalog';
import { ConnectorHub } from './components/connectors/ConnectorHub';
import { VersionHistory } from './components/versioning/VersionHistory';
import { LiveAuthoring } from './components/live/LiveAuthoring';
import { SharingModal } from './components/permissions/SharingModal';
import { lazy, Suspense, useState } from 'react';

const NotebookView = lazy(() => import('./components/notebook/NotebookView').then(m => ({ default: m.NotebookView })));
const SkillEditor = lazy(() => import('./components/skills/SkillEditor').then(m => ({ default: m.SkillEditor })));
const LiveSplitView = lazy(() => import('./components/editor/LiveSplitView').then(m => ({ default: m.LiveSplitView })));
const AgentPortfolio = lazy(() => import('./components/dashboard/AgentPortfolio').then(m => ({ default: m.AgentPortfolio })));
const AdminConsole = lazy(() => import('./components/admin/AdminConsole').then(m => ({ default: m.AdminConsole })));
const CostCalculator = lazy(() => import('./components/shared/CostCalculator').then(m => ({ default: m.CostCalculator })));

// ─── SVG Icon Components (16×16 viewBox) ──────────────────────────────
// Each icon is a clean, geometric shape — no emoji, no gradients.
// Consistent 1.3px stroke, round caps, clean geometry.

function IconEditor() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 5.5h6M5 8h4M5 10.5h5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

function IconSplitView() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 2.5v11" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function IconNotebook() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <rect x="3.5" y="1.5" width="9" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M6 5h4M6 8h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
      <path d="M3.5 4.5H2M3.5 7.5H2M3.5 10.5H2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

function IconRegistry() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconConnectors() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="4.5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="11.5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 8h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function IconSkills() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M8 2l1.8 3.6L14 6.4l-3 2.9.7 4.1L8 11.4 4.3 13.4l.7-4.1-3-2.9 4.2-.8L8 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}

function IconHistory() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 4.5v4l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconLive() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M5.5 3v10l7-5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

function IconPortfolio() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M3 6h2v6H3zM7 4h2v8H7zM11 7h2v5h-2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}

function IconAdmin() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M8 2L3 4.5v4c0 3.5 2.2 5.5 5 6.5 2.8-1 5-3 5-6.5v-4L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCost() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5v6M6.5 6.5h2.5a1 1 0 010 2H6.5a1 1 0 000 2H10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

function IconPermissions() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M5.5 7V5a2.5 2.5 0 015 0v2" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="3.5" y="7" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

const ICON_MAP: Record<string, React.FC> = {
  editor: IconEditor,
  splitView: IconSplitView,
  notebook: IconNotebook,
  registry: IconRegistry,
  connectors: IconConnectors,
  skills: IconSkills,
  history: IconHistory,
  live: IconLive,
  portfolio: IconPortfolio,
  admin: IconAdmin,
  cost: IconCost,
  permissions: IconPermissions,
};

// ─── Navigation Structure ───────────────────────────────────────────
interface NavItem {
  path: string;
  label: string;
  icon: string;
  section?: string;
  badge?: string;
}

const NAV: NavItem[] = [
  { path: '/editor', label: 'Editor', icon: 'editor', section: 'Build' },
  { path: '/split-view', label: 'Split View', icon: 'splitView' },
  { path: '/notebook', label: 'Notebook', icon: 'notebook' },
  { path: '/registry', label: 'Registry', icon: 'registry', section: 'Manage' },
  { path: '/connectors', label: 'Connectors', icon: 'connectors' },
  { path: '/skills', label: 'Skills', icon: 'skills' },
  { path: '/history', label: 'History', icon: 'history' },
  { path: '/portfolio', label: 'Portfolio', icon: 'portfolio', section: 'Operate' },
  { path: '/admin', label: 'Admin', icon: 'admin' },
  { path: '/cost', label: 'Cost', icon: 'cost' },
  { path: '/live', label: 'Live Author', icon: 'live', section: 'Other' },
  { path: '/permissions', label: 'Permissions', icon: 'permissions' },
];

// ─── Shell ──────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="h-screen flex overflow-hidden bg-[#F8F9FA]">
      {/* Sidebar */}
      <aside
        className="h-full flex flex-col shrink-0 transition-[width] duration-200 ease-out bg-white"
        style={{
          width: collapsed ? 56 : 220,
          borderRight: '1px solid #E5E7EB',
        }}
      >
        {/* Logo area */}
        <div
          className="flex items-center shrink-0"
          style={{
            height: 56,
            padding: collapsed ? '0 12px' : '0 16px',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity w-full"
          >
            <div
              className="shrink-0 rounded-lg flex items-center justify-center"
              style={{
                width: 32,
                height: 32,
                background: '#2563EB',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3.5 4.5h9M3.5 8h5.5M3.5 11.5h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span
                  className="text-[13px] font-semibold text-[#111827] leading-tight tracking-[-0.01em]"
                  style={{ fontFamily: 'var(--font-ui)' }}
                >
                  Playbook
                </span>
                <span className="text-[10px] text-[#9CA3AF] leading-tight">
                  Agent Builder
                </span>
              </div>
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {NAV.map((item, i) => {
            const isActive = location.pathname === item.path;
            const showSection = item.section && !collapsed;
            const IconComponent = ICON_MAP[item.icon];

            return (
              <div key={item.path}>
                {showSection && (
                  <div
                    className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] px-2"
                    style={{
                      marginTop: i === 0 ? 0 : 20,
                      marginBottom: 6,
                    }}
                  >
                    {item.section}
                  </div>
                )}
                {item.section && collapsed && i > 0 && (
                  <div className="mx-2 my-3 border-t border-[#F1F3F5]" />
                )}
                <NavLink
                  to={item.path}
                  className="flex items-center rounded-lg transition-all duration-150 group relative"
                  style={{
                    padding: collapsed ? '8px 10px' : '7px 10px',
                    gap: 10,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    color: isActive ? '#2563EB' : '#6B7280',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                      style={{
                        height: 20,
                        background: '#2563EB',
                      }}
                    />
                  )}
                  {IconComponent && <IconComponent />}
                  {!collapsed && (
                    <span className="text-[13px] truncate" style={{ fontFamily: 'var(--font-ui)' }}>
                      {item.label}
                    </span>
                  )}
                  {!collapsed && item.badge && (
                    <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              </div>
            );
          })}
        </nav>

        {/* Footer: Agent Status */}
        <div
          className="shrink-0 px-3 py-3"
          style={{ borderTop: '1px solid #E5E7EB' }}
        >
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[10px] font-semibold text-[#6B7280]"
                  style={{ fontFamily: 'var(--font-ui)' }}
                >
                  CA
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                  style={{ background: '#22C55E' }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] font-medium text-[#374151] truncate">Claims Agent</div>
                <div className="text-[10px] text-[#9CA3AF]">v2.1 · Running</div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-7 h-7 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[9px] font-semibold text-[#6B7280]">
                  CA
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                  style={{ background: '#22C55E' }}
                />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function Loading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 border-[#E5E7EB] border-t-[#2563EB] rounded-full animate-spin" />
        <span className="text-[11px] text-[#9CA3AF]" style={{ fontFamily: 'var(--font-ui)' }}>Loading...</span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Shell><Loading /></Shell>}>
        <Routes>
          <Route path="/" element={<Navigate to="/editor" replace />} />
          <Route path="/editor" element={<Shell><PlaybookEditor /></Shell>} />
          <Route path="/split-view" element={<Shell><LiveSplitView /></Shell>} />
          <Route path="/notebook" element={<Shell><NotebookView /></Shell>} />
          <Route path="/registry" element={<Shell><RegistryCatalog /></Shell>} />
          <Route path="/connectors" element={<Shell><ConnectorHub /></Shell>} />
          <Route path="/skills" element={<Shell><SkillEditor /></Shell>} />
          <Route path="/history" element={<Shell><VersionHistory /></Shell>} />
          <Route path="/portfolio" element={<Shell><AgentPortfolio /></Shell>} />
          <Route path="/admin" element={<Shell><AdminConsole /></Shell>} />
          <Route path="/cost" element={<Shell><CostCalculator /></Shell>} />
          <Route path="/live" element={<Shell><LiveAuthoring /></Shell>} />
          <Route path="/permissions" element={<Shell><SharingModal /></Shell>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
