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

  /** Deploy a tool to Cloud Run (mock: returns endpoint URL) */
  deployTool(toolName: string): Promise<{ endpoint: string; status: string }>;

  /** Publish an asset to the registry with a version */
  publishToRegistry(type: string, name: string, version: string): Promise<{ registryId: string }>;

  /** Fork a playbook from a specific version */
  forkPlaybook(fromVersion: string): Promise<{ newVersion: string; documentId: string }>;

  /** Test whether a skill would activate for a given prompt */
  activateSkill(skillName: string, prompt: string): Promise<{ activated: boolean; confidence: number; response?: string }>;

  /** Convert raw code into a Tool Definition */
  convertCodeToTool(code: string, language: string): Promise<{ toolName: string; schema: Record<string, unknown> }>;

  /** Convert raw code into a SKILL.md bundle */
  convertCodeToSkill(code: string, language: string): Promise<{ skillName: string; skillMd: string }>;

  /** Run a natural-language query against a connector */
  queryConnector(connectorName: string, query: string): Promise<{ results: Record<string, unknown>[]; timing: number }>;
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

  async deployTool(toolName: string): Promise<{ endpoint: string; status: string }> {
    await delay(800);
    return {
      endpoint: `https://${toolName}-prod-us-central1.run.app`,
      status: 'deployed',
    };
  }

  async publishToRegistry(type: string, name: string, version: string): Promise<{ registryId: string }> {
    await delay(300);
    return {
      registryId: `projects/acme-prod/locations/global/${type}s/${name}@${version}`,
    };
  }

  async forkPlaybook(fromVersion: string): Promise<{ newVersion: string; documentId: string }> {
    await delay(200);
    const parts = fromVersion.split('.');
    const major = parseInt(parts[0] || '1', 10);
    return {
      newVersion: `${major + 1}.0.0-draft`,
      documentId: `fork-${Date.now().toString(36)}`,
    };
  }

  async activateSkill(skillName: string, prompt: string): Promise<{ activated: boolean; confidence: number; response?: string }> {
    await delay(600);
    const confidence = 0.7 + Math.random() * 0.25;
    const activated = confidence > 0.75;
    return {
      activated,
      confidence: Math.round(confidence * 100) / 100,
      response: activated
        ? `Skill "${skillName}" activated for: "${prompt.slice(0, 60)}..." — applied domain expertise.`
        : undefined,
    };
  }

  async convertCodeToTool(code: string, language: string): Promise<{ toolName: string; schema: Record<string, unknown> }> {
    await delay(400);
    const fnMatch = language === 'python'
      ? code.match(/def\s+(\w+)/)
      : code.match(/(?:function|const|export)\s+(\w+)/);
    const name = fnMatch?.[1] || 'new-tool';
    return {
      toolName: name.replace(/_/g, '-'),
      schema: {
        name: name.replace(/_/g, '-'),
        description: `Auto-generated from ${language} code`,
        parameters: { type: 'object', properties: {} },
      },
    };
  }

  async convertCodeToSkill(code: string, language: string): Promise<{ skillName: string; skillMd: string }> {
    await delay(500);
    const fnMatch = language === 'python'
      ? code.match(/def\s+(\w+)/)
      : code.match(/(?:function|const|export)\s+(\w+)/);
    const name = fnMatch?.[1] || 'new-skill';
    const skillName = name.replace(/_/g, '-');
    return {
      skillName,
      skillMd: `---\nname: ${skillName}\ndescription: Auto-generated from ${language} code\nversion: "0.1.0"\n---\n\n# ${skillName}\n\nGenerated skill with bundled script.\n`,
    };
  }

  async queryConnector(connectorName: string, query: string): Promise<{ results: Record<string, unknown>[]; timing: number }> {
    await delay(300 + Math.random() * 500);
    return {
      results: [
        { id: 'REC-001', summary: `Result for "${query}" from ${connectorName}`, status: 'active' },
        { id: 'REC-002', summary: `Related record in ${connectorName}`, status: 'closed' },
      ],
      timing: Math.round(300 + Math.random() * 500),
    };
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
