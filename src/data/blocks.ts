/**
 * Block-based data model for the Structured Editor.
 *
 * Maps 1:1 to adk-fluent constructs:
 *   Block       → A single adk-fluent construct (Agent, Tool, Guard, etc.)
 *   Section     → A semantic grouping (Triggers, Skills, Process, etc.)
 *   Document    → The full agent definition = list of sections
 *
 * The parser converts playbook markdown → sections/blocks.
 * The serializer converts sections/blocks → markdown.
 * Both directions are lossless for round-trip editing.
 */

import type { ChipType } from '../parser/types';

// ─── Section Types ────────────────────────────────────────────────────

export type SectionType =
  | 'identity'     // Agent name, role, model → Agent("name").instruct()
  | 'triggers'     // How the loop starts → StreamRunner / PubSub / Cron
  | 'skills'       // Expertise bundles → Skill("SKILL.md")
  | 'knowledge'    // Grounding sources → VertexAiSearchTool
  | 'systems'      // Capabilities → Toolsets + FunctionTools
  | 'topology'     // Execution flow → >> | * // @ operators
  | 'process'      // Core instructions → .instruct() body
  | 'escalation'   // Routing/branching → Route() / gate()
  | 'output'       // Response shape → agent @ Schema
  | 'compliance'   // Hard boundaries → G.pii() | G.budget()
  | 'custom';      // User-defined

export const SECTION_META: Record<SectionType, {
  label: string;
  description: string;
  icon: string;
  color: string;
  suggestedBlocks: BlockType[];
  adkMapping: string;
}> = {
  identity:   { label: 'Identity',     description: 'Agent name, role, and model',           icon: '◎', color: '#D97706', suggestedBlocks: ['instruction'],                       adkMapping: 'Agent("name", "model").instruct(...)' },
  triggers:   { label: 'Triggers',     description: 'How the agent loop starts',             icon: '▸', color: '#EA580C', suggestedBlocks: ['trigger'],                           adkMapping: 'StreamRunner / PubSubToolset / Eventarc' },
  skills:     { label: 'Skills',       description: 'Expertise and behavior bundles',        icon: '✦', color: '#7C3AED', suggestedBlocks: ['skill'],                             adkMapping: 'Skill("SKILL.md")' },
  knowledge:  { label: 'Knowledge',    description: 'Grounding sources and documents',       icon: '◇', color: '#0D9488', suggestedBlocks: ['doc'],                               adkMapping: 'VertexAiSearchTool(data_store_specs)' },
  systems:    { label: 'Systems',      description: 'Connected tools and enterprise systems',icon: '◈', color: '#2563EB', suggestedBlocks: ['connector', 'tool'],                  adkMapping: 'ApplicationIntegrationToolset / FunctionTool' },
  topology:   { label: 'Topology',     description: 'Agent execution flow expression',       icon: '⟿', color: '#6366F1', suggestedBlocks: ['instruction', 'code'],                adkMapping: 'a >> b | c * 3 // d @ Schema' },
  process:    { label: 'Process',      description: 'Core instructions and steps',           icon: '▤', color: '#059669', suggestedBlocks: ['instruction', 'tool', 'connector'],   adkMapping: '.instruct("...") with @-refs' },
  escalation: { label: 'Escalation',   description: 'Routing, conditions, and gates',        icon: '◆', color: '#E11D48', suggestedBlocks: ['conditional', 'guard', 'agent'],      adkMapping: 'Route("key") / gate(pred) / G.guard()' },
  output:     { label: 'Output',       description: 'Response format and schema',            icon: '▢', color: '#475569', suggestedBlocks: ['schema', 'instruction'],              adkMapping: 'agent @ OutputSchema' },
  compliance: { label: 'Compliance',   description: 'Safety guards and policy constraints',  icon: '△', color: '#E11D48', suggestedBlocks: ['guard'],                              adkMapping: 'G.pii() | G.budget() | G.topic()' },
  custom:     { label: 'Custom',       description: 'User-defined section',                  icon: '§', color: '#6B7280', suggestedBlocks: ['instruction'],                        adkMapping: '' },
};

// ─── Block Types ──────────────────────────────────────────────────────

