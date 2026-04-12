/**
 * Workspace model — The top-level organizational container.
 *
 * In this app, **everything lives in a workspace**. A workspace is the
 * enterprise-tier equivalent of a Google Drive shared drive: it owns
 * agents, tools, connectors, guards, skills, triggers, docs, data, and
 * schemas. Teams collaborate inside a workspace; assets are shared
 * *across* workspaces via explicit grants.
 *
 * Hierarchy:
 *   Org (single tenant)
 *    └── Workspace (one per product/team/agent-family)
 *         ├── Members (users with a role)
 *         ├── Assets (chips owned by this workspace)
 *         └── Sharing (grants to other workspaces + org catalog)
 *
 * Cross-workspace access:
 *   Chips can be "owned" by exactly one workspace but "visible" in many.
 *   The visibility model has four levels:
 *     - private       → only the owning workspace sees it
 *     - shared        → explicitly shared to named workspaces (cross-ws grants)
 *     - org-catalog   → discoverable org-wide (the shared catalog)
 *     - published     → external marketplace (cross-org)
 *   Platform-level assets (e.g. pii-redaction guard, salesforce connector)
 *   live in the "Platform" workspace and are shared org-wide so every team
 *   gets governed primitives for free.
 */

// ─── Types ─────────────────────────────────────────────────────────────

/** Where an asset is visible */
export type WorkspaceVisibility =
  | 'private'      // only the owning workspace sees it
  | 'shared'       // explicitly shared to enumerated workspaces
  | 'org-catalog'  // org-wide discoverable
  | 'published';   // external marketplace (cross-org)

/** Role a user holds inside a workspace */
export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

/** A member of a workspace */
export interface WorkspaceMember {
  name: string;
  email: string;
  avatar: string;
  role: WorkspaceRole;
}

/** A workspace-level cross-workspace grant (workspace A shares to workspace B) */
export interface WorkspaceGrant {
  workspaceId: string;
  role: Exclude<WorkspaceRole, 'owner'>; // granted role in the consuming workspace
  grantedAt: string;
  grantedBy: string;                     // email of the granting admin
}

/** A workspace — the top-level container for a team's agents and assets. */
export interface Workspace {
  id: string;
  slug: string;                  // url-friendly, e.g. "claims"
  name: string;                  // display name, e.g. "Claims Processing"
  description: string;
  icon: string;                  // emoji
  color: string;                 // accent hex

  /** Who created this workspace */
  owner: WorkspaceMember;

  /** Everyone with explicit per-workspace access */
  members: WorkspaceMember[];

  /** Default visibility for new assets created in this workspace */
  defaultVisibility: WorkspaceVisibility;

  /**
   * Workspaces this workspace has extended grants to.
   * e.g. Platform workspace grants "viewer" to Claims → Claims sees all
   * Platform assets in their registry as "shared-with-us".
   */
  sharingGrants: WorkspaceGrant[];

  /**
   * Other workspaces whose assets are imported/visible here.
   * Kept denormalized for fast visibility checks. Computed from
   * the inverse of sharingGrants on other workspaces, plus the
   * org-catalog/published set.
   */
  subscribedTo: string[];

  /** Primary agent/playbook name for this workspace (for header chrome) */
  agentName: string;
  agentVersion: string;

  /** Lifecycle */
  status: 'active' | 'archived' | 'draft';
  lastUpdated: string;
  createdAt: string;

  /** Optional: org-level billing code / cost center */
  costCenter?: string;

  /** Optional: VPC Service Controls perimeter */
  perimeter?: string;

  /** Optional: data residency region */
  region?: string;
}

// ─── Mock Users (for consistent ownership) ─────────────────────────────

const USERS = {
  vamsi:    { name: 'Vamsi K',      email: 'vamsi@acme.com',    avatar: 'VK' },
  priya:    { name: 'Priya Sharma', email: 'priya@acme.com',    avatar: 'PS' },
  wei:      { name: 'Wei Chen',     email: 'wei@acme.com',      avatar: 'WC' },
  mira:     { name: 'Mira Patel',   email: 'mira@acme.com',     avatar: 'MP' },
  omar:     { name: 'Omar Rashid',  email: 'omar@acme.com',     avatar: 'OR' },
  lin:      { name: 'Lin Hao',      email: 'lin@acme.com',      avatar: 'LH' },
  platform: { name: 'Platform Ops', email: 'platform@acme.com', avatar: 'PO' },
} as const;

