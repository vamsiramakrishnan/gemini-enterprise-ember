/**
 * SidebarContent — Shared sidebar UI for mobile drawer and desktop panel.
 *
 * Contains: logo area with gradient, "Create New" button, nav items with
 * section headers, active glow indicator, and an agent status footer.
 * Used by Shell in both mobile and desktop layouts.
 */

import { NavLink, useLocation } from 'react-router-dom';
import { NAV } from './Navigation';
import { ICON_MAP } from './Icons';
import { useTheme } from '../../contexts/ThemeContext';

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
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <>
      {/* Logo area */}
      <div
        className="flex items-center shrink-0"
        style={{
          height: 64,
          padding: collapsed ? '0 12px' : '0 18px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-0)',
          transition: `padding var(--duration-normal) var(--ease-out)`,
        }}
      >
        <button
          onClick={onToggle}
          className="flex items-center gap-3 w-full group"
          style={{
            transition: `opacity var(--duration-fast) var(--ease-out)`,
          }}
        >
          <div
            className="shrink-0 flex items-center justify-center relative"
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 50%, #4F46E5 100%)',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
              transition: 'box-shadow 200ms ease-out, transform 200ms ease-out',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 4.5h9M3.5 8h5.5M3.5 11.5h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col" style={{ animation: 'fadeIn 200ms ease-out' }}>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 650,
                  lineHeight: 1.25,
                  letterSpacing: '-0.015em',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Playbook
              </span>
              <span
                style={{
                  fontSize: 11,
                  lineHeight: 1.25,
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                Agent Builder
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Create New Button */}
      <div
        style={{
          padding: collapsed ? '16px 10px 8px' : '16px 14px 8px',
          transition: `padding var(--duration-normal) var(--ease-out)`,
        }}
      >
        <button
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2"
          style={{
            padding: collapsed ? '11px 0' : '11px 16px',
            background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
            color: 'var(--color-surface-0)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            letterSpacing: '-0.01em',
            borderRadius: 'var(--radius-md)',
            transition: `all var(--duration-fast) var(--ease-out)`,
            boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(37, 99, 235, 0.35), inset 0 1px 0 rgba(255,255,255,0.2)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(37, 99, 235, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)';
            e.currentTarget.style.transform = 'none';
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'translateY(0.5px)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
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
      <nav
        className="flex-1 overflow-y-auto scrollbar-thin"
        style={{ padding: '8px 10px' }}
      >
        {NAV.map((item, i) => {
          const isActive = location.pathname === item.path;
          const showSection = item.section && !collapsed;
          const IconComponent = ICON_MAP[item.icon];

          return (
            <div key={item.path}>
              {showSection && (
                <div
                  className="text-section-label"
                  style={{
                    marginTop: i === 0 ? 6 : 28,
                    marginBottom: 10,
                    paddingLeft: 10,
                  }}
                >
                  {item.section}
                </div>
              )}
              {item.section && collapsed && i > 0 && (
                <div
                  style={{
                    margin: '12px 8px',
                    borderTop: '1px solid var(--color-surface-2)',
                  }}
                />
              )}
              <NavLink
                to={item.path}
                onClick={onNavigate}
                className="flex items-center relative group/nav"
                style={{
                  padding: '10px 12px',
                  gap: 10,
                  minHeight: 44,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-accent-light)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                  borderRadius: 'var(--radius-md)',
                  marginBottom: 2,
                  transition: `all var(--duration-fast) var(--ease-out)`,
                  boxShadow: isActive ? 'inset 0 0 0 1px rgba(37, 99, 235, 0.08)' : 'none',
                }}
                title={collapsed ? item.label : undefined}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--color-surface-2)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-secondary)';
                  }
                }}
              >
                {isActive && (
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2"
                    style={{
                      width: 3,
                      height: 22,
                      borderRadius: '0 3px 3px 0',
                      background: 'var(--color-accent)',
                      boxShadow: '2px 0 8px rgba(37, 99, 235, 0.2)',
                      transition: 'height 200ms ease-out',
                    }}
                  />
                )}
                {IconComponent && <IconComponent />}
                {!collapsed && (
                  <span
                    className="truncate"
                    style={{ fontSize: 13, fontFamily: 'var(--font-ui)', letterSpacing: '-0.01em' }}
                  >
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <span
                    className="ml-auto font-semibold rounded-full"
                    style={{
                      fontSize: 9,
                      padding: '2px 7px',
                      background: 'var(--color-accent-light)',
                      color: 'var(--color-accent)',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Theme Toggle */}
      <div
        className="shrink-0"
        style={{
          padding: collapsed ? '8px 10px' : '8px 14px',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        <button
          onClick={() => {
            const next = resolvedTheme === 'dark' ? 'light' : 'dark';
            setTheme(next);
          }}
          className="w-full flex items-center gap-2.5 group/theme"
          style={{
            padding: collapsed ? '8px 0' : '8px 12px',
            borderRadius: 'var(--radius-md)',
            background: 'transparent',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 150ms ease-out',
            color: 'var(--color-text-secondary)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-surface-2)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
          title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: resolvedTheme === 'dark'
                ? 'linear-gradient(135deg, #1E293B 0%, #334155 100%)'
                : 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
              transition: 'all 300ms ease-out',
              flexShrink: 0,
            }}
          >
            {resolvedTheme === 'dark' ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M13.5 8.5a5.5 5.5 0 0 1-6-6 5.5 5.5 0 1 0 6 6Z" stroke="#94A3B8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" stroke="#D97706" strokeWidth="1.3"/>
                <path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.76 3.76l1.06 1.06M11.18 11.18l1.06 1.06M3.76 12.24l1.06-1.06M11.18 4.82l1.06-1.06" stroke="#D97706" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            )}
          </div>
          {!collapsed && (
            <div className="flex flex-col" style={{ animation: 'fadeIn 200ms ease-out' }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-ui)', letterSpacing: '-0.01em' }}>
                {resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
              <span style={{ fontSize: 10, color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-ui)' }}>
                {theme === 'system' ? 'System' : theme === 'dark' ? 'Manual' : 'Manual'}
              </span>
            </div>
          )}
        </button>
      </div>

      {/* Footer: Agent Status */}
      <div
        className="shrink-0"
        style={{
          padding: collapsed ? '16px 12px' : '16px 16px',
          borderTop: '1px solid var(--color-border)',
          background: 'var(--color-surface-1)',
          transition: `padding var(--duration-normal) var(--ease-out)`,
        }}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="flex items-center justify-center font-semibold"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-md)',
                  fontSize: 10,
                  background: 'linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface-3) 100%)',
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '0.02em',
                }}
              >
                CA
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  background: 'var(--color-success)',
                  border: '2px solid var(--color-surface-1)',
                  boxShadow: '0 0 4px rgba(22, 163, 74, 0.3)',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="font-medium truncate"
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '-0.01em',
                }}
              >
                Claims Agent
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-ui)',
                  marginTop: 1,
                }}
              >
                v2.1 · Running
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="relative">
              <div
                className="flex items-center justify-center font-semibold"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-md)',
                  fontSize: 9,
                  background: 'linear-gradient(135deg, var(--color-surface-2) 0%, var(--color-surface-3) 100%)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                CA
              </div>
              <div
                className="absolute -bottom-0.5 -right-0.5 rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  background: 'var(--color-success)',
                  border: '2px solid var(--color-surface-1)',
                  boxShadow: '0 0 4px rgba(22, 163, 74, 0.3)',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