export type BlockType =
  | 'instruction'   // Freeform markdown with inline @-chips → .instruct()
  | 'trigger'       // @trigger(type) → StreamRunner / PubSub / Cron
  | 'skill'         // @skill(name) → Skill("SKILL.md") — EXPANDABLE
  | 'tool'          // @tool(name) → FunctionTool / MCPToolset
  | 'connector'     // @connector(name) → ApplicationIntegrationToolset
  | 'guard'         // @guard(name) → G.pii() | G.budget() | ...
  | 'doc'           // @doc(name) → VertexAiSearchTool
  | 'schema'        // @schema(name) → agent @ OutputSchema
  | 'agent'         // @agent(name) → Agent delegation — EXPANDABLE
  | 'conditional'   // if/when/route → Route() / gate()
  | 'code'          // Raw code → BuiltInCodeExecutor
  | 'data';         // @data(name) → S.capture() / BigQueryToolset

export const BLOCK_META: Record<BlockType, {
  label: string;
  icon: string;
  color: string;
  chipType?: ChipType;
  adkConstruct: string;
  description: string;
  expandable?: boolean;
}> = {
  instruction: { label: 'Instruction',  icon: '¶',  color: '#374151', adkConstruct: '.instruct("...")',                   description: 'Freeform text with inline @-references' },
  trigger:     { label: 'Trigger',      icon: '▸',  color: '#EA580C', chipType: 'trigger',   adkConstruct: 'StreamRunner / PubSub / Cron',        description: 'How the agent loop is invoked' },
  skill:       { label: 'Skill',        icon: '✦',  color: '#7C3AED', chipType: 'skill',     adkConstruct: 'Skill("SKILL.md")',                   description: 'Reusable expertise bundle', expandable: true },
  tool:        { label: 'Tool',         icon: '⬡',  color: '#4F46E5', chipType: 'tool',      adkConstruct: 'FunctionTool / MCPToolset',           description: 'Callable capability' },
  connector:   { label: 'Connector',    icon: '◈',  color: '#2563EB', chipType: 'connector',  adkConstruct: 'ApplicationIntegrationToolset',       description: 'Enterprise system integration' },
  guard:       { label: 'Guard',        icon: '△',  color: '#E11D48', chipType: 'guard',     adkConstruct: 'G.pii() | G.budget() | ...',          description: 'Safety constraint or policy check' },
  doc:         { label: 'Knowledge',    icon: '◇',  color: '#0D9488', chipType: 'doc',       adkConstruct: 'VertexAiSearchTool',                  description: 'Grounding document or data store' },
  schema:      { label: 'Schema',       icon: '▢',  color: '#475569', chipType: 'schema',    adkConstruct: 'agent @ OutputSchema',                description: 'Output format constraint' },
  agent:       { label: 'Agent',        icon: '◎',  color: '#D97706', chipType: 'agent',     adkConstruct: 'Agent("name") / RemoteAgent',         description: 'Delegate to another agent', expandable: true },
  conditional: { label: 'Condition',    icon: '◆',  color: '#DC2626', adkConstruct: 'Route("key") / gate(pred)',           description: 'Routing rule or approval gate' },
  code:        { label: 'Code',         icon: '⚡',  color: '#EA580C', adkConstruct: 'BuiltInCodeExecutor',                 description: 'Raw code execution (dev only)' },
  data:        { label: 'Data',         icon: '▣',  color: '#059669', chipType: 'data',      adkConstruct: 'S.capture() / BigQueryToolset',       description: 'Data binding or transform' },
};

// ─── Block & Section Data Model ───────────────────────────────────────

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string;                  // markdown content (instruction blocks) or description
  chipRef?: { type: ChipType; name: string };  // @-reference for typed blocks
  config?: Record<string, unknown>; // type-specific configuration
  collapsed?: boolean;
  adkExpression?: string;           // e.g. "G.pii('redact')" or "FunctionTool(policy_lookup)"
}

export interface EditorSection {
  id: string;
  type: SectionType;
  title: string;
  blocks: EditorBlock[];
  collapsed?: boolean;
}

// ─── Slash Command Items ──────────────────────────────────────────────

export interface SlashCommandItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  category: 'blocks' | 'sections' | 'patterns' | 'advanced';
  action: { type: 'insert-block'; blockType: BlockType } | { type: 'insert-section'; sectionType: SectionType } | { type: 'insert-pattern'; pattern: string };
  shortcut?: string;
  adkConstruct?: string;
}

