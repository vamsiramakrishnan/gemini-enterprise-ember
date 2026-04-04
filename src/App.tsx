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
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface-0)]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-[1120px] mx-auto px-8 py-4 flex items-center gap-5">
          <div className="flex items-center gap-3">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="7" fill="#1A73E8"/>
              <path d="M8 9h12M8 14h8M8 19h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <div>
              <h1 className="text-[15px] font-semibold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-ui)', color: '#1A1816' }}>
                Agent Playbook Editor
              </h1>
              <p className="text-[11px] tracking-wide" style={{ color: '#9B9590' }}>powered by adk-fluent</p>
            </div>
          </div>
          <div className="flex-1" />
          <span className="text-[11px] font-medium tracking-wide" style={{ color: '#9B9590', fontFamily: 'var(--font-mono)' }}>
            {screens.length} surfaces
          </span>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-[1120px] mx-auto px-8">
        <div className="pt-16 pb-12 animate-in">
          <p className="text-[11px] font-medium uppercase tracking-[2px] mb-5"
            style={{ fontFamily: 'var(--font-mono)', color: '#9B9590' }}>
            Gemini Enterprise Concept
          </p>
          <h2 className="text-[38px] font-semibold tracking-[-0.03em] leading-[1.15] mb-5"
            style={{ fontFamily: 'var(--font-ui)', color: '#1A1816' }}>
            The agent builder is<br/>
            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 400, fontStyle: 'italic', color: '#4F46E5' }}>
              a document editor.
            </span>
          </h2>
          <p className="text-[17px] leading-[1.7] max-w-[600px]"
            style={{ fontFamily: 'var(--font-body)', color: '#5C5550' }}>
            Writing a playbook IS building an agent. Every{' '}
            <code className="text-[13px] px-1.5 py-0.5 rounded font-mono"
              style={{ background: 'rgba(79, 70, 229, 0.07)', color: '#4F46E5', fontFamily: 'var(--font-mono)' }}>
              @reference
            </code>{' '}
            shapes the agent's action space. The document compiles into a graph.
            The graph is derived, never authored.
          </p>
        </div>

        {/* Screen Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 stagger">
          {screens.map((screen) => (
            <Link
              key={screen.path}
              to={screen.path}
              className="group block rounded-xl p-5 bg-white border border-[var(--color-border)] transition-all duration-300"
              style={{
                boxShadow: 'var(--depth-resting)',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--depth-lifted)'; e.currentTarget.style.borderColor = 'var(--color-border-strong)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--depth-resting)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="text-[15px]">{screen.icon}</span>
                <h3 className="text-[13px] font-semibold tracking-[-0.01em]"
                  style={{ fontFamily: 'var(--font-ui)', color: '#1A1816' }}>{screen.label}</h3>
                <span className="badge badge-live" style={{ fontSize: 9 }}>LIVE</span>
              </div>
              <p className="text-[12px] leading-[1.6]" style={{ color: '#9B9590', fontFamily: 'var(--font-body)' }}>
                {screen.desc}
              </p>
            </Link>
          ))}
        </div>

        {/* Architecture */}
        <div className="mt-14 rounded-xl bg-white border border-[var(--color-border)] p-7 animate-in"
          style={{ boxShadow: 'var(--depth-resting)', animationDelay: '300ms' }}>
          <h3 className="text-[13px] font-semibold tracking-[-0.01em] mb-4"
            style={{ fontFamily: 'var(--font-ui)', color: '#1A1816' }}>
            Architecture: Playbook → Parse → Compile → Graph
          </h3>
          <div className="flex items-center gap-3 flex-wrap">
            {[
              { label: 'Playbook', sub: 'Markdown + @chips', color: '#0D9488' },
              { label: 'Parser', sub: 'refs + conditionals', color: '#4F46E5' },
              { label: 'Compiler', sub: 'IR nodes + edges', color: '#7C3AED' },
              { label: 'Flow Tab', sub: 'interactive DAG', color: '#D97706' },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-3">
                {i > 0 && (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 8h8M9 5l3 3-3 3" stroke="#D6D2CC" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
                <div className="px-3.5 py-2 rounded-lg" style={{ background: `${step.color}08`, border: `1px solid ${step.color}18` }}>
                  <div className="text-[11px] font-semibold" style={{ color: step.color, fontFamily: 'var(--font-ui)' }}>{step.label}</div>
                  <div className="text-[10px]" style={{ color: '#9B9590', fontFamily: 'var(--font-mono)' }}>{step.sub}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] mt-4 leading-relaxed" style={{ color: '#9B9590', fontFamily: 'var(--font-body)', fontStyle: 'italic' }}>
            Mirrors adk-fluent's pipeline:{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#5C5550' }}>parse_skill_file()</code> →{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#5C5550' }}>Skill.build()</code> →{' '}
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#5C5550' }}>viz.ir_to_mermaid()</code>
          </p>
        </div>

        {/* Thesis Cards */}
        <div className="mt-8 mb-16 grid grid-cols-1 md:grid-cols-3 gap-3 stagger" style={{ animationDelay: '200ms' }}>
          {[
            { title: 'The Loop Is Simple', body: 'Every agent is the same loop: Observe → Reason → Act → Observe. No magic graph. The playbook constrains the space, not the sequence.', accent: '#0D9488' },
            { title: 'Code Is Omnipotent', body: 'Tools, connectors, skills — they\'re all cached reductions of the code execution space. The enterprise governs the boundary.', accent: '#4F46E5' },
            { title: '@ Shapes The Manifold', body: 'Each @reference is a dimension. Skills reduce. Connectors expand governedly. Guards constrain. The playbook IS the manifold definition.', accent: '#7C3AED' },
          ].map(card => (
            <div key={card.title} className="rounded-xl bg-white border border-[var(--color-border)] p-6"
              style={{ boxShadow: 'var(--depth-resting)' }}>
              <div className="w-1 h-5 rounded-full mb-4" style={{ background: card.accent }} />
              <h4 className="text-[13px] font-semibold tracking-[-0.01em] mb-2"
                style={{ fontFamily: 'var(--font-ui)', color: '#1A1816' }}>{card.title}</h4>
              <p className="text-[12.5px] leading-[1.7]"
                style={{ fontFamily: 'var(--font-body)', color: '#5C5550' }}>
                {card.body}
              </p>
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
