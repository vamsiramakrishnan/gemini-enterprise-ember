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
import { StatusBadge } from '../../ui';

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
    // Agents open the dedicated playbook editor — not the wizard
    if (type === 'agent') {
      navigate('/editor/new');
      return;
    }
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
          background: 'linear-gradient(145deg, #0F172A 0%, #1E3A5F 35%, #2563EB 80%, #3B82F6 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Rich layered depth with multiple radial glows */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at 70% 20%, rgba(124, 58, 237, 0.18) 0%, transparent 50%), ' +
              'radial-gradient(ellipse at 20% 80%, rgba(37, 99, 235, 0.12) 0%, transparent 45%), ' +
              'radial-gradient(ellipse at 90% 80%, rgba(6, 182, 212, 0.08) 0%, transparent 40%)',
            pointerEvents: 'none',
          }}
        />
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            pointerEvents: 'none',
          }}
        />

        <div
          className="max-w-5xl mx-auto relative"
          style={{ padding: 'clamp(36px, 6vw, 56px) var(--space-page-x)' }}
        >
          <h1
            className="animate-in"
            style={{
              fontSize: 'clamp(26px, 4.5vw, 36px)',
              fontWeight: 700,
              color: '#FFFFFF',
              fontFamily: 'var(--font-ui)',
              letterSpacing: '-0.035em',
              lineHeight: 1.12,
              margin: 0,
              textShadow: '0 2px 12px rgba(0,0,0,0.15)',
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
                padding: '11px 24px',
                background: 'rgba(255, 255, 255, 0.97)',
                color: '#1E3A5F',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--font-ui)',
                letterSpacing: '-0.01em',
                borderRadius: 'var(--radius-lg)',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.5)',
                transition: `all 180ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255,255,255,0.5)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.97)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255,255,255,0.5)';
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
                padding: '11px 24px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: 13,
                fontWeight: 500,
                fontFamily: 'var(--font-ui)',
                letterSpacing: '-0.01em',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: `all 180ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                e.currentTarget.style.transform = 'translateY(0)';
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
              gap: 14,
            }}
          >
            {HOMEPAGE_CARDS.map((card) => {
              const c = CHIP_COLORS[card.type];
              return (
                <button
                  key={card.type}
                  onClick={() => handleQuickCreate(card.type)}
                  className="group/card text-left"
                  style={{
                    padding: 0,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-surface-0)',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `var(--shadow-lg), 0 0 0 1px ${c.accent}18`;
                    e.currentTarget.style.borderColor = `${c.accent}30`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                  onMouseUp={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `var(--shadow-lg), 0 0 0 1px ${c.accent}18`;
                  }}
                >
                  {/* Gradient top edge */}
                  <div
                    style={{
                      height: 3,
                      background: `linear-gradient(90deg, ${c.accent}, ${c.accent}60)`,
                      borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                      opacity: 0.7,
                      transition: 'opacity 200ms ease-out',
                    }}
                  />
                  <div style={{ padding: '16px 18px 14px' }}>
                    <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 'var(--radius-md)',
                          background: `linear-gradient(135deg, ${c.tint}, ${c.bg})`,
                          color: c.text,
                          fontSize: 15,
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.7), 0 1px 3px ${c.accent}15`,
                          border: `1px solid ${c.accent}12`,
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
                            letterSpacing: '-0.01em',
                          }}
                        >
                          {card.title}
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            color: 'var(--color-text-tertiary)',
                            fontFamily: 'var(--font-ui)',
                            marginTop: 1,
                          }}
                        >
                          {card.subtitle}
                        </div>
                      </div>
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 'var(--radius-sm)',
                          background: 'var(--color-surface-1)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text-tertiary)',
                          fontSize: 14,
                          fontWeight: 300,
                          lineHeight: 1,
                          transition: 'all 200ms ease-out',
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
                </button>
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
              className="flex items-center gap-1"
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--color-accent)',
                fontFamily: 'var(--font-ui)',
                textDecoration: 'none',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                transition: 'all 150ms ease-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-accent-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              View all
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 2.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>

          <div
            className="stagger"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 14,
            }}
          >
            {recentAssets.map((chip) => {
              const c = CHIP_COLORS[chip.type];
              return (
                <div
                  key={chip.id}
                  onClick={() => navigate('/registry')}
                  className="cursor-pointer"
                  style={{
                    padding: 0,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-surface-0)',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    e.currentTarget.style.borderColor = 'var(--color-border-strong)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
                    e.currentTarget.style.borderColor = 'var(--color-border)';
                  }}
                >
                  <div style={{ padding: '14px 16px 12px' }}>
                    <div className="flex items-center gap-2.5" style={{ marginBottom: 8 }}>
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 'var(--radius-sm)',
                          background: `linear-gradient(135deg, ${c.tint}, ${c.bg})`,
                          color: c.text,
                          fontSize: 10,
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.6)`,
                          border: `1px solid ${c.accent}10`,
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
                          letterSpacing: '-0.01em',
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
                        lineHeight: 1.5,
                      }}
                    >
                      {chip.description}
                    </p>
                  </div>
                  {/* Footer bar */}
                  <div
                    className="flex items-center justify-between"
                    style={{
                      padding: '8px 16px',
                      fontSize: 10.5,
                      color: 'var(--color-text-tertiary)',
                      fontFamily: 'var(--font-ui)',
                      borderTop: '1px solid var(--color-border-subtle)',
                      background: 'var(--color-surface-1)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>v{chip.version}</span>
                    <span className="flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
                        <path d="M5 1v4l2.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1" fill="none"/>
                      </svg>
                      {chip.usageCount} refs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section: How It Works ───────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <div
            style={{
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-0)',
              boxShadow: 'var(--shadow-xs)',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '28px 32px 32px' }}>
              <div className="flex flex-col items-center" style={{ marginBottom: 28 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--color-text-tertiary)',
                    fontFamily: 'var(--font-ui)',
                    marginBottom: 6,
                  }}
                >
                  Getting Started
                </span>
                <h2
                  style={{
                    fontSize: 15,
                    fontWeight: 650,
                    color: 'var(--color-text-primary)',
                    fontFamily: 'var(--font-ui)',
                    letterSpacing: '-0.015em',
                    textAlign: 'center',
                    margin: 0,
                  }}
                >
                  Three steps to a running agent
                </h2>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 24,
                }}
              >
                {[
                  {
                    step: '1',
                    title: 'Write a Playbook',
                    desc: 'Author instructions with @references. Each @tool, @connector, @guard shapes the agent\u2019s action space.',
                    color: '#2563EB',
                    gradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 3h7l3 3v7a1 1 0 01-1 1H3a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 9h6M5 11.5h4" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    ),
                  },
                  {
                    step: '2',
                    title: 'Create Assets',
                    desc: 'Define tools, skills, connectors, and guards. The wizard generates adk-fluent Python code for you.',
                    color: '#7C3AED',
                    gradient: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="2" y="2" width="5" height="5" rx="1" stroke="white" strokeWidth="1.3"/>
                        <rect x="9" y="2" width="5" height="5" rx="1" stroke="white" strokeWidth="1.3"/>
                        <rect x="2" y="9" width="5" height="5" rx="1" stroke="white" strokeWidth="1.3"/>
                        <path d="M11.5 9.5v5M9 11.75h5" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    ),
                  },
                  {
                    step: '3',
                    title: 'Deploy & Monitor',
                    desc: 'Publish versions, set up triggers, and monitor your agent fleet from the portfolio dashboard.',
                    color: '#059669',
                    gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    icon: (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v4l3.5 2" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="1.3"/>
                        <path d="M12 12l2 2" stroke="white" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                    ),
                  },
                ].map((s, i) => (
                  <div
                    key={s.step}
                    className="flex flex-col items-center relative"
                    style={{ textAlign: 'center' }}
                  >
                    {/* Connector line between steps (not on first) */}
                    {i > 0 && (
                      <div
                        className="absolute top-5 -left-3 hidden md:block"
                        style={{
                          width: 24,
                          height: 1,
                          background: 'var(--color-border-strong)',
                        }}
                      />
                    )}
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        background: s.gradient,
                        marginBottom: 16,
                        boxShadow: `0 3px 10px ${s.color}30, inset 0 1px 0 rgba(255,255,255,0.2)`,
                      }}
                    >
                      {s.icon}
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 620,
                        color: 'var(--color-text-primary)',
                        fontFamily: 'var(--font-ui)',
                        marginBottom: 6,
                        letterSpacing: '-0.01em',
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
          </div>
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
