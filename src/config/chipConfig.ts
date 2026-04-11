/**
 * chipConfig — THE single source of truth for all chip type metadata.
 *
 * To add a new chip type (e.g., 'workflow'):
 *   1. Add 'workflow' to ChipType union in parser/types.ts
 *   2. Add one entry here in CHIP_CONFIG
 *   3. Done. Every UI, color map, icon map, wizard, and graph view
 *      derives from this config automatically.
 *
 * Nothing else needs to change. This file is the only place where
 * chip metadata (colors, icons, labels, adk constructs, descriptions)
 * is defined.
 */

import type { ChipType } from '../parser/types';

// ─── Types ───────────────────────────────────────────────────────────

export interface ChipColorPalette {
  bg: string;
  text: string;
  border: string;
  accent: string;
  tint: string;
}

export interface ChipTypeConfig {
  /** Display label (e.g., "Agent", "Tool") */
  label: string;
  /** Short subtitle for cards (e.g., "LLM Agent") */
  subtitle: string;
  /** Unicode icon glyph */
  icon: string;
  /** 5-color palette for chip rendering */
  colors: ChipColorPalette;
  /** adk-fluent Python construct name (e.g., "LlmAgent", "FunctionTool") */
  adkConstruct: string;
  /** Brief description for wizard/creation UI */
  description: string;
  /** CSS custom property name for this chip's accent color */
  cssVar: string;
  /** Optional: route to navigate when creating this type */
  createRoute?: string;
  /** Which graph node type this chip maps to */
  graphNodeType: string;
}

// ─── THE CONFIG ──────────────────────────────────────────────────────

/**
 * Color families:
 *   Blue family   → tool, connector, doc (capability spectrum)
 *   Purple family → skill, agent (intelligence spectrum)
 *   Warm family   → guard, trigger, data, schema (governance spectrum)
 *
 * Within each family, tints/bgs are desaturated to reduce rainbow fatigue.
 * Accent colors stay vibrant for chips and graph nodes.
 */
export const CHIP_CONFIG: Record<ChipType, ChipTypeConfig> = {
  // ── Blue family (capabilities) ────────────────────────────────────
  doc: {
    label: 'Document',
    subtitle: 'Knowledge Source',
    icon: '◇',
    colors: { bg: '#F4FAFA', text: '#0F766E', border: '#B2E5DF', accent: '#0D9488', tint: '#E0F5F2' },
    adkConstruct: 'VertexAiSearchTool',
    description: 'Ground your agent with a knowledge source — policy documents, regulatory guides, or FAQs via Vertex AI Search.',
    cssVar: '--color-chip-doc',
    createRoute: '/docs/edit',
    graphNodeType: 'grounding',
  },
  tool: {
    label: 'Tool',
    subtitle: 'Function / MCP / OpenAPI',
    icon: '⬡',
    colors: { bg: '#F0F1FE', text: '#4338CA', border: '#CDCFFC', accent: '#4F46E5', tint: '#E4E5FC' },
    adkConstruct: 'FunctionTool',
    description: 'Define a callable capability — a Python function, MCP server endpoint, or OpenAPI spec that agents can invoke.',
    cssVar: '--color-chip-tool',
    createRoute: '/tools/edit',
    graphNodeType: 'tool-call',
  },
  connector: {
    label: 'Connector',
    subtitle: 'Enterprise Integration',
    icon: '◈',
    colors: { bg: '#F0F4FF', text: '#1D4ED8', border: '#C4D5FB', accent: '#2563EB', tint: '#DCEAFF' },
    adkConstruct: 'IntegrationToolset',
    description: 'Connect to Jira, Salesforce, Slack, BigQuery, and other enterprise systems via Application Integration.',
    cssVar: '--color-chip-connector',
    createRoute: '/connectors',
    graphNodeType: 'connector-call',
  },

  // ── Purple family (intelligence) ──────────────────────────────────
  agent: {
    label: 'Agent',
    subtitle: 'LLM Agent',
    icon: '◎',
    colors: { bg: '#FBF8EE', text: '#92610A', border: '#F0DCA0', accent: '#B77D16', tint: '#F5EDDA' },
    adkConstruct: 'LlmAgent',
    description: 'Create an agent with instructions, tools, and delegation. The agent runs an Observe-Reason-Act loop governed by its playbook.',
    cssVar: '--color-chip-agent',
    createRoute: '/agents/edit',
    graphNodeType: 'agent',
  },
  skill: {
    label: 'Skill',
    subtitle: 'SKILL.md Bundle',
    icon: '✦',
    colors: { bg: '#F6F3FF', text: '#6D28D9', border: '#DCD4FE', accent: '#7C3AED', tint: '#EDE7FE' },
    adkConstruct: 'Skill',
    description: 'Package reusable expertise as a SKILL.md — instructions, tools, and eval cases that any agent can activate.',
    cssVar: '--color-chip-skill',
    createRoute: '/skills',
    graphNodeType: 'skill',
  },

  // ── Warm family (governance & structure) ───────────────────────────
  guard: {
    label: 'Guard',
    subtitle: 'Policy / Safety',
    icon: '△',
    colors: { bg: '#FEF2F2', text: '#BE123C', border: '#F9C8CC', accent: '#E11D48', tint: '#FDE4E7' },
    adkConstruct: 'GateNode',
    description: 'Add a safety boundary — PII redaction, toxicity filtering, budget limits, or schema validation using the G namespace.',
    cssVar: '--color-chip-guard',
    createRoute: '/guards/edit',
    graphNodeType: 'gate',
  },
  trigger: {
    label: 'Trigger',
    subtitle: 'Entry Point',
    icon: '▸',
    colors: { bg: '#FEF6EE', text: '#C2410C', border: '#FAD5B0', accent: '#EA580C', tint: '#FDEAD0' },
    adkConstruct: 'StreamRunner',
    description: 'Define how the agent loop starts — chat, inbox queue, webhook event, or cron schedule.',
    cssVar: '--color-chip-trigger',
    createRoute: '/triggers/edit',
    graphNodeType: 'trigger-entry',
  },
  data: {
    label: 'Data',
    subtitle: 'Data Binding',
    icon: '▣',
    colors: { bg: '#F0FAF5', text: '#047857', border: '#B0E5CA', accent: '#059669', tint: '#DAF4E6' },
    adkConstruct: 'TransformNode',
    description: 'Bind data sources or define state transforms using the S namespace.',
    cssVar: '--color-chip-data',
    createRoute: '/data/edit',
    graphNodeType: 'transform',
  },
  schema: {
    label: 'Schema',
    subtitle: 'Output Constraint',
    icon: '▢',
    colors: { bg: '#F7F8FA', text: '#334155', border: '#CDD1D8', accent: '#475569', tint: '#E6E8EC' },
    adkConstruct: 'OutputSchema',
    description: 'Constrain agent output to a Pydantic model shape using the @ operator for typed responses.',
    cssVar: '--color-chip-schema',
    createRoute: '/schemas/edit',
    graphNodeType: 'output',
  },
};

