/**
 * CommandPalette — Cmd+K command palette for global search & navigation.
 *
 * Fuzzy-searches across three categories:
 *   - Assets   → registry chips (tools, connectors, skills, agents, etc.)
 *   - Navigation → app routes / screens
 *   - Actions   → quick actions (create, publish, open settings, etc.)
 *
 * Built on `cmdk` v1 for keyboard-driven navigation + scoring,
 * with framer-motion for glass-morphism entrance/exit animation.
 *
 * Usage:
 *   const { open, toggle, setOpen } = useCommandPalette();
 *   <CommandPalette open={open} onClose={() => setOpen(false)} />
 *
 * The hook registers Cmd+K / Ctrl+K globally.
 */

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { useRegistry } from '../../contexts/AppContext';
import { CHIP_COLORS, CHIP_ICONS, CHIP_CONFIG } from '../../config/chipConfig';
import type { ChipType } from '../../parser/types';

// ─── Navigation routes ──────────────────────────────────────────────

interface NavRoute {
  label: string;
  path: string;
  icon: string;
}

const NAV_ROUTES: NavRoute[] = [
  { label: 'Home', path: '/', icon: '\u{1F3E0}' },
  { label: 'Playbook Editor', path: '/editor', icon: '\u{1F4DD}' },
  { label: 'Notebook', path: '/notebook', icon: '\u{1F4D3}' },
  { label: 'Registry', path: '/registry', icon: '\u{1F4E6}' },
  { label: 'Connectors', path: '/connectors', icon: '\u{1F517}' },
  { label: 'Skills', path: '/skills', icon: '\u2728' },
  { label: 'Version History', path: '/history', icon: '\u{1F550}' },
  { label: 'Portfolio', path: '/portfolio', icon: '\u{1F4CA}' },
  { label: 'Live Authoring', path: '/live', icon: '\u{1F399}\uFE0F' },
];

// ─── Quick actions ──────────────────────────────────────────────────

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  description: string;
  action: (navigate: ReturnType<typeof useNavigate>) => void;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'create-agent',
    label: 'Create new Agent',
    icon: '\u2795',
    description: 'Start a new playbook from scratch',
    action: (nav) => nav('/editor'),
  },
  {
    id: 'create-tool',
    label: 'Create new Tool',
    icon: '\u{1F527}',
    description: 'Define a new callable tool',
    action: (nav) => nav('/registry'),
  },
  {
    id: 'create-skill',
    label: 'Create new Skill',
    icon: '\u{1F4D6}',
    description: 'Author a SKILL.md capability bundle',
    action: (nav) => nav('/skills'),
  },
  {
    id: 'add-connector',
    label: 'Add Connector',
    icon: '\u{1F50C}',
    description: 'Connect an enterprise system',
    action: (nav) => nav('/connectors'),
  },
  {
    id: 'run-test',
    label: 'Run Test',
    icon: '\u25B6\uFE0F',
    description: 'Execute the current playbook test cell',
    action: (nav) => nav('/notebook'),
  },
  {
    id: 'publish',
    label: 'Publish Playbook',
    icon: '\u{1F680}',
    description: 'Publish the current agent to production',
    action: (nav) => nav('/editor'),
  },
  {
    id: 'view-history',
    label: 'View Version History',
    icon: '\u{1F4C5}',
    description: 'Compare versions and review diffs',
    action: (nav) => nav('/history'),
  },
];

// ─── useCommandPalette hook ─────────────────────────────────────────

export interface CommandPaletteState {
  open: boolean;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

export function useCommandPalette(): CommandPaletteState {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  return { open, toggle, setOpen };
}

// ─── Framer-motion variants ──────────────────────────────────────────

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const dialogVariants = {
  hidden: {
    opacity: 0,
    scale: 0.96,
    y: -12,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 500,
      damping: 32,
      mass: 0.8,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -8,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// ─── Chip type badge ────────────────────────────────────────────────

function TypeBadge({ type }: { type: ChipType }) {
  const colors = CHIP_COLORS[type];
  const config = CHIP_CONFIG[type];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '1px 7px',
        borderRadius: 'var(--radius-xs)',
        fontSize: 10,
        fontWeight: 550,
        letterSpacing: '0.02em',
        lineHeight: '18px',
        fontFamily: 'var(--font-ui)',
        color: colors.text,
        backgroundColor: colors.tint,
        border: `1px solid ${colors.border}`,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}
    >
      {config.label}
    </span>
  );
}

// ─── Section label ──────────────────────────────────────────────────

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        padding: '8px 16px 4px',
        fontSize: 10,
        fontWeight: 600,
        fontFamily: 'var(--font-ui)',
        color: 'var(--color-text-tertiary)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        userSelect: 'none',
      }}
    >
      {children}
    </div>
  );
}

