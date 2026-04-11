/**
 * App — Root component with routing and provider setup.
 *
 * Layout shell and navigation live in components/shell/.
 * Context providers live in contexts/.
 * This file is kept lean: just routing and top-level composition.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AppProvider, useNotifications } from './contexts/AppContext';
import { NotificationToast } from './components/shared/NotificationToast';
import { Shell } from './components/shell/Shell';
import { HomePage } from './components/dashboard/HomePage';
import { PlaybookEditor } from './components/editor/PlaybookEditor';

// ─── Lazy-loaded screens ─────────────────────────────────────────────

const NotebookView = lazy(() => import('./components/notebook/NotebookView').then(m => ({ default: m.NotebookView })));
const SkillEditor = lazy(() => import('./components/skills/SkillEditor').then(m => ({ default: m.SkillEditor })));
const LiveSplitView = lazy(() => import('./components/editor/LiveSplitView').then(m => ({ default: m.LiveSplitView })));
const AgentPortfolio = lazy(() => import('./components/dashboard/AgentPortfolio').then(m => ({ default: m.AgentPortfolio })));
const AdminConsole = lazy(() => import('./components/admin/AdminConsole').then(m => ({ default: m.AdminConsole })));
const CostCalculator = lazy(() => import('./components/shared/CostCalculator').then(m => ({ default: m.CostCalculator })));
const RegistryCatalog = lazy(() => import('./components/registry/RegistryCatalog').then(m => ({ default: m.RegistryCatalog })));
const ConnectorHub = lazy(() => import('./components/connectors/ConnectorHub').then(m => ({ default: m.ConnectorHub })));
const VersionHistory = lazy(() => import('./components/versioning/VersionHistory').then(m => ({ default: m.VersionHistory })));
const LiveAuthoring = lazy(() => import('./components/live/LiveAuthoring').then(m => ({ default: m.LiveAuthoring })));
const SharingModal = lazy(() => import('./components/permissions/SharingModal').then(m => ({ default: m.SharingModal })));

// DocsEmbed and SheetsSchema are less frequently visited — lazy load too
const DocsEmbed = lazy(() => import('./components/workspace/DocsEmbed').then(m => ({ default: m.DocsEmbed })));
const SheetsSchema = lazy(() => import('./components/workspace/SheetsSchema').then(m => ({ default: m.SheetsSchema })));

// ─── Loading fallback ────────────────────────────────────────────────

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

// ─── Notification layer ──────────────────────────────────────────────

function NotificationLayer() {
  const { notifications, removeNotification } = useNotifications();
  return <NotificationToast notifications={notifications} onDismiss={removeNotification} />;
}

// ─── App ─────────────────────────────────────────────────────────────

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
            <Route path="/docs-embed" element={<Shell><DocsEmbed /></Shell>} />
            <Route path="/sheets-schema" element={<Shell><SheetsSchema /></Shell>} />
          </Routes>
        </Suspense>
        <NotificationLayer />
      </AppProvider>
    </BrowserRouter>
  );
}
