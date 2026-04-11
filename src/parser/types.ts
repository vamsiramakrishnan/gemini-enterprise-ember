/**
 * Core type system for the Playbook Editor.
 *
 * These types bridge adk-fluent's backend constructs to the UI.
 * Every type here has a 1:1 mapping to an adk-fluent Python class.
 *
 * adk-fluent mapping:
 *   ChipType      → The namespace letter (Agent=A, Tool=T, Guard=G, Skill=S, etc.)
 *   SmartChip     → A resolved reference to a registry entry
 *   CompiledGraph → The IR node tree produced by viz.ir_to_mermaid()
 */

// ─── Chip Types ────────────────────────────────────────────────────────

export type ChipType =
  | 'doc'        // Knowledge grounding — VertexAiSearchTool / DiscoveryEngineSearchTool
  | 'tool'       // Capability — FunctionTool / MCPToolset / OpenAPIToolset
  | 'agent'      // Delegation — Agent / RemoteAgent (A2A)
  | 'guard'      // Policy/safety — G.pii() | G.budget() | G.json() etc.
  | 'data'       // Data binding — S.capture() / S.pick() / S.rename()
  | 'schema'     // Output constraint — agent @ Schema (Pydantic BaseModel)
  | 'connector'  // Enterprise system — ApplicationIntegrationToolset / BigQueryToolset / GoogleApiToolset
  | 'skill'      // Reusable bundle — Skill("SKILL.md") with agents, topology, eval
  | 'trigger';   // Invocation — StreamRunner / PubSub / Eventarc / CloudScheduler

export type ChipStatus = 'resolved' | 'draft' | 'unresolved' | 'deprecated';

export interface SmartChip {
  id: string;
  type: ChipType;
  name: string;
  registryId: string;
  version: string;
  status: ChipStatus;
  owner: string;
  description: string;
  permissions: {
    currentUser: 'viewer' | 'invoker' | 'editor' | 'admin';
  };
  metadata: Record<string, unknown>;
  lastUpdated: string;
  usageCount: number;
  endpoint?: string;
  healthStatus?: 'healthy' | 'degraded' | 'down';
}

// ─── Guard Types (maps to adk-fluent G namespace) ──────────────────────

export type GuardKind =
  | 'json'           // G.json() — validate JSON output
  | 'length'         // G.length(min, max) — output length bounds
  | 'output'         // G.output(Schema) — Pydantic schema validation
  | 'input'          // G.input(Schema) — input validation
  | 'budget'         // G.budget(max_tokens) — token budget
  | 'rate_limit'     // G.rate_limit(rpm) — requests per minute
  | 'max_turns'      // G.max_turns(n) — conversation turn limit
  | 'pii'            // G.pii("redact") — PII detection (regex + Cloud DLP)
  | 'toxicity'       // G.toxicity(threshold) — LLM-based toxicity judge
  | 'topic'          // G.topic(deny=[...]) — topic blocking
  | 'grounded'       // G.grounded("sources") — hallucination check
  | 'hallucination'  // G.hallucination(threshold) — factual accuracy
  | 'regex'          // G.regex(pattern) — regex match/block/redact
  | 'a2ui';          // G.a2ui(max_components) — A2UI output validation

export type GuardPhase = 'pre_agent' | 'pre_model' | 'post_model' | 'context' | 'middleware';

export interface GuardSpec {
  kind: GuardKind;
  phase: GuardPhase;
  config: Record<string, unknown>;
}

// ─── Connector Types (maps to ADK toolsets) ────────────────────────────

export interface ConnectorMetadata {
  provider: 'google' | 'third-party';
  product: string;
  productIcon: string;
  adkToolset: string; // e.g. "BigQueryToolset", "ApplicationIntegrationToolset"
  syncStatus: 'active' | 'syncing' | 'error' | 'paused';
  lastSyncTime: string;
  syncMode: 'federated' | 'ingested';
  entities: Array<{
    name: string;
    enabled: boolean;
    documentCount: number;
  }>;
  actions: Array<{
    name: string;
    enabled: boolean;
    authRequired: boolean;
  }>;
  authMethod: 'oauth' | 'api-token' | 'service-account';
  authUser?: string;
  dataStoreId: string;
  dataStoreRegion: string;
  vpcPerimeter?: string;
  identityProvider: 'google' | 'workforce-identity-federation';
}

