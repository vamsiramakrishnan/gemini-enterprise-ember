/**
 * WorkspaceSwitcher — The sidebar chrome that makes the workspace
 * model tangible. Sits where the "Playbook · Agent Builder" logo
 * used to live. Click to open a dropdown of workspaces the user is
 * a member of, plus the Platform / Compliance workspaces they've
 * been granted access to.
 *
 * This is the visual anchor of the workspace-centric model: the
 * user always knows which workspace's assets they're looking at.
 */

import { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { CreateWorkspaceModal } from '../workspaces/CreateWorkspaceModal';

interface WorkspaceSwitcherProps {
  collapsed: boolean;
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { current, accessibleWorkspaces, switchWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!current) {
    return (
      <div
        className="shrink-0"
        style={{
          height: 64,
          padding: collapsed ? '0 12px' : '0 14px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface-0)',
        }}
      />
    );
  }

  return (
    <div
      ref={rootRef}
      className="shrink-0 relative"
      style={{
        height: 64,
        padding: collapsed ? '0 10px' : '0 12px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface-0)',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5"
        style={{
          padding: collapsed ? '8px 0' : '8px 10px',
          borderRadius: 'var(--radius-md)',
          background: open ? 'var(--color-surface-2)' : 'transparent',
          transition: 'background 150ms ease-out',
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = 'var(--color-surface-2)';
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'transparent';
        }}
        title={collapsed ? `${current.name} workspace` : undefined}
      >
        {/* Workspace icon/color */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-md)',
            background: `linear-gradient(135deg, ${current.color} 0%, ${current.color}dd 100%)`,
            fontSize: 17,
            boxShadow: `0 2px 8px ${current.color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
            color: '#fff',
          }}
        >
          {current.icon}
        </div>
        {!collapsed && (
          <>
            <div className="flex flex-col flex-1 min-w-0 text-left" style={{ animation: 'fadeIn 200ms ease-out' }}>
              <span
                className="truncate"
                style={{
                  fontSize: 13,
                  fontWeight: 650,
                  lineHeight: 1.25,
                  letterSpacing: '-0.015em',
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-ui)',
                }}
              >
                {current.name}
              </span>
              <span
                className="truncate"
                style={{
                  fontSize: 10.5,
                  lineHeight: 1.25,
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '0.01em',
                  textTransform: 'uppercase',
                }}
              >
                {current.members.length}{' '}
                {current.members.length === 1 ? 'member' : 'members'}
                {' · '}
                {current.agentPrincipals.length}{' '}
                {current.agentPrincipals.length === 1 ? 'agent' : 'agents'}
              </span>
            </div>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                color: 'var(--color-text-tertiary)',
                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 150ms ease-out',
                flexShrink: 0,
              }}
            >
              <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute"
          style={{
            top: 60,
            left: collapsed ? 12 : 10,
            right: collapsed ? 'auto' : 10,
            minWidth: collapsed ? 260 : undefined,
            background: 'var(--color-surface-0)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: 6,
            zIndex: 50,
            animation: 'fadeIn 150ms ease-out',
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-text-tertiary)',
              padding: '8px 10px 6px',
            }}
          >
            Switch workspace
          </div>
          {accessibleWorkspaces.map((ws) => {
            const isActive = ws.id === current.id;
            return (
              <button
                key={ws.id}
                onClick={() => {
                  switchWorkspace(ws.id);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2.5 text-left"
                style={{
                  padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)',
                  background: isActive ? 'var(--color-accent-light)' : 'transparent',
                  transition: 'background 120ms ease-out',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'var(--color-surface-2)';
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div
                  className="shrink-0 flex items-center justify-center"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 'var(--radius-sm)',
                    background: `linear-gradient(135deg, ${ws.color} 0%, ${ws.color}dd 100%)`,
                    fontSize: 15,
                    color: '#fff',
                  }}
                >
                  {ws.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="truncate"
                    style={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: isActive ? 'var(--color-accent)' : 'var(--color-text-primary)',
                      fontFamily: 'var(--font-ui)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {ws.name}
                  </div>
                  <div
                    className="truncate"
                    style={{
                      fontSize: 10.5,
                      color: 'var(--color-text-tertiary)',
                      fontFamily: 'var(--font-ui)',
                      marginTop: 1,
                    }}
                  >
                    {ws.status === 'active'
                      ? `${ws.agentPrincipals.length} ${ws.agentPrincipals.length === 1 ? 'agent' : 'agents'} · v${ws.agentVersion}`
                      : ws.status}
                  </div>
                </div>
                {isActive && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ color: 'var(--color-accent)', flexShrink: 0 }}>
                    <path d="M3 7.5l2.5 2.5L11 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
          <div style={{ height: 1, background: 'var(--color-border)', margin: '6px 4px' }} />
          <button
            onClick={() => {
              setOpen(false);
              setCreateOpen(true);
            }}
            className="w-full flex items-center gap-2 text-left"
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-ui)',
              transition: 'background 120ms ease-out',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Create new workspace
          </button>
        </div>
      )}

      <CreateWorkspaceModal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
