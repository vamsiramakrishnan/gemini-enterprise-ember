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

// ─── SVG Icons (16x16) ─────────────────────────────────────────────
const icons = {
  editor: <path d="M3 3h10v10H3z" fill="none" stroke="currentColor" strokeWidth="1.3"/>,
  splitView: <><path d="M3 3h10v10H3z" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M8 3v10" stroke="currentColor" strokeWidth="1.3"/></>,
  notebook: <><path d="M4 2h8a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M6 5h4M6 8h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></>,
  registry: <><circle cx="8" cy="8" r="5" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M11.5 11.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></>,
  connectors: <><circle cx="5" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.3"/><circle cx="11" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M7 8h2" stroke="currentColor" strokeWidth="1.3"/></>,
  skills: <><path d="M8 2l1.5 4H14l-3.5 2.5L12 13 8 10l-4 3 1.5-4.5L2 6h4.5z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></>,
  history: <><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3.5l2.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></>,
  live: <><path d="M5 3v10l7-5z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></>,
  portfolio: <><path d="M3 5h2v7H3zM7 3h2v9H7zM11 6h2v6h-2z" fill="none" stroke="currentColor" strokeWidth="1.2"/></>,
  admin: <><path d="M8 2L3 5v4c0 3.5 2.2 6 5 7 2.8-1 5-3.5 5-7V5z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></>,
  cost: <><circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v6M6 6.5h3.5a1 1 0 010 2H6.5a1 1 0 000 2H10" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></>,
  permissions: <><path d="M5 7V5a3 3 0 016 0v2" fill="none" stroke="currentColor" strokeWidth="1.3"/><rect x="3" y="7" width="10" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3"/></>,
};

type IconKey = keyof typeof icons;

function Icon({ name, size = 16 }: { name: IconKey; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="shrink-0">
      {icons[name]}
    </svg>
  );
}

// ─── Navigation Structure ───────────────────────────────────────────
interface NavItem { path: string; label: string; icon: IconKey; section?: string }

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
    <div className="h-screen flex overflow-hidden" style={{ background: '#FAFBFC' }}>
      {/* Sidebar */}
      <aside
        className="h-full flex flex-col border-r shrink-0 transition-all duration-200"
        style={{
          width: collapsed ? 52 : 200,
          borderColor: '#E2E5E9',
          background: '#FFFFFF',
        }}
      >
        {/* Logo */}
        <div className="h-[52px] flex items-center px-3 border-b" style={{ borderColor: '#E2E5E9' }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0" style={{ background: '#2563EB' }}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M3.5 4.5h8M3.5 7.5h5M3.5 10.5h6.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </div>
            {!collapsed && (
              <span className="text-[13px] font-semibold text-[#111827] tracking-[-0.01em] whitespace-nowrap">
                Playbook
              </span>
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {NAV.map((item, i) => {
            const isActive = location.pathname === item.path;
            const showSection = item.section && !collapsed;

            return (
              <div key={item.path}>
                {showSection && (
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9CA3AF] mt-4 mb-1.5 px-2">
                    {item.section}
                  </div>
                )}
                {item.section && collapsed && i > 0 && (
                  <div className="mx-2 my-2 border-t" style={{ borderColor: '#F1F3F5' }} />
                )}
                <NavLink
                  to={item.path}
                  className="flex items-center gap-2.5 rounded-md transition-colors duration-150"
                  style={{
                    padding: collapsed ? '8px' : '6px 8px',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    color: isActive ? '#2563EB' : '#6B7280',
                    background: isActive ? '#EFF6FF' : 'transparent',
                    fontWeight: isActive ? 500 : 400,
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon name={item.icon} />
                  {!collapsed && (
                    <span className="text-[13px] truncate">{item.label}</span>
                  )}
                </NavLink>
              </div>
            );
          })}
        </nav>

        {/* Agent indicator */}
        <div className="px-3 py-3 border-t" style={{ borderColor: '#E2E5E9' }}>
          {!collapsed ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
              <span className="text-[11px] text-[#6B7280] truncate">Claims Agent v2.1</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-2 h-2 rounded-full" style={{ background: '#22C55E' }} />
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

function Loading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#E2E5E9] border-t-[#2563EB] rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Shell><Loading /></Shell>}>
        <Routes>
          {/* Default → Editor */}
          <Route path="/" element={<Navigate to="/editor" replace />} />

          {/* All screens wrapped in Shell */}
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
