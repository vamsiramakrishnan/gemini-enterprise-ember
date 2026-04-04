import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ParserDemo } from './components/editor/ParserDemo';
import { PlaybookEditor } from './components/editor/PlaybookEditor';
import { RegistryCatalog } from './components/registry/RegistryCatalog';
import { ConnectorHub } from './components/connectors/ConnectorHub';
import { VersionHistory } from './components/versioning/VersionHistory';
import { LiveAuthoring } from './components/live/LiveAuthoring';
import { DocsEmbed } from './components/workspace/DocsEmbed';
import { SheetsSchema } from './components/workspace/SheetsSchema';
import { SharingModal } from './components/permissions/SharingModal';
import { lazy, Suspense } from 'react';

// Lazy-loaded screens
const NotebookView = lazy(() =>
  import('./components/notebook/NotebookView').then(m => ({ default: m.NotebookView }))
);
const SkillEditor = lazy(() =>
  import('./components/skills/SkillEditor').then(m => ({ default: m.SkillEditor }))
);
const LiveSplitView = lazy(() =>
  import('./components/editor/LiveSplitView').then(m => ({ default: m.LiveSplitView }))
);
const AgentPortfolio = lazy(() =>
  import('./components/dashboard/AgentPortfolio').then(m => ({ default: m.AgentPortfolio }))
);
const AdminConsole = lazy(() =>
  import('./components/admin/AdminConsole').then(m => ({ default: m.AdminConsole }))
);
const CostCalculator = lazy(() =>
  import('./components/shared/CostCalculator').then(m => ({ default: m.CostCalculator }))
);

