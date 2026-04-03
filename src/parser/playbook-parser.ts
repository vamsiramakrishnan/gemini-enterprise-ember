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
  ParsedConditional,
  ParsedPlaybook,
  ParsedReference,
  ParsedSection,
  SmartChip,
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

  return {
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
  };
}

// ─── Utility: Pretty Print ─────────────────────────────────────────────

export function summarizePlaybook(parsed: ParsedPlaybook): string {
  const lines: string[] = [
    `📋 Playbook: ${parsed.title}`,
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