// ─── Skill Types (maps to adk-fluent SkillDefinition) ──────────────────

export interface SkillAgentDefinition {
  name: string;
  model: string | null;
  instruct: string;
  tools: string[];
  reads: string[];
  writes: string | null;
  describe: string | null;
}

export interface SkillMetadata {
  scope: 'workspace' | 'user' | 'extension';
  activationMode: 'pinned' | 'on-demand';
  frontmatter: {
    name: string;
    description: string;
  };
  agents: SkillAgentDefinition[];
  topology: string | null; // Expression like "a >> b | c"
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
  evalCases: Array<{ prompt: string; expect_contains?: string; expect?: string }>;
  resources: {
    scripts: string[];
    references: string[];
    assets: string[];
  };
  referencedChips: string[];
  precedenceLevel: number;
  installSource?: string;
}

// ─── Trigger Types (maps to adk-fluent entry points) ───────────────────

export interface TriggerMetadata {
  triggerType: 'chat' | 'inbox' | 'event' | 'schedule' | 'webhook';
  status: 'active' | 'paused';
  // Chat — maps to StreamRunner
  streamingEnabled?: boolean;
  maxTurns?: number;
  // Inbox — maps to PubSubToolset
  queueName?: string;
  priorityRules?: string;
  concurrencyLimit?: number;
  // Event — maps to Eventarc
  sourceConnectorId?: string;
  eventType?: string;
  filterRules?: Record<string, string>;
  // Schedule — maps to Cloud Scheduler
  cronExpression?: string;
  humanReadableSchedule?: string;
  timezone?: string;
  nextRuns?: string[];
  // Webhook
  webhookUrl?: string;
  authMethod?: 'api-key' | 'oauth' | 'none';
  payloadSchema?: Record<string, unknown>;
  // GCP mapping
  gcpService: 'gemini-enterprise' | 'pubsub' | 'eventarc' | 'cloud-scheduler' | 'cloud-functions';
}

// ─── Compiled Graph IR (maps to adk-fluent _ir.py + _ir_generated.py) ──

/**
 * Node types in the compiled graph. Each maps to an adk-fluent IR node:
 *
 *   'trigger-entry'  → Entry point (from TriggerMetadata)
 *   'agent'          → AgentNode (LlmAgent)
 *   'tool-call'      → Tool invocation within an agent's step
 *   'connector-call' → Connector action (ApplicationIntegrationToolset call)
 *   'decision'       → RouteNode — deterministic branching
 *   'gate'           → GateNode — guard check with pass/fail
 *   'grounding'      → Doc reference providing context
 *   'output'         → Schema constraint at terminus
 *   'transform'      → TransformNode — zero-cost state mutation
 *   'sequence'       → SequenceNode — sequential container
 *   'parallel'       → ParallelNode — concurrent container
 *   'loop'           → LoopNode — iteration container
 *   'fallback'       → FallbackNode — try in order
 *   'skill-region'   → Skill overlay (not a node, a grouping)
 */
export type GraphNodeType =
  | 'trigger-entry'
  | 'agent'
  | 'tool-call'
  | 'connector-call'
  | 'decision'
  | 'gate'
  | 'grounding'
  | 'output'
  | 'transform'
  | 'sequence'
  | 'parallel'
  | 'loop'
  | 'fallback';

export interface CompiledGraphNode {
  id: string;
  type: GraphNodeType;
  chipRef?: string;           // ID of the SmartChip this node represents
  chipType?: ChipType;        // For coloring
  label: string;
  sourceLines: number[];      // Line numbers in playbook that generated this
  position?: { x: number; y: number };
  metadata?: Record<string, unknown>;
}