// ─── CommandPalette component ────────────────────────────────────────

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { chips } = useRegistry();
  const [search, setSearch] = useState('');

  // Reset search when opening
  useEffect(() => {
    if (open) setSearch('');
  }, [open]);

  // Limit displayed assets for performance (show top 12 when browsing, all when searching)
  const displayedChips = useMemo(() => {
    if (!search) return chips.slice(0, 12);
    return chips;
  }, [chips, search]);

  const handleSelect = useCallback(
    (value: string) => {
      // Navigation routes
      const route = NAV_ROUTES.find((r) => r.path === value);
      if (route) {
        navigate(route.path);
        onClose();
        return;
      }

      // Quick actions
      const action = QUICK_ACTIONS.find((a) => a.id === value);
      if (action) {
        action.action(navigate);
        onClose();
        return;
      }

      // Registry chips — navigate to registry with selection
      const chip = chips.find((c) => c.id === value);
      if (chip) {
        // Navigate to registry; a real implementation would also select the chip
        navigate('/registry');
        onClose();
        return;
      }

      onClose();
    },
    [navigate, onClose, chips],
  );

  // Determine the user's platform for shortcut display
  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent),
    [],
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            key="cmd-palette-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.18 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9998,
              background: 'rgba(0, 0, 0, 0.25)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}
          />

          {/* Dialog */}
          <motion.div
            key="cmd-palette-dialog"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'fixed',
              top: 'min(20vh, 160px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              width: '100%',
              maxWidth: 560,
              padding: '0 16px',
              pointerEvents: 'none',
            }}
          >
            <Command
              label="Command palette"
              loop
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  onClose();
                }
              }}
              style={{
                pointerEvents: 'auto',
                background: 'var(--color-surface-0)',
                borderRadius: 'var(--radius-2xl)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-2xl)',
                overflow: 'hidden',
                fontFamily: 'var(--font-ui)',
              }}
            >
              {/* Search input */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--color-border-subtle)',
                }}
              >
                <SearchIcon />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search assets, pages, and actions\u2026"
                  autoFocus
                  style={{
                    flex: 1,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 16,
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 400,
                    color: 'var(--color-text-primary)',
                    caretColor: 'var(--color-accent)',
                    lineHeight: '24px',
                  }}
                />
                <kbd
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px 6px',
                    fontSize: 11,
                    fontFamily: 'var(--font-ui)',
                    fontWeight: 500,
                    color: 'var(--color-text-tertiary)',
                    background: 'var(--color-surface-2)',
                    borderRadius: 'var(--radius-xs)',
                    border: '1px solid var(--color-border)',
                    lineHeight: '16px',
                    userSelect: 'none',
                  }}
                >
                  esc
                </kbd>
              </div>

              {/* Results */}
              <Command.List
                style={{
                  maxHeight: 340,
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  padding: '6px 0',
                }}
              >
                <Command.Empty
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    fontSize: 13,
                    color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-ui)',
                  }}
                >
                  No results found.
                </Command.Empty>

                {/* Assets */}
                <Command.Group
                  heading={<SectionHeading>Assets</SectionHeading>}
                >
                  {displayedChips.map((chip) => (
                    <Command.Item
                      key={chip.id}
                      value={chip.id}
                      keywords={[
                        chip.name,
                        chip.type,
                        chip.description,
                        `@${chip.type}`,
                        CHIP_CONFIG[chip.type]?.label ?? '',
                      ]}
                      onSelect={handleSelect}
                      style={{ padding: 0 }}
                    >
                      {/* Custom rendering via wrapper — cmdk only styles [data-selected] on the Item */}
                      <PaletteItem
                        icon={
                          <ChipIcon type={chip.type} />
                        }
                        name={chip.name}
                        badge={<TypeBadge type={chip.type} />}
                        description={chip.description}
                      />
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Navigation */}
                <Command.Group
                  heading={<SectionHeading>Navigation</SectionHeading>}
                >
                  {NAV_ROUTES.map((route) => (
                    <Command.Item
                      key={route.path}
                      value={route.path}
                      keywords={[route.label, 'go', 'navigate', 'open', 'page']}
                      onSelect={handleSelect}
                      style={{ padding: 0 }}
                    >
                      <PaletteItem
                        icon={
                          <span style={{ fontSize: 15, lineHeight: 1 }}>
                            {route.icon}
                          </span>
                        }
                        name={route.label}
                        description={route.path}
                      />
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Actions */}
                <Command.Group
                  heading={<SectionHeading>Actions</SectionHeading>}
                >
                  {QUICK_ACTIONS.map((action) => (
                    <Command.Item
                      key={action.id}
                      value={action.id}
                      keywords={[action.label, action.description, 'action', 'do', 'run']}
                      onSelect={handleSelect}
                      style={{ padding: 0 }}
                    >
                      <PaletteItem
                        icon={
                          <span style={{ fontSize: 15, lineHeight: 1 }}>
                            {action.icon}
                          </span>
                        }
                        name={action.label}
                        description={action.description}
                      />
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>

              {/* Footer — keyboard shortcut hints */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '8px 16px',
                  borderTop: '1px solid var(--color-border-subtle)',
                  background: 'var(--color-surface-1)',
                  borderRadius: '0 0 var(--radius-2xl) var(--radius-2xl)',
                }}
              >
                <FooterHint keys={['\u2191', '\u2193']} label="navigate" />
                <FooterHint keys={['\u21B5']} label="select" />
                <FooterHint keys={['esc']} label="close" />
                <span style={{ flex: 1 }} />
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: 'var(--font-ui)',
                    color: 'var(--color-text-quaternary)',
                  }}
                >
                  {isMac ? '\u2318' : 'Ctrl+'}K to toggle
                </span>
              </div>
            </Command>
          </motion.div>

          {/* Scoped styles for cmdk data-attributes */}
          <style>{`
            [cmdk-group-heading] {
              padding: 0 !important;
            }

            [cmdk-item] {
              cursor: pointer;
              border-radius: 0;
              transition: none;
            }

            [cmdk-item][data-selected="true"] .cmd-palette-item {
              background: var(--color-accent-light);
            }

            [cmdk-item][data-selected="true"] .cmd-palette-item::before {
              content: '';
              position: absolute;
              left: 0;
              top: 4px;
              bottom: 4px;
              width: 3px;
              border-radius: 0 2px 2px 0;
              background: var(--color-accent);
            }

            [cmdk-item]:active .cmd-palette-item {
              background: var(--color-surface-2);
            }

            [cmdk-input]::placeholder {
              color: var(--color-text-quaternary);
            }

            [cmdk-list]::-webkit-scrollbar {
              width: 6px;
            }

            [cmdk-list]::-webkit-scrollbar-track {
              background: transparent;
            }

            [cmdk-list]::-webkit-scrollbar-thumb {
              background: var(--color-border-strong);
              border-radius: 3px;
            }

            [cmdk-list]::-webkit-scrollbar-thumb:hover {
              background: var(--color-text-quaternary);
            }

            [cmdk-group] + [cmdk-group] {
              margin-top: 4px;
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Internal sub-components ────────────────────────────────────────

function PaletteItem({
  icon,
  name,
  badge,
  description,
}: {
  icon: ReactNode;
  name: string;
  badge?: ReactNode;
  description: string;
}) {
  return (
    <div
      className="cmd-palette-item"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 16px',
        minHeight: 40,
        transition: 'background 80ms ease',
      }}
    >
      {/* Icon */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Text */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontWeight: 500,
              fontFamily: 'var(--font-ui)',
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </span>
          {badge}
        </div>
        <span
          style={{
            fontSize: 11.5,
            fontFamily: 'var(--font-ui)',
            color: 'var(--color-text-tertiary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '16px',
          }}
        >
          {description}
        </span>
      </div>
    </div>
  );
}

function ChipIcon({ type }: { type: ChipType }) {
  const colors = CHIP_COLORS[type];
  const icon = CHIP_ICONS[type];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 'var(--radius-sm)',
        backgroundColor: colors.tint,
        border: `1px solid ${colors.border}`,
        color: colors.accent,
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      {icon}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-text-tertiary)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FooterHint({ keys, label }: { keys: string[]; label: string }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontFamily: 'var(--font-ui)',
        color: 'var(--color-text-quaternary)',
      }}
    >
      {keys.map((key) => (
        <kbd
          key={key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 18,
            height: 18,
            padding: '0 4px',
            fontSize: 11,
            fontFamily: 'var(--font-ui)',
            fontWeight: 500,
            color: 'var(--color-text-tertiary)',
            background: 'var(--color-surface-0)',
            borderRadius: 3,
            border: '1px solid var(--color-border)',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          {key}
        </kbd>
      ))}
      <span>{label}</span>
    </span>
  );
}
