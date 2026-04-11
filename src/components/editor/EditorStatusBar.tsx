/**
 * EditorStatusBar — Bottom status bar and tab icon components.
 *
 * StatusBar shows actionable info: save state, keyboard hints.
 * No decorative counters — only things the user can act on.
 *
 * TabIcon renders the SVG icon for each editor tab.
 */

// ─── StatusBar ──────────────────────────────────────────────────────────

export function StatusBar({
  dirty, saving, activeTab,
}: {
  dirty: boolean; saving: boolean; activeTab: string;
}) {
  return (
    <div
      className="shrink-0 flex items-center justify-between px-3 sm:px-4 py-1.5 text-[11px] select-none"
      style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-surface-0)', color: 'var(--color-text-tertiary)' }}
    >
      <div className="flex items-center gap-2">
        {saving ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--color-accent)' }} />
            <span>Saving...</span>
          </>
        ) : dirty ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-draft)' }} />
            <span>Unsaved changes</span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--color-success)' }} />
            <span className="hidden sm:inline">All changes saved</span>
          </>
        )}
      </div>
      <div className="hidden md:flex items-center gap-1" style={{ color: 'var(--color-text-tertiary)' }}>
        {activeTab === 'document' && (
          <>
            <span>Type</span>
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ background: 'var(--color-surface-2)' }}>@</kbd>
            <span>for refs</span>
            <span style={{ margin: '0 4px', opacity: 0.4 }}>&middot;</span>
            <kbd className="px-1 py-0.5 rounded text-[9px] font-mono" style={{ background: 'var(--color-surface-2)' }}>{navigator.platform?.includes('Mac') ? '⌘' : 'Ctrl+'}K</kbd>
            <span>search</span>
          </>
        )}
        {activeTab === 'structured' && <span>Press / to insert blocks</span>}
        {activeTab === 'flow' && <span>Click nodes to view source</span>}
        {activeTab === 'notebook' && <span>Development mode</span>}
      </div>
    </div>
  );
}

// ─── TabIcon ────────────────────────────────────────────────────────────

export function TabIcon({ tab, active }: { tab: string; active: boolean }) {
  const color = active ? 'var(--color-accent)' : 'var(--color-text-tertiary)';
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
    </svg>
  );
}
