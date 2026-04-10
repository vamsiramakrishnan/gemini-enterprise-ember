import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { PlaybookEditor } from './components/editor/PlaybookEditor';
import { RegistryCatalog } from './components/registry/RegistryCatalog';
import { ConnectorHub } from './components/connectors/ConnectorHub';
import { VersionHistory } from './components/versioning/VersionHistory';
import { LiveAuthoring } from './components/live/LiveAuthoring';
import { SharingModal } from './components/permissions/SharingModal';
import { HomePage } from './components/dashboard/HomePage';
import { lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { AppProvider, useNotifications, useRegistry } from './contexts/AppContext';
import { NotificationToast } from './components/shared/NotificationToast';
import { CreateAssetWizard } from './components/shared/CreateAssetWizard';

const NotebookView = lazy(() => import('./components/notebook/NotebookView').then(m => ({ default: m.NotebookView })));
const SkillEditor = lazy(() => import('./components/skills/SkillEditor').then(m => ({ default: m.SkillEditor })));
const LiveSplitView = lazy(() => import('./components/editor/LiveSplitView').then(m => ({ default: m.LiveSplitView })));
const AgentPortfolio = lazy(() => import('./components/dashboard/AgentPortfolio').then(m => ({ default: m.AgentPortfolio })));
const AdminConsole = lazy(() => import('./components/admin/AdminConsole').then(m => ({ default: m.AdminConsole })));
const CostCalculator = lazy(() => import('./components/shared/CostCalculator').then(m => ({ default: m.CostCalculator })));

// ─── SVG Icon Components (16x16 viewBox) ──────────────────────────────

function IconHome() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M3 8l5-5 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.5 7v5.5a1 1 0 001 1h5a1 1 0 001-1V7" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

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

function IconMenu() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="shrink-0">
      <path d="M3 5h12M3 9h8M3 13h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

const ICON_MAP: Record<string, React.FC> = {
  home: IconHome,
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
  { path: '/', label: 'Home', icon: 'home' },
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

// ─── useMediaQuery hook ────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

// ─── Sidebar Content (shared between mobile drawer & desktop sidebar) ──
function SidebarContent({
  collapsed,
  onToggle,
  onNavigate,
  onCreateNew,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  onCreateNew?: () => void;
}) {
  const location = useLocation();

  return (
    <>
      {/* Logo area */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 56,
          padding: collapsed ? '0 12px' : '0 16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={onToggle}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity w-full"
        >
          <div
            className="shrink-0 rounded-lg flex items-center justify-center"
            style={{ width: 32, height: 32, background: 'var(--color-accent)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 4.5h9M3.5 8h5.5M3.5 11.5h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold leading-tight tracking-[-0.01em]" style={{ color: 'var(--color-text-primary)' }}>
                Playbook
              </span>
              <span className="text-[10px] leading-tight" style={{ color: 'var(--color-text-tertiary)' }}>
                Agent Builder
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Create New Button */}
      <div className="px-2 pt-3 pb-1">
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 rounded-lg transition-all duration-150"
          style={{
            padding: collapsed ? '8px 0' : '8px 12px',
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
          }}
          title="Create new asset"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {!collapsed && <span>Create New</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV.map((item, i) => {
          const isActive = location.pathname === item.path;
          const showSection = item.section && !collapsed;
          const IconComponent = ICON_MAP[item.icon];

          return (
            <div key={item.path}>
              {showSection && (
                <div
                  className="text-section-label px-2"
                  style={{
                    marginTop: i === 0 ? 0 : 20,
                    marginBottom: 6,
                  }}
                >
                  {item.section}
                </div>
              )}
              {item.section && collapsed && i > 0 && (
                <div className="mx-2 my-3" style={{ borderTop: '1px solid var(--color-surface-2)' }} />
              )}
              <NavLink
                to={item.path}
                onClick={onNavigate}
                className="flex items-center rounded-lg transition-all duration-150 group relative"
                style={{
                  padding: collapsed ? '8px 10px' : '7px 10px',
                  gap: 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-accent-light)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                }}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                    style={{ height: 20, background: 'var(--color-accent)' }}
                  />
                )}
                {IconComponent && <IconComponent />}
                {!collapsed && (
                  <span className="text-[13px] truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Footer: Agent Status */}
      <div className="shrink-0 px-3 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                CA
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: 'var(--color-success)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>Claims Agent</div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>v2.1 · Running</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-semibold" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                CA
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: 'var(--color-success)' }} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Shell ──────────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const location = useLocation();
  const { createChip } = useRegistry();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openCreateWizard = useCallback(() => setCreateWizardOpen(true), []);

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-surface-1)' }}>
        {/* Mobile top bar */}
        <div className="shell-mobile-header" style={{ display: 'flex' }}>
          <button onClick={() => setMobileOpen(true)} className="p-1 -ml-1" style={{ color: 'var(--color-text-secondary)' }}>
            <IconMenu />
          </button>
          <span className="ml-3 text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Playbook
          </span>
          <span className="ml-1.5 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Agent Builder
          </span>
          <button
            onClick={openCreateWizard}
            className="ml-auto p-1.5 rounded-lg"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
            title="Create new asset"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Overlay */}
        {mobileOpen && (
          <div className="shell-overlay" onClick={closeMobile} style={{ display: 'block' }} />
        )}

        {/* Drawer */}
        <aside
          className="shell-sidebar h-full flex flex-col bg-white"
          style={{
            width: 260,
            borderRight: '1px solid var(--color-border)',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <div className="flex items-center justify-between px-4 h-[48px] shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Navigation</span>
            <button onClick={closeMobile} className="p-1" style={{ color: 'var(--color-text-tertiary)' }}>
              <IconClose />
            </button>
          </div>
          <SidebarContent collapsed={false} onToggle={closeMobile} onNavigate={closeMobile} onCreateNew={openCreateWizard} />
        </aside>

        {/* Main content */}
        <main key={location.pathname} className="flex-1 overflow-auto page-enter">
          {children}
        </main>

        <CreateAssetWizard
          isOpen={createWizardOpen}
          onClose={() => setCreateWizardOpen(false)}
          onCreate={(partial) => createChip(partial)}
        />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--color-surface-1)' }}>
      <aside
        className="h-full flex flex-col shrink-0 transition-[width] duration-200 ease-out bg-white"
        style={{
          width: collapsed ? 56 : 220,
          borderRight: '1px solid var(--color-border)',
        }}
      >
        <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} onCreateNew={openCreateWizard} />
      </aside>
      <main key={location.pathname} className="flex-1 overflow-auto page-enter">
        {children}
      </main>

      <CreateAssetWizard
        isOpen={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
        onCreate={(partial) => createChip(partial)}
      />
    </div>
  );
}

function Loading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
        <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>Loading...</span>
      </div>
    </div>
  );
}

function NotificationLayer() {
  const { notifications, removeNotification } = useNotifications();
  return <NotificationToast notifications={notifications} onDismiss={removeNotification} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Suspense fallback={<Shell><Loading /></Shell>}>
          <Routes>
            <Route path="/" element={<Shell><HomePage /></Shell>} />
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
        <NotificationLayer />
      </AppProvider>
    </BrowserRouter>
  );
}
