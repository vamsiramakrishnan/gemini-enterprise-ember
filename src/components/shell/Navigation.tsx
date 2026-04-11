/**
 * Navigation config for the app shell.
 *
 * 7 primary nav items organized by user intent:
 *   Build   → Editor (the primary workspace)
 *   Manage  → Assets (registry), Connectors, History
 *   Operate → Portfolio
 *
 * Secondary screens (Split View, Notebook, Skills, Admin, Cost,
 * Live Author, Permissions) are accessible via routes but not
 * promoted in the sidebar — they're reached from contextual links
 * within primary screens.
 *
 * Design principle: "If everything is important, nothing is."
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  section?: string;
  badge?: string;
}

// ─── Primary navigation (sidebar) ────────────────────────────────────

export const NAV: NavItem[] = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/editor', label: 'Editor', icon: 'editor', section: 'Build' },
  { path: '/registry', label: 'Assets', icon: 'registry', section: 'Manage' },
  { path: '/connectors', label: 'Connectors', icon: 'connectors' },
  { path: '/history', label: 'History', icon: 'history' },
  { path: '/portfolio', label: 'Portfolio', icon: 'portfolio', section: 'Operate' },
  { path: '/live', label: 'Live Author', icon: 'live' },
];

// ─── All routes (superset — includes secondary screens) ──────────────
// Routes still exist for deep-linking, but aren't in the sidebar.

export const SECONDARY_ROUTES = [
  '/split-view',
  '/notebook',
  '/skills',
  '/admin',
  '/cost',
  '/permissions',
  '/docs-embed',
  '/sheets-schema',
];
