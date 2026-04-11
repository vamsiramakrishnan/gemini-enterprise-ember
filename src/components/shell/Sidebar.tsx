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
          height: 64,
          padding: collapsed ? '0 12px' : '0 18px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-0)',
          transition: `padding var(--duration-normal) var(--ease-out)`,
        }}
      >
        <button
          onClick={onToggle}
          className="flex items-center gap-3 w-full"
          style={{
            transition: `opacity var(--duration-fast) var(--ease-out)`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <div
            className="shrink-0 flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-accent)',
              boxShadow: '0 1px 3px rgba(37, 99, 235, 0.25)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3.5 4.5h9M3.5 8h5.5M3.5 11.5h7" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  letterSpacing: '-0.01em',
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
            background: 'var(--color-accent)',
            color: 'var(--color-surface-0)',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'var(--font-ui)',
            borderRadius: 'var(--radius-md)',
            transition: `background var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)`,
            boxShadow: 'var(--shadow-xs)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-accent-hover)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-accent)';
            e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
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
        className="flex-1 overflow-y-auto"
        style={{ padding: '6px 10px' }}
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
                className="flex items-center relative"
                style={{
                  padding: '10px 12px',
                  gap: 10,
                  minHeight: 44,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                  background: isActive ? 'var(--color-accent-light)' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: 2,
                  transition: `background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out)`,
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
                    }}
                  />
                )}
                {IconComponent && <IconComponent />}
                {!collapsed && (
                  <span
                    className="truncate"
                    style={{ fontSize: 13, fontFamily: 'var(--font-ui)' }}
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
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 10,
                  background: 'var(--color-surface-2)',
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
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 9,
                  background: 'var(--color-surface-2)',
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
                }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
