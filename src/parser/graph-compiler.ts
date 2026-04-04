/**
 * Graph Compiler — transforms a ParsedPlaybook into a CompiledGraph.
 *
 * This is the TypeScript equivalent of adk-fluent's viz.ir_to_mermaid(),
 * but instead of generating Mermaid text, it produces a structured graph
 * that the Flow tab renders as an interactive DAG.
 *
 * The compilation process (mirrors the CLAUDE.md spec):
 *
 * 1. Parse @trigger references → entry nodes (orange, left edge)
 * 2. Parse @doc references → grounding input nodes (teal, top)
 * 3. Parse @tool, @connector, @agent references in process sections → process nodes
 * 4. Parse conditional prose → decision diamonds
 * 5. Parse @guard references → gate nodes with pass/fail branches
 * 6. Parse @skill activations → colored region overlays
 * 7. Parse @schema references → output nodes (slate, right edge)
 *
 * The result is a read-only DAG. The user NEVER edits this directly.
 * Changes flow: Playbook Document → re-parse → re-compile → updated graph.
 */

import type {
  ChipType,
  CompiledGraph,
  CompiledGraphEdge,
  CompiledGraphNode,
  EdgeType,
  GraphNodeType,
  IRNode,
  ParsedPlaybook,
  ParsedReference,
  SkillRegion,
} from './types';

// ─── ID Generation ─────────────────────────────────────────────────────

let _nodeCounter = 0;
let _edgeCounter = 0;

function resetCounters() {
  _nodeCounter = 0;
  _edgeCounter = 0;
}

function nextNodeId(): string {
  return `node_${++_nodeCounter}`;
}

function nextEdgeId(): string {
  return `edge_${++_edgeCounter}`;
}

// ─── Node Builders ─────────────────────────────────────────────────────

function createNode(
  type: GraphNodeType,
  label: string,
  opts: Partial<CompiledGraphNode> = {},
): CompiledGraphNode {
  return {
    id: nextNodeId(),
    type,
    label,
    sourceLines: [],
    ...opts,
  };
}

function createEdge(
  from: string,
  to: string,
  type: EdgeType = 'flow',
  label?: string,
): CompiledGraphEdge {
  return {
    id: nextEdgeId(),
    from,
    to,
    type,
    label,
  };
}

// ─── Chip Type → Node Type Mapping ─────────────────────────────────────

function chipTypeToNodeType(chipType: ChipType): GraphNodeType {
  switch (chipType) {
    case 'trigger':   return 'trigger-entry';
    case 'tool':      return 'tool-call';
    case 'connector': return 'connector-call';
    case 'agent':     return 'agent';
    case 'guard':     return 'gate';
    case 'doc':       return 'grounding';
    case 'schema':    return 'output';
    case 'data':      return 'transform';
    case 'skill':     return 'agent'; // Skills compile to agent subgraphs
    default:          return 'agent';
  }
}

// ─── Deduplication ─────────────────────────────────────────────────────

