/**
 * Playbook Parser — extracts @references from playbook markdown and builds
 * a structured representation.
 *
 * This mirrors adk-fluent's _skill_parser.py but operates on the richer
 * playbook format (prose + smart chips). The parser:
 *
 * 1. Tokenizes the markdown into sections (heading hierarchy)
 * 2. Extracts every @type(name) reference with position info
 * 3. Identifies conditional logic ("if X, then @agent(Y)")
 * 4. Classifies sections by semantic role (triggers, process, escalation, etc.)
 * 5. Resolves references against the registry
 *
 * The output (ParsedPlaybook) feeds into the graph compiler to produce
 * the CompiledGraph for the Flow tab.
 */

import type {
  ChipType,
  IRNode,
  IRNodeKind,
  ParsedConditional,
  ParsedPlaybook,
  ParsedReference,
  ParsedSection,
  SmartChip,
  TopologyExpression,
  TopologyOperator,
} from './types';

// ─── Reference Regex ───────────────────────────────────────────────────
//
// Matches: @type(name)  @type(name:qualifier)  @type(name-with-dashes)
// Groups:  [1] = type   [2] = name (including qualifier)
//
// adk-fluent equivalent: the YAML key parsing in _skill_parser._parse_agent_def

const REFERENCE_REGEX = /@(doc|tool|agent|guard|data|schema|connector|skill|trigger)\(([^)]+)\)/g;

// ─── Conditional Patterns ──────────────────────────────────────────────
//
// These detect prose conditionals that compile to RouteNode / GateNode in the IR.
// "If claim amount exceeds $50,000" → RouteNode with threshold predicate
// "If the policy is flagged" → GateNode with flag check

const CONDITIONAL_PATTERNS = [
  {
    // "If X exceeds/over/above $Y" → threshold conditional
    regex: /[Ii]f\s+(?:the\s+)?(.+?)\s+(?:exceeds?|is\s+(?:over|above|greater\s+than|more\s+than))\s+\$?([\d,]+)/,
    type: 'threshold' as const,
  },
  {
    // "If X is flagged/marked/tagged" → flag conditional
    regex: /[Ii]f\s+(?:the\s+)?(.+?)\s+is\s+(?:flagged|marked|tagged|classified\s+as)/,
    type: 'flag' as const,
  },
  {
    // "For X involving/containing Y" → category conditional
    regex: /[Ff]or\s+(?:claims?|requests?|cases?)\s+(?:involving|containing|with|in)\s+(.+)/,
    type: 'category' as const,
  },
  {
    // General "If/When X, Y" with a @reference on the same line
    regex: /(?:[Ii]f|[Ww]hen)\s+(.+?)(?:,\s*|\s*→\s*|\s*then\s*)/,
    type: 'general' as const,
  },
];

// ─── Section Semantic Classification ────────────────────────────────────
//
// Maps section titles to semantic roles. This drives how the graph compiler
// interprets each section.

const SECTION_ROLE_PATTERNS: Array<{ pattern: RegExp; role: ParsedSection['semanticRole'] }> = [
  { pattern: /^role$/i, role: 'role' },
  { pattern: /trigger/i, role: 'triggers' },
  { pattern: /skill/i, role: 'skills' },
  { pattern: /knowledge|source|document/i, role: 'knowledge' },
  { pattern: /connect|system|integration/i, role: 'connectors' },
  { pattern: /process|workflow|steps?|procedure/i, role: 'process' },
  { pattern: /escalat|exception|routing|handoff/i, role: 'escalation' },
  { pattern: /complian|policy|governance|audit/i, role: 'compliance' },
  { pattern: /response|output|format|schema/i, role: 'output' },
];

function classifySection(title: string): ParsedSection['semanticRole'] | undefined {
  for (const { pattern, role } of SECTION_ROLE_PATTERNS) {
    if (pattern.test(title)) return role;
  }
  return undefined;
}

// ─── Parser Functions ──────────────────────────────────────────────────

/**
 * Extract all @type(name) references from a text block.
 */
