/**
 * adk-fluent Service Layer
 *
 * Mock implementation of the adk-fluent backend service.
 * Replace with real SDK calls when adk-fluent pip package is available.
 *
 * Architecture:
 *   UI -> AdkFluentService -> [mock] -> parsed IR / compiled graph
 *   UI -> AdkFluentService -> [real] -> adk-fluent Python SDK via API
 *
 * The service interface defines the seam where the real backend will plug in.
 * Currently all methods return realistic mock data with simulated latency.
 */

import { REGISTRY, findChip } from '../data/registry';
import type {
  SmartChip,
  CompiledGraph,
  IRNode,
  IRNodeKind,
} from '../parser/types';

// ─── Service Interface ─────────────────────────────────────────────────

export interface IAdkFluentService {
  /** Compile playbook prose to IR tree and visual graph */
  compilePlaybook(content: string): Promise<CompileResult>;

  /** Run a test prompt against the compiled agent (mock: scripted iterations) */
  runTest(content: string, prompt: string): Promise<TestResult>;

  /** Stream execution events from a test run */
  streamTest(content: string, prompt: string): AsyncGenerator<AgentEvent>;

  /** Validate playbook references against the registry */
  validate(content: string): Promise<ValidationResult>;

  /** Export the compiled graph as Mermaid markdown */
  toMermaid(content: string): Promise<string>;

  /** Generate adk-fluent Python code from playbook prose */
  toPython(content: string): Promise<string>;

  /** Generate SKILL.md format from playbook prose */
  toYAML(content: string): Promise<string>;

  /** Resolve a single @type(name) reference against registry */
  resolveReference(type: string, name: string): Promise<SmartChip | null>;

  /** Search the registry with a free-text query */
  searchRegistry(query: string): Promise<SmartChip[]>;

  /** Generate adk-fluent Python code for a single asset from wizard form data */
  generateAssetCode(asset: AssetCodeRequest): Promise<AssetCodeResult>;
}

// ─── Asset Code Generation Types ──────────────────────────────────────

export interface AssetCodeRequest {
  type: string;
  name: string;
  description: string;
  metadata: Record<string, unknown>;
}

export interface AssetCodeResult {
  /** adk-fluent Python code */
  python: string;
  /** SKILL.md YAML (only for skills) */
  skillMd?: string;
  /** adk-fluent builder expression (one-liner) */
  expression: string;
  /** How to reference this in a playbook */
  playbookRef: string;
  /** pip install requirements */
  dependencies: string[];
}

// ─── Result Types ──────────────────────────────────────────────────────

export interface CompileResult {
  ir: IRNode;
  graph: CompiledGraph;
  topologyExpression: string;
  warnings: string[];
}

export interface TestIteration {
  index: number;
  observe: string;
  reason: { playbookExcerpt: string; confidence: number; skillActivated?: string };
  act: { chipRef: string; parameters: Record<string, unknown>; duration: number };
  result: string;
  guardChecks: Array<{ guard: string; passed: boolean; detail?: string }>;
  decision: 'loop' | 'respond';
  decisionReason?: string;
}

export interface TestResult {
  iterations: TestIteration[];
  totalDuration: number;
  tokenCount: number;
  finalResponse: string;
}

export interface AgentEvent {
  type: 'thought' | 'tool_call' | 'tool_result' | 'guard_check' | 'response' | 'state_delta';
  timestamp: number;
  data: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ line: number; message: string; chipRef?: string }>;
  warnings: Array<{ line: number; message: string }>;
  resolvedChips: number;
  unresolvedChips: number;
}