const screens = [
  { path: '/editor', label: 'Playbook Editor', desc: 'Document | Flow | Notebook — three views of one agent', icon: '📝', ready: true },
  { path: '/split-view', label: 'Live Split View', desc: 'Document + Flow side-by-side with real-time compilation', icon: '⚡', ready: true },
  { path: '/portfolio', label: 'Agent Portfolio', desc: 'Enterprise fleet view — all agents, metrics, teams', icon: '📊', ready: true },
  { path: '/admin', label: 'Admin Console', desc: 'Governance, teams, audit logs, policies', icon: '🛡️', ready: true },
  { path: '/cost-calculator', label: 'Cost Calculator', desc: 'ROI estimator with FTE savings analysis', icon: '💰', ready: true },
  { path: '/parser-demo', label: 'Parser Demo', desc: 'Live playbook parsing + graph compilation', icon: '🔬', ready: true },
  { path: '/notebook', label: 'Notebook', desc: 'Colab-style cell-based development', icon: '📓', ready: true },
  { path: '/registry', label: 'Registry', desc: 'Searchable asset catalog for all @-references', icon: '📚', ready: true },
  { path: '/permissions', label: 'Permissions', desc: 'Google-Docs-style sharing for agent assets', icon: '🔐', ready: true },
  { path: '/live-authoring', label: 'Gemini Live', desc: 'Voice-driven playbook generation', icon: '🎤', ready: true },
  { path: '/skill-editor', label: 'Skill Editor', desc: 'SKILL.md authoring with smart chips', icon: '✨', ready: true },
  { path: '/connectors', label: 'Connector Hub', desc: 'Gemini Enterprise data source management', icon: '🔗', ready: true },
  { path: '/history', label: 'Version History', desc: 'Chip-aware diffing and version timeline', icon: '🕐', ready: true },
  { path: '/docs-embed', label: 'Docs Embed', desc: 'Agent block in Google Docs', icon: '📄', ready: true },
  { path: '/sheets-schema', label: 'Sheets Schema', desc: 'Spreadsheet as tool parameter schema', icon: '📊', ready: true },
];

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-0)]">
      <div className="text-sm text-gray-400">Loading...</div>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-0)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center text-white font-bold text-sm">
            P
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>
              Agent Playbook Editor
            </h1>
            <p className="text-xs text-gray-500">UI Mockup Suite — powered by adk-fluent</p>
          </div>
          <div className="flex-1" />
          <span className="text-[10px] text-gray-400">{screens.length} screens</span>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h2 className="text-3xl font-semibold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
            The agent builder is a document editor.
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl" style={{ fontFamily: 'var(--font-body)' }}>
            Writing a playbook IS building an agent. Every <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded font-mono">@reference</code> shapes
            the agent's action space. The document compiles into a graph. The graph is derived, never authored.
          </p>
        </div>

        {/* Screen Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {screens.map((screen) => (
            <Link
              key={screen.path}
              to={screen.path}
              className={`group block rounded-xl border p-5 transition-all hover:shadow-md ${
                screen.ready
                  ? 'border-[var(--color-accent)]/30 bg-white hover:border-[var(--color-accent)]'
                  : 'border-[var(--color-border)] bg-white/60 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base">{screen.icon}</span>
                <h3 className="text-sm font-semibold text-gray-900">{screen.label}</h3>
                {screen.ready ? (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                    LIVE
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    PLANNED
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">{screen.desc}</p>
            </Link>
          ))}
        </div>

        {/* Architecture Note */}
        <div className="mt-12 rounded-xl border border-[var(--color-border)] bg-white p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Architecture: Playbook → Parse → Compile → Graph</h3>
          <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
            <span className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 font-medium">Playbook (Markdown + @chips)</span>
            <span className="text-gray-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 font-medium">Parser (extract refs + conditionals)</span>
            <span className="text-gray-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-700 font-medium">Graph Compiler (IR nodes + edges)</span>
            <span className="text-gray-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 font-medium">Flow Tab (interactive DAG)</span>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Mirrors adk-fluent's pipeline: <code className="font-mono text-[10px] bg-gray-100 px-1 py-0.5 rounded">parse_skill_file()</code> →{' '}
            <code className="font-mono text-[10px] bg-gray-100 px-1 py-0.5 rounded">Skill.build()</code> →{' '}
            <code className="font-mono text-[10px] bg-gray-100 px-1 py-0.5 rounded">viz.ir_to_mermaid()</code>
          </p>
        </div>

        {/* Thesis Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-base mb-2">🔄</div>
            <h4 className="text-xs font-semibold text-gray-900 mb-1">The Loop Is Simple</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Every agent is the same loop: Observe → Reason → Act → Observe. No magic graph. The playbook constrains the <em>space</em>, not the <em>sequence</em>.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-base mb-2">💎</div>
            <h4 className="text-xs font-semibold text-gray-900 mb-1">Code Is Omnipotent</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Tools, connectors, skills — they're all cached reductions of the code execution space. The enterprise governs the boundary.
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="text-base mb-2">📐</div>
            <h4 className="text-xs font-semibold text-gray-900 mb-1">@ Shapes The Manifold</h4>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Each @reference is a dimension. Skills reduce. Connectors expand governedly. Guards constrain. The playbook IS the manifold definition.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/editor" element={<PlaybookEditor />} />
          <Route path="/split-view" element={<LiveSplitView />} />
          <Route path="/portfolio" element={<AgentPortfolio />} />
          <Route path="/admin" element={<AdminConsole />} />
          <Route path="/cost-calculator" element={<CostCalculator />} />
          <Route path="/parser-demo" element={<ParserDemo />} />
          <Route path="/notebook" element={<NotebookView />} />
          <Route path="/registry" element={<RegistryCatalog />} />
          <Route path="/permissions" element={<SharingModal />} />
          <Route path="/live-authoring" element={<LiveAuthoring />} />
          <Route path="/skill-editor" element={<SkillEditor />} />
          <Route path="/connectors" element={<ConnectorHub />} />
          <Route path="/history" element={<VersionHistory />} />
          <Route path="/docs-embed" element={<DocsEmbed />} />
          <Route path="/sheets-schema" element={<SheetsSchema />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