export type EdgeType =
  | 'flow'                    // Normal directed edge
  | 'conditional-true'        // True branch of decision
  | 'conditional-false'       // False branch of decision
  | 'guard-pass'              // Guard check passed
  | 'guard-block'             // Guard check blocked/escalated
  | 'data-flow';              // State key flowing between nodes

export interface CompiledGraphEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  type: EdgeType;
}

export interface SkillRegion {
  skillChipId: string;
  nodeIds: string[];
  color: string;
  label: string;
}

export interface CompiledGraph {
  nodes: CompiledGraphNode[];
  edges: CompiledGraphEdge[];
  skillRegions: SkillRegion[];
}

// ─── adk-fluent IR Node Types ─────────────────────────────────────────
// These mirror the IR dataclasses in adk-fluent's _ir.py
// The graph compiler produces these; backends consume them.

export type IRNodeKind =
  | 'agent'       // AgentNode — LLM agent with instructions
  | 'sequence'    // SequenceNode — a >> b >> c
  | 'parallel'    // ParallelNode — a | b | c
  | 'loop'        // LoopNode — a * 3 or a * until(pred)
  | 'route'       // RouteNode — Route("key").eq("val", handler) or dict shorthand
  | 'gate'        // GateNode — .proceed_if(pred) or gate(pred)
  | 'transform'   // TransformNode — S.pick() / S.rename() / >> fn
  | 'fallback'    // FallbackNode — a // b
  | 'tap'         // TapNode — tap(fn), observe without mutate
  | 'race';       // RaceNode — first to complete wins

export interface IRNode {
  kind: IRNodeKind;
  name: string;
  children?: IRNode[];
  // Agent-specific
  model?: string;
  instructions?: string;
  tools?: string[];
  guards?: string[];       // Guard specs from G namespace
  outputSchema?: string;   // @ operator target
  outputKey?: string;      // .writes() / output_key
  // Loop-specific
  maxIterations?: number;
  untilCondition?: string; // Human-readable predicate description
  // Route-specific
  routeKey?: string;       // State key to route on
  branches?: Record<string, IRNode>; // key → handler mapping
  // Gate-specific
  predicate?: string;      // Human-readable gate condition
  // Metadata
  sourceLines?: number[];
  chipRefs?: string[];     // @type(name) references within this node
}

// ─── Topology Expression Types ────────────────────────────────────────
// These represent the parsed form of adk-fluent's expression language

export type TopologyOperator = '>>' | '|' | '*' | '//' | '@';

export interface TopologyExpression {
  type: 'operator' | 'agent-ref' | 'skill-ref' | 'function-ref' | 'group';
  operator?: TopologyOperator;
  operands?: TopologyExpression[];
  // For agent/skill/function refs
  name?: string;
  // For * operator
  iterations?: number;
  untilCondition?: string;
  // For @ operator
  schema?: string;
  // For group (parenthesized expression)
  inner?: TopologyExpression;
  // Source position
  sourceLine?: number;
}

// ─── Operator Precedence (for reference) ──────────────────────────────
// From adk-fluent docs:
// 1. @ (tightest — type validation)
// 2. * (loop)
// 3. >> (sequence)
// 4. | (parallel)
// 5. // (fallback — loosest)

// ─── adk-fluent Backend Service Interface ─────────────────────────────
// These interfaces define the contract for wiring to a real backend.
// Currently mocked; replace implementations when adk-fluent SDK is available.

export interface AdkFluentService {
  // Compile playbook to IR
  compileToIR(content: string): Promise<IRNode>;
  // Compile IR to native ADK objects (returns opaque handle)
  compileToADK(ir: IRNode, config?: ExecutionConfig): Promise<string>;
  // Execute a test prompt against a compiled agent
  executeTest(agentId: string, prompt: string): Promise<TestExecutionResult>;
  // Stream execution events
  streamExecution(agentId: string, prompt: string): AsyncIterable<AgentEvent>;
  // Validate playbook references against registry
  validateReferences(content: string): Promise<ValidationResult>;
  // Export IR as Mermaid diagram
  toMermaid(ir: IRNode): string;
  // Get IR from topology expression string
  parseTopology(expr: string): IRNode;
}

