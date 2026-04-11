/**
 * SidebarContent — Shared sidebar UI for mobile drawer and desktop panel.
 *
 * Contains: logo area, "Create New" button, nav items with section headers,
 * and an agent status footer. Used by Shell in both mobile and desktop layouts.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { NAV } from './Navigation';
import { ICON_MAP } from './Icons';

// ─── Props ───────────────────────────────────────────────────────────

interface SidebarContentProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  onCreateNew?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────

export function SidebarContent({ collapsed, onToggle, onNavigate, onCreateNew }: SidebarContentProps) {
  const location = useLocation();

  return (
    <>
      {/* Logo area */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 56,
          padding: collapsed ? '0 12px' : '0 16px',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={onToggle}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity w-full"
        >
          <div
            className="shrink-0 rounded-lg flex items-center justify-center"
            style={{ width: 32, height: 32, background: 'var(--color-accent)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 4.5h9M3.5 8h5.5M3.5 11.5h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold leading-tight tracking-[-0.01em]" style={{ color: 'var(--color-text-primary)' }}>
                Playbook
              </span>
              <span className="text-[10px] leading-tight" style={{ color: 'var(--color-text-tertiary)' }}>
                Agent Builder
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Create New Button */}
      <div className="px-2 pt-3 pb-1">
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 rounded-lg transition-all duration-150"
          style={{
            padding: collapsed ? '8px 0' : '8px 12px',
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
          }}
          title="Create new asset"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          {!collapsed && <span>Create New</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {NAV.map((item, i) => {
          const isActive = location.pathname === item.path;
          const showSection = item.section && !collapsed;
          const IconComponent = ICON_MAP[item.icon];

          return (
            <div key={item.path}>
              {showSection && (
                <div
                  className="text-section-label px-2"
                  style={{
                    marginTop: i === 0 ? 0 : 20,
                    marginBottom: 6,
                  }}
                >
                  {item.section}
                </div>
              )}
              {item.section && collapsed && i > 0 && (
                <div className="mx-2 my-3" style={{ borderTop: '1px solid var(--color-surface-2)' }} />
              )}
              <NavLink
                to={item.path}
                onClick={onNavigate}
                className="flex items-center rounded-lg transition-all duration-150 group relative"
                style={{
                  padding: collapsed ? '8px 10px' : '7px 10px',
                  gap: 10,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-accent-light)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                }}
                title={collapsed ? item.label : undefined}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full"
                    style={{ height: 20, background: 'var(--color-accent)' }}
                  />
                )}
                {IconComponent && <IconComponent />}
                {!collapsed && (
                  <span className="text-[13px] truncate">{item.label}</span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Footer: Agent Status */}
      <div className="shrink-0 px-3 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                CA
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: 'var(--color-success)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>Claims Agent</div>
              <div className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>v2.1 · Running</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-semibold" style={{ background: 'var(--color-surface-2)', color: 'var(--color-text-secondary)' }}>
                CA
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: 'var(--color-success)' }} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
