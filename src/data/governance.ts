/**
 * Governance — The AIPlex-aligned access control model.
 *
 * AIPlex is the gateway + registry that sits underneath adk-fluent at
 * runtime. Where adk-fluent compiles a playbook to native ADK constructs,
 * AIPlex answers the question: "can THIS principal (user or agent) invoke
 * THIS resource right now?" The answer is computed from the intersection
 * of three dimensions:
 *
 *   Effective = AgentCeiling ∩ UserCeiling ∩ UserConsent
 *
 *   Dimension A — AgentCeiling: the `allowed_scopes` on an AgentPrincipal,
 *     set at registration. This is the maximum the agent can *ever* ask for.
 *
 *   Dimension B — UserCeiling: the user's role within a workspace plus any
 *     explicit per-object grants. This is what the user is allowed to
 *     approve *on behalf of* an agent.
 *
 *   Dimension C — UserConsent (runtime): one-shot / session-scoped approval
 *     the user grants at invocation time. We mock this in the UI but do not
 *     enforce it.
 *
 * In the UI, this means:
 *   - Every workspace now has multiple AgentPrincipals (not "one primary").
 *   - Every chip can be granted either at the workspace level (implicit via
 *     scope visibility) OR explicitly to individual users / agents.
 *   - The registry shows TWO views: "what THIS user can see/edit" and
 *     "what THIS agent can call at runtime" — they are computed differently.
 *
 * Scope grammar (matches AIPlex exactly):
 *
 *   {plane}:{resource}:{specific}
 *
 *   mcplex: @tool, @connector, @guard, @doc, @schema, @data, @trigger
 *   a2aplex: @agent, @skill
 *   llmplex: the LLM models an agent principal may use
 *
 * Examples:
 *   mcp:tools:policy_lookup         → call the policy-lookup tool
 *   mcp:connectors:salesforce       → invoke the Salesforce connector
 *   mcp:guards:*                    → all guards (workspace-level grant)
 *   a2a:agents:senior_adjuster      → delegate to the senior-adjuster agent
 *   a2a:skills:apac_compliance      → activate the apac-compliance skill
 *   llm:models:gemini-2.5-pro       → use gemini-2.5-pro for reasoning
 *   workspace:claims:editor         → workspace-level role grant
 */

import type { ChipType } from '../parser/types';

// ─── Planes ────────────────────────────────────────────────────────────

/** The three AIPlex planes — every resource belongs to exactly one. */
export type Plane = 'mcplex' | 'a2aplex' | 'llmplex';

/**
 * Every chip type maps to exactly one plane. This is what lets the gateway
 * route requests — a tool call goes to mcplex, an agent delegation goes to
 * a2aplex, and the LLM call underneath goes to llmplex.
 */
export const CHIP_TYPE_TO_PLANE: Record<ChipType, Plane> = {
  tool:      'mcplex',
  connector: 'mcplex',
  guard:     'mcplex',
  doc:       'mcplex',
  schema:    'mcplex',
  data:      'mcplex',
  trigger:   'mcplex',
  agent:     'a2aplex',
  skill:     'a2aplex',
};

/** Short form of the plane prefix used in scope strings. */
export const PLANE_PREFIX: Record<Plane, string> = {
  mcplex:  'mcp',
  a2aplex: 'a2a',
  llmplex: 'llm',
};

/**
 * The resource key used inside a scope string. Tool-like chips collapse to
 * one key per plane; agents and skills are modelled separately inside a2a.
 */
export const CHIP_TYPE_TO_RESOURCE: Record<ChipType, string> = {
  tool:      'tools',
  connector: 'connectors',
  guard:     'guards',
  doc:       'docs',
  schema:    'schemas',
  data:      'data',
  trigger:   'triggers',
  agent:     'agents',
  skill:     'skills',
};

// ─── Scopes ────────────────────────────────────────────────────────────

/** A scope string in AIPlex format. Exported as a branded type for clarity. */
export type Scope = string;

/**
 * Canonical helper — given a chip type and a chip identifier, produce the
 * scope string the gateway would enforce.
 */
export function scopeForChip(type: ChipType, name: string): Scope {
  const plane = CHIP_TYPE_TO_PLANE[type];
  const resource = CHIP_TYPE_TO_RESOURCE[type];
  return `${PLANE_PREFIX[plane]}:${resource}:${name}`;
}

/** The wildcard form — "all tools in this workspace", "all guards", etc. */
export function wildcardScope(type: ChipType): Scope {
  const plane = CHIP_TYPE_TO_PLANE[type];
  const resource = CHIP_TYPE_TO_RESOURCE[type];
  return `${PLANE_PREFIX[plane]}:${resource}:*`;
}

/** Parse a scope string into its three parts. */
export function parseScope(scope: Scope): { prefix: string; resource: string; specific: string } | null {
  const parts = scope.split(':');
  if (parts.length !== 3) return null;
  return { prefix: parts[0], resource: parts[1], specific: parts[2] };
}

/** Does `held` satisfy `required`? Honors wildcards. */
export function scopeMatches(held: Scope, required: Scope): boolean {
  if (held === required) return true;
  const h = parseScope(held);
  const r = parseScope(required);
  if (!h || !r) return false;
  if (h.prefix !== r.prefix) return false;
  if (h.resource !== '*' && h.resource !== r.resource) return false;
  if (h.specific !== '*' && h.specific !== r.specific) return false;
  return true;
}