export interface ExecutionConfig {
  appName: string;
  resumable?: boolean;
  backend?: 'adk' | 'temporal' | 'asyncio';
  middlewares?: string[];
}

// Note: LoopIteration, TestResult, GuardCheck types live in contexts/TestContext.tsx
// (the only consumer). AgentEvent/ValidationResult were unused — removed.

// ─── Parsed Playbook (output of the parser) ────────────────────────────

export interface ParsedReference {
  type: ChipType;
  name: string;
  raw: string;             // The original "@type(name)" string
  line: number;            // Line number in source
  column: number;          // Column offset
  sectionPath: string[];   // e.g. ["Process", "Escalation Rules"]
  contextText: string;     // Surrounding text for the reference
  resolved: boolean;       // Whether it was found in registry
  chipId?: string;         // Resolved chip ID from registry
}

export interface ParsedSection {
  title: string;
  level: number;           // 1 = #, 2 = ##, 3 = ###
  startLine: number;
  endLine: number;
  references: ParsedReference[];
  children: ParsedSection[];
  content: string;
  semanticRole?: 'role' | 'triggers' | 'skills' | 'knowledge' | 'connectors' | 'process' | 'escalation' | 'compliance' | 'output';
  // adk-fluent topology expression within this section
  topologyExpression?: string;
}

export interface ParsedConditional {
  condition: string;       // "claim amount exceeds $50,000"
  thenRef?: ParsedReference;  // @agent(senior-adjuster)
  line: number;
  type: 'threshold' | 'flag' | 'category' | 'general';
}

export interface ParsedPlaybook {
  title: string;
  version?: string;
  sections: ParsedSection[];
  allReferences: ParsedReference[];
  conditionals: ParsedConditional[];
  // Grouped by type for easy access
  referencesByType: Record<ChipType, ParsedReference[]>;
  // Stats
  stats: {
    totalReferences: number;
    resolvedCount: number;
    unresolvedCount: number;
    uniqueTypes: ChipType[];
    sectionCount: number;
  };
  // adk-fluent topology (if declared in playbook)
  topology?: TopologyExpression;
  topologyRaw?: string;  // The raw topology expression string
  // IR tree (compiled from playbook)
  ir?: IRNode;
}

// ─── Version & Diff Types ──────────────────────────────────────────────

export type VersionStatus = 'draft' | 'staging' | 'production' | 'rolled-back' | 'deprecated';
export type SemverBump = 'patch' | 'minor' | 'major';
export type ChipChangeAction = 'added' | 'removed' | 'modified';

export interface ChipChange {
  action: ChipChangeAction;
  chipType: ChipType;
  chipName: string;
  detail?: string;
}

export interface PlaybookVersion {
  version: string;
  status: VersionStatus;
  author: {
    name: string;
    email: string;
    avatarUrl: string;
  };
  timestamp: string;
  changeSummary: string;
  chipChanges: ChipChange[];
  reviewStatus?: 'pending' | 'approved' | 'changes-requested';
  reviewers?: string[];
  content: string;
  compiledGraph: CompiledGraph;
}

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  lineNumber: { old?: number; new?: number };
  content: string;
  chips?: Array<{
    chipId: string;
    changeAction?: ChipChangeAction;
  }>;
}

export interface VersionDiff {
  from: PlaybookVersion;
  to: PlaybookVersion;
  lines: DiffLine[];
  chipChanges: ChipChange[];
  graphDiff: {
    addedNodes: string[];
    removedNodes: string[];
    modifiedNodes: string[];
    addedEdges: string[];
    removedEdges: string[];
  };
  suggestedBump: SemverBump;
  suggestedBumpReason: string;
}

// ─── Chip Color & Icon System ─────────────────────────────────────────
// Single source of truth lives in config/chipConfig.ts.
// Re-exported here for backward compatibility — all existing imports work.

export { CHIP_COLORS, CHIP_ICONS } from '../config/chipConfig';
