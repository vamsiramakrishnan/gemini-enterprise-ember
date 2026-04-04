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
    <div className="min-h-screen" style={{ background: '#FAFBFC' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b" style={{ borderColor: '#E2E5E9', background: 'rgba(250,251,252,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-[960px] mx-auto px-6 h-[52px] flex items-center">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#2563EB' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 4h8M3 7h5M3 10h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </div>
            <span className="text-[13px] font-semibold text-[#111827] tracking-[-0.01em]">Playbook Editor</span>
          </div>
          <div className="flex-1" />
          <span className="text-[11px] text-[#9CA3AF] font-mono">{screens.length} screens</span>
        </div>
      </nav>

      <div className="max-w-[960px] mx-auto px-6">
        {/* Hero */}
        <div className="pt-12 pb-10 animate-in">
          <div className="inline-block px-2.5 py-1 rounded-md text-[11px] font-medium mb-6"
            style={{ background: '#EFF6FF', color: '#2563EB' }}>
            Gemini Enterprise
          </div>
          <h1 className="text-[32px] font-semibold text-[#111827] tracking-[-0.025em] leading-[1.2] mb-4">
            The agent builder is a document editor.
          </h1>
          <p className="text-[15px] text-[#6B7280] leading-[1.65] max-w-[540px]">
            Writing a playbook IS building an agent. Every{' '}
            <code className="text-[13px] px-1 py-0.5 rounded" style={{ background: '#F1F3F5', color: '#111827', fontFamily: 'var(--font-mono)' }}>@reference</code>{' '}
            shapes the action space. The document compiles to a graph. The graph is derived, never authored.
          </p>
        </div>

        {/* Screens */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 pb-8 stagger">
          {screens.map((screen) => (
            <Link key={screen.path} to={screen.path}
              className="group flex items-start gap-3 rounded-lg p-4 border transition-all duration-200 hover:border-[#CED4DA]"
              style={{ borderColor: '#E2E5E9', background: 'white', boxShadow: 'var(--shadow-xs)' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-xs)'; }}>
              <span className="text-[14px] mt-0.5 shrink-0 w-5 text-center">{screen.icon}</span>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[#111827] group-hover:text-[#2563EB] transition-colors">{screen.label}</div>
                <div className="text-[12px] text-[#9CA3AF] leading-[1.5] mt-0.5">{screen.desc}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Pipeline */}
        <div className="rounded-lg border p-5 mb-6" style={{ borderColor: '#E2E5E9', background: 'white', boxShadow: 'var(--shadow-xs)' }}>
          <div className="text-[12px] font-semibold text-[#111827] mb-3">Pipeline</div>
          <div className="flex items-center gap-2 flex-wrap">
            {['Playbook', 'Parser', 'Compiler', 'Flow'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                {i > 0 && <span className="text-[#D1D5DB]">→</span>}
                <div className="px-3 py-1.5 rounded-md text-[12px] font-medium"
                  style={{ background: '#F1F3F5', color: '#374151' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Principles */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pb-16">
          {[
            { title: 'The Loop Is Simple', body: 'Every agent is Observe → Reason → Act → Observe. The playbook constrains the space, not the sequence.' },
            { title: 'Code Is Omnipotent', body: 'Tools, connectors, skills are cached reductions of the code execution space. The enterprise governs the boundary.' },
            { title: '@ Shapes The Space', body: 'Each @reference is a dimension. Skills reduce. Connectors expand governedly. Guards constrain.' },
          ].map(c => (
            <div key={c.title} className="rounded-lg border p-5" style={{ borderColor: '#E2E5E9', background: 'white' }}>
              <div className="text-[13px] font-semibold text-[#111827] mb-2">{c.title}</div>
              <div className="text-[12px] text-[#6B7280] leading-[1.6]">{c.body}</div>
            </div>
          ))}
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