// ─── Workspace IDs (exported for cross-file reference) ────────────────

export const WORKSPACE_IDS = {
  PLATFORM:    'ws-platform',
  CLAIMS:      'ws-claims',
  REFUND:      'ws-refund',
  ONBOARDING:  'ws-onboarding',
  COMPLIANCE:  'ws-compliance',
} as const;

// ─── Mock Data ─────────────────────────────────────────────────────────

export const WORKSPACES: Workspace[] = [
  // ── Platform Workspace ──────────────────────────────────────────────
  // Home of the governed primitives every team inherits: PII guard,
  // Salesforce connector, Slack connector, customer-empathy skill, etc.
  // Shared org-wide so every team gets safety + systems access for free.
  {
    id: WORKSPACE_IDS.PLATFORM,
    slug: 'platform',
    name: 'Platform',
    description:
      'Shared primitives for the whole org — connectors, safety guards, compliance skills, and base schemas. Published to the org catalog.',
    icon: '🏛️',
    color: '#0F766E',
    owner: { ...USERS.platform, role: 'owner' },
    members: [
      { ...USERS.platform, role: 'owner' },
      { ...USERS.vamsi,    role: 'admin' },
      { ...USERS.mira,     role: 'editor' },
    ],
    defaultVisibility: 'org-catalog',
    sharingGrants: [
      { workspaceId: WORKSPACE_IDS.CLAIMS,     role: 'viewer', grantedAt: '2026-01-01T00:00:00Z', grantedBy: 'platform@acme.com' },
      { workspaceId: WORKSPACE_IDS.REFUND,     role: 'viewer', grantedAt: '2026-01-01T00:00:00Z', grantedBy: 'platform@acme.com' },
      { workspaceId: WORKSPACE_IDS.ONBOARDING, role: 'viewer', grantedAt: '2026-01-01T00:00:00Z', grantedBy: 'platform@acme.com' },
      { workspaceId: WORKSPACE_IDS.COMPLIANCE, role: 'editor', grantedAt: '2026-01-01T00:00:00Z', grantedBy: 'platform@acme.com' },
    ],
    subscribedTo: [],
    agentName: 'Platform Services',
    agentVersion: '1.0.0',
    status: 'active',
    lastUpdated: '2026-04-11T10:00:00Z',
    createdAt: '2025-10-01T00:00:00Z',
    costCenter: 'CC-PLAT-0001',
    perimeter: 'acme-platform-perimeter',
    region: 'global',
  },

  // ── Claims Processing ──────────────────────────────────────────────
  // The primary demo workspace. Owns claim-specific tools, docs, and
  // the claims agent. Imports Salesforce/Slack/PII guard from Platform.
  {
    id: WORKSPACE_IDS.CLAIMS,
    slug: 'claims',
    name: 'Claims Processing',
    description:
      'APAC insurance claims processing agent with policy lookup, fraud detection, and senior adjuster escalation.',
    icon: '📋',
    color: '#2563EB',
    owner: { ...USERS.vamsi, role: 'owner' },
    members: [
      { ...USERS.vamsi, role: 'owner' },
      { ...USERS.priya, role: 'admin' },
      { ...USERS.wei,   role: 'editor' },
      { ...USERS.lin,   role: 'viewer' },
    ],
    defaultVisibility: 'private',
    sharingGrants: [
      // Claims shares its policy lookup tool with the Refund workspace
      { workspaceId: WORKSPACE_IDS.REFUND, role: 'viewer', grantedAt: '2026-03-15T00:00:00Z', grantedBy: 'vamsi@acme.com' },
    ],
    subscribedTo: [WORKSPACE_IDS.PLATFORM, WORKSPACE_IDS.COMPLIANCE],
    agentName: 'Claims Processing Agent',
    agentVersion: '2.1.0',
    status: 'active',
    lastUpdated: '2026-04-11T08:30:00Z',
    createdAt: '2026-01-15T10:00:00Z',
    costCenter: 'CC-APAC-0042',
    perimeter: 'apac-finance-perimeter',
    region: 'asia-southeast1',
  },

  // ── Refund Processing ──────────────────────────────────────────────
  {
    id: WORKSPACE_IDS.REFUND,
    slug: 'refund',
    name: 'Refund Processing',
    description:
      'Customer refund agent with Shopify integration, refund policy grounding, and manager escalation.',
    icon: '💳',
    color: '#7C3AED',
    owner: { ...USERS.priya, role: 'owner' },
    members: [
      { ...USERS.priya, role: 'owner' },
      { ...USERS.vamsi, role: 'viewer' },
    ],
    defaultVisibility: 'private',
    sharingGrants: [],
    subscribedTo: [WORKSPACE_IDS.PLATFORM, WORKSPACE_IDS.CLAIMS],
    agentName: 'Refund Agent',
    agentVersion: '1.0.0',
    status: 'active',
    lastUpdated: '2026-04-10T14:20:00Z',
    createdAt: '2026-03-01T09:00:00Z',
    costCenter: 'CC-RET-0017',
    perimeter: 'apac-finance-perimeter',
    region: 'asia-southeast1',
  },

  // ── Employee Onboarding ────────────────────────────────────────────
  {
    id: WORKSPACE_IDS.ONBOARDING,
    slug: 'onboarding',
    name: 'Employee Onboarding',
    description:
      'HR onboarding assistant that provisions accounts, explains benefits, and schedules orientation sessions.',
    icon: '🚀',
    color: '#059669',
    owner: { ...USERS.wei, role: 'owner' },
    members: [
      { ...USERS.wei,  role: 'owner' },
      { ...USERS.omar, role: 'editor' },
    ],
    defaultVisibility: 'private',
    sharingGrants: [],
    subscribedTo: [WORKSPACE_IDS.PLATFORM],
    agentName: 'Onboarding Assistant',
    agentVersion: '0.3.0',
    status: 'draft',
    lastUpdated: '2026-04-09T16:45:00Z',
    createdAt: '2026-04-01T11:00:00Z',
    costCenter: 'CC-HR-0003',
    region: 'us-central1',
  },

  // ── APAC Compliance ────────────────────────────────────────────────
  // Shared compliance workspace that publishes skills + docs used by
  // Claims, Refund, and others.
  {
    id: WORKSPACE_IDS.COMPLIANCE,
    slug: 'compliance',
    name: 'APAC Compliance',
    description:
      'Regulatory compliance hub for APAC markets. Publishes skills, docs, and guards for MAS, APRA, RBI, OJK, FSC.',
    icon: '⚖️',
    color: '#B91C1C',
    owner: { ...USERS.mira, role: 'owner' },
    members: [
      { ...USERS.mira, role: 'owner' },
      { ...USERS.lin,  role: 'editor' },
    ],
    defaultVisibility: 'org-catalog',
    sharingGrants: [
      { workspaceId: WORKSPACE_IDS.CLAIMS,  role: 'viewer', grantedAt: '2026-02-01T00:00:00Z', grantedBy: 'mira@acme.com' },
      { workspaceId: WORKSPACE_IDS.REFUND,  role: 'viewer', grantedAt: '2026-02-01T00:00:00Z', grantedBy: 'mira@acme.com' },
    ],
    subscribedTo: [WORKSPACE_IDS.PLATFORM],
    agentName: 'Compliance Advisor',
    agentVersion: '1.2.0',
    status: 'active',
    lastUpdated: '2026-04-08T12:00:00Z',
    createdAt: '2025-11-10T00:00:00Z',
    costCenter: 'CC-COMP-0008',
    perimeter: 'apac-finance-perimeter',
    region: 'asia-southeast1',
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

export function findWorkspace(id: string): Workspace | undefined {
  return WORKSPACES.find((w) => w.id === id);
}

export function findWorkspaceBySlug(slug: string): Workspace | undefined {
  return WORKSPACES.find((w) => w.slug === slug);
}