/** Deduplicate references by type:name, keeping first occurrence */
function deduplicateRefs(refs: ParsedReference[]): ParsedReference[] {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = `${ref.type}:${ref.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Layout Engine ─────────────────────────────────────────────────────

/**
 * Simple left-to-right DAG layout.
 * Assigns x/y positions to nodes based on their role in the graph.
 *
 * Layout columns (left to right):
 *   0: Triggers (entry points)
 *   1: Grounding (docs)
 *   2-N: Process nodes (tools, connectors, agents, decisions, gates)
 *   N+1: Output (schemas)
 */
function layoutGraph(graph: CompiledGraph): void {
  // Match the FlowGraph rendering dimensions
  const NODE_WIDTH = 220;
  const NODE_HEIGHT = 72;
  const HORIZONTAL_GAP = 130;
  const VERTICAL_GAP = 48;
  const MAX_PER_COLUMN = 4; // Split process nodes into multiple columns if > 4

  // Categorize nodes by column
  const columns: Map<number, CompiledGraphNode[]> = new Map();

  function addToColumn(col: number, node: CompiledGraphNode) {
    if (!columns.has(col)) columns.set(col, []);
    columns.get(col)!.push(node);
  }

  // Separate process nodes by type for better distribution
  const toolNodes: CompiledGraphNode[] = [];
  const connectorNodes: CompiledGraphNode[] = [];
  const agentNodes: CompiledGraphNode[] = [];

  for (const node of graph.nodes) {
    switch (node.type) {
      case 'trigger-entry':
        addToColumn(0, node);
        break;
      case 'grounding':
        addToColumn(1, node);
        break;
      case 'output':
        addToColumn(99, node); // Will be renumbered
        break;
      case 'tool-call':
        toolNodes.push(node);
        break;
      case 'connector-call':
        connectorNodes.push(node);
        break;
      case 'agent':
        agentNodes.push(node);
        break;
      case 'decision':
        addToColumn(5, node);
        break;
      case 'gate':
        addToColumn(6, node);
        break;
      default:
        addToColumn(3, node);
        break;
    }
  }

  // Distribute process nodes across columns 2-4 based on type
  // Tools and connectors do lookups (parallel), agents handle escalation
  const lookupNodes = [...toolNodes, ...connectorNodes];
  if (lookupNodes.length > 0) {
    // If many lookup nodes, split into 2 columns
    if (lookupNodes.length > MAX_PER_COLUMN) {
      const half = Math.ceil(lookupNodes.length / 2);
      lookupNodes.slice(0, half).forEach(n => addToColumn(2, n));
      lookupNodes.slice(half).forEach(n => addToColumn(3, n));
    } else {
      lookupNodes.forEach(n => addToColumn(2, n));
    }
  }
  if (agentNodes.length > 0) {
    agentNodes.forEach(n => addToColumn(4, n));
  }

  // Renumber columns to be contiguous
  const sortedCols = [...columns.keys()].sort((a, b) => a - b);
  const colRemap = new Map<number, number>();
  sortedCols.forEach((col, idx) => colRemap.set(col, idx));

  // Assign positions — center each column vertically
  for (const [origCol, nodes] of columns) {
    const col = colRemap.get(origCol) || 0;
    const x = col * (NODE_WIDTH + HORIZONTAL_GAP);
    const totalHeight = nodes.length * (NODE_HEIGHT + VERTICAL_GAP) - VERTICAL_GAP;
    const startY = -totalHeight / 2;

    nodes.forEach((node, row) => {
      node.position = {
        x,
        y: startY + row * (NODE_HEIGHT + VERTICAL_GAP),
      };
    });
  }
}

// ─── Main Compiler ─────────────────────────────────────────────────────

/**
 * Compile a ParsedPlaybook into a CompiledGraph.
 *
 * This implements the "playbook compiles into a graph" principle from
 * the CLAUDE.md conceptual framework (Section 5).
 */
export function compilePlaybookToGraph(parsed: ParsedPlaybook): CompiledGraph {
  resetCounters();

  const nodes: CompiledGraphNode[] = [];
  const edges: CompiledGraphEdge[] = [];
  const skillRegions: SkillRegion[] = [];

  // Track created nodes by chip reference for edge wiring
  const nodesByChipKey = new Map<string, CompiledGraphNode>();

  // ── Step 1: Create trigger entry nodes ──────────────────────────────

  const triggerRefs = deduplicateRefs(parsed.referencesByType.trigger || []);
  const triggerNodes: CompiledGraphNode[] = [];

  for (const ref of triggerRefs) {
    const node = createNode('trigger-entry', ref.name, {
      chipRef: ref.chipId,
      chipType: 'trigger',
      sourceLines: [ref.line],
      metadata: {
        triggerType: inferTriggerType(ref.name),
      },
    });
    nodes.push(node);
    triggerNodes.push(node);
    nodesByChipKey.set(`trigger:${ref.name}`, node);
  }

  // ── Step 2: Create grounding input nodes ────────────────────────────

  const docRefs = deduplicateRefs(parsed.referencesByType.doc || []);
  const groundingNodes: CompiledGraphNode[] = [];

  for (const ref of docRefs) {
    const node = createNode('grounding', ref.name, {
      chipRef: ref.chipId,
      chipType: 'doc',
      sourceLines: [ref.line],
    });
    nodes.push(node);
    groundingNodes.push(node);
    nodesByChipKey.set(`doc:${ref.name}`, node);
  }

  // ── Step 3: Create process nodes (tools, connectors, agents) ────────

  const processTypes: ChipType[] = ['tool', 'connector', 'agent'];
  const processNodes: CompiledGraphNode[] = [];

  for (const chipType of processTypes) {
    const refs = deduplicateRefs(parsed.referencesByType[chipType] || []);
    for (const ref of refs) {
      const nodeType = chipTypeToNodeType(chipType);
      const node = createNode(nodeType, ref.name, {
        chipRef: ref.chipId,
        chipType,
        sourceLines: [ref.line],
        metadata: {
          contextText: ref.contextText,
          sectionPath: ref.sectionPath,
        },
      });
      nodes.push(node);
      processNodes.push(node);
      nodesByChipKey.set(`${chipType}:${ref.name}`, node);
    }
  }

  // ── Step 4: Create decision diamonds from conditionals ──────────────

  const decisionNodes: CompiledGraphNode[] = [];

  for (const conditional of parsed.conditionals) {
    const node = createNode('decision', conditional.condition, {
      sourceLines: [conditional.line],
      metadata: {
        conditionType: conditional.type,
        condition: conditional.condition,
      },
    });
    nodes.push(node);
    decisionNodes.push(node);

    // Wire the "then" reference if present
    if (conditional.thenRef) {
      const targetKey = `${conditional.thenRef.type}:${conditional.thenRef.name}`;
      const targetNode = nodesByChipKey.get(targetKey);
      if (targetNode) {
        edges.push(createEdge(node.id, targetNode.id, 'conditional-true', 'yes'));
      }
    }
  }

  // ── Step 5: Create gate nodes from guards ───────────────────────────

  const guardRefs = deduplicateRefs(parsed.referencesByType.guard || []);
  const gateNodes: CompiledGraphNode[] = [];

  for (const ref of guardRefs) {
    const node = createNode('gate', ref.name, {
      chipRef: ref.chipId,
      chipType: 'guard',
      sourceLines: [ref.line],
      metadata: {
        guardKind: inferGuardKind(ref.name),
      },
    });
    nodes.push(node);
    gateNodes.push(node);
    nodesByChipKey.set(`guard:${ref.name}`, node);
  }

  // ── Step 6: Create skill region overlays ────────────────────────────

  const skillRefs = deduplicateRefs(parsed.referencesByType.skill || []);

  for (const ref of skillRefs) {
    // Skills affect all process nodes — they're context overlays
    const region: SkillRegion = {
      skillChipId: ref.chipId || `skill:${ref.name}`,
      nodeIds: processNodes.map((n) => n.id),
      color: '#7C3AED',
      label: ref.name,
    };
    skillRegions.push(region);
  }

  // ── Step 7: Create output nodes from schemas ────────────────────────

  const schemaRefs = deduplicateRefs(parsed.referencesByType.schema || []);
  const outputNodes: CompiledGraphNode[] = [];

  for (const ref of schemaRefs) {
    const node = createNode('output', ref.name, {
      chipRef: ref.chipId,
      chipType: 'schema',
      sourceLines: [ref.line],
    });
    nodes.push(node);
    outputNodes.push(node);
    nodesByChipKey.set(`schema:${ref.name}`, node);
  }

  // ── Step 8: Wire edges ──────────────────────────────────────────────
  //
  // The wiring strategy:
  // - Triggers → first process nodes (or grounding if exists)
  // - Grounding → first process nodes
  // - Process nodes → sequential within the same section
  // - Decision nodes → targets (already wired above) + fallthrough
  // - Guard nodes → pass edges to next process, block edges to escalation
  // - Last process/guard → output nodes

  // Triggers → grounding or first process
  const firstTargets = groundingNodes.length > 0 ? groundingNodes : processNodes.slice(0, 1);
  for (const trigger of triggerNodes) {
    for (const target of firstTargets) {
      edges.push(createEdge(trigger.id, target.id));
    }
  }

  // Grounding → first process nodes
  if (groundingNodes.length > 0 && processNodes.length > 0) {
    for (const grounding of groundingNodes) {
      edges.push(createEdge(grounding.id, processNodes[0].id, 'data-flow', 'context'));
    }
  }

  // Process nodes → sequential flow (simplified: linear chain)
  // In a real implementation, this would use section structure to determine topology
  for (let i = 0; i < processNodes.length - 1; i++) {
    edges.push(createEdge(processNodes[i].id, processNodes[i + 1].id));
  }

  // Wire decision nodes into the process flow
  for (const decision of decisionNodes) {
    // Find the process node closest to the decision (by line number)
    const decisionLine = decision.sourceLines[0] || 0;
    let closestBefore: CompiledGraphNode | null = null;

    for (const pn of processNodes) {
      const pnLine = pn.sourceLines[0] || 0;
      if (pnLine < decisionLine) {
        closestBefore = pn;
      }
    }

    if (closestBefore) {
      edges.push(createEdge(closestBefore.id, decision.id));
    }
  }

  // Wire guard nodes — guards have pass/block edges
  for (const gate of gateNodes) {
    const gateLine = gate.sourceLines[0] || 0;

    // Find surrounding process nodes
    let before: CompiledGraphNode | null = null;
    let after: CompiledGraphNode | null = null;

    for (const pn of processNodes) {
      const pnLine = pn.sourceLines[0] || 0;
      if (pnLine < gateLine) before = pn;
      if (pnLine > gateLine && !after) after = pn;
    }

    if (before) {
      edges.push(createEdge(before.id, gate.id));
    }
    if (after) {
      edges.push(createEdge(gate.id, after.id, 'guard-pass', '✓ pass'));
    }

    // Block edge — if there's an escalation agent nearby, wire to it
    const escalationAgent = processNodes.find(
      (n) => n.chipType === 'agent' && n.sourceLines[0]! > gateLine,
    );
    if (escalationAgent) {
      edges.push(createEdge(gate.id, escalationAgent.id, 'guard-block', '✗ block'));
    }
  }

  // Last process/gate → output
  const lastProcessNode = processNodes[processNodes.length - 1] || gateNodes[gateNodes.length - 1];
  if (lastProcessNode && outputNodes.length > 0) {
    for (const output of outputNodes) {
      edges.push(createEdge(lastProcessNode.id, output.id));
    }
  }

  // ── Build result ────────────────────────────────────────────────────

  const graph: CompiledGraph = { nodes, edges, skillRegions };

  // ── Step 9: Layout ──────────────────────────────────────────────────

  layoutGraph(graph);

  return graph;
}

// ─── Inference Helpers ─────────────────────────────────────────────────

function inferTriggerType(name: string): string {
  if (name === 'chat') return 'chat';
  if (name.startsWith('inbox:')) return 'inbox';
  if (name.startsWith('schedule:') || name.includes('am') || name.includes('pm')) return 'schedule';
  if (
    name.includes(':') &&
    !name.startsWith('inbox:') &&
    !name.startsWith('schedule:')
  )
    return 'event';
  return 'webhook';
}

function inferGuardKind(name: string): string {
  if (name.includes('pii')) return 'pii';
  if (name.includes('fraud')) return 'toxicity';
  if (name.includes('compliance') || name.includes('rules')) return 'grounded';
  if (name.includes('redact')) return 'pii';
  return 'general';
}

// ─── Graph Diff ────────────────────────────────────────────────────────

/**
 * Compute a diff between two compiled graphs.
 * Used by Screen 10 (Version History) to show what changed.
 */
export function diffGraphs(
  oldGraph: CompiledGraph,
  newGraph: CompiledGraph,
): {
  addedNodes: string[];
  removedNodes: string[];
  modifiedNodes: string[];
  addedEdges: string[];
  removedEdges: string[];
} {
  const oldNodeKeys = new Set(
    oldGraph.nodes.map((n) => `${n.type}:${n.label}`),
  );
  const newNodeKeys = new Set(
    newGraph.nodes.map((n) => `${n.type}:${n.label}`),
  );

  const oldEdgeKeys = new Set(
    oldGraph.edges.map((e) => {
      const from = oldGraph.nodes.find((n) => n.id === e.from);
      const to = oldGraph.nodes.find((n) => n.id === e.to);
      return `${from?.label}→${to?.label}`;
    }),
  );
  const newEdgeKeys = new Set(
    newGraph.edges.map((e) => {
      const from = newGraph.nodes.find((n) => n.id === e.from);
      const to = newGraph.nodes.find((n) => n.id === e.to);
      return `${from?.label}→${to?.label}`;
    }),
  );

  return {
    addedNodes: newGraph.nodes
      .filter((n) => !oldNodeKeys.has(`${n.type}:${n.label}`))
      .map((n) => n.id),
    removedNodes: oldGraph.nodes
      .filter((n) => !newNodeKeys.has(`${n.type}:${n.label}`))
      .map((n) => n.id),
    modifiedNodes: [], // Would need deeper comparison
    addedEdges: newGraph.edges
      .filter((e) => {
        const from = newGraph.nodes.find((n) => n.id === e.from);
        const to = newGraph.nodes.find((n) => n.id === e.to);
        return !oldEdgeKeys.has(`${from?.label}→${to?.label}`);
      })
      .map((e) => e.id),
    removedEdges: oldGraph.edges
      .filter((e) => {
        const from = oldGraph.nodes.find((n) => n.id === e.from);
        const to = oldGraph.nodes.find((n) => n.id === e.to);
        return !newEdgeKeys.has(`${from?.label}→${to?.label}`);
      })
      .map((e) => e.id),
  };
}

// ─── Mermaid Export ────────────────────────────────────────────────────

/**
 * Export a CompiledGraph as Mermaid diagram text.
 * This mirrors adk-fluent's viz.ir_to_mermaid() output format.
 */
export function graphToMermaid(graph: CompiledGraph): string {
  const lines: string[] = ['graph LR'];

  // Node shapes by type (matching adk-fluent's viz.py conventions)
  for (const node of graph.nodes) {
    const label = node.label.replace(/"/g, "'");
    switch (node.type) {
      case 'trigger-entry':
        lines.push(`    ${node.id}(("${label}"))`);
        break;
      case 'grounding':
        lines.push(`    ${node.id}[/"${label}"/]`);
        break;
      case 'tool-call':
        lines.push(`    ${node.id}["${label}"]`);
        break;
      case 'connector-call':
        lines.push(`    ${node.id}["${label}"]`);
        break;
      case 'agent':
        lines.push(`    ${node.id}["${label}"]`);
        break;
      case 'decision':
        lines.push(`    ${node.id}{"${label}"}`);
        break;
      case 'gate':
        lines.push(`    ${node.id}{{"${label}"}}`);
        break;
      case 'output':
        lines.push(`    ${node.id}[["${label}"]]`);
        break;
      case 'transform':
        lines.push(`    ${node.id}>"${label}"]`);
        break;
      default:
        lines.push(`    ${node.id}["${label}"]`);
    }
  }

  // Edges
  for (const edge of graph.edges) {
    const label = edge.label ? `|"${edge.label}"|` : '';
    switch (edge.type) {
      case 'conditional-true':
        lines.push(`    ${edge.from} -->|"✓ ${edge.label || 'yes'}"|${edge.to}`);
        break;
      case 'conditional-false':
        lines.push(`    ${edge.from} -.->|"✗ ${edge.label || 'no'}"|${edge.to}`);
        break;
      case 'guard-pass':
        lines.push(`    ${edge.from} -->|"✓ pass"|${edge.to}`);
        break;
      case 'guard-block':
        lines.push(`    ${edge.from} -.->|"✗ block"|${edge.to}`);
        break;
      case 'data-flow':
        lines.push(`    ${edge.from} -. "${edge.label || 'data'}" .-> ${edge.to}`);
        break;
      default:
        lines.push(`    ${edge.from} -->${label}${edge.to}`);
    }
  }

  // Skill region subgraphs
  for (const region of graph.skillRegions) {
    lines.push(`    subgraph "${region.label} (skill)"`);
    for (const nodeId of region.nodeIds) {
      lines.push(`        ${nodeId}`);
    }
    lines.push('    end');
  }

  return lines.join('\n');
}

// ─── Pattern Detection ────────────────────────────────────────────────

export interface DetectedPattern {
  type: 'sequential' | 'fan-out' | 'fan-in' | 'supervised' | 'review-loop' | 'cascade' | 'gated' | 'map-reduce';
  nodeIds: string[];
  label: string;
  description: string;
  adkFluentCode: string;
  position: { x: number; y: number };
}

/**
 * Detect adk-fluent composition patterns in a compiled graph.
 * Returns pattern annotations that the Flow tab renders as badges.
 */
export function detectPatterns(graph: CompiledGraph): DetectedPattern[] {
  const patterns: DetectedPattern[] = [];

  // Build adjacency maps
  const outEdges = new Map<string, CompiledGraphEdge[]>();
  const inEdges = new Map<string, CompiledGraphEdge[]>();
  for (const e of graph.edges) {
    if (!outEdges.has(e.from)) outEdges.set(e.from, []);
    outEdges.get(e.from)!.push(e);
    if (!inEdges.has(e.to)) inEdges.set(e.to, []);
    inEdges.get(e.to)!.push(e);
  }

  const nodeById = new Map(graph.nodes.map(n => [n.id, n]));

  // Sequential: 3+ nodes in a chain with single in/out flow edges
  const visited = new Set<string>();
  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue;
    const chain: CompiledGraphNode[] = [node];
    visited.add(node.id);
    let current = node;
    while (true) {
      const outs = (outEdges.get(current.id) || []).filter(e => e.type === 'flow');
      if (outs.length !== 1) break;
      const next = nodeById.get(outs[0].to);
      if (!next || visited.has(next.id)) break;
      const ins = (inEdges.get(next.id) || []).filter(e => e.type === 'flow');
      if (ins.length !== 1) break;
      chain.push(next);
      visited.add(next.id);
      current = next;
    }
    if (chain.length >= 3) {
      const names = chain.map(n => n.label).join(' >> ');
      patterns.push({
        type: 'sequential',
        nodeIds: chain.map(n => n.id),
        label: 'Sequential Pipeline',
        description: `${chain.length} steps executed in order`,
        adkFluentCode: names,
        position: centroid(chain),
      });
    }
  }

  // Fan-Out: 1 source → 2+ targets via flow edges
  for (const node of graph.nodes) {
    const outs = (outEdges.get(node.id) || []).filter(e => e.type === 'flow');
    if (outs.length >= 2) {
      const targets = outs.map(e => nodeById.get(e.to)).filter(Boolean) as CompiledGraphNode[];
      const names = targets.map(n => n.label).join(' | ');
      patterns.push({
        type: 'fan-out',
        nodeIds: [node.id, ...targets.map(n => n.id)],
        label: 'Parallel Lookup',
        description: `Fan-out from ${node.label} to ${targets.length} parallel branches`,
        adkFluentCode: `${node.label} >> (${names})`,
        position: centroidOffset([node, ...targets], -30),
      });
    }
  }

  // Fan-In: 2+ sources → 1 target via flow edges
  for (const node of graph.nodes) {
    const ins = (inEdges.get(node.id) || []).filter(e => e.type === 'flow');
    if (ins.length >= 2) {
      const sources = ins.map(e => nodeById.get(e.from)).filter(Boolean) as CompiledGraphNode[];
      patterns.push({
        type: 'fan-in',
        nodeIds: [...sources.map(n => n.id), node.id],
        label: 'Merge Point',
        description: `${sources.length} branches converge to ${node.label}`,
        adkFluentCode: `fan_out_merge(${sources.map(n => n.label).join(', ')}, merge_key="result")`,
        position: centroidOffset([...sources, node], -30),
      });
    }
  }

  // Supervised: decision → agent delegation
  for (const node of graph.nodes) {
    if (node.type !== 'decision') continue;
    const outs = outEdges.get(node.id) || [];
    const agentTargets = outs
      .map(e => nodeById.get(e.to))
      .filter(n => n && n.type === 'agent') as CompiledGraphNode[];
    if (agentTargets.length > 0) {
      patterns.push({
        type: 'supervised',
        nodeIds: [node.id, ...agentTargets.map(n => n.id)],
        label: 'Supervised Escalation',
        description: `Conditional routing to specialist agent(s)`,
        adkFluentCode: `supervised(worker=auto, gate_condition=lambda s: ${node.label})`,
        position: centroidOffset([node, ...agentTargets], -30),
      });
    }
  }

  // Gated: gate node with pass and block edges
  for (const node of graph.nodes) {
    if (node.type !== 'gate') continue;
    const outs = outEdges.get(node.id) || [];
    const hasPass = outs.some(e => e.type === 'guard-pass');
    const hasBlock = outs.some(e => e.type === 'guard-block');
    if (hasPass || hasBlock) {
      patterns.push({
        type: 'gated',
        nodeIds: [node.id],
        label: 'Guard Gate',
        description: `${node.label} — ${hasPass && hasBlock ? 'pass/block' : hasPass ? 'pass-through' : 'blocking'} guard`,
        adkFluentCode: `G.${node.label.replace(/-/g, '_')}()`,
        position: centroidOffset([node], -30),
      });
    }
  }

  // Deduplicate patterns with overlapping node sets
  return deduplicatePatterns(patterns);
}

function centroid(nodes: CompiledGraphNode[]): { x: number; y: number } {
  const x = nodes.reduce((s, n) => s + (n.position?.x ?? 0), 0) / nodes.length + 110;
  const y = nodes.reduce((s, n) => s + (n.position?.y ?? 0), 0) / nodes.length;
  return { x, y };
}

function centroidOffset(nodes: CompiledGraphNode[], yOffset: number): { x: number; y: number } {
  const c = centroid(nodes);
  return { x: c.x, y: c.y + yOffset };
}

function deduplicatePatterns(patterns: DetectedPattern[]): DetectedPattern[] {
  const seen = new Set<string>();
  return patterns.filter(p => {
    const key = `${p.type}-${p.nodeIds.sort().join(',')}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── IR → Topology Expression ──────────────────────────────────────────

