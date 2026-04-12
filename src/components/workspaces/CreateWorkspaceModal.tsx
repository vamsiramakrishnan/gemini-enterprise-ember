/**
 * CreateWorkspaceModal — The dedicated UX for spinning up a new
 * workspace. Because a workspace is the top-level container that
 * owns every other asset, this is arguably the most important
 * creation flow in the entire app.
 *
 * Collects:
 *   • Identity: name, slug (auto-derived), description
 *   • Visuals:  emoji icon, accent color
 *   • Policy:   default visibility for assets created inside
 *   • Inheritance: subscribe to Platform (governed primitives)
 *
 * On success, the modal switches the active workspace to the new
 * one — every subsequent asset creation will live inside it.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Field, TextInput, TextArea } from '../../ui';
import { useWorkspace, type CreateWorkspaceInput } from '../../contexts/WorkspaceContext';
import type { WorkspaceVisibility } from '../../data/workspaces';

// ─── Constants ───────────────────────────────────────────────────────

const ICON_CHOICES = ['📋', '💳', '🚀', '⚖️', '🏛️', '🛡️', '🔬', '📊', '🎯', '🧭', '💼', '🌐'];

const COLOR_CHOICES: Array<{ name: string; hex: string }> = [
  { name: 'Blue',    hex: '#2563EB' },
  { name: 'Violet',  hex: '#7C3AED' },
  { name: 'Emerald', hex: '#059669' },
  { name: 'Teal',    hex: '#0F766E' },
  { name: 'Rose',    hex: '#E11D48' },
  { name: 'Amber',   hex: '#D97706' },
  { name: 'Indigo',  hex: '#4F46E5' },
  { name: 'Slate',   hex: '#475569' },
];

const VISIBILITY_OPTIONS: Array<{
  value: WorkspaceVisibility;
  label: string;
  description: string;
}> = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only members of this workspace can see assets created here.',
  },
  {
    value: 'shared',
    label: 'Shared',
    description: 'Assets are explicitly shared to other workspaces you name.',
  },
  {
    value: 'org-catalog',
    label: 'Org catalog',
    description: 'Assets are discoverable org-wide — good for Platform / Compliance.',
  },
];

// ─── Types ───────────────────────────────────────────────────────────

export interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** If true, navigate to `/` (home) after creating so the user lands
   *  in the fresh workspace. Defaults to true. */
  navigateAfterCreate?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  navigateAfterCreate = true,
}: CreateWorkspaceModalProps) {
  const { createWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📋');
  const [color, setColor] = useState('#2563EB');
  const [defaultVisibility, setDefaultVisibility] =
    useState<WorkspaceVisibility>('private');
  const [subscribeToPlatform, setSubscribeToPlatform] = useState(true);
  const [step, setStep] = useState<0 | 1>(0);

  // Reset state whenever the modal opens afresh
  useEffect(() => {
    if (isOpen) {
      setName('');
      setDescription('');
      setIcon('📋');
      setColor('#2563EB');
      setDefaultVisibility('private');
      setSubscribeToPlatform(true);
      setStep(0);
    }
  }, [isOpen]);

  const slug = useMemo(
    () =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'my-workspace',
    [name],
  );

  const canContinue = name.trim().length > 0;

  const handleCreate = () => {
    if (!canContinue) return;
    const input: CreateWorkspaceInput = {
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      defaultVisibility,
      subscribeToPlatform,
    };
    createWorkspace(input);
    onClose();
    if (navigateAfterCreate) {
      // Land in the registry so the user sees the (currently empty) pool
      // of assets in the new workspace. Any chip created next defaults
      // into this workspace via RegistryContext.
      navigate('/registry');
    }
  };

  // ── Step indicator ────────────────────────────────────────────────
  const headerRight = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[0, 1].map((i) => (
        <div
          key={i}
          style={{
            width: 18,
            height: 4,
            borderRadius: 2,
            background:
              i <= step ? color : 'var(--color-surface-2)',
            transition: 'background 200ms ease-out',
          }}
        />
      ))}
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      title={step === 0 ? 'Create Workspace' : 'Workspace Policy'}
      subtitle={
        step === 0
          ? 'Identity, branding, and purpose'
          : 'Sharing defaults and governance'
      }
      headerRight={headerRight}
      footer={
        <>
          <Button
            variant="secondary"
            size="md"
            onClick={() => (step === 0 ? onClose() : setStep(0))}
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </Button>
          {step === 0 ? (
            <Button
              variant="primary"
              size="md"
              disabled={!canContinue}
              onClick={() => setStep(1)}
              style={{ background: canContinue ? color : undefined }}
            >
              Next
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleCreate}
              style={{ background: color }}
            >
              Create Workspace
            </Button>
          )}
        </>
      }
    >
      {/* ── Step 0: Identity & branding ───────────────────────────── */}
      {step === 0 && (
        <div>
          {/* Live preview card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              marginBottom: 22,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${color}08, ${color}02)`,
              border: `1px solid ${color}22`,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                background: `linear-gradient(135deg, ${color}, ${color}cc)`,
                color: '#fff',
                boxShadow: `0 2px 10px ${color}40, inset 0 1px 0 rgba(255,255,255,0.2)`,
                flexShrink: 0,
              }}
            >
              {icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 650,
                  color: 'var(--color-text-primary)',
                  letterSpacing: '-0.015em',
                }}
              >
                {name.trim() || 'New workspace'}
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--color-text-tertiary)',
                  fontFamily: 'var(--font-mono, monospace)',
                  marginTop: 2,
                }}
              >
                /{slug}
              </div>
            </div>
          </div>

          <Field label="Name">
            <TextInput
              placeholder="e.g. Claims Processing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Description" hint="What does this workspace do?">
            <TextArea
              rows={2}
              placeholder="APAC insurance claims processing with fraud detection..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {/* Icon picker */}
          <Field label="Icon">
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
              }}
            >
              {ICON_CHOICES.map((c) => {
                const active = c === icon;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setIcon(c)}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      border: `1.5px solid ${active ? color : 'var(--color-border)'}`,
                      background: active ? `${color}12` : 'var(--color-surface-0)',
                      cursor: 'pointer',
                      fontSize: 18,
                      transition: 'all 120ms ease-out',
                    }}
                    aria-label={`icon ${c}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Color picker */}
          <Field label="Accent color">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {COLOR_CHOICES.map((c) => {
                const active = c.hex === color;
                return (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.name}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      border: active
                        ? `2.5px solid var(--color-surface-0)`
                        : '2px solid transparent',
                      background: c.hex,
                      cursor: 'pointer',
                      boxShadow: active
                        ? `0 0 0 2px ${c.hex}, 0 2px 6px ${c.hex}40`
                        : 'var(--shadow-xs)',
                      transition: 'all 120ms ease-out',
                    }}
                    aria-label={`color ${c.name}`}
                  />
                );
              })}
            </div>
          </Field>
        </div>
      )}

      {/* ── Step 1: Policy & governance ────────────────────────────── */}
      {step === 1 && (
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-secondary)',
              marginBottom: 8,
            }}
          >
            Default Visibility
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
            {VISIBILITY_OPTIONS.map((opt) => {
              const active = opt.value === defaultVisibility;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDefaultVisibility(opt.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1.5px solid ${active ? color : 'var(--color-border)'}`,
                    background: active ? `${color}08` : 'var(--color-surface-0)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 120ms ease-out',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      border: `2px solid ${active ? color : 'var(--color-border-strong)'}`,
                      background: active ? color : 'transparent',
                      flexShrink: 0,
                      marginTop: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {active && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: '#fff',
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        marginBottom: 2,
                      }}
                    >
                      {opt.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: 'var(--color-text-secondary)',
                        lineHeight: 1.45,
                      }}
                    >
                      {opt.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Platform subscription */}
          <button
            type="button"
            onClick={() => setSubscribeToPlatform((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 10,
              width: '100%',
              border: `1.5px solid ${
                subscribeToPlatform ? color : 'var(--color-border)'
              }`,
              background: subscribeToPlatform
                ? `${color}08`
                : 'var(--color-surface-0)',
              cursor: 'pointer',
              textAlign: 'left',
              marginBottom: 14,
              transition: 'all 120ms ease-out',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 4,
                border: `2px solid ${
                  subscribeToPlatform ? color : 'var(--color-border-strong)'
                }`,
                background: subscribeToPlatform ? color : 'transparent',
                flexShrink: 0,
                marginTop: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {subscribeToPlatform && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6.5L4.8 8.8L9.5 3.5"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  marginBottom: 2,
                }}
              >
                Subscribe to Platform workspace
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.45,
                }}
              >
                Inherit governed primitives: PII redaction guard, Salesforce
                connector, customer-empathy skill, and base schemas.
                Recommended.
              </div>
            </div>
          </button>

          {/* Info box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#F0F9FF',
              border: '1px solid #BAE6FD',
              fontSize: 11,
              color: '#0369A1',
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: 13, lineHeight: 1, marginTop: 1 }}>ⓘ</span>
            <span>
              You will be the <strong>owner</strong> of this workspace. Every
              asset created here (@tools, @connectors, @guards, @agents...)
              will be owned by it, with these defaults applied.
            </span>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default CreateWorkspaceModal;