export const SLASH_COMMANDS: SlashCommandItem[] = [
  // ─── Blocks
  { id: 'instruction', label: 'Instruction',  icon: '¶',  color: '#374151', description: 'Freeform text with @-references',                category: 'blocks', action: { type: 'insert-block', blockType: 'instruction' },  adkConstruct: '.instruct()' },
  { id: 'trigger',     label: 'Trigger',      icon: '▸',  color: '#EA580C', description: 'How the agent is invoked',                       category: 'blocks', action: { type: 'insert-block', blockType: 'trigger' },      adkConstruct: 'StreamRunner' },
  { id: 'skill',       label: 'Skill',        icon: '✦',  color: '#7C3AED', description: 'Reusable expertise bundle (SKILL.md)',            category: 'blocks', action: { type: 'insert-block', blockType: 'skill' },        adkConstruct: 'Skill()' },
  { id: 'tool',        label: 'Tool',         icon: '⬡',  color: '#4F46E5', description: 'Callable capability or function',                category: 'blocks', action: { type: 'insert-block', blockType: 'tool' },         adkConstruct: 'FunctionTool' },
  { id: 'connector',   label: 'Connector',    icon: '◈',  color: '#2563EB', description: 'Enterprise system (Jira, Salesforce, etc.)',      category: 'blocks', action: { type: 'insert-block', blockType: 'connector' },    adkConstruct: 'ApplicationIntegrationToolset' },
  { id: 'guard',       label: 'Guard',        icon: '△',  color: '#E11D48', description: 'Safety constraint or policy check',              category: 'blocks', action: { type: 'insert-block', blockType: 'guard' },        adkConstruct: 'G.pii() | G.budget()' },
  { id: 'doc',         label: 'Knowledge',    icon: '◇',  color: '#0D9488', description: 'Grounding document or data store',               category: 'blocks', action: { type: 'insert-block', blockType: 'doc' },          adkConstruct: 'VertexAiSearchTool' },
  { id: 'schema',      label: 'Schema',       icon: '▢',  color: '#475569', description: 'Output format constraint (Pydantic)',             category: 'blocks', action: { type: 'insert-block', blockType: 'schema' },       adkConstruct: 'agent @ Schema' },
  { id: 'agent',       label: 'Agent',        icon: '◎',  color: '#D97706', description: 'Delegate to another agent (local or A2A)',        category: 'blocks', action: { type: 'insert-block', blockType: 'agent' },        adkConstruct: 'Agent() / RemoteAgent()' },
  { id: 'conditional', label: 'Condition',    icon: '◆',  color: '#DC2626', description: 'Routing rule, gate, or if/when branch',          category: 'blocks', action: { type: 'insert-block', blockType: 'conditional' },  adkConstruct: 'Route() / gate()' },
  { id: 'data',        label: 'Data',         icon: '▣',  color: '#059669', description: 'Data binding, transform, or query',              category: 'blocks', action: { type: 'insert-block', blockType: 'data' },         adkConstruct: 'S.capture() / S.pick()' },
  { id: 'code',        label: 'Code',         icon: '⚡',  color: '#EA580C', description: 'Raw code execution (dev-only escape hatch)',      category: 'blocks', action: { type: 'insert-block', blockType: 'code' },         adkConstruct: 'BuiltInCodeExecutor' },
  // ─── Sections
  { id: 'sec-triggers',   label: 'Triggers Section',   icon: '▸',  color: '#EA580C', description: 'Add a triggers section',             category: 'sections', action: { type: 'insert-section', sectionType: 'triggers' } },
  { id: 'sec-skills',     label: 'Skills Section',     icon: '✦',  color: '#7C3AED', description: 'Add a skills section',               category: 'sections', action: { type: 'insert-section', sectionType: 'skills' } },
  { id: 'sec-knowledge',  label: 'Knowledge Section',  icon: '◇',  color: '#0D9488', description: 'Add a knowledge section',            category: 'sections', action: { type: 'insert-section', sectionType: 'knowledge' } },
  { id: 'sec-systems',    label: 'Systems Section',    icon: '◈',  color: '#2563EB', description: 'Add a connected systems section',     category: 'sections', action: { type: 'insert-section', sectionType: 'systems' } },
  { id: 'sec-process',    label: 'Process Section',    icon: '▤',  color: '#059669', description: 'Add a process section',              category: 'sections', action: { type: 'insert-section', sectionType: 'process' } },
  { id: 'sec-escalation', label: 'Escalation Section', icon: '◆',  color: '#E11D48', description: 'Add an escalation section',          category: 'sections', action: { type: 'insert-section', sectionType: 'escalation' } },
  { id: 'sec-compliance', label: 'Compliance Section', icon: '△',  color: '#E11D48', description: 'Add a compliance section',           category: 'sections', action: { type: 'insert-section', sectionType: 'compliance' } },
  // ─── Patterns
  { id: 'pat-review',     label: 'Review Loop',        icon: '🔄', color: '#6366F1', description: 'Writer → Reviewer → Repeat until quality',   category: 'patterns', action: { type: 'insert-pattern', pattern: 'review_loop' },    adkConstruct: 'review_loop(worker, reviewer, target="good", max_rounds=3)' },
  { id: 'pat-fanout',     label: 'Fan-Out Merge',      icon: '⤨',  color: '#6366F1', description: 'Parallel agents → Merge results',             category: 'patterns', action: { type: 'insert-pattern', pattern: 'fan_out_merge' },  adkConstruct: 'fan_out_merge(a, b, c, merge_key="merged")' },
  { id: 'pat-cascade',    label: 'Cascade Fallback',   icon: '↯',  color: '#6366F1', description: 'Try agents in order, first success wins',     category: 'patterns', action: { type: 'insert-pattern', pattern: 'cascade' },        adkConstruct: 'cascade(fast_model, smart_model)' },
  { id: 'pat-supervised', label: 'Supervised',         icon: '👁',  color: '#6366F1', description: 'Worker + Approval gate for high-risk',        category: 'patterns', action: { type: 'insert-pattern', pattern: 'supervised' },     adkConstruct: 'supervised(worker, gate_condition=...)' },
];