/**
 * Convert an IR tree back to a human-readable adk-fluent topology expression.
 * Used for:
 *   - Displaying inferred topology in the Flow tab
 *   - "Pin topology" action (writes expression into playbook)
 *   - Export to Python/YAML
 */
export function irToTopologyExpression(ir: IRNode, depth: number = 0): string {
  switch (ir.kind) {
    case 'sequence': {
      const parts = (ir.children || []).map(c => irToTopologyExpression(c, depth + 1));
      const expr = parts.join(' >> ');
      return depth > 0 && parts.length > 1 ? `(${expr})` : expr;
    }
    case 'parallel': {
      const parts = (ir.children || []).map(c => irToTopologyExpression(c, depth + 1));
      const expr = parts.join(' | ');
      return depth > 0 ? `(${expr})` : expr;
    }
    case 'loop': {
      const child = ir.children?.[0];
      const inner = child ? irToTopologyExpression(child, depth + 1) : ir.name;
      if (ir.untilCondition) return `${inner} * until("${ir.untilCondition}")`;
      if (ir.maxIterations) return `${inner} * ${ir.maxIterations}`;
      return `${inner} * 3`;
    }
    case 'route': {
      const branches = ir.branches || {};
      const parts = Object.entries(branches).map(([key, handler]) =>
        `.eq("${key}", ${irToTopologyExpression(handler, depth + 1)})`
      );
      return `Route("${ir.routeKey || 'key'}")${parts.join('')}`;
    }
    case 'gate': {
      const guardName = ir.guards?.[0] || ir.name;
      return `@guard(${guardName})`;
    }
    case 'fallback': {
      const parts = (ir.children || []).map(c => irToTopologyExpression(c, depth + 1));
      return parts.join(' // ');
    }
    case 'transform': {
      return `S.${ir.name}()`;
    }
    case 'tap': {
      return `tap(${ir.name})`;
    }
    case 'agent': {
      // Use chip refs if available, otherwise construct from name
      if (ir.chipRefs && ir.chipRefs.length > 0) return ir.chipRefs[0];
      if (ir.tools && ir.tools.length > 0) return `@tool(${ir.tools[0]})`;
      return ir.name;
    }
    case 'race': {
      const parts = (ir.children || []).map(c => irToTopologyExpression(c, depth + 1));
      return `race(${parts.join(', ')})`;
    }
    default:
      return ir.name || 'unknown';
  }
}

