/**
 * EditorStatusBar — Bottom status bar and tab icon components for the Playbook Editor.
 *
 * StatusBar: displays chip/node/edge counts and contextual hints for the active tab.
 * TabIcon: renders a small SVG icon for each editor tab (document, structured, flow, notebook).
 */

import React from 'react';

// ─── StatusBar ──────────────────────────────────────────────────────────

export function StatusBar({
  chipCount, nodeCount, edgeCount, activeTab,
}: {
  chipCount: number; nodeCount: number; edgeCount: number; activeTab: string;
}) {
  return (
    <div
      className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-1 text-[10px] select-none"
      style={{ borderTop: '1px solid var(--color-surface-2)', background: 'var(--color-surface-1)', color: 'var(--color-text-tertiary)' }}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <span>{chipCount} refs</span>
        <span className="hidden sm:inline">{nodeCount} nodes</span>
        <span className="hidden sm:inline">{edgeCount} edges</span>
      </div>
      <div className="flex items-center gap-3 sm:gap-4">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
          <span className="hidden sm:inline">Auto-compiling</span>
        </span>
        <span className="hidden md:inline">
          {activeTab === 'document' && 'Click any @reference to inspect \u00B7 Type @ to insert'}
          {activeTab === 'structured' && 'Block editor \u00B7 / to insert \u00B7 Click skills to expand'}
          {activeTab === 'flow' && 'Compiled graph \u00B7 Click nodes to view source'}
          {activeTab === 'notebook' && 'Development mode'}
        </span>
      </div>
    </div>
  );
}

// ─── TabIcon ────────────────────────────────────────────────────────────

/**
 * Small SVG icon for each editor tab. Renders a document, block, graph, or
 * notebook icon depending on the `tab` prop, colored by `active` state.
 */
export function TabIcon({ tab, active }: { tab: string; active: boolean }) {
  const color = active ? '#2563EB' : '#9CA3AF';
  if (tab === 'document') return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1.5" stroke={color} strokeWidth="1.2"/>
      <path d="M5.5 5.5h5M5.5 8h3.5M5.5 10.5h4" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
  if (tab === 'structured') return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="3" rx="1" stroke={color} strokeWidth="1.2"/>
      <rect x="3" y="7" width="10" height="3" rx="1" stroke={color} strokeWidth="1.2"/>
      <rect x="3" y="12" width="6" height="2" rx="1" stroke={color} strokeWidth="1.2"/>
      <rect x="11" y="12" width="2" height="2" rx="1" fill={color} fillOpacity="0.4"/>
    </svg>
  );
  if (tab === 'flow') return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <circle cx="4" cy="8" r="2" stroke={color} strokeWidth="1.2"/>
      <circle cx="12" cy="5" r="2" stroke={color} strokeWidth="1.2"/>
      <circle cx="12" cy="11" r="2" stroke={color} strokeWidth="1.2"/>
      <path d="M6 7.2L10 5.5M6 8.8L10 10.5" stroke={color} strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="4" rx="1" stroke={color} strokeWidth="1.2"/>
      <rect x="3" y="8" width="10" height="3" rx="1" stroke={color} strokeWidth="1.2"/>
      <rect x="3" y="13" width="6" height="1.5" rx="0.75" fill={color} fillOpacity="0.3"/>
    </svg>
  );
}
