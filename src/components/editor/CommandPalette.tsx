/**
 * CommandPalette — Cmd+K command palette overlay for the Playbook Editor.
 *
 * Provides quick access to navigation (tab switching), actions (publish, share,
 * history, test), and insert commands (@ references). Supports search/filter
 * with keyboard shortcut hints.
 */

import { useState, useMemo } from 'react';

export function CommandPalette({ open, onClose, onAction }: { open: boolean; onClose: () => void; onAction: (action: string) => void }) {
  const [query, setQuery] = useState('');

  const commands = useMemo(() => [
    { section: 'Navigate', items: [
      { label: 'Switch to Document tab', shortcut: '1', action: 'tab:document' },
      { label: 'Switch to Flow tab', shortcut: '2', action: 'tab:flow' },
      { label: 'Switch to Notebook tab', shortcut: '3', action: 'tab:notebook' },
    ]},
    { section: 'Actions', items: [
      { label: 'Publish new version...', shortcut: 'P', action: 'publish' },
      { label: 'Share with team...', shortcut: 'S', action: 'share' },
      { label: 'View version history', shortcut: 'H', action: 'history' },
      { label: 'Run test...', shortcut: 'T', action: 'test' },
    ]},
    { section: 'Insert', items: [
      { label: 'Insert @tool reference', shortcut: '@t', action: 'insert:tool' },
      { label: 'Insert @connector reference', shortcut: '@c', action: 'insert:connector' },
      { label: 'Insert @guard reference', shortcut: '@g', action: 'insert:guard' },
      { label: 'Insert @skill reference', shortcut: '@s', action: 'insert:skill' },
    ]},
  ], []);

  const filtered = useMemo(() => {
    if (!query) return commands;
    const q = query.toLowerCase();
    return commands.map(section => ({
      ...section,
      items: section.items.filter(item => item.label.toLowerCase().includes(q)),
    })).filter(section => section.items.length > 0);
  }, [query, commands]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400 shrink-0">
            <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
            <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands, references, actions..."
            className="flex-1 text-sm text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
            style={{ fontFamily: 'var(--font-ui)' }}
          />
          <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>
        <div className="max-h-72 overflow-auto py-2">
          {filtered.map((section) => (
            <div key={section.section}>
              <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-gray-400">
                {section.section}
              </div>
              {section.items.map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors text-left"
                  onClick={() => { onAction(item.action); onClose(); }}
                >
                  <span className="text-[13px] text-gray-700 flex-1">{item.label}</span>
                  {item.shortcut && (
                    <kbd className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