export function extractReferences(
  text: string,
  lineOffset: number = 0,
  sectionPath: string[] = [],
): ParsedReference[] {
  const references: ParsedReference[] = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let match: RegExpExecArray | null;
    const regex = new RegExp(REFERENCE_REGEX.source, 'g');

    while ((match = regex.exec(line)) !== null) {
      references.push({
        type: match[1] as ChipType,
        name: match[2],
        raw: match[0],
        line: lineOffset + i + 1,
        column: match.index,
        sectionPath: [...sectionPath],
        contextText: line.trim(),
        resolved: false, // Will be resolved in a second pass
      });
    }
  }

  return references;
}

/**
 * Extract conditional logic from text.
 * These become decision diamonds and gate nodes in the compiled graph.
 */
export function extractConditionals(
  text: string,
  lineOffset: number = 0,
): ParsedConditional[] {
  const conditionals: ParsedConditional[] = [];
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    for (const { regex, type } of CONDITIONAL_PATTERNS) {
      const match = regex.exec(line);
      if (!match) continue;

      // Find any @reference on the same line (the "then" action)
      const refRegex = new RegExp(REFERENCE_REGEX.source, 'g');
      const refMatch = refRegex.exec(line);

      const conditional: ParsedConditional = {
        condition: match[1]?.trim() || match[0],
        line: lineOffset + i + 1,
        type,
      };

      if (refMatch) {
        conditional.thenRef = {
          type: refMatch[1] as ChipType,
          name: refMatch[2],
          raw: refMatch[0],
          line: lineOffset + i + 1,
          column: refMatch.index,
          sectionPath: [],
          contextText: line.trim(),
          resolved: false,
        };
      }

      conditionals.push(conditional);
      break; // Only match one pattern per line
    }
  }

  return conditionals;
}

/**
 * Parse markdown into a section hierarchy.
 * Each section contains its title, level, content, references, and children.
 */
export function parseSections(text: string): ParsedSection[] {
  const lines = text.split('\n');
  const rootSections: ParsedSection[] = [];
  const stack: ParsedSection[] = [];

  let currentContent: string[] = [];
  let contentStartLine = 1;

  function flushContent(endLine: number) {
    if (stack.length > 0 && currentContent.length > 0) {
      const section = stack[stack.length - 1];
      const contentText = currentContent.join('\n');
      section.content += (section.content ? '\n' : '') + contentText;
      section.endLine = endLine;

      // Extract references from this content
      const sectionPath = stack.map((s) => s.title);
      const refs = extractReferences(contentText, contentStartLine - 1, sectionPath);
      section.references.push(...refs);
    }
    currentContent = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);

    if (headingMatch) {
      flushContent(i);

      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();

      const section: ParsedSection = {
        title,
        level,
        startLine: i + 1,
        endLine: i + 1,
        references: [],
        children: [],
        content: '',
        semanticRole: classifySection(title),
      };

      // Pop stack until we find a parent with lower level
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      if (stack.length > 0) {
        stack[stack.length - 1].children.push(section);
      } else {
        rootSections.push(section);
      }

      stack.push(section);
      contentStartLine = i + 2; // Next line after heading
    } else {
      currentContent.push(line);
    }
  }

  // Flush remaining content
  flushContent(lines.length);

  return rootSections;
}

/**
 * Collect all references from a section tree (depth-first).
 */
function collectAllReferences(sections: ParsedSection[]): ParsedReference[] {
  const refs: ParsedReference[] = [];
  for (const section of sections) {
    refs.push(...section.references);
    refs.push(...collectAllReferences(section.children));
  }
  return refs;
}

/**
 * Group references by their ChipType.
 */
function groupByType(refs: ParsedReference[]): Record<ChipType, ParsedReference[]> {
  const groups: Record<string, ParsedReference[]> = {};
  const allTypes: ChipType[] = ['doc', 'tool', 'agent', 'guard', 'data', 'schema', 'connector', 'skill', 'trigger'];

  for (const type of allTypes) {
    groups[type] = [];
  }

  for (const ref of refs) {
    if (!groups[ref.type]) groups[ref.type] = [];
    groups[ref.type].push(ref);
  }

  return groups as Record<ChipType, ParsedReference[]>;
}

