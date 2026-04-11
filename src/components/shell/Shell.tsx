/**
 * Shell — The responsive app layout shell.
 *
 * Desktop: fixed sidebar + main content area.
 * Mobile: top bar with hamburger → drawer overlay.
 *
 * Handles sidebar collapse, mobile drawer open/close, and the
 * "Create New" wizard integration.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRegistry } from '../../contexts/AppContext';
import { CreateAssetWizard } from '../shared/CreateAssetWizard';
import { useIsMobile } from '../../hooks';
import { SidebarContent } from './Sidebar';
import { IconMenu, IconClose } from './Icons';
import { CommandPalette, useCommandPalette } from '../shared/CommandPalette';

// ─── Page transition variants ───────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 8, filter: 'blur(4px)' },
  enter: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -6, filter: 'blur(2px)', transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } },
};

// ─── Component ───────────────────────────────────────────────────────

export function Shell({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const location = useLocation();
  const { createChip } = useRegistry();
  const commandPalette = useCommandPalette();

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openCreateWizard = useCallback(() => setCreateWizardOpen(true), []);

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--color-surface-1)' }}>
        {/* Mobile top bar */}
        <div className="shell-mobile-header" style={{ display: 'flex' }}>
          <button onClick={() => setMobileOpen(true)} className="p-1 -ml-1" style={{ color: 'var(--color-text-secondary)' }}>
            <IconMenu />
          </button>
          <span className="ml-3 text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Playbook
          </span>
          <span className="ml-1.5 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Agent Builder
          </span>
          <button
            onClick={openCreateWizard}
            className="ml-auto p-1.5 rounded-lg"
            style={{ background: 'var(--color-accent)', color: '#fff' }}
            title="Create new asset"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Overlay */}
        {mobileOpen && (
          <div className="shell-overlay" onClick={closeMobile} style={{ display: 'block' }} />
        )}

        {/* Drawer */}
        <aside
          className="shell-sidebar h-full flex flex-col bg-white"
          style={{
            width: 260,
            borderRight: '1px solid var(--color-border)',
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
        >
          <div className="flex items-center justify-between px-4 h-[48px] shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <span className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>Navigation</span>
            <button onClick={closeMobile} className="p-1" style={{ color: 'var(--color-text-tertiary)' }}>
              <IconClose />
            </button>
          </div>
          <SidebarContent collapsed={false} onToggle={closeMobile} onNavigate={closeMobile} onCreateNew={openCreateWizard} />
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="enter"
              exit="exit"
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <CreateAssetWizard
          isOpen={createWizardOpen}
          onClose={() => setCreateWizardOpen(false)}
          onCreate={(partial) => createChip(partial)}
        />
        <CommandPalette open={commandPalette.open} onOpenChange={commandPalette.setOpen} />
      </div>
    );
  }

  // Desktop layout
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--color-surface-1)' }}>
      <aside
        className="h-full flex flex-col shrink-0"
        style={{
          width: collapsed ? 56 : 228,
          borderRight: '1px solid var(--color-border)',
          background: 'var(--color-sidebar)',
          transition: 'width var(--duration-normal) var(--ease-out)',
        }}
      >
        <SidebarContent collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} onCreateNew={openCreateWizard} />
      </aside>
      <main className="flex-1 overflow-auto relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            className="h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <CreateAssetWizard
        isOpen={createWizardOpen}
        onClose={() => setCreateWizardOpen(false)}
        onCreate={(partial) => createChip(partial)}
      />
      <CommandPalette open={commandPalette.open} onOpenChange={commandPalette.setOpen} />
    </div>
  );
}
