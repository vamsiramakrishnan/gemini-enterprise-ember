/**
 * HomePage — The landing page for the Playbook Agent Builder.
 *
 * Provides quick-create cards for all asset types, recent activity,
 * and workspace stats. This is the first thing users see.
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRegistry } from '../../contexts/AppContext';
import { CHIP_COLORS, CHIP_ICONS } from '../../parser/types';
import type { ChipType, SmartChip } from '../../parser/types';
import { CreateAssetWizard } from '../shared/CreateAssetWizard';
import { Button, StatusBadge } from '../../ui';

// ─── Quick-create card data ─────────────────────────────────────────

interface CreateCard {
  type: ChipType;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  route?: string;
}

const CREATE_CARDS: CreateCard[] = [
  {
    type: 'agent',
    title: 'New Agent',
    subtitle: 'LLM Agent',
    description: 'Create an agent with instructions, tools, and delegation. The agent runs an Observe-Reason-Act loop governed by its playbook.',
    icon: '\u25CE',
  },
  {
    type: 'tool',
    title: 'New Tool',
    subtitle: 'Function / MCP / OpenAPI',
    description: 'Define a callable capability — a Python function, MCP server endpoint, or OpenAPI spec that agents can invoke.',
    icon: '\u2B21',
  },
  {
    type: 'skill',
    title: 'New Skill',
    subtitle: 'SKILL.md Bundle',
    description: 'Package reusable expertise as a SKILL.md — instructions, tools, and eval cases that any agent can activate.',
    icon: '\u2726',
    route: '/skills',
  },
  {
    type: 'connector',
    title: 'New Connector',
    subtitle: 'Enterprise Integration',
    description: 'Connect to Jira, Salesforce, Slack, BigQuery, and other enterprise systems via Application Integration.',
    icon: '\u25C8',
    route: '/connectors',
  },
  {
    type: 'guard',
    title: 'New Guard',
    subtitle: 'Policy / Safety',
    description: 'Add a safety boundary — PII redaction, toxicity filtering, budget limits, or schema validation using the G namespace.',
    icon: '\u25B3',
  },
  {
    type: 'doc',
    title: 'New Document',
    subtitle: 'Knowledge Source',
    description: 'Ground your agent with a knowledge source — policy documents, regulatory guides, or FAQs via Vertex AI Search.',
    icon: '\u25C7',
  },
  {
    type: 'trigger',
    title: 'New Trigger',
    subtitle: 'Entry Point',
    description: 'Define how the agent loop starts — chat, inbox queue, webhook event, or cron schedule.',
    icon: '\u25B8',
  },
  {
    type: 'schema',
    title: 'New Schema',
    subtitle: 'Output Constraint',
    description: 'Constrain agent output to a Pydantic model shape using the @ operator for typed responses.',
    icon: '\u25A2',
  },
];

// ─── Stats helpers ──────────────────────────────────────────────────

function useWorkspaceStats(chips: SmartChip[]) {
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  for (const c of chips) {
    byType[c.type] = (byType[c.type] || 0) + 1;
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  }
  return { total: chips.length, byType, byStatus };
}

// ─── Component ──────────────────────────────────────────────────────

export function HomePage() {
  const navigate = useNavigate();
  const { chips, createChip } = useRegistry();
  const stats = useWorkspaceStats(chips);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardType, setWizardType] = useState<ChipType | undefined>(undefined);

  const handleQuickCreate = (type: ChipType) => {
    setWizardType(type);
    setWizardOpen(true);
  };

  const recentAssets = [...chips]
    .sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 8);

  return (
    <div className="h-full overflow-auto" style={{ background: '#FAFAF9' }}>
      {/* Hero header */}
      <header style={{ background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 50%, #7C3AED 100%)' }}>
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1" style={{ fontFamily: 'var(--font-ui)' }}>
                Playbook Agent Builder
              </h1>
              <p className="text-sm text-blue-100 max-w-lg leading-relaxed">
                Build enterprise agents by writing playbooks. The document IS the agent.
                Every <code className="text-blue-200 bg-white/10 px-1 rounded">@reference</code> shapes the action space.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => navigate('/editor')}
                className="bg-white text-blue-700 hover:bg-blue-50 font-semibold shadow-sm border-transparent"
              >
                Open Editor
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => navigate('/live')}
                className="bg-white/15 text-white hover:bg-white/25 border border-white/20"
              >
                Live Author
              </Button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-6 mt-6">
            {[
              { label: 'Assets', value: stats.total, color: '#fff' },
              { label: 'Agents', value: stats.byType['agent'] || 0, color: '#FDE68A' },
              { label: 'Tools', value: stats.byType['tool'] || 0, color: '#C7D2FE' },
              { label: 'Skills', value: stats.byType['skill'] || 0, color: '#DDD6FE' },
              { label: 'Connectors', value: stats.byType['connector'] || 0, color: '#BFDBFE' },
              { label: 'Guards', value: stats.byType['guard'] || 0, color: '#FECDD3' },
              { label: 'Published', value: stats.byStatus['resolved'] || 0, color: '#A7F3D0' },
              { label: 'Draft', value: stats.byStatus['draft'] || 0, color: '#FEF9C3' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
                <div className="text-[10px] text-blue-200 uppercase tracking-wider">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Section: Create New */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-primary)' }}>Create New</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Each asset you create becomes an @reference in your playbooks</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setWizardType(undefined); setWizardOpen(true); }}
            >
              Browse All Types...
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {CREATE_CARDS.map((card) => {
              const c = CHIP_COLORS[card.type];
              return (
                <button
                  key={card.type}
                  onClick={() => handleQuickCreate(card.type)}
                  className="group text-left p-4 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                  style={{ borderLeftWidth: 4, borderLeftColor: c.accent }}
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <span
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ background: c.tint, color: c.text }}
                    >
                      {card.icon}
                    </span>
                    <div>
                      <div className="text-sm font-semibold group-hover:opacity-80" style={{ color: 'var(--color-text-primary)' }}>{card.title}</div>
                      <div className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{card.subtitle}</div>
                    </div>
                    <span className="ml-auto text-gray-300 group-hover:text-gray-400 transition-colors text-lg">+</span>
                  </div>
                  <p className="text-[11px] leading-relaxed line-clamp-2" style={{ color: 'var(--color-text-secondary)' }}>
                    {card.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Quick Actions */}
        <div className="mb-10">
          <h2 className="text-base font-semibold mb-4" style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-primary)' }}>Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Edit Playbook', desc: 'Open the playbook editor', icon: '\u270E', route: '/editor', color: '#2563EB' },
              { label: 'View Notebook', desc: 'Cell-based development', icon: '\u{1F4D3}', route: '/notebook', color: '#0D9488' },
              { label: 'Browse Registry', desc: 'Search all assets', icon: '\u{1F50D}', route: '/registry', color: '#4F46E5' },
              { label: 'Agent Portfolio', desc: 'Monitor fleet health', icon: '\u{1F4CA}', route: '/portfolio', color: '#D97706' },
              { label: 'Connector Hub', desc: 'Manage integrations', icon: '\u{1F517}', route: '/connectors', color: '#2563EB' },
              { label: 'Skill Editor', desc: 'Author SKILL.md files', icon: '\u2728', route: '/skills', color: '#7C3AED' },
              { label: 'Version History', desc: 'Diff and rollback', icon: '\u{1F553}', route: '/history', color: '#475569' },
              { label: 'Live Authoring', desc: 'Build with Gemini', icon: '\u{1F399}', route: '/live', color: '#EA580C' },
            ].map((action) => (
              <Link
                key={action.route}
                to={action.route}
                className="flex items-center gap-3 p-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all group"
              >
                <span
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ background: action.color + '10', color: action.color }}
                >
                  {action.icon}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{action.label}</div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--color-text-tertiary)' }}>{action.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Section: Recent Assets */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-primary)' }}>Recent Assets</h2>
            <Link to="/registry" className="text-xs font-medium text-blue-600 hover:text-blue-700">
              View all in Registry &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentAssets.map((chip) => {
              const c = CHIP_COLORS[chip.type];
              return (
                <div
                  key={chip.id}
                  className="p-3 rounded-xl bg-white border border-gray-200 hover:shadow-sm transition-shadow cursor-pointer"
                  onClick={() => navigate('/registry')}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px]"
                      style={{ background: c.tint, color: c.text }}
                    >
                      {CHIP_ICONS[chip.type]}
                    </span>
                    <span className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {chip.name}
                    </span>
                    <span className="ml-auto">
                      <StatusBadge status={chip.status} size="xs" />
                    </span>
                  </div>
                  <p className="text-[10px] line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>{chip.description}</p>
                  <div className="flex items-center justify-between mt-1.5 text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    <span>v{chip.version}</span>
                    <span>{chip.usageCount} refs</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section: How It Works */}
        <div className="mb-8 p-5 rounded-xl bg-white border border-gray-200">
          <h2 className="text-sm font-semibold mb-3" style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-text-primary)' }}>How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
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
                desc: 'Define tools, skills, connectors, guards, and schemas. The wizard generates adk-fluent Python code for you.',
                color: 'var(--color-chip-skill)',
              },
              {
                step: '3',
                title: 'Deploy & Monitor',
                desc: 'Publish versions, set up triggers, and monitor your agent fleet from the portfolio dashboard.',
                color: 'var(--color-chip-data)',
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: s.color }}
                >
                  {s.step}
                </div>
                <div className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>{s.title}</div>
                <p className="text-[11px] leading-relaxed max-w-[200px]" style={{ color: 'var(--color-text-secondary)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <CreateAssetWizard
        isOpen={wizardOpen}
        onClose={() => { setWizardOpen(false); setWizardType(undefined); }}
        onCreate={(partial) => {
          createChip(partial);
        }}
        initialType={wizardType}
      />
    </div>
  );
}