// ─── Derived maps (backward compatible with existing code) ───────────
// These replace CHIP_COLORS, CHIP_ICONS, chipAccent, NODE_COLORS, etc.
// Existing imports continue to work — just point them here.

/** Chip type → 5-color palette. Drop-in replacement for CHIP_COLORS. */
export const CHIP_COLORS: Record<ChipType, ChipColorPalette> =
  Object.fromEntries(
    Object.entries(CHIP_CONFIG).map(([k, v]) => [k, v.colors]),
  ) as Record<ChipType, ChipColorPalette>;

/** Chip type → icon glyph. Drop-in replacement for CHIP_ICONS. */
export const CHIP_ICONS: Record<ChipType, string> =
  Object.fromEntries(
    Object.entries(CHIP_CONFIG).map(([k, v]) => [k, v.icon]),
  ) as Record<ChipType, string>;

/** Chip type → accent hex. Drop-in replacement for chipAccent. */
export const CHIP_ACCENTS: Record<ChipType, string> =
  Object.fromEntries(
    Object.entries(CHIP_CONFIG).map(([k, v]) => [k, v.colors.accent]),
  ) as Record<ChipType, string>;

/** Graph node type → accent color. Drop-in replacement for NODE_COLORS. */
export const NODE_COLORS: Record<string, string> = (() => {
  const map: Record<string, string> = { decision: '#374151' };
  for (const cfg of Object.values(CHIP_CONFIG)) {
    map[cfg.graphNodeType] = cfg.colors.accent;
  }
  return map;
})();

/** Graph node type → icon. Drop-in replacement for NODE_ICONS. */
export const NODE_ICONS: Record<string, string> = (() => {
  const map: Record<string, string> = { decision: '◆' };
  for (const cfg of Object.values(CHIP_CONFIG)) {
    map[cfg.graphNodeType] = cfg.icon;
  }
  return map;
})();

/** Graph node type → adk-fluent construct name. Drop-in replacement for ADK_CONSTRUCT. */
export const ADK_CONSTRUCT: Record<string, string> = (() => {
  const map: Record<string, string> = { decision: 'RouteNode' };
  for (const cfg of Object.values(CHIP_CONFIG)) {
    map[cfg.graphNodeType] = cfg.adkConstruct;
  }
  return map;
})();

/** All chip types as an ordered array (for iteration in UIs). */
export const CHIP_TYPES: ChipType[] = Object.keys(CHIP_CONFIG) as ChipType[];

/** Wizard type options — derived from config. */
export const TYPE_OPTIONS = CHIP_TYPES.map((type) => ({
  type,
  label: CHIP_CONFIG[type].label,
  description: CHIP_CONFIG[type].description,
  icon: CHIP_CONFIG[type].icon,
}));

/** Homepage create cards — derived from config. */
export const CREATE_CARDS = CHIP_TYPES.filter(t => t !== 'data').map((type) => ({
  type,
  title: `New ${CHIP_CONFIG[type].label}`,
  subtitle: CHIP_CONFIG[type].subtitle,
  description: CHIP_CONFIG[type].description,
  icon: CHIP_CONFIG[type].icon,
  route: CHIP_CONFIG[type].createRoute,
}));

/** Chip type → graph node type lookup. */
export const CHIP_TO_NODE_TYPE: Record<ChipType, string> =
  Object.fromEntries(
    Object.entries(CHIP_CONFIG).map(([k, v]) => [k, v.graphNodeType]),
  ) as Record<ChipType, string>;