/**
 * Resolve references against a registry of SmartChips.
 * Mutates the references in place, setting `resolved` and `chipId`.
 */
export function resolveReferences(
  refs: ParsedReference[],
  registry: SmartChip[],
): { resolved: number; unresolved: number } {
  const registryMap = new Map<string, SmartChip>();

  for (const chip of registry) {
    // Index by type:name for exact matching
    registryMap.set(`${chip.type}:${chip.name}`, chip);
    // Also index by just name for fuzzy matching
    registryMap.set(chip.name, chip);
  }

  let resolved = 0;
  let unresolved = 0;

  for (const ref of refs) {
    const exactKey = `${ref.type}:${ref.name}`;
    const chip = registryMap.get(exactKey) || registryMap.get(ref.name);

    if (chip) {
      ref.resolved = true;
      ref.chipId = chip.id;
      resolved++;
    } else {
      ref.resolved = false;
      unresolved++;
    }
  }

  return { resolved, unresolved };
}

// ─── Topology Expression Extraction ───────────────────────────────────
//
// Finds explicit topology expressions in the playbook. These use
// adk-fluent's operator syntax: >>, |, *, //, @
//
// Recognized patterns:
//   - YAML-style: "topology: agent_a >> agent_b | agent_c"
//   - Section-based: ## Topology followed by expression on next line(s)
//   - Inline: lines starting with "flow:" or "pipeline:"

const TOPOLOGY_LINE_PATTERNS = [
  /^\s*topology\s*:\s*(.+)$/im,
  /^\s*flow\s*:\s*(.+)$/im,
  /^\s*pipeline\s*:\s*(.+)$/im,
];

const TOPOLOGY_SECTION_PATTERN = /^#{1,6}\s+topology\s*$/im;

/**
 * Extract a topology expression string from playbook content.
 * Returns the raw expression or undefined if none found.
 */
export function extractTopologyExpression(content: string): string | undefined {
  // Try YAML-style / inline patterns first
  for (const pattern of TOPOLOGY_LINE_PATTERNS) {
    const match = pattern.exec(content);
    if (match) {
      return match[1].trim();
    }
  }

  // Try section-based: look for a ## Topology heading and grab the next non-empty line(s)
  const sectionMatch = TOPOLOGY_SECTION_PATTERN.exec(content);
  if (sectionMatch) {
    const afterHeading = content.slice(sectionMatch.index + sectionMatch[0].length);
    const lines = afterHeading.split('\n');
    const exprLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      // Stop at next heading or empty line after we've started collecting
      if (trimmed.startsWith('#')) break;
      if (trimmed === '' && exprLines.length > 0) break;
      if (trimmed === '') continue;
      // Skip markdown prose — topology expressions contain operators
      if (/[>>|*//@]/.test(trimmed) || /^[\w_()-]+/.test(trimmed)) {
        exprLines.push(trimmed);
      }
    }

    if (exprLines.length > 0) {
      return exprLines.join(' ').trim();
    }
  }

  return undefined;
}

// ─── Topology Expression Parser ───────────────────────────────────────
//
// Recursive descent parser for adk-fluent's operator expression language.
//
// Operator precedence (loosest to tightest):
//   5. // (fallback)
//   4. |  (parallel)
//   3. >> (sequence)
//   2. *  (loop)
//   1. @  (typed output)
//
// Grammar (informal):
//   expr       := fallback
//   fallback   := parallel ("//" parallel)*
//   parallel   := sequence ("|" sequence)*
//   sequence   := loop (">>" loop)*
//   loop       := output ("*" (NUMBER | "until(" STRING ")"))?
//   output     := primary ("@" IDENTIFIER)?
//   primary    := "(" expr ")" | "Route(" STRING ")" | "gate(" STRING ")" | "tap(" IDENTIFIER ")" | IDENTIFIER

/**
 * Tokenizer for topology expressions.
 * Produces tokens: IDENT, NUMBER, STRING, OP(>>, |, *, //, @), LPAREN, RPAREN, COMMA, EOF
 */
