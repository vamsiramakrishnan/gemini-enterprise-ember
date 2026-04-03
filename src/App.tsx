import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ParserDemo } from './components/editor/ParserDemo';

const screens = [
  { path: '/editor', label: 'Playbook Editor', desc: 'Document | Flow | Notebook — three views of one agent', ready: false },
  { path: '/parser-demo', label: 'Parser Demo', desc: 'Live playbook parsing + graph compilation', ready: true },
  { path: '/notebook', label: 'Notebook', desc: 'Colab-style cell-based development', ready: false },
  { path: '/registry', label: 'Registry', desc: 'Searchable asset catalog for all @-references', ready: false },
  { path: '/live-authoring', label: 'Gemini Live', desc: 'Voice-driven playbook generation', ready: false },
  { path: '/skill-editor', label: 'Skill Editor', desc: 'SKILL.md authoring with smart chips', ready: false },
  { path: '/connectors', label: 'Connector Hub', desc: 'Gemini Enterprise data source management', ready: false },
  { path: '/history', label: 'Version History', desc: 'Chip-aware diffing and version timeline', ready: false },
  { path: '/docs-embed', label: 'Docs Embed', desc: 'Agent block in Google Docs', ready: false },
  { path: '/sheets-schema', label: 'Sheets Schema', desc: 'Spreadsheet as tool parameter schema', ready: false },
];

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
                  ? 'border-[var(--color-accent)] bg-white hover:border-[var(--color-accent-hover)]'
                  : 'border-[var(--color-border)] bg-white/60 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
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
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/parser-demo" element={<ParserDemo />} />
      </Routes>
    </BrowserRouter>
  );
}