// ─── Parser: Playbook Markdown → Sections/Blocks ──────────────────────

let _blockId = 0;
function nextId(prefix: string) { return `${prefix}-${++_blockId}`; }

/** Infer section type from heading text */
function inferSectionType(title: string): SectionType {
  const t = title.toLowerCase();
  if (t.includes('role') || t.includes('identity') || t.includes('persona')) return 'identity';
  if (t.includes('trigger'))    return 'triggers';
  if (t.includes('skill'))      return 'skills';
  if (t.includes('knowledge') || t.includes('knowledge source'))  return 'knowledge';
  if (t.includes('connected') || t.includes('system'))            return 'systems';
  if (t.includes('topolog') || t.includes('flow') || t.includes('pipeline')) return 'topology';
  if (t.includes('process') || t.includes('step'))                return 'process';
  if (t.includes('escalat') || t.includes('routing') || t.includes('condition')) return 'escalation';
  if (t.includes('output') || t.includes('response') || t.includes('format'))   return 'output';
  if (t.includes('complian') || t.includes('guard') || t.includes('safety'))    return 'compliance';
  return 'custom';
}

/** Extract @type(name) references from a line */
const CHIP_REGEX = /@(doc|tool|agent|guard|data|schema|connector|skill|trigger)\(([^)]+)\)/g;

function extractChipRefs(line: string): Array<{ type: ChipType; name: string }> {
  const refs: Array<{ type: ChipType; name: string }> = [];
  let m;
  const re = new RegExp(CHIP_REGEX.source, 'g');
  while ((m = re.exec(line)) !== null) {
    refs.push({ type: m[1] as ChipType, name: m[2] });
  }
  return refs;
}

/** Determine block type from line content */
function inferBlockType(line: string, _sectionType: SectionType): { type: BlockType; chipRef?: { type: ChipType; name: string } } {
  const refs = extractChipRefs(line);
  if (refs.length === 1) {
    const r = refs[0];
    // Map chip types to block types
    const chipToBlock: Record<string, BlockType> = {
      trigger: 'trigger', skill: 'skill', tool: 'tool', connector: 'connector',
      guard: 'guard', doc: 'doc', schema: 'schema', agent: 'agent', data: 'data',
    };
    if (chipToBlock[r.type]) {
      return { type: chipToBlock[r.type] as BlockType, chipRef: r };
    }
  }
  // Conditional detection
  if (/^-?\s*(if|when|for claims involving)\b/i.test(line) && refs.length > 0) {
    return { type: 'conditional', chipRef: refs[0] };
  }
  return { type: 'instruction' };
}