// ─── Edge Route Computation ───────────────────────────────────────────

export interface EdgeRoute {
  edgeId: string;
  path: string;
  labelPosition: { x: number; y: number };
  isBackEdge: boolean;
}

/**
 * Compute SVG bezier paths for all edges in the graph.
 * Handles forward edges, back-edges (loops), and cross-column edges.
 */
export function computeEdgeRoutes(
  graph: CompiledGraph,
  nodeWidth: number = 220,
  nodeHeight: number = 72,
): EdgeRoute[] {
  return graph.edges.map(edge => {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);
    if (!fromNode?.position || !toNode?.position) {
      return { edgeId: edge.id, path: '', labelPosition: { x: 0, y: 0 }, isBackEdge: false };
    }

    const x1 = fromNode.position.x + nodeWidth;
    const y1 = fromNode.position.y + nodeHeight / 2;
    const x2 = toNode.position.x;
    const y2 = toNode.position.y + nodeHeight / 2;

    const isBackEdge = x2 < x1; // Target is to the left = loop back-edge

    let path: string;
    if (isBackEdge) {
      // Route below all nodes in a smooth arc
      const lowestY = Math.max(y1, y2) + nodeHeight + 60;
      path = `M${x1},${y1} C${x1 + 60},${lowestY} ${x2 - 60},${lowestY} ${x2},${y2}`;
    } else if (Math.abs(fromNode.position.x - toNode.position.x) < nodeWidth * 0.5) {
      // Same column — S-curve
      const midY = (y1 + y2) / 2;
      const offset = 80;
      path = `M${x1},${y1} C${x1 + offset},${y1} ${x2 - offset},${y2} ${x2},${y2}`;
      // If very close vertically, use straight
      if (Math.abs(y1 - y2) < 20) {
        path = `M${x1},${y1} C${x1 + offset},${midY - 30} ${x2 - offset},${midY + 30} ${x2},${y2}`;
      }
    } else {
      // Normal forward edge — cubic bezier
      const dx = x2 - x1;
      const cx1 = x1 + dx * 0.4;
      const cx2 = x2 - dx * 0.4;
      path = `M${x1},${y1} C${cx1},${y1} ${cx2},${y2} ${x2},${y2}`;
    }

    // Label at midpoint
    const labelPosition = {
      x: (x1 + x2) / 2,
      y: isBackEdge ? Math.max(y1, y2) + nodeHeight + 60 : (y1 + y2) / 2 - 8,
    };

    return { edgeId: edge.id, path, labelPosition, isBackEdge };
  });
}