interface Token {
  type: 'IDENT' | 'NUMBER' | 'STRING' | 'OP' | 'LPAREN' | 'RPAREN' | 'COMMA' | 'EOF';
  value: string;
  pos: number;
}

function tokenizeTopology(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    // Skip whitespace
    if (/\s/.test(expr[i])) { i++; continue; }

    // Two-character operators: >>, //
    if (i + 1 < expr.length) {
      const two = expr[i] + expr[i + 1];
      if (two === '>>' || two === '//') {
        tokens.push({ type: 'OP', value: two, pos: i });
        i += 2;
        continue;
      }
    }

    // Single-character operators: |, *, @
    if ('|*@'.includes(expr[i])) {
      tokens.push({ type: 'OP', value: expr[i], pos: i });
      i++;
      continue;
    }

    // Parentheses and comma
    if (expr[i] === '(') { tokens.push({ type: 'LPAREN', value: '(', pos: i }); i++; continue; }
    if (expr[i] === ')') { tokens.push({ type: 'RPAREN', value: ')', pos: i }); i++; continue; }
    if (expr[i] === ',') { tokens.push({ type: 'COMMA', value: ',', pos: i }); i++; continue; }

    // Quoted string
    if (expr[i] === '"' || expr[i] === "'") {
      const quote = expr[i];
      const start = i;
      i++; // skip opening quote
      let str = '';
      while (i < expr.length && expr[i] !== quote) {
        if (expr[i] === '\\' && i + 1 < expr.length) { str += expr[i + 1]; i += 2; }
        else { str += expr[i]; i++; }
      }
      i++; // skip closing quote
      tokens.push({ type: 'STRING', value: str, pos: start });
      continue;
    }

    // Number
    if (/\d/.test(expr[i])) {
      const start = i;
      while (i < expr.length && /\d/.test(expr[i])) i++;
      tokens.push({ type: 'NUMBER', value: expr.slice(start, i), pos: start });
      continue;
    }

    // Identifier: letters, digits, underscores, hyphens, dots, colons
    if (/[a-zA-Z_]/.test(expr[i])) {
      const start = i;
      while (i < expr.length && /[a-zA-Z0-9_\-.:!]/.test(expr[i])) i++;
      tokens.push({ type: 'IDENT', value: expr.slice(start, i), pos: start });
      continue;
    }

    // Unknown character — skip
    i++;
  }

  tokens.push({ type: 'EOF', value: '', pos: expr.length });
  return tokens;
}

/**
 * Parse a topology expression string into a TopologyExpression tree.
 *
 * Handles operator precedence and special forms like Route(), gate(), tap().
 */
