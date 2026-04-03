/**
 * Parser module — the bridge between playbook prose and compiled graphs.
 *
 * This module implements the core thesis: "The playbook compiles into a graph,
 * but the graph is derived, never authored."
 *
 * Usage:
 *   import { parsePlaybook, compilePlaybookToGraph, graphToMermaid } from './parser';
 *
 *   const parsed = parsePlaybook(playbookContent, registry);
 *   const graph = compilePlaybookToGraph(parsed);
 *   const mermaid = graphToMermaid(graph);
 */

export { parsePlaybook, extractReferences, extractConditionals, resolveReferences, summarizePlaybook } from './playbook-parser';
export { compilePlaybookToGraph, diffGraphs, graphToMermaid } from './graph-compiler';
export type * from './types';
