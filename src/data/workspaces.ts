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

import type {
  AgentPrincipal,
  UserBinding,
  ResourceGrant,
} from './governance';

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

  /** Primary agent/playbook name for this workspace (for header chrome).
   *  NOTE: deprecated — a workspace may host MANY agent principals. This
   *  field is retained for backward compatibility with the chrome that
   *  needs a single label; prefer `agentPrincipals` for the real model. */
  agentName: string;
  agentVersion: string;

  /**
   * AIPlex-aligned agent principals — each principal is an OAuth client
   * with its own ceiling of allowed scopes (Dimension A). A workspace
   * typically hosts several: a primary responder, background delegates,
   * async workers, etc. Every runtime tool/agent/model call goes through
   * one of these principals.
   */
  agentPrincipals: AgentPrincipal[];

  /**
   * Workspace-level user bindings (Dimension B). Each binding maps a
   * user or group to a role, which unlocks a bundle of default scopes.
   * This is what lets an "editor" in this workspace approve an agent
   * invocation on their behalf.
   */
  userBindings: UserBinding[];

  /**
   * Per-object grants — the finest-grained form of access. A grant
   * either lets a specific user/group invoke a specific chip, or
   * expands an agent principal's allowed_scopes on a specific chip.
   * Evaluated after workspace-level visibility.
   */
  resourceGrants: ResourceGrant[];

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
    agentPrincipals: [
      {
        clientId: 'svc-platform-ops',
        displayName: 'Platform Ops Service',
        description:
          'Admin principal used by the platform team to register and maintain shared primitives.',
        authMethod: 'client_credentials',
        spiffeId: 'spiffe://acme.com/ns/platform/sa/ops',
        allowedScopes: [
          'mcp:tools:*',
          'mcp:connectors:*',
          'mcp:guards:*',
          'mcp:docs:*',
          'mcp:schemas:*',
          'mcp:data:*',
          'mcp:triggers:*',
          'a2a:agents:*',
          'a2a:skills:*',
          'llm:models:*',
        ],
        status: 'active',
        registeredAt: '2025-10-01T00:00:00Z',
        registeredBy: 'platform@acme.com',
        labels: { tier: 'platform', env: 'prod' },
      },
    ],
    userBindings: [
      { id: 'ub-plat-1', principal: 'platform@acme.com', principalKind: 'user', role: 'owner',  grantedAt: '2025-10-01T00:00:00Z', grantedBy: 'platform@acme.com' },
      { id: 'ub-plat-2', principal: 'vamsi@acme.com',    principalKind: 'user', role: 'admin',  grantedAt: '2025-10-05T00:00:00Z', grantedBy: 'platform@acme.com' },
      { id: 'ub-plat-3', principal: 'mira@acme.com',     principalKind: 'user', role: 'editor', grantedAt: '2025-10-05T00:00:00Z', grantedBy: 'platform@acme.com' },
      { id: 'ub-plat-4', principal: 'group:all-engineers', principalKind: 'group', role: 'viewer', grantedAt: '2025-11-01T00:00:00Z', grantedBy: 'platform@acme.com' },
    ],
    resourceGrants: [],
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
    agentPrincipals: [
      {
        clientId: 'svc-claims-primary',
        agentChipId: 'agent-senior-adjuster',
        displayName: 'Claims Primary Responder',
        description:
          'Customer-facing agent that handles claim intake, policy lookup, and first-line responses.',
        authMethod: 'authorization_code',
        spiffeId: 'spiffe://acme.com/ns/claims/sa/primary',
        allowedScopes: [
          'mcp:tools:policy-lookup',
          'mcp:tools:claims-history',
          'mcp:tools:notification-sender',
          'mcp:connectors:salesforce',
          'mcp:connectors:jira',
          'mcp:connectors:slack',
          'mcp:guards:pii-redaction',
          'mcp:guards:fraud-detection',
          'mcp:docs:*',
          'a2a:agents:senior-adjuster',
          'a2a:skills:customer-empathy',
          'llm:models:gemini-2.5-pro',
          'llm:models:gemini-2.5-flash',
        ],
        status: 'active',
        registeredAt: '2026-01-15T10:00:00Z',
        registeredBy: 'vamsi@acme.com',
        labels: { tier: 'primary', env: 'prod', region: 'apac' },
      },
      {
        clientId: 'svc-claims-senior-adjuster',
        agentChipId: 'agent-senior-adjuster',
        displayName: 'Senior Adjuster Delegate',
        description:
          'Escalation target for high-value or flagged claims. Invoked via a2a delegation from the primary responder.',
        authMethod: 'client_credentials',
        spiffeId: 'spiffe://acme.com/ns/claims/sa/senior-adjuster',
        allowedScopes: [
          'mcp:tools:policy-lookup',
          'mcp:tools:claims-history',
          'mcp:tools:payment-processor',
          'mcp:connectors:salesforce',
          'mcp:connectors:jira',
          'mcp:guards:*',
          'mcp:docs:*',
          'llm:models:gemini-2.5-pro',
        ],
        status: 'active',
        registeredAt: '2026-02-01T00:00:00Z',
        registeredBy: 'vamsi@acme.com',
        labels: { tier: 'escalation', env: 'prod' },
      },
      {
        clientId: 'svc-claims-fraud',
        agentChipId: 'agent-fraud-specialist',
        displayName: 'Fraud Specialist Worker',
        description:
          'Background worker that runs fraud scoring on every inbound claim. Async, no direct user interaction.',
        authMethod: 'client_credentials',
        spiffeId: 'spiffe://acme.com/ns/claims/sa/fraud',
        allowedScopes: [
          'mcp:tools:claims-history',
          'mcp:guards:fraud-detection',
          'mcp:guards:pii-redaction',
          'mcp:data:high-risk-categories',
          'llm:models:gemini-2.5-flash',
        ],
        status: 'active',
        registeredAt: '2026-02-10T00:00:00Z',
        registeredBy: 'priya@acme.com',
        labels: { tier: 'background', env: 'prod' },
      },
    ],
    userBindings: [
      { id: 'ub-claims-1', principal: 'vamsi@acme.com', principalKind: 'user',  role: 'owner',   grantedAt: '2026-01-15T10:00:00Z', grantedBy: 'vamsi@acme.com' },
      { id: 'ub-claims-2', principal: 'priya@acme.com', principalKind: 'user',  role: 'admin',   grantedAt: '2026-01-15T10:00:00Z', grantedBy: 'vamsi@acme.com' },
      { id: 'ub-claims-3', principal: 'wei@acme.com',   principalKind: 'user',  role: 'editor',  grantedAt: '2026-01-20T00:00:00Z', grantedBy: 'vamsi@acme.com' },
      { id: 'ub-claims-4', principal: 'lin@acme.com',   principalKind: 'user',  role: 'viewer',  grantedAt: '2026-02-01T00:00:00Z', grantedBy: 'vamsi@acme.com' },
      { id: 'ub-claims-5', principal: 'group:apac-support', principalKind: 'group', role: 'invoker', grantedAt: '2026-02-05T00:00:00Z', grantedBy: 'vamsi@acme.com' },
    ],
    resourceGrants: [
      // Per-object grant: Priya can call the senior-adjuster delegation
      // even though she's just admin, because of this explicit grant.
      {
        id: 'rg-claims-1',
        chipId: 'agent-senior-adjuster',
        grantee: { kind: 'user', id: 'priya@acme.com' },
        access: 'invoker',
        grantedAt: '2026-02-15T00:00:00Z',
        grantedBy: 'vamsi@acme.com',
      },
      // Fraud specialist principal gets explicit access to the
      // high-risk categories data (normally restricted).
      {
        id: 'rg-claims-2',
        chipId: 'data-high-risk-categories',
        grantee: { kind: 'agent-principal', id: 'svc-claims-fraud' },
        access: 'invoker',
        grantedAt: '2026-02-10T00:00:00Z',
        grantedBy: 'priya@acme.com',
      },
    ],
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
    agentPrincipals: [
      {
        clientId: 'svc-refund-primary',
        displayName: 'Refund Responder',
        description:
          'Handles customer refund requests end-to-end — order lookup, policy check, and payout.',
        authMethod: 'authorization_code',
        spiffeId: 'spiffe://acme.com/ns/refund/sa/primary',
        allowedScopes: [
          'mcp:tools:policy-lookup',
          'mcp:tools:payment-processor',
          'mcp:tools:notification-sender',
          'mcp:connectors:salesforce',
          'mcp:connectors:slack',
          'mcp:guards:pii-redaction',
          'mcp:docs:refund-policy-q4',
          'a2a:skills:customer-empathy',
          'llm:models:gemini-2.5-flash',
        ],
        status: 'active',
        registeredAt: '2026-03-01T09:00:00Z',
        registeredBy: 'priya@acme.com',
        labels: { tier: 'primary', env: 'prod' },
      },
    ],
    userBindings: [
      { id: 'ub-ref-1', principal: 'priya@acme.com', principalKind: 'user', role: 'owner',  grantedAt: '2026-03-01T09:00:00Z', grantedBy: 'priya@acme.com' },
      { id: 'ub-ref-2', principal: 'vamsi@acme.com', principalKind: 'user', role: 'viewer', grantedAt: '2026-03-01T09:00:00Z', grantedBy: 'priya@acme.com' },
    ],
    resourceGrants: [],
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
    agentPrincipals: [
      {
        clientId: 'svc-onboarding-primary',
        displayName: 'Onboarding Buddy',
        description:
          'New-hire companion that answers benefits questions and schedules orientation.',
        authMethod: 'authorization_code',
        allowedScopes: [
          'mcp:connectors:salesforce',
          'mcp:docs:*',
          'a2a:skills:customer-empathy',
          'llm:models:gemini-2.5-flash',
        ],
        status: 'active',
        registeredAt: '2026-04-01T11:00:00Z',
        registeredBy: 'wei@acme.com',
        labels: { tier: 'primary', env: 'dev' },
      },
    ],
    userBindings: [
      { id: 'ub-onb-1', principal: 'wei@acme.com',  principalKind: 'user', role: 'owner',  grantedAt: '2026-04-01T11:00:00Z', grantedBy: 'wei@acme.com' },
      { id: 'ub-onb-2', principal: 'omar@acme.com', principalKind: 'user', role: 'editor', grantedAt: '2026-04-01T11:00:00Z', grantedBy: 'wei@acme.com' },
    ],
    resourceGrants: [],
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
    agentPrincipals: [
      {
        clientId: 'svc-compliance-advisor',
        agentChipId: 'agent-compliance-officer',
        displayName: 'Compliance Advisor',
        description:
          'Answers regulatory questions for APAC markets and cross-references policy docs.',
        authMethod: 'authorization_code',
        spiffeId: 'spiffe://acme.com/ns/compliance/sa/advisor',
        allowedScopes: [
          'mcp:tools:regtech-api',
          'mcp:guards:apac-compliance-rules',
          'mcp:guards:pii-redaction',
          'mcp:docs:*',
          'a2a:skills:apac-compliance',
          'llm:models:gemini-2.5-pro',
        ],
        status: 'active',
        registeredAt: '2025-11-10T00:00:00Z',
        registeredBy: 'mira@acme.com',
        labels: { tier: 'primary', env: 'prod', region: 'apac' },
      },
      {
        clientId: 'svc-compliance-jurisdiction',
        displayName: 'Jurisdiction Classifier',
        description:
          'Lightweight classifier that identifies a customer jurisdiction from context. Pipelined before the main advisor.',
        authMethod: 'client_credentials',
        allowedScopes: [
          'mcp:tools:regtech-api',
          'llm:models:gemini-2.5-flash',
        ],
        status: 'active',
        registeredAt: '2025-12-01T00:00:00Z',
        registeredBy: 'mira@acme.com',
        labels: { tier: 'classifier', env: 'prod' },
      },
    ],
    userBindings: [
      { id: 'ub-comp-1', principal: 'mira@acme.com', principalKind: 'user', role: 'owner',  grantedAt: '2025-11-10T00:00:00Z', grantedBy: 'mira@acme.com' },
      { id: 'ub-comp-2', principal: 'lin@acme.com',  principalKind: 'user', role: 'editor', grantedAt: '2025-11-10T00:00:00Z', grantedBy: 'mira@acme.com' },
    ],
    resourceGrants: [],
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