export function parseTopologyExpression(expr: string): TopologyExpression {
  const tokens = tokenizeTopology(expr);
  let pos = 0;

  function peek(): Token {
    return tokens[pos] || { type: 'EOF', value: '', pos: expr.length };
  }

  function advance(): Token {
    const tok = tokens[pos];
    pos++;
    return tok;
  }

  function expect(type: Token['type'], value?: string): Token {
    const tok = advance();
    if (tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new Error(
        `Topology parse error at pos ${tok.pos}: expected ${type}${value ? `(${value})` : ''}, got ${tok.type}(${tok.value})`
      );
    }
    return tok;
  }

  // ── Precedence levels (loosest to tightest) ──

  function parseFallback(): TopologyExpression {
    let left = parseParallel();
    while (peek().type === 'OP' && peek().value === '//') {
      advance(); // consume //
      const right = parseParallel();
      left = {
        type: 'operator',
        operator: '//' as TopologyOperator,
        operands: left.type === 'operator' && left.operator === '//'
          ? [...(left.operands || []), right]
          : [left, right],
      };
    }
    return left;
  }

  function parseParallel(): TopologyExpression {
    let left = parseSequence();
    while (peek().type === 'OP' && peek().value === '|') {
      advance(); // consume |
      const right = parseSequence();
      left = {
        type: 'operator',
        operator: '|' as TopologyOperator,
        operands: left.type === 'operator' && left.operator === '|'
          ? [...(left.operands || []), right]
          : [left, right],
      };
    }
    return left;
  }

  function parseSequence(): TopologyExpression {
    let left = parseLoop();
    while (peek().type === 'OP' && peek().value === '>>') {
      advance(); // consume >>
      const right = parseLoop();
      left = {
        type: 'operator',
        operator: '>>' as TopologyOperator,
        operands: left.type === 'operator' && left.operator === '>>'
          ? [...(left.operands || []), right]
          : [left, right],
      };
    }
    return left;
  }

  function parseLoop(): TopologyExpression {
    const operand = parseOutput();
    if (peek().type === 'OP' && peek().value === '*') {
      advance(); // consume *
      const next = peek();
      if (next.type === 'NUMBER') {
        const count = advance();
        return {
          type: 'operator',
          operator: '*' as TopologyOperator,
          operands: [operand],
          iterations: parseInt(count.value, 10),
        };
      }
      if (next.type === 'IDENT' && next.value === 'until') {
        advance(); // consume 'until'
        expect('LPAREN');
        const condTok = advance(); // STRING or IDENT
        const condition = condTok.value;
        expect('RPAREN');
        return {
          type: 'operator',
          operator: '*' as TopologyOperator,
          operands: [operand],
          untilCondition: condition,
        };
      }
      // Bare * with no argument — treat as loop(1)
      return {
        type: 'operator',
        operator: '*' as TopologyOperator,
        operands: [operand],
        iterations: 1,
      };
    }
    return operand;
  }

  function parseOutput(): TopologyExpression {
    const operand = parsePrimary();
    if (peek().type === 'OP' && peek().value === '@') {
      advance(); // consume @
      const schemaTok = advance(); // IDENT — the schema name
      return {
        type: 'operator',
        operator: '@' as TopologyOperator,
        operands: [operand],
        schema: schemaTok.value,
      };
    }
    return operand;
  }

  function parsePrimary(): TopologyExpression {
    const tok = peek();

    // Parenthesized group
    if (tok.type === 'LPAREN') {
      advance(); // consume (
      const inner = parseFallback();
      expect('RPAREN');
      return { type: 'group', inner };
    }

    // Special forms: Route("key"), gate("condition"), tap(fn)
    if (tok.type === 'IDENT') {
      const name = tok.value;

      if (name === 'Route' && tokens[pos + 1]?.type === 'LPAREN') {
        advance(); // consume 'Route'
        advance(); // consume (
        const keyTok = advance(); // STRING or IDENT
        expect('RPAREN');
        return { type: 'function-ref', name: 'Route', schema: keyTok.value };
      }

      if (name === 'gate' && tokens[pos + 1]?.type === 'LPAREN') {
        advance(); // consume 'gate'
        advance(); // consume (
        const condTok = advance(); // STRING or IDENT
        expect('RPAREN');
        return { type: 'function-ref', name: 'gate', schema: condTok.value };
      }

      if (name === 'tap' && tokens[pos + 1]?.type === 'LPAREN') {
        advance(); // consume 'tap'
        advance(); // consume (
        const fnTok = advance(); // IDENT
        expect('RPAREN');
        return { type: 'function-ref', name: 'tap', schema: fnTok.value };
      }

      // Plain identifier — agent or skill reference
      advance();
      // Determine if it's a skill ref (has 'skill' in name or matches common patterns)
      const exprType = name.includes('skill') ? 'skill-ref' : 'agent-ref';
      return { type: exprType, name };
    }

    // Fallback: advance and return an empty agent-ref to avoid infinite loops
    advance();
    return { type: 'agent-ref', name: tok.value || '_unknown' };
  }

  const result = parseFallback();

  // Sanity: we should have consumed all tokens (except EOF)
  if (peek().type !== 'EOF') {
    // There's leftover — wrap what we parsed, don't error for mockup robustness
  }

  return result;
}

// ─── Topology Inference from Section Structure ────────────────────────
//
// When no explicit topology expression exists, we infer topology from
// the playbook's section structure and prose patterns.

/**
 * Infer sequential steps from numbered list items within a section.
 * Returns @references in order of appearance.
 */
