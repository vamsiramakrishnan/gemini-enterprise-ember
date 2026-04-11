/**
 * Navigation config for the app shell.
 *
 * Defines the sidebar nav structure (items, sections, routes).
 * Responsive hooks are in /src/hooks/useResponsive.ts.
 */

// ─── Types ───────────────────────────────────────────────────────────

export interface NavItem {
  path: string;
  label: string;
  icon: string;
  section?: string;
  badge?: string;
}

// ─── Navigation items ────────────────────────────────────────────────

export const NAV: NavItem[] = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/editor', label: 'Editor', icon: 'editor', section: 'Build' },
  { path: '/split-view', label: 'Split View', icon: 'splitView' },
  { path: '/notebook', label: 'Notebook', icon: 'notebook' },
  { path: '/registry', label: 'Registry', icon: 'registry', section: 'Manage' },
  { path: '/connectors', label: 'Connectors', icon: 'connectors' },
  { path: '/skills', label: 'Skills', icon: 'skills' },
  { path: '/history', label: 'History', icon: 'history' },
  { path: '/portfolio', label: 'Portfolio', icon: 'portfolio', section: 'Operate' },
  { path: '/admin', label: 'Admin', icon: 'admin' },
  { path: '/cost', label: 'Cost', icon: 'cost' },
  { path: '/live', label: 'Live Author', icon: 'live', section: 'Other' },
  { path: '/permissions', label: 'Permissions', icon: 'permissions' },
];
