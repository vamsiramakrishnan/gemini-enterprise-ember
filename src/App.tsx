/**
 * App — Root component with routing, providers, and error boundaries.
 *
 * Architecture:
 *   BrowserRouter → AppProvider → QueryClientProvider → Suspense → Routes
 *   Each route is wrapped in RouteErrorBoundary for crash isolation.
 *   Lazy loading via React.lazy + Suspense for all non-critical screens.
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppProvider, useNotifications } from './contexts/AppContext';
import { NotificationToast } from './components/shared/NotificationToast';
import { Shell } from './components/shell/Shell';
import { RouteErrorBoundary, Spinner } from './ui';
import { HomePage } from './components/dashboard/HomePage';
import { PlaybookEditor } from './components/editor/PlaybookEditor';

// ─── React Query client ──────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,         // data fresh for 30s before refetch
      gcTime: 5 * 60_000,        // keep unused data 5 min
      retry: 1,                  // retry failed requests once
      refetchOnWindowFocus: false,
    },
  },
});

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
const DocsEmbed = lazy(() => import('./components/workspace/DocsEmbed').then(m => ({ default: m.DocsEmbed })));
const SheetsSchema = lazy(() => import('./components/workspace/SheetsSchema').then(m => ({ default: m.SheetsSchema })));

// ─── Loading fallback ────────────────────────────────────────────────

function Loading() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Spinner />
        <span className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>Loading...</span>
      </div>
    </div>
  );
}

// ─── Route wrapper (error boundary + shell) ──────────────────────────

function Page({ children }: { children: React.ReactNode }) {
  return (
    <Shell>
      <RouteErrorBoundary>
        {children}
      </RouteErrorBoundary>
    </Shell>
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
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <Suspense fallback={<Shell><Loading /></Shell>}>
            <Routes>
              <Route path="/" element={<Page><HomePage /></Page>} />
              <Route path="/editor" element={<Page><PlaybookEditor /></Page>} />
              <Route path="/split-view" element={<Page><LiveSplitView /></Page>} />
              <Route path="/notebook" element={<Page><NotebookView /></Page>} />
              <Route path="/registry" element={<Page><RegistryCatalog /></Page>} />
              <Route path="/connectors" element={<Page><ConnectorHub /></Page>} />
              <Route path="/skills" element={<Page><SkillEditor /></Page>} />
              <Route path="/history" element={<Page><VersionHistory /></Page>} />
              <Route path="/portfolio" element={<Page><AgentPortfolio /></Page>} />
              <Route path="/admin" element={<Page><AdminConsole /></Page>} />
              <Route path="/cost" element={<Page><CostCalculator /></Page>} />
              <Route path="/live" element={<Page><LiveAuthoring /></Page>} />
              <Route path="/permissions" element={<Page><SharingModal /></Page>} />
              <Route path="/docs-embed" element={<Page><DocsEmbed /></Page>} />
              <Route path="/sheets-schema" element={<Page><SheetsSchema /></Page>} />
            </Routes>
          </Suspense>
          <NotificationLayer />
        </AppProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}