// ─── Mock Implementation ───────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockAdkFluentService implements IAdkFluentService {
  async compilePlaybook(content: string): Promise<CompileResult> {
    await delay(120);

    // Build a realistic IR tree from the playbook references
    const chipRegex = /@(doc|tool|agent|guard|data|schema|connector|skill|trigger)\(([^)]+)\)/g;
    const refs: Array<{ type: string; name: string }> = [];
    let m: RegExpExecArray | null;
    while ((m = chipRegex.exec(content)) !== null) {
      refs.push({ type: m[1], name: m[2] });
    }

    const guardRefs = refs.filter((r) => r.type === 'guard');
    const toolRefs = refs.filter((r) => r.type === 'tool');
    const connectorRefs = refs.filter((r) => r.type === 'connector');
    const agentRefs = refs.filter((r) => r.type === 'agent');

    // Build IR: guard >> (tool | connector) >> route >> schema
    const ir: IRNode = {
      kind: 'sequence' as IRNodeKind,
      name: 'pipeline',
      children: [
        ...guardRefs.slice(0, 1).map((g) => ({
          kind: 'gate' as IRNodeKind,
          name: g.name,
          predicate: `${g.name} check`,
          guards: [g.name],
        })),
        {
          kind: 'parallel' as IRNodeKind,
          name: 'parallel_lookup',
          children: [
            ...toolRefs.slice(0, 2).map((t) => ({
              kind: 'agent' as IRNodeKind,
              name: t.name,
              tools: [t.name],
            })),
            ...connectorRefs.slice(0, 1).map((c) => ({
              kind: 'agent' as IRNodeKind,
              name: c.name,
              tools: [c.name],
            })),
          ],
        },
        {
          kind: 'route' as IRNodeKind,
          name: 'escalation',
          routeKey: 'risk_level',
          branches: agentRefs.length > 0
            ? { high: { kind: 'agent' as IRNodeKind, name: agentRefs[0].name } }
            : {},
        },
      ],
    };

    // Return a minimal compiled graph (the real parser produces a richer one)
    const graph: CompiledGraph = {
      nodes: [],
      edges: [],
      skillRegions: [],
    };

    return {
      ir,
      graph,
      topologyExpression:
        '@guard(pii-redaction) >> intake >> (@tool(policy-lookup) | @connector(salesforce) | @tool(claims-history)) >> validation >> escalation >> @schema(claims-response-v2)',
      warnings: [],
    };
  }

  async runTest(_content: string, prompt: string): Promise<TestResult> {
    await delay(200);

    const iterations: TestIteration[] = [
      {
        index: 0,
        observe: `User: "${prompt}"`,
        reason: {
          playbookExcerpt: 'Greet the customer and collect their policy number',
          confidence: 0.94,
          skillActivated: 'customer-empathy',
        },
        act: {
          chipRef: '@tool(policy-lookup)',
          parameters: { policy_id: 'POL-SG-001234' },
          duration: 340,
        },
        result: '{ policy_id: "POL-SG-001234", coverage: "comprehensive", status: "active", holder: "Jane Chen" }',
        guardChecks: [
          { guard: 'pii-redaction', passed: true, detail: 'No PII in outbound response' },
        ],
        decision: 'loop',
        decisionReason: 'Need account history from Salesforce',
      },
      {
        index: 1,
        observe: 'Tool result: policy found, coverage=comprehensive',
        reason: {
          playbookExcerpt: 'Search @connector(salesforce) for the customer\'s account history',
          confidence: 0.91,
        },
        act: {
          chipRef: '@connector(salesforce)',
          parameters: { query: 'Account where PolicyId = POL-SG-001234' },
          duration: 820,
        },
        result: '{ account_id: "ACC-8821", history: "3 claims in 24 months", risk_tier: "standard" }',
        guardChecks: [
          { guard: 'pii-redaction', passed: true },
          { guard: 'apac-compliance-rules', passed: true },
        ],
        decision: 'loop',
        decisionReason: 'Need to check claims history',
      },
      {
        index: 2,
        observe: 'Salesforce: account found, risk_tier=standard, 3 prior claims',
        reason: {
          playbookExcerpt: 'Validate the claim against @doc(claims-policy-2024) coverage rules',
          confidence: 0.97,
          skillActivated: 'apac-compliance',
        },
        act: {
          chipRef: '@tool(claims-history)',
          parameters: { policy_id: 'POL-SG-001234', months: 12 },
          duration: 280,
        },
        result: '{ claims: [{ id: "CLM-4401", amount: 2300, status: "settled" }], count: 1 }',
        guardChecks: [
          { guard: 'fraud-detection', passed: true, detail: 'Risk score 0.12 < threshold 0.7' },
          { guard: 'pii-redaction', passed: true },
        ],
        decision: 'respond',
        decisionReason: 'All data collected, claim within standard parameters',
      },
    ];

    return {
      iterations,
      totalDuration: 1840,
      tokenCount: 3247,
      finalResponse:
        'Your claim has been validated against policy POL-SG-001234. Coverage is comprehensive and your claim is eligible for processing. Reference number: CLM-2024-5582. Estimated processing time: 3-5 business days.',
    };
  }

  async *streamTest(_content: string, _prompt: string): AsyncGenerator<AgentEvent> {
    const base = Date.now();
    yield { type: 'thought', timestamp: base, data: { text: 'Analyzing customer request...' } };
    await delay(300);
    yield {
      type: 'tool_call',
      timestamp: base + 300,
      data: { tool: 'policy-lookup', params: { policy_id: 'POL-SG-001234' } },
    };
    await delay(340);
    yield {
      type: 'tool_result',
      timestamp: base + 640,
      data: { tool: 'policy-lookup', result: { status: 'active', coverage: 'comprehensive' } },
    };
    await delay(100);
    yield {
      type: 'guard_check',
      timestamp: base + 740,
      data: { guard: 'pii-redaction', passed: true },
    };
    await delay(200);
    yield {
      type: 'tool_call',
      timestamp: base + 940,
      data: { tool: 'salesforce', params: { query: 'Account lookup' } },
    };
    await delay(820);
    yield {
      type: 'tool_result',
      timestamp: base + 1760,
      data: { tool: 'salesforce', result: { account_id: 'ACC-8821' } },
    };
    await delay(200);
    yield {
      type: 'response',
      timestamp: base + 1960,
      data: { text: 'Your claim has been validated. Reference: CLM-2024-5582.' },
    };
  }

  async validate(content: string): Promise<ValidationResult> {
    await delay(80);

    const chipRegex = /@(doc|tool|agent|guard|data|schema|connector|skill|trigger)\(([^)]+)\)/g;
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];
    let resolved = 0;
    let unresolved = 0;
    let m: RegExpExecArray | null;

    while ((m = chipRegex.exec(content)) !== null) {
      const type = m[1];
      const name = m[2];
      const lineNum = content.substring(0, m.index).split('\n').length;
      const chip = findChip(type as any, name);
      if (chip) {
        resolved++;
        if (chip.status === 'deprecated') {
          warnings.push({
            line: lineNum,
            message: `@${type}(${name}) is deprecated — consider upgrading`,
          });
        }
      } else {
        unresolved++;
        errors.push({
          line: lineNum,
          message: `Unresolved reference: @${type}(${name})`,
          chipRef: `@${type}(${name})`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      resolvedChips: resolved,
      unresolvedChips: unresolved,
    };
  }

  async toMermaid(_content: string): Promise<string> {
    await delay(60);
    return `graph LR
    A["@guard(pii-redaction)"] --> B["intake"]
    B --> C{"parallel_lookup"}
    C --> D["@tool(policy-lookup)"]
    C --> E["@connector(salesforce)"]
    C --> F["@tool(claims-history)"]
    D --> G["validation"]
    E --> G
    F --> G
    G --> H{"Route: risk_level"}
    H -->|high| I["@agent(senior-adjuster)"]
    H -->|flagged| J["@guard(fraud-detection)"]
    J --> I
    H -->|default| K["auto_process"]
    I --> L["@schema(claims-response-v2)"]
    K --> L
`;
  }

  async toPython(_content: string): Promise<string> {
    await delay(100);
    return `"""
Auto-generated adk-fluent code from playbook: Claims Processing Agent
Generated: ${new Date().toISOString()}
"""
from adk_fluent import Agent, G, S, T, Skill, Route
from adk_fluent.tools import FunctionTool
from adk_fluent.connectors import ApplicationIntegrationToolset
from adk_fluent.search import VertexAiSearchTool

# ── Tools ───────────────────────────────────────────────────
policy_lookup = T.search("policy-lookup")
claims_history = T.search("claims-history")

# ── Connectors ──────────────────────────────────────────────
salesforce = ApplicationIntegrationToolset(
    project="acme-prod",
    location="us-central1",
    integration="salesforce-v2",
    triggers=["api_trigger/salesforce_search"],
)

jira = ApplicationIntegrationToolset(
    project="acme-prod",
    location="us-central1",
    integration="jira-cloud",
    triggers=["api_trigger/jira_create_issue", "api_trigger/jira_search"],
)

slack = ApplicationIntegrationToolset(
    project="acme-prod",
    location="us-central1",
    integration="slack-v1",
    triggers=["api_trigger/slack_post_message"],
)

# ── Documents ───────────────────────────────────────────────
claims_policy = VertexAiSearchTool(
    data_store_specs=[{"data_store_id": "claims-policy-2024", "project": "acme-prod"}]
)
apac_matrix = VertexAiSearchTool(
    data_store_specs=[{"data_store_id": "apac-regulatory-matrix", "project": "acme-prod"}]
)

# ── Skills ──────────────────────────────────────────────────
customer_empathy = Skill("skills/customer-empathy/SKILL.md")
apac_compliance = Skill("skills/apac-compliance/SKILL.md")

# ── Guards ──────────────────────────────────────────────────
guards = (
    G.pii("redact", detector=G.dlp("acme-prod"))
    | G.custom("fraud-detection", threshold=0.7)
    | G.topic(deny=["internal-thresholds"])
)

# ── Agents ──────────────────────────────────────────────────
intake = (
    Agent("intake", "gemini-2.5-flash")
    .instruct("Greet the customer and collect their policy number.")
    .build()
)

policy_check = (
    Agent("policy-check", "gemini-2.5-flash")
    .instruct("Retrieve policy details and account history.")
    .tool(policy_lookup, salesforce, claims_history)
    .build()
)

senior_adjuster = (
    Agent("senior-adjuster", "gemini-2.5-pro")
    .instruct("Handle high-value or flagged claims with senior review.")
    .tool(policy_lookup, salesforce, jira, slack)
    .build()
)

# ── Topology ────────────────────────────────────────────────
# Parallel lookups
parallel_lookup = policy_check | salesforce | claims_history

# Escalation routing
escalation = (
    Route("risk_level")
    .eq("high", senior_adjuster)
    .eq("flagged", G.custom("fraud-detection") >> senior_adjuster)
    .default(intake)
)

# Full pipeline
pipeline = (
    guards
    >> intake
    >> parallel_lookup
    >> claims_policy
    >> escalation
    >> ClaimsResponseV2  # @schema
)

# ── Build & Serve ───────────────────────────────────────────
agent = (
    Agent("claims-processing", "gemini-2.5-pro")
    .instruct(open("playbook.md").read())
    .skill(customer_empathy, apac_compliance)
    .guard(guards)
    .tool(policy_lookup, claims_history, salesforce, jira, slack)
    .grounding(claims_policy, apac_matrix)
    .build()
)
`;
  }

  async toYAML(_content: string): Promise<string> {
    await delay(80);
    return `---
name: claims-processing
description: >
  Insurance claims processing agent for ACME Insurance.
  Handles APAC market customers with policy lookup, Salesforce
  integration, and automated escalation routing.
version: "2.1.0"
tags: [claims, insurance, apac, processing]
agents:
  intake:
    model: gemini-2.5-flash
    instruct: "Greet the customer and collect their policy number."
    tools: []
    writes: policy_id
  policy_check:
    model: gemini-2.5-flash
    instruct: "Retrieve policy details and check account history."
    tools: [policy-lookup, salesforce, claims-history]
    reads: [policy_id]
    writes: policy_data
  senior_adjuster:
    model: gemini-2.5-pro
    instruct: "Handle high-value or flagged claims with senior review."
    tools: [policy-lookup, salesforce, jira, slack]
    reads: [policy_data]
    writes: decision
topology: intake >> (policy_check | salesforce_lookup) >> validation >> escalation
input:
  customer_message: string
  policy_id: string
output:
  response: string
  claim_reference: string
  estimated_processing_time: string
eval:
  - prompt: "I need to file a claim for water damage to my home."
    expect_contains: "policy number"
  - prompt: "My policy is POL-SG-001234, I had a car accident."
    expect_contains: "CLM-"
  - prompt: "The repair cost is $75,000."
    expect_contains: "senior"
---

# Claims Processing Agent

## Role
You are an insurance claims processing assistant for ACME Insurance,
serving customers across APAC markets.

## Skills
This agent uses @skill(customer-empathy) for tone and de-escalation
patterns, and @skill(apac-compliance) for regional regulatory awareness.

## Process
When a customer submits a claim:
1. Greet the customer and collect their policy number
2. Use @tool(policy-lookup) to retrieve their policy details
3. Search @connector(salesforce) for the customer's account history
4. Use @tool(claims-history) to check for prior claims
5. Validate the claim against @doc(claims-policy-2024) coverage rules

## Escalation Rules
- If claim amount exceeds $50,000, route to @agent(senior-adjuster)
- If the policy is flagged, apply @guard(fraud-detection) before proceeding

## Compliance
All interactions are subject to @guard(pii-redaction) and
@guard(apac-compliance-rules).
`;
  }

  async resolveReference(type: string, name: string): Promise<SmartChip | null> {
    await delay(20);
    return findChip(type as any, name) || null;
  }

  async searchRegistry(query: string): Promise<SmartChip[]> {
    await delay(50);
    const lower = query.toLowerCase();
    return REGISTRY.filter(
      (chip) =>
        chip.name.toLowerCase().includes(lower) ||
        chip.description.toLowerCase().includes(lower) ||
        chip.type.toLowerCase().includes(lower),
    );
  }

  async generateAssetCode(asset: AssetCodeRequest): Promise<AssetCodeResult> {
    await delay(60);

    const pyName = asset.name.replace(/-/g, '_');
    const meta = asset.metadata;

    switch (asset.type) {
      case 'agent':
        return generateAgentCode(pyName, asset, meta);
      case 'tool':
        return generateToolCode(pyName, asset, meta);
      case 'skill':
        return generateSkillCode(pyName, asset, meta);
      case 'guard':
        return generateGuardCode(pyName, asset, meta);
      case 'trigger':
        return generateTriggerCode(pyName, asset, meta);
      case 'connector':
        return generateConnectorCode(pyName, asset, meta);
      case 'doc':
        return generateDocCode(pyName, asset, meta);
      case 'schema':
        return generateSchemaCode(pyName, asset, meta);
      default:
        return {
          python: `# @${asset.type}(${asset.name})\n# TODO: Implement ${asset.type} "${asset.name}"`,
          expression: `@${asset.type}(${asset.name})`,
          playbookRef: `@${asset.type}(${asset.name})`,
          dependencies: ['adk-fluent'],
        };
    }
  }
}

// ─── Code Generators ──────────────────────────────────────────────────

function generateAgentCode(
  pyName: string,
  asset: AssetCodeRequest,
  meta: Record<string, unknown>,
): AssetCodeResult {
  const model = (meta.model as string) || 'gemini-2.5-pro';
  const systemPrompt = (meta.systemPrompt as string) || asset.description || 'You are a helpful agent.';
  const tools = (meta.tools as string[]) || [];
  const delegatesTo = (meta.delegatesTo as string[]) || [];
  const maxTurns = (meta.maxTurns as number) || 10;

  const toolLines = tools.length > 0
    ? `\n    .tool(${tools.map((t) => t.replace(/-/g, '_')).join(', ')})`
    : '';
  const delegateComment = delegatesTo.length > 0
    ? `\n# Delegates to: ${delegatesTo.map((a) => `@agent(${a})`).join(', ')}`
    : '';

  const python = `"""
${asset.description || `Agent: ${asset.name}`}
"""
from adk_fluent import Agent
${delegateComment}

${pyName} = (
    Agent("${asset.name}", "${model}")
    .instruct("""${systemPrompt}""")${toolLines}
    .build()
)

# Run with:
# result = ${pyName}.ask("your prompt here")
# Max turns: ${maxTurns}
`;

  const expression = `Agent("${asset.name}", "${model}").instruct("...").build()`;

  return {
    python,
    expression,
    playbookRef: `@agent(${asset.name})`,
    dependencies: ['adk-fluent'],
  };
}

function generateToolCode(
  pyName: string,
  asset: AssetCodeRequest,
  meta: Record<string, unknown>,
): AssetCodeResult {
  const toolType = (meta.toolType as string) || 'function';
  const endpoint = (meta.endpoint as string) || '';
  const authMethod = (meta.authMethod as string) || 'none';
  const params = (meta.parameters as Array<{ name: string; type: string; required: boolean; description: string }>) || [];

  let python: string;
  let expression: string;
  const deps = ['adk-fluent'];

  if (toolType === 'mcp') {
    python = `"""
Tool: ${asset.name} (MCP Server)
${asset.description}
"""
from adk_fluent.tools import MCPToolset
from adk_fluent.auth import AuthCredential, APIKey

${pyName} = MCPToolset(
    server_params={
        "url": "${endpoint || 'http://localhost:8080/mcp'}",
    },${authMethod !== 'none' ? `\n    auth=AuthCredential(auth_type="${authMethod}"),` : ''}
)

# Register in tool catalog:
# T.register("${asset.name}", ${pyName})
`;
    expression = `MCPToolset(server_params={"url": "${endpoint}"})`;

  } else if (toolType === 'openapi') {
    python = `"""
Tool: ${asset.name} (OpenAPI)
${asset.description}
"""
from adk_fluent.tools import OpenAPIToolset

${pyName} = OpenAPIToolset(
    spec_url="${endpoint || 'https://api.example.com/openapi.json'}",${authMethod !== 'none' ? `\n    auth_method="${authMethod}",` : ''}
)

# Register in tool catalog:
# T.register("${asset.name}", ${pyName})
`;
    expression = `OpenAPIToolset(spec_url="${endpoint}")`;

  } else {
    // FunctionTool
    const paramSignature = params.length > 0
      ? params.map((p) => `${p.name}: ${pyTypeMap(p.type)}${p.required ? '' : ' = None'}`).join(', ')
      : '';
    const paramDocs = params.length > 0
      ? '\n' + params.map((p) => `    ${p.name}: ${p.description || p.type}`).join('\n')
      : '';

    python = `"""
Tool: ${asset.name} (FunctionTool)
${asset.description}
"""
from adk_fluent.tools import FunctionTool

def ${pyName}(${paramSignature}) -> dict:
    """${asset.description || asset.name}${paramDocs ? `\\n\\n    Args:${paramDocs}` : ''}
    """${endpoint ? `\n    # Endpoint: ${endpoint}` : ''}
    # TODO: Implement tool logic
    return {"status": "ok"}

${pyName}_tool = FunctionTool(${pyName})

# Register in tool catalog:
# T.register("${asset.name}", ${pyName}_tool)
`;
    expression = `FunctionTool(${pyName})`;
  }

  return {
    python,
    expression,
    playbookRef: `@tool(${asset.name})`,
    dependencies: deps,
  };
}

function generateSkillCode(
  pyName: string,
  asset: AssetCodeRequest,
  meta: Record<string, unknown>,
): AssetCodeResult {
  const scope = (meta.scope as string) || 'workspace';
  const activationMode = (meta.activationMode as string) || 'on-demand';
  const frontmatter = (meta.frontmatter as { name: string; description: string }) || {
    name: asset.name,
    description: asset.description,
  };
  const body = (meta.body as string) || '';
  const tags = (meta.tags as string[]) || [];

  const skillMd = `---
name: ${asset.name}
description: >
  ${frontmatter.description || asset.description}
version: "0.1.0"
tags: [${tags.join(', ')}]
scope: ${scope}
activation: ${activationMode}
agents:
  main:
    model: gemini-2.5-pro
    instruct: "${frontmatter.description || 'Process requests using this skill.'}"
    tools: []
    writes: result
topology: main
input:
  query: string
output:
  result: string
eval:
  - prompt: "Test prompt for ${asset.name}"
    expect_contains: "result"
---

${body || `# ${asset.name}\n\n## Instructions\n\nTODO: Add skill instructions here.\n`}`;

  const python = `"""
Skill: ${asset.name}
${asset.description}

Scope: ${scope} | Activation: ${activationMode}
"""
from adk_fluent import Skill

${pyName} = Skill("skills/${asset.name}/SKILL.md")

# Use in an agent:
# agent = Agent("my-agent", "gemini-2.5-pro").skill(${pyName}).build()

# Or compose with operators:
# pipeline = ${pyName} >> other_skill
`;

  return {
    python,
    skillMd,
    expression: `Skill("skills/${asset.name}/SKILL.md")`,
    playbookRef: `@skill(${asset.name})`,
    dependencies: ['adk-fluent'],
  };
}

function generateGuardCode(
  pyName: string,
  asset: AssetCodeRequest,
  meta: Record<string, unknown>,
): AssetCodeResult {
  const guardKind = (meta.guardKind as string) || 'pii';
  const phase = (meta.phase as string) || 'post_model';
  const threshold = (meta.threshold as string) || '';

  let guardExpr: string;
  switch (guardKind) {
    case 'pii':
      guardExpr = 'G.pii("redact", detector=G.dlp("my-project"))';
      break;
    case 'toxicity':
      guardExpr = `G.toxicity(${threshold || '0.8'}, judge=G.llm_judge())`;
      break;
    case 'budget':
      guardExpr = `G.budget(${threshold || '5000'})`;
      break;
    case 'json':
      guardExpr = 'G.json()';
      break;
    case 'length':
      guardExpr = `G.length(max=${threshold || '500'})`;
      break;
    case 'topic':
      guardExpr = 'G.topic(deny=["politics", "religion"])';
      break;
    case 'grounded':
      guardExpr = 'G.grounded("sources")';
      break;
    case 'output':
      guardExpr = 'G.output(ResponseSchema)';
      break;
    default:
      guardExpr = `G.custom("${asset.name}")`;
  }

  const python = `"""
Guard: ${asset.name}
${asset.description}

Kind: G.${guardKind}() | Phase: ${phase}
"""
from adk_fluent import G

${pyName} = ${guardExpr}

# Apply to an agent:
# agent = Agent("my-agent", "gemini-2.5-pro").guard(${pyName}).build()

# Compose guards with | operator:
# guards = ${pyName} | G.budget(5000) | G.json()

# Phase: ${phase === 'pre_model' ? 'before_model_callback' : 'after_model_callback'}
`;

  return {
    python,
    expression: guardExpr,
    playbookRef: `@guard(${asset.name})`,
    dependencies: ['adk-fluent'],
  };
}

function generateTriggerCode(
  pyName: string,
  asset: AssetCodeRequest,
  meta: Record<string, unknown>,
): AssetCodeResult {
  const triggerType = (meta.triggerType as string) || 'chat';
  const cronExpr = (meta.cronExpression as string) || '';
  const queueName = (meta.queueName as string) || '';
  const eventSource = (meta.eventSource as string) || '';
  const eventType = (meta.eventType as string) || '';

  let python: string;
  let expression: string;
  const deps = ['adk-fluent'];

  switch (triggerType) {
    case 'chat':
      python = `"""
Trigger: ${asset.name} (Chat — real-time streaming)
${asset.description}
"""
from adk_fluent import Agent
from adk_fluent.runners import StreamRunner

agent = Agent("my-agent", "gemini-2.5-pro").instruct("...").build()

# Start streaming chat server
runner = StreamRunner(agent)
runner.serve(port=8080)
`;
      expression = 'StreamRunner(agent)';
      break;

    case 'inbox':
      python = `"""
Trigger: ${asset.name} (Inbox — async queue)
Queue: ${queueName || 'my-queue'}
${asset.description}
"""
from adk_fluent import Agent
from adk_fluent.connectors import PubSubToolset

agent = Agent("my-agent", "gemini-2.5-pro").instruct("...").build()

# Subscribe to Pub/Sub queue
inbox = PubSubToolset(
    project="my-project",
    topic="${queueName || 'claims-queue'}",
)

# Process messages from the queue
# Each message starts an Observe->Reason->Act loop
`;
      expression = `PubSubToolset(topic="${queueName}")`;
      deps.push('google-cloud-pubsub');
      break;

    case 'event':
      python = `"""
Trigger: ${asset.name} (Event — from @connector(${eventSource || 'source'}))
Event: ${eventType || 'event-type'}
${asset.description}
"""
from google.cloud import eventarc_v1

# Eventarc trigger from @connector(${eventSource || 'source'})
# Event type: ${eventType || 'event-type'}
# The connector is both the ear (trigger) and the hand (action)

# Configuration in Eventarc:
# gcloud eventarc triggers create ${pyName} \\
#     --location=us-central1 \\
#     --destination-run-service=my-agent-service \\
#     --event-filters="type=${eventType || 'event-type'}"
`;
      expression = `Eventarc("${eventSource}:${eventType}")`;
      deps.push('google-cloud-eventarc');
      break;

    case 'schedule':
      python = `"""
Trigger: ${asset.name} (Schedule — cron)
Cron: ${cronExpr || '0 9 * * 1-5'}
${asset.description}
"""
# Cloud Scheduler trigger
# Cron: ${cronExpr || '0 9 * * 1-5'}

# Configuration in Cloud Scheduler:
# gcloud scheduler jobs create http ${pyName} \\
#     --schedule="${cronExpr || '0 9 * * 1-5'}" \\
#     --uri="https://my-agent-service.run.app/trigger" \\
#     --time-zone="Asia/Singapore" \\
#     --http-method=POST
`;
      expression = `CloudScheduler("${cronExpr || '0 9 * * 1-5'}")`;
      deps.push('google-cloud-scheduler');
      break;

    default:
      python = `"""
Trigger: ${asset.name} (Webhook)
${asset.description}
"""
# Custom webhook trigger
# Endpoint: https://my-agent-service.run.app/webhook/${asset.name}
`;
      expression = `Webhook("${asset.name}")`;
      break;
  }

  return {
    python,
    expression,
    playbookRef: `@trigger(${asset.name})`,
    dependencies: deps,
  };
}

function generateConnectorCode(
  pyName: string,
  asset: AssetCodeRequest,
  _meta: Record<string, unknown>,
): AssetCodeResult {
  const python = `"""
Connector: ${asset.name}
${asset.description}
"""
from adk_fluent.connectors import ApplicationIntegrationToolset

${pyName} = ApplicationIntegrationToolset(
    project="my-project",
    location="us-central1",
    integration="${asset.name}-v1",
    triggers=["api_trigger/${asset.name}_search", "api_trigger/${asset.name}_create"],
)

# Use in an agent:
# agent = Agent("my-agent", "gemini-2.5-pro").tool(${pyName}).build()
`;

  return {
    python,
    expression: `ApplicationIntegrationToolset(integration="${asset.name}-v1")`,
    playbookRef: `@connector(${asset.name})`,
    dependencies: ['adk-fluent'],
  };
}

function generateDocCode(
  pyName: string,
  asset: AssetCodeRequest,
  _meta: Record<string, unknown>,
): AssetCodeResult {
  const python = `"""
Document: ${asset.name}
${asset.description}
"""
from adk_fluent.search import VertexAiSearchTool

${pyName} = VertexAiSearchTool(
    data_store_specs=[{
        "data_store_id": "${asset.name}",
        "project": "my-project",
    }]
)

# Use as grounding source:
# agent = Agent("my-agent", "gemini-2.5-pro").grounding(${pyName}).build()
`;

  return {
    python,
    expression: `VertexAiSearchTool(data_store_id="${asset.name}")`,
    playbookRef: `@doc(${asset.name})`,
    dependencies: ['adk-fluent'],
  };
}

function generateSchemaCode(
  _pyName: string,
  asset: AssetCodeRequest,
  _meta: Record<string, unknown>,
): AssetCodeResult {
  const className = asset.name
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');

  const python = `"""
Schema: ${asset.name}
${asset.description}
"""
from pydantic import BaseModel, Field

class ${className}(BaseModel):
    """${asset.description || `Output schema for ${asset.name}`}"""
    status: str = Field(description="Response status")
    message: str = Field(description="Response message")
    # TODO: Add fields

# Constrain agent output with @ operator:
# pipeline = agent @ ${className}
`;

  return {
    python,
    expression: `agent @ ${className}`,
    playbookRef: `@schema(${asset.name})`,
    dependencies: ['adk-fluent', 'pydantic'],
  };
}

function pyTypeMap(tsType: string): string {
  switch (tsType) {
    case 'string': return 'str';
    case 'number': return 'float';
    case 'boolean': return 'bool';
    case 'object': return 'dict';
    case 'array': return 'list';
    default: return 'str';
  }
}

// ─── Factory ───────────────────────────────────────────────────────────

let _instance: IAdkFluentService | null = null;

export function createAdkFluentService(
  _mode: 'mock' | 'live' = 'mock',
): IAdkFluentService {
  if (!_instance) {
    // When mode === 'live', this is where the real adk-fluent SDK
    // client would be instantiated. For now, always mock.
    _instance = new MockAdkFluentService();
  }
  return _instance;
}

export function getAdkFluentService(): IAdkFluentService {
  return createAdkFluentService();
}
