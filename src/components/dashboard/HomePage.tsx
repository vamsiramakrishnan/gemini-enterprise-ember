/**
 * HomePage — The landing page for the Playbook Agent Builder.
 *
 * Design: Linear-inspired — minimal, warm, confident.
 * Hero breathes. Create cards are spacious. No visual overload.
 * Quick Actions removed (duplicates sidebar). Stats removed from hero.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegistry } from '../../contexts/AppContext';
import { CHIP_COLORS, CHIP_ICONS, CREATE_CARDS } from '../../config/chipConfig';
import type { ChipType } from '../../parser/types';
import { CreateAssetWizard } from '../shared/CreateAssetWizard';
import { Button, StatusBadge, Card } from '../../ui';

// ─── Component ──────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const { chips, createChip } = useRegistry();
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<ChipType | undefined>(undefined);

  const handleQuickCreate = (type: ChipType) => {
    setWizardType(type);
    setWizardOpen(true);
  };

  const recentAssets = [...chips]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 6);

  return (
    <div className="h-full overflow-auto" style={{ background: 'var(--color-surface-1)' }}>

      {/* ── Hero — clean, breathing, confident ── */}
      <header
        style={{
          background: 'linear-gradient(145deg, #1A1F36 0%, #1E3A5F 40%, #2563EB 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-20%',
          width: '70%',
          height: '200%',
          background: 'radial-gradient(ellipse, rgba(37, 99, 235, 0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div className="max-w-5xl mx-auto relative" style={{ padding: 'clamp(32px, 6vw, 56px) clamp(20px, 4vw, 40px)' }}>
          <h1
            className="text-white mb-3"
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}
          >
            Playbook Agent Builder
          </h1>
          <p
            className="max-w-md mb-8"
            style={{
              fontSize: 'clamp(14px, 2vw, 16px)',
              lineHeight: 1.6,
              color: 'rgba(255, 255, 255, 0.65)',
              letterSpacing: '-0.01em',
            }}
          >
            Build enterprise agents by writing playbooks. The document is the agent.
            Every <code style={{
              color: 'rgba(255, 255, 255, 0.85)',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: '0.9em',
              fontFamily: 'var(--font-mono)',
            }}>@reference</code> shapes the action space.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/editor')}
              className="flex items-center gap-2"
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#1E3A5F',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all var(--duration-fast) var(--ease-out)',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.2)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.95)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Open Editor
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              onClick={() => navigate('/live')}
              style={{
                padding: '10px 20px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 13,
                fontWeight: 500,
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                transition: 'all var(--duration-fast) var(--ease-out)',
                letterSpacing: '-0.01em',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              }}
            >
              Live Author
            </button>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="max-w-5xl mx-auto" style={{ padding: 'clamp(24px, 4vw, 40px) clamp(20px, 4vw, 40px)' }}>

        {/* ── Create New — spacious 3-column grid ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-page-title">Create New</h2>
              <p className="text-card-body mt-1">Each asset becomes an @reference in your playbooks</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setWizardType(undefined); setWizardOpen(true); }}
            >
              All types...
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {CREATE_CARDS.slice(0, 6).map((card) => {
              const c = CHIP_COLORS[card.type];
              return (
                <button
                  key={card.type}
                  onClick={() => handleQuickCreate(card.type)}
                  className="group text-left card-interactive"
                  style={{
                    padding: '20px',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-surface-0)',
                    border: '1px solid var(--color-border)',
                    borderLeftWidth: 3,
                    borderLeftColor: c.accent,
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="flex items-center justify-center shrink-0"
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 'var(--radius-md)',
                        background: c.tint,
                        color: c.text,
                        fontSize: 14,
                      }}
                    >
                      {card.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-card-title">{card.title}</div>
                      <div className="text-card-meta">{card.subtitle}</div>
                    </div>
                    <span
                      className="text-xl transition-transform group-hover:translate-x-0.5"
                      style={{ color: 'var(--color-text-tertiary)' }}
                    >
                      +
                    </span>
                  </div>
                  <p className="text-card-body line-clamp-2">
                    {card.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Recent Assets — 3-column, compact ── */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-page-title">Recent Assets</h2>
            <Link
              to="/registry"
              className="text-[12px] font-medium transition-colors"
              style={{ color: 'var(--color-accent)' }}
            >
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {recentAssets.map((chip) => {
              const c = CHIP_COLORS[chip.type];
              return (
                <Card
                  key={chip.id}
                  variant="interactive"
                  padding="md"
                  onClick={() => navigate('/registry')}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span
                      className="inline-flex items-center justify-center rounded"
                      style={{
                        width: 24,
                        height: 24,
                        background: c.tint,
                        color: c.text,
                        fontSize: 10,
                      }}
                    >
                      {CHIP_ICONS[chip.type]}
                    </span>
                    <span className="text-card-title truncate flex-1">
                      {chip.name}
                    </span>
                    <StatusBadge status={chip.status} size="xs" />
                  </div>
                  <p className="text-card-body line-clamp-1 mb-2">{chip.description}</p>
                  <div className="flex items-center justify-between text-card-meta">
                    <span>v{chip.version}</span>
                    <span>{chip.usageCount} refs</span>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ── How It Works — clean 3-step ── */}
        <section className="mb-8">
          <Card padding="lg">
            <h2 className="text-card-title mb-6" style={{ textAlign: 'center' }}>How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
              {[
                {
                  step: '1',
                  title: 'Write a Playbook',
                  desc: 'Author instructions with @references. Each @tool, @connector, @guard shapes the agent\'s action space.',
                  color: 'var(--color-accent)',
                },
                {
                  step: '2',
                  title: 'Create Assets',
                  desc: 'Define tools, skills, connectors, and guards. The wizard generates adk-fluent Python code for you.',
                  color: 'var(--color-chip-skill)',
                },
                {
                  step: '3',
                  title: 'Deploy & Monitor',
                  desc: 'Publish versions, set up triggers, and monitor your agent fleet from the portfolio dashboard.',
                  color: 'var(--color-chip-data)',
                },
              ].map((s) => (
                <div key={s.step} className="flex flex-col items-center gap-3">
                  <div
                    className="flex items-center justify-center text-sm font-bold text-white"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: s.color,
                      boxShadow: `0 2px 8px color-mix(in srgb, ${s.color} 30%, transparent)`,
                    }}
                  >
                    {s.step}
                  </div>
                  <div className="text-card-title">{s.title}</div>
                  <p className="text-card-body max-w-[240px]">{s.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>

      <CreateAssetWizard
        isOpen={wizardOpen}
        onClose={() => { setWizardOpen(false); setWizardType(undefined); }}
        onCreate={(partial) => createChip(partial)}
        initialType={wizardType}
      />
    </div>
  );
}