function inferSequentialRefs(section: ParsedSection): ParsedReference[] {
  const lines = section.content.split('\n');
  const orderedRefs: ParsedReference[] = [];
  const numberedLinePattern = /^\s*\d+\.\s+/;

  for (const line of lines) {
    if (numberedLinePattern.test(line)) {
      // Find @references on this line
      const regex = new RegExp(REFERENCE_REGEX.source, 'g');
      let match: RegExpExecArray | null;
      while ((match = regex.exec(line)) !== null) {
        const existing = section.references.find(
          (r) => r.type === match![1] && r.name === match![2]
        );
        if (existing) {
          orderedRefs.push(existing);
        }
      }
    }
  }

  return orderedRefs;
}

/**
 * Detect conditional branches in a section (e.g., escalation rules).
 * Returns { condition, refs } pairs for route node construction.
 */
function inferConditionalBranches(
  section: ParsedSection,
  conditionals: ParsedConditional[],
): Array<{ condition: string; type: string; ref?: ParsedReference }> {
  const branches: Array<{ condition: string; type: string; ref?: ParsedReference }> = [];
  const sectionConditionals = conditionals.filter(
    (c) => c.line >= section.startLine && c.line <= section.endLine
  );

  for (const cond of sectionConditionals) {
    branches.push({
      condition: cond.condition,
      type: cond.type,
      ref: cond.thenRef || undefined,
    });
  }

  return branches;
}

// ─── IR Builder ───────────────────────────────────────────────────────
//
// Builds an adk-fluent IR tree from a ParsedPlaybook.
// If an explicit topology expression was parsed, it's converted to IR.
// Otherwise, IR is inferred from section structure.

/**
 * Convert a TopologyExpression tree into an IRNode tree.
 */
export function topologyToIR(expr: TopologyExpression): IRNode {
  switch (expr.type) {
    case 'operator': {
      const op = expr.operator!;
      const children = (expr.operands || []).map(topologyToIR);

      const kindMap: Record<string, IRNodeKind> = {
        '>>': 'sequence',
        '|': 'parallel',
        '*': 'loop',
        '//': 'fallback',
        '@': 'agent', // @ wraps an agent with output schema
      };

      if (op === '@') {
        // The @ operator attaches a schema to the first operand
        const base = children[0] || { kind: 'agent' as IRNodeKind, name: '_unknown' };
        return { ...base, outputSchema: expr.schema };
      }

      if (op === '*') {
        const child = children[0] || { kind: 'agent' as IRNodeKind, name: '_unknown' };
        return {
          kind: 'loop',
          name: `loop(${child.name})`,
          children: [child],
          maxIterations: expr.iterations,
          untilCondition: expr.untilCondition,
        };
      }

      const kind = kindMap[op] || 'sequence';
      return {
        kind: kind as IRNodeKind,
        name: `${kind}(${children.map((c) => c.name).join(', ')})`,
        children,
      };
    }

    case 'agent-ref':
      return {
        kind: 'agent',
        name: expr.name || '_unknown',
        chipRefs: expr.name ? [`@agent(${expr.name})`] : undefined,
      };

    case 'skill-ref':
      return {
        kind: 'agent',
        name: expr.name || '_unknown',
        chipRefs: expr.name ? [`@skill(${expr.name})`] : undefined,
      };

    case 'function-ref': {
      if (expr.name === 'Route') {
        return {
          kind: 'route',
          name: `Route("${expr.schema || ''}")`,
          routeKey: expr.schema,
        };
      }
      if (expr.name === 'gate') {
        return {
          kind: 'gate',
          name: `gate("${expr.schema || ''}")`,
          predicate: expr.schema,
        };
      }
      if (expr.name === 'tap') {
        return {
          kind: 'tap',
          name: `tap(${expr.schema || ''})`,
        };
      }
      return { kind: 'agent', name: expr.name || '_unknown' };
    }

    case 'group':
      return expr.inner ? topologyToIR(expr.inner) : { kind: 'agent', name: '_group' };

    default:
      return { kind: 'agent', name: expr.name || '_unknown' };
  }
}