/** Does ANY held scope satisfy the required scope? */
export function anyScopeMatches(held: Scope[], required: Scope): boolean {
  return held.some((s) => scopeMatches(s, required));
}

// ─── Agent Principal (Dimension A: the agent ceiling) ────────────────

/**
 * An AgentPrincipal is the AIPlex-native notion of an agent — a registered
 * client with a scope ceiling. Our @agent chips surface in the UI, but the
 * runtime identity that ACTUALLY calls tools is the AgentPrincipal.
 *
 * Many workspaces will have several principals: a "tutor" agent, a
 * "research" delegate, a "summarizer", etc. They live in the same workspace
 * but each has its own ceiling.
 */
export interface AgentPrincipal {
  /** Stable client_id — used in JWT azp claim. */
  clientId: string;
  /** The @agent chip this principal corresponds to (optional if registered
   *  externally). */
  agentChipId?: string;
  displayName: string;
  description?: string;
  /** OAuth client type. */
  authMethod: 'client_credentials' | 'authorization_code' | 'device_code';
  /** SPIFFE workload identity — used for mTLS between the gateway and backends. */
  spiffeId?: string;
  /**
   * Dimension A ceiling — the maximum scopes this agent can ever request,
   * set by the workspace admin at registration time. This is the policy the
   * rego engine evaluates against.
   */
  allowedScopes: Scope[];
  status: 'active' | 'suspended';
  registeredAt: string;
  registeredBy: string;
  /** Free-form labels — useful for grouping in the UI. */
  labels?: Record<string, string>;
}

// ─── User Binding (Dimension B: the user ceiling) ────────────────────

/**
 * A UserBinding maps a user (or a group) in a workspace to a role, plus
 * optional extra scopes and per-object grants. This is the raw material
 * for computing Dimension B at runtime.
 */
export interface UserBinding {
  id: string;
  /** Email OR "group:<name>" for group bindings. */
  principal: string;
  principalKind: 'user' | 'group';
  /** Workspace-level role. Maps to a bundle of default scopes. */
  role: 'owner' | 'admin' | 'editor' | 'invoker' | 'viewer';
  /** Extra scopes beyond the role default. */
  extraScopes?: Scope[];
  grantedAt: string;
  grantedBy: string;
}

/** Default scope bundles per role — mirrors AIPlex DefaultRoleScopes. */
export const DEFAULT_ROLE_SCOPES: Record<UserBinding['role'], Scope[]> = {
  owner: [
    'mcp:tools:*', 'mcp:connectors:*', 'mcp:guards:*', 'mcp:docs:*',
    'mcp:schemas:*', 'mcp:data:*', 'mcp:triggers:*',
    'a2a:agents:*', 'a2a:skills:*',
    'llm:models:*',
    'workspace:*:admin',
  ],
  admin: [
    'mcp:tools:*', 'mcp:connectors:*', 'mcp:guards:*', 'mcp:docs:*',
    'mcp:schemas:*', 'mcp:data:*', 'mcp:triggers:*',
    'a2a:agents:*', 'a2a:skills:*',
    'llm:models:*',
  ],
  editor: [
    'mcp:tools:*', 'mcp:connectors:*', 'mcp:guards:*', 'mcp:docs:*',
    'mcp:schemas:*', 'mcp:data:*', 'mcp:triggers:*',
    'a2a:agents:*', 'a2a:skills:*',
    'llm:models:gemini-2.5-flash',
  ],
  invoker: [
    // Can call but not edit — good for business users hitting an agent.
    'a2a:agents:*',
  ],
  viewer: [
    // Read-only — no invocation scopes.
  ],
};

// ─── Per-object grant ────────────────────────────────────────────────

/**
 * A ResourceGrant binds a specific chip to specific principals (users OR
 * agents). This is the "per-object access" the user asked for — distinct
 * from workspace-level visibility.
 *
 * Granting @tool(policy-lookup) to alice@acme.com with role=invoker lets
 * Alice call that tool even if she isn't a member of the owning workspace.
 *
 * Granting @tool(policy-lookup) to the "research-agent" principal lets that
 * agent call the tool even if it was registered in a different workspace.
 */
export interface ResourceGrant {
  id: string;
  /** The chip being granted. */
  chipId: string;
  /** Who gets the grant. */
  grantee: {
    kind: 'user' | 'group' | 'agent-principal' | 'workspace';
    /** Email, group name, clientId, or workspaceId depending on kind. */
    id: string;
  };
  /**
   * What they can do. For users this maps to a role-equivalent; for agents
   * it surfaces as additional allowed_scopes on top of the principal's
   * ceiling.
   */
  access: 'viewer' | 'invoker' | 'editor' | 'admin';
  grantedAt: string;
  grantedBy: string;
  expiresAt?: string;
}

// ─── Effective access resolution ─────────────────────────────────────

/**
 * The runtime answer: can this (user, agent) pair call this chip?
 *
 * This is the intersection computation — it mirrors the rego policy's
 * effective-permission check but runs in the UI so we can show the user
 * why something is / isn't callable.
 */
export interface EffectiveAccess {
  /** Is the chip visible in the UI at all? (Dimension B ∪ explicit grants) */
  visible: boolean;
  /** Can the user themselves invoke the chip without an agent? */
  userCanInvoke: boolean;
  /** Can the chosen agent principal invoke the chip on behalf of the user? */
  agentCanInvoke: boolean;
  /** The human-readable reason — shown in tooltips and inspector panels. */
  reason: string;
  /** The specific scope that would be checked by the gateway. */
  requiredScope: Scope;
}