/** Infer an adk-fluent expression for a block */
function inferAdkExpression(block: EditorBlock): string {
  if (!block.chipRef) return '';
  const { type, name } = block.chipRef;
  switch (type) {
    case 'trigger':   return `@trigger(${name})`;
    case 'skill':     return `Skill("skills/${name}/SKILL.md")`;
    case 'tool':      return `FunctionTool(${name.replace(/-/g, '_')})`;
    case 'connector': return `ApplicationIntegrationToolset("${name}")`;
    case 'guard':     return `G.${name.replace(/-/g, '_')}()`;
    case 'doc':       return `VertexAiSearchTool("${name}")`;
    case 'schema':    return `agent @ ${name.replace(/-/g, '_').replace(/\b\w/g, c => c.toUpperCase())}`;
    case 'agent':     return `Agent("${name}")`;
    case 'data':      return `S.capture("${name}")`;
    default:          return `@${type}(${name})`;
  }
}

/** Parse playbook markdown into structured sections and blocks */
export function parsePlaybookToBlocks(content: string): EditorSection[] {
  _blockId = 0;
  const lines = content.split('\n');
  const sections: EditorSection[] = [];
  let currentSection: EditorSection | null = null;
  let inCodeBlock = false;
  let codeBlockContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block handling
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block — add as code block
        if (currentSection) {
          currentSection.blocks.push({
            id: nextId('code'),
            type: 'code',
            content: codeBlockContent.trim(),
            adkExpression: '# Topology expression',
          });
        }
        inCodeBlock = false;
        codeBlockContent = '';
        continue;
      } else {
        inCodeBlock = true;
        codeBlockContent = '';
        continue;
      }
    }
    if (inCodeBlock) {
      codeBlockContent += line + '\n';
      continue;
    }

    // H1 — document title → identity section
    if (line.startsWith('# ') && !line.startsWith('## ')) {
      currentSection = {
        id: nextId('sec'),
        type: 'identity',
        title: line.replace(/^# /, ''),
        blocks: [],
      };
      sections.push(currentSection);
      continue;
    }

    // H2 or H3 — new section
    if (line.startsWith('## ') || line.startsWith('### ')) {
      const title = line.replace(/^#{2,3} /, '');
      currentSection = {
        id: nextId('sec'),
        type: inferSectionType(title),
        title,
        blocks: [],
      };
      sections.push(currentSection);
      continue;
    }

    // Skip empty lines
    if (!line.trim()) continue;

    // Add block to current section
    if (!currentSection) {
      currentSection = { id: nextId('sec'), type: 'custom', title: 'Untitled', blocks: [] };
      sections.push(currentSection);
    }

    // Determine block type from content
    const { type, chipRef } = inferBlockType(line, currentSection.type);

    // For consecutive instruction lines, merge into one block
    const lastBlock = currentSection.blocks[currentSection.blocks.length - 1];
    if (type === 'instruction' && lastBlock?.type === 'instruction' && !chipRef) {
      lastBlock.content += '\n' + line;
      continue;
    }

    const block: EditorBlock = {
      id: nextId('blk'),
      type,
      content: line,
      chipRef,
      collapsed: type === 'skill' || type === 'agent', // expandable blocks start collapsed
    };
    block.adkExpression = inferAdkExpression(block);
    currentSection.blocks.push(block);
  }

  return sections;
}

/** Create a new empty block of a given type */
export function createEmptyBlock(type: BlockType): EditorBlock {
  const meta = BLOCK_META[type];
  return {
    id: nextId('blk'),
    type,
    content: '',
    chipRef: meta.chipType ? { type: meta.chipType, name: '' } : undefined,
    collapsed: meta.expandable ?? false,
    adkExpression: '',
  };
}

/** Create a new empty section of a given type */
export function createEmptySection(type: SectionType): EditorSection {
  const meta = SECTION_META[type];
  return {
    id: nextId('sec'),
    type,
    title: meta.label,
    blocks: [],
    collapsed: false,
  };
}
