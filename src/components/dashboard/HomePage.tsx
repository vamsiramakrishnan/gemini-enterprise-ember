/**
 * HomePage — The landing page for the Playbook Agent Builder.
 *
 * Minimal, warm, confident. A clean hero with two CTAs, a focused
 * create-new grid (6 cards), recent assets, and a brief explainer.
 * No stats bar, no quick actions — let the page breathe.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegistry } from '../../contexts/AppContext';
import { CHIP_COLORS, CHIP_ICONS, CREATE_CARDS } from '../../config/chipConfig';
import type { ChipType } from '../../parser/types';
import { CreateAssetWizard } from '../shared/CreateAssetWizard';
import { Card, StatusBadge } from '../../ui';

// ─── Constants ──────────────────────────────────────────────────────

/** 6 most-created asset types: drop Data and Schema (rarely created directly). */
const HOMEPAGE_CARDS = CREATE_CARDS.filter(
  (c) => c.type !== 'schema',
).slice(0, 6);

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

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <header
        style={{
          background: 'linear-gradient(145deg, #1A1F36 0%, #1E3A5F 40%, #2563EB 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle radial glow for depth */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 75% 30%, rgba(124, 58, 237, 0.12) 0%, transparent 60%), ' +
              'radial-gradient(ellipse at 20% 80%, rgba(37, 99, 235, 0.08) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        <div
          className="max-w-5xl mx-auto relative"
          style={{ padding: 'clamp(36px, 6vw, 56px) var(--space-page-x)' }}
        >
          <h1
            style={{
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 700,
              color: '#FFFFFF',
              fontFamily: 'var(--font-ui)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            Playbook Agent Builder
          </h1>
          <p
            style={{
              fontSize: 'clamp(13px, 1.6vw, 15px)',
              lineHeight: 1.65,
              color: 'rgba(255, 255, 255, 0.65)',
              maxWidth: 460,
              marginTop: 12,
              marginBottom: 0,
              fontFamily: 'var(--font-ui)',
              letterSpacing: '-0.005em',
            }}
          >
            Build enterprise agents by writing playbooks. The document is the agent.
            Every{' '}
            <code
              style={{
                color: 'rgba(255, 255, 255, 0.88)',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: '0.9em',
                fontFamily: 'var(--font-mono)',
              }}
            >
              @reference
            </code>{' '}
            shapes the action space.
          </p>

          <div className="flex items-center gap-3" style={{ marginTop: 28 }}>
            <button
              onClick={() => navigate('/editor')}
              className="flex items-center gap-2"
              style={{
                padding: '10px 22px',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#1E3A5F',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                letterSpacing: '-0.01em',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                transition: `all var(--duration-fast) var(--ease-out)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
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
                <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/live')}
              style={{
                padding: '10px 22px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
                letterSpacing: '-0.01em',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                cursor: 'pointer',
                transition: `all var(--duration-fast) var(--ease-out)`,
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

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div
        className="max-w-5xl mx-auto"
        style={{ padding: 'clamp(24px, 4vw, 40px) var(--space-page-x)' }}
      >

        {/* Section: Create New ─────────────────────────────────── */}
        <section style={{ marginBottom: 48 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
            <div>
              <h2
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-ui)',
                  letterSpacing: '-0.01em',
                  margin: 0,
                }}
              >
                Create New
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: 'var(--color-text-secondary)',
                  fontFamily: 'var(--font-ui)',
                  margin: '4px 0 0',
                }}
              >
                Each asset becomes an @reference in your playbooks
              </p>
            </div>
            <button
              onClick={() => { setWizardType(undefined); setWizardOpen(true); }}
              style={{
                padding: '7px 14px',
                fontSize: 12,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
                color: 'var(--color-text-secondary)',
                background: 'var(--color-surface-0)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: `all var(--duration-fast) var(--ease-out)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-1)';
                e.currentTarget.style.borderColor = 'var(--color-border-strong)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-surface-0)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
              }}
            >
              All types...
            </button>
          </div>

          <div
            className="stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {HOMEPAGE_CARDS.map((card) => {
              const c = CHIP_COLORS[card.type];
              return (
                <Card
                  key={card.type}
                  variant="interactive"
                  padding="none"
                  accentColor={c.accent}
                  onClick={() => handleQuickCreate(card.type)}
                  role="button"
                  style={{ textAlign: 'left' }}
                >
                  <div style={{ padding: '18px 18px 16px' }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
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
                      <div className="min-w-0 flex-1">
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            fontFamily: 'var(--font-ui)',
                            lineHeight: 1.3,
                          }}
                        >
                          {card.title}
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: 'var(--color-text-tertiary)',
                            fontFamily: 'var(--font-ui)',
                          }}
                        >
                          {card.subtitle}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 18,
                          color: 'var(--color-text-tertiary)',
                          lineHeight: 1,
                        }}
                      >
                        +
                      </span>
                    </div>
                    <p
                      className="line-clamp-2"
                      style={{
                        fontSize: 11.5,
                        lineHeight: 1.55,
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-ui)',
                        margin: 0,
                      }}
                    >
                      {card.description}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Section: Recent Assets ──────────────────────────────── */}
        <section style={{ marginBottom: 48 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 18 }}>
            <h2
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--color-text-primary)',
                fontFamily: 'var(--font-ui)',
                letterSpacing: '-0.01em',
                margin: 0,
              }}
            >
              Recent Assets
            </h2>
            <Link
              to="/registry"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-accent)',
                fontFamily: 'var(--font-ui)',
                textDecoration: 'none',
              }}
            >
              View all in Registry &rarr;
            </Link>
          </div>

          <div
            className="stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}
          >
            {recentAssets.map((chip) => {
              const c = CHIP_COLORS[chip.type];
              return (
                <Card
                  key={chip.id}
                  variant="interactive"
                  padding="none"
                  onClick={() => navigate('/registry')}
                >
                  <div style={{ padding: '16px 18px' }}>
                    <div className="flex items-center gap-2.5" style={{ marginBottom: 8 }}>
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 'var(--radius-xs)',
                          background: c.tint,
                          color: c.text,
                          fontSize: 10,
                        }}
                      >
                        {CHIP_ICONS[chip.type]}
                      </span>
                      <span
                        className="truncate flex-1"
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--color-text-primary)',
                          fontFamily: 'var(--font-ui)',
                        }}
                      >
                        {chip.name}
                      </span>
                      <span className="shrink-0 ml-auto">
                        <StatusBadge status={chip.status} size="xs" />
                      </span>
                    </div>
                    <p
                      className="line-clamp-1"
                      style={{
                        fontSize: 11.5,
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-ui)',
                        margin: 0,
                      }}
                    >
                      {chip.description}
                    </p>
                    <div
                      className="flex items-center justify-between"
                      style={{
                        marginTop: 10,
                        fontSize: 10.5,
                        color: 'var(--color-text-tertiary)',
                        fontFamily: 'var(--font-ui)',
                      }}
                    >
                      <span>v{chip.version}</span>
                      <span>{chip.usageCount} refs</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Section: How It Works ───────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <Card padding="none">
            <div style={{ padding: '28px 32px' }}>
              <h2
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--color-text-primary)',
                  fontFamily: 'var(--font-ui)',
                  textAlign: 'center',
                  margin: '0 0 28px',
                }}
              >
                How It Works
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 36,
                }}
              >
                {[
                  {
                    step: '1',
                    title: 'Write a Playbook',
                    desc: 'Author instructions with @references. Each @tool, @connector, @guard shapes the agent\u2019s action space.',
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
                  <div
                    key={s.step}
                    className="flex flex-col items-center"
                    style={{ textAlign: 'center' }}
                  >
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: '50%',
                        background: s.color,
                        color: '#FFFFFF',
                        fontSize: 14,
                        fontWeight: 700,
                        fontFamily: 'var(--font-ui)',
                        marginBottom: 14,
                      }}
                    >
                      {s.step}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                        fontFamily: 'var(--font-ui)',
                        marginBottom: 6,
                      }}
                    >
                      {s.title}
                    </div>
                    <p
                      style={{
                        fontSize: 11.5,
                        lineHeight: 1.65,
                        color: 'var(--color-text-secondary)',
                        fontFamily: 'var(--font-ui)',
                        maxWidth: 220,
                        margin: 0,
                      }}
                    >
                      {s.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

      </div>

      <CreateAssetWizard
        isOpen={wizardOpen}
        onClose={() => { setWizardOpen(false); setWizardType(undefined); }}
        onCreate={(partial) => { createChip(partial); }}
        initialType={wizardType}
      />
    </div>
  );
}