/**
 * Build an IR tree from a parsed playbook by inferring topology from sections.
 *
 * Strategy:
 * - If an explicit topology expression was parsed, convert it directly
 * - Otherwise, infer from section structure:
 *   1. Process sections with numbered steps → SequenceNode
 *   2. Escalation sections with conditionals → RouteNode children
 *   3. Guards → GateNode wrapping the process
 *   4. Skills → agent nodes referenced by name
 *   5. Wrap everything in a root SequenceNode
 */
export function buildIRFromPlaybook(parsed: ParsedPlaybook): IRNode {
  // If we have an explicit parsed topology, convert it
  if (parsed.topology) {
    return topologyToIR(parsed.topology);
  }

  // Otherwise, infer from section structure
  const rootChildren: IRNode[] = [];

  // Helper: create an agent IR node from a ParsedReference
  function refToIRNode(ref: ParsedReference): IRNode {
    const kindMap: Partial<Record<ChipType, IRNodeKind>> = {
      tool: 'agent',
      connector: 'agent',
      agent: 'agent',
      guard: 'gate',
      data: 'transform',
    };

    return {
      kind: kindMap[ref.type] || 'agent',
      name: ref.name,
      chipRefs: [ref.raw],
      sourceLines: [ref.line],
      ...(ref.type === 'guard' ? { predicate: ref.name } : {}),
    };
  }

  // Walk sections and build IR
  function processSection(section: ParsedSection): IRNode | undefined {
    switch (section.semanticRole) {
      case 'process': {
        // Numbered steps → SequenceNode
        const seqRefs = inferSequentialRefs(section);
        if (seqRefs.length > 0) {
          return {
            kind: 'sequence',
            name: section.title,
            children: seqRefs.map(refToIRNode),
            sourceLines: [section.startLine],
          };
        }
        // Fallback: list all refs as a sequence
        if (section.references.length > 0) {
          return {
            kind: 'sequence',
            name: section.title,
            children: section.references.map(refToIRNode),
            sourceLines: [section.startLine],
          };
        }
        return undefined;
      }

      case 'escalation': {
        // Conditionals → RouteNode
        const branches = inferConditionalBranches(section, parsed.conditionals);
        if (branches.length > 0) {
          const branchMap: Record<string, IRNode> = {};
          for (const branch of branches) {
            if (branch.ref) {
              branchMap[branch.condition] = refToIRNode(branch.ref);
            }
          }
          return {
            kind: 'route',
            name: section.title,
            routeKey: 'escalation',
            branches: branchMap,
            children: Object.values(branchMap),
            sourceLines: [section.startLine],
          };
        }
        return undefined;
      }

      case 'compliance': {
        // Guards → GateNode wrapping
        const guardRefs = section.references.filter((r) => r.type === 'guard');
        if (guardRefs.length > 0) {
          return {
            kind: 'gate',
            name: section.title,
            predicate: guardRefs.map((r) => r.name).join(' & '),
            guards: guardRefs.map((r) => r.name),
            children: guardRefs.map(refToIRNode),
            sourceLines: [section.startLine],
          };
        }
        return undefined;
      }

      default: {
        // For other section types, if they have children with semantic roles, recurse
        const childIRNodes: IRNode[] = [];
        for (const child of section.children) {
          const childIR = processSection(child);
          if (childIR) childIRNodes.push(childIR);
        }
        if (childIRNodes.length > 0) {
          return {
            kind: 'sequence',
            name: section.title,
            children: childIRNodes,
            sourceLines: [section.startLine],
          };
        }
        return undefined;
      }
    }
  }

  // Process top-level sections
  for (const section of parsed.sections) {
    const ir = processSection(section);
    if (ir) rootChildren.push(ir);

    // Also process children of sections without semantic roles
    if (!ir) {
      for (const child of section.children) {
        const childIR = processSection(child);
        if (childIR) rootChildren.push(childIR);
      }
    }
  }

  // Wrap in a root sequence
  if (rootChildren.length === 0) {
    return {
      kind: 'sequence',
      name: parsed.title,
      children: [],
    };
  }

  if (rootChildren.length === 1) {
    return rootChildren[0];
  }

  return {
    kind: 'sequence',
    name: parsed.title,
    children: rootChildren,
  };
}

