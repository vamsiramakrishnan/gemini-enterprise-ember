/**
 * WizardShared — Shared UI primitives for the CreateAssetWizard.
 *
 * Contains: Field (labeled form field wrapper), StepIndicator,
 * and shared style constants. These are reused by all type-specific forms.
 */

import type { ReactNode } from 'react';

// ─── Styles ─────────────────────────────────────────────────────────────

export const wizardStyles = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    zIndex: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(0,0,0,0.35)',
    backdropFilter: 'blur(2px)',
  },
  modal: {
    background: '#fff',
    borderRadius: 14,
    width: 580,
    maxWidth: '92vw',
    maxHeight: '88vh',
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
    fontFamily: 'var(--font-ui, Inter, system-ui, sans-serif)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    padding: '18px 24px 14px',
    borderBottom: '1px solid #F3F4F6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  body: {
    padding: '20px 24px',
    flex: 1,
    overflowY: 'auto' as const,
  },
  footer: {
    padding: '14px 24px',
    borderTop: '1px solid #F3F4F6',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    display: 'block',
    fontSize: 11,
    fontWeight: 600 as const,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.03em',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  textarea: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box' as const,
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    transition: 'border-color 0.15s',
  },
  select: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    fontSize: 13,
    outline: 'none',
    background: '#fff',
    boxSizing: 'border-box' as const,
  },
  btnPrimary: {
    padding: '7px 18px',
    borderRadius: 8,
    border: 'none',
    background: '#2563EB',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600 as const,
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  btnSecondary: {
    padding: '7px 18px',
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    background: '#fff',
    color: '#6B7280',
    fontSize: 12,
    fontWeight: 500 as const,
    cursor: 'pointer',
  },
};

// ─── Field ──────────────────────────────────────────────────────────────

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={wizardStyles.label}>{label}</label>
      {children}
    </div>
  );
}

// ─── Step Indicator ─────────────────────────────────────────────────────

export function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 20 : 8,
            height: 8,
            borderRadius: 4,
            background: i === current ? '#2563EB' : i < current ? '#93C5FD' : '#E5E7EB',
            transition: 'all 0.2s',
          }}
        />
      ))}
    </div>
  );
}