// ─── Section Topology Extraction ──────────────────────────────────────
//
// Finds topology expressions within individual sections and annotates
// the ParsedSection with them.

function extractSectionTopologies(sections: ParsedSection[]): void {
  for (const section of sections) {
    const topologyExpr = extractTopologyExpression(section.content);
    if (topologyExpr) {
      section.topologyExpression = topologyExpr;
    }
    // Recurse into children
    if (section.children.length > 0) {
      extractSectionTopologies(section.children);
    }
  }
}

// ─── Main Parser Entry Point ───────────────────────────────────────────

/**
 * Parse a complete playbook document into a structured representation.
 *
 * This is the TypeScript equivalent of adk-fluent's parse_skill_file(),
 * but extended for the richer playbook format with prose, conditionals,
 * and multi-section structure.
 *
 * @param content - The raw playbook markdown content
 * @param registry - Optional SmartChip registry for reference resolution
 * @returns ParsedPlaybook with all extracted information
 */
export function parsePlaybook(
  content: string,
  registry: SmartChip[] = [],
): ParsedPlaybook {
  // 1. Extract title from first H1
  const titleMatch = content.match(/^#\s+(.+)/m);
  const title = titleMatch ? titleMatch[1].trim() : 'Untitled Playbook';

  // 2. Parse section hierarchy
  const sections = parseSections(content);

  // 3. Collect all references
  const allReferences = collectAllReferences(sections);

  // 4. Extract conditionals from the full document
  const conditionals = extractConditionals(content);

  // 5. Resolve references against registry
  const { resolved: resolvedCount, unresolved: unresolvedCount } =
    resolveReferences(allReferences, registry);

  // 6. Group by type
  const referencesByType = groupByType(allReferences);

  // 7. Compute unique types used
  const uniqueTypes = [...new Set(allReferences.map((r) => r.type))];

  // 8. Extract topology expression (adk-fluent operator syntax)
  const topologyRaw = extractTopologyExpression(content);
  let topology: TopologyExpression | undefined;
  if (topologyRaw) {
    try {
      topology = parseTopologyExpression(topologyRaw);
    } catch {
      // Topology parse error — leave undefined, parser is best-effort
    }
  }

  // 9. Extract section-level topology expressions
  extractSectionTopologies(sections);

  // 10. Build partial result for IR construction
  const partialResult: ParsedPlaybook = {
    title,
    sections,
    allReferences,
    conditionals,
    referencesByType,
    stats: {
      totalReferences: allReferences.length,
      resolvedCount,
      unresolvedCount,
      uniqueTypes,
      sectionCount: sections.length,
    },
    topology,
    topologyRaw,
  };

  // 11. Build IR tree from parsed playbook
  const ir = buildIRFromPlaybook(partialResult);
  partialResult.ir = ir;

  return partialResult;
}

// ─── Utility: Pretty Print ─────────────────────────────────────────────

export function summarizePlaybook(parsed: ParsedPlaybook): string {
  const lines: string[] = [
    `Playbook: ${parsed.title}`,
    `   ${parsed.stats.totalReferences} references (${parsed.stats.resolvedCount} resolved, ${parsed.stats.unresolvedCount} unresolved)`,
    `   ${parsed.stats.sectionCount} top-level sections`,
    `   ${parsed.conditionals.length} conditional rules`,
    '',
    '   References by type:',
  ];

  for (const type of parsed.stats.uniqueTypes) {
    const refs = parsed.referencesByType[type];
    const uniqueNames = [...new Set(refs.map((r) => r.name))];
    lines.push(`   @${type}: ${uniqueNames.join(', ')}`);
  }

  if (parsed.conditionals.length > 0) {
    lines.push('', '   Conditionals:');
    for (const c of parsed.conditionals) {
      const action = c.thenRef ? ` → ${c.thenRef.raw}` : '';
      lines.push(`   [${c.type}] "${c.condition}"${action} (line ${c.line})`);
    }
  }

  return lines.join('\n');
}
