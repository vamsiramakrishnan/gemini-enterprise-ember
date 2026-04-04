# CLAUDE.md — Agent Playbook Editor: UI Mockup Suite

## Vision

Build a suite of interactive UI mockups demonstrating a radical reimagining of enterprise agent building. The core thesis: **the agent builder is a document editor, not a flow builder.** Writing a playbook IS building an agent. The IDE IS the editor.

This is a Google Cloud / Gemini Enterprise concept. The design language should feel like a natural evolution of Google Workspace (Docs, Sheets, Colab) — not a separate product. Think: what if Google Docs grew agent-authoring capabilities natively.

-----

## Conceptual Framework (READ THIS FIRST — it governs how every screen should feel)

Three ideas underpin the entire design. Every screen, interaction, and visual should make these ideas tangible:

### 1. The Loop Is Simple — The Space Is The Design Surface

Every agent is the same loop: **Observe → Reason → Act → Observe**. There is no magic graph, no complex state machine. It’s a while-loop with an LLM call inside it. The playbook document is not a *description* of a loop — it’s the *operating context* of the loop. The LLM reads the playbook on every iteration the way a human reads a runbook while doing their job.

Flow builders overcomplicate this by constraining the *sequence* (do A then B then C). The playbook constrains the *space* (you have access to A, B, C — use them as you see fit). The agent retains autonomy within a governed boundary. This is the right abstraction for LLMs.

**Design implication**: The mockups should never show a flow/DAG/graph editor. The playbook document IS the agent. The Test Cell should show the loop running iteratively, not a pipeline.

### 2. Code Execution Is Omnipotent — Everything Else Is Cached Reduction

An agent with code execution and internet access can *in principle* do anything computable. `@tool(policy-lookup)` is really “write code to call the policy API.” `@connector(salesforce)` is really “write code to auth with Salesforce OAuth and query Accounts.” Tools, connectors, skills — they’re all **pre-computed reductions of the code execution space.** They’re cached solutions.

The enterprise doesn’t want its claims agent improvising Python to talk to Salesforce. It wants a governed, tested, audited connector that the agent invokes by reference. But the developer prototyping the agent *does* want raw code execution to explore what’s possible.

**Design implication**: Show the spectrum from unconstrained (code execution cell) to fully constrained (playbook with only `@` references). The Notebook view should include both. Skills can bundle audited code. The production deployment strips the escape hatch.

### 3. The Playbook Is A Manifold Definition — Each `@` Reference Shapes The Space

An unconstrained agent faces an infinite-dimensional problem space. The playbook collapses it:

- **Skills** reduce the space (cached expertise, behavioral constraints)
- **Connectors** expand the space in governed directions (new actions, new data, but pre-authed and pre-scoped)
- **Guards** are hard boundary walls (the agent cannot pass through them)
- **Docs** are grounding anchors (they constrain reasoning to factual territory)
- **Tools** are cached capabilities (pre-defined action dimensions)
- **Schemas** constrain output shape (the last mile of reduction)

Each `@` reference is a dimension in the constrained action space. The playbook assembles them into a manifold the agent operates within. The mockups should make this spatial metaphor *visible* — especially in the Inspector’s Problem Space Visualizer.

### 4. Triggers Define How The Loop Starts — The Invocation Surface

Everything above defines what happens *inside* the loop. But an agent also needs an *entry point* — how does the loop begin? There are four fundamental trigger patterns:

- **Inbox (async queue)**: requests accumulate and the agent processes them in order or by priority. Think: support tickets, approval workflows, document review queues. Maps to Pub/Sub in Google Cloud. The agent is a worker draining a queue.
- **Chat (streaming)**: real-time conversational. User sends a message, agent streams a response. Maps to Gemini Enterprise web app / API endpoint. The loop runs interactively with the human in it.
- **Event (webhook)**: something happens in an external system and the agent wakes up. A Slack message posted. A file uploaded to a Drive folder. A cell changed in a Sheet. A Jira ticket created. Maps to Eventarc. **Critically: event triggers come FROM the same connectors the agent uses for actions.** `@connector(slack)` is both a data source AND an event source. The connector is both the ear and the hand.
- **Schedule (cron)**: time-based. “Every Monday at 9am, generate the weekly report.” Maps to Cloud Scheduler. Agent Designer already has a Schedule tab for this.

Triggers are `@trigger` chips declared in the playbook header — using the same `@` reference system as everything else. A trigger from Slack resolves against the same `@connector(slack)` configuration. This unifies the invocation surface with the action surface.

**Design implication**: The playbook should have a “Triggers” section at the top declaring how the agent is invoked. Trigger chips are visually distinct (orange) and appear as entry-point nodes in the compiled flow view.

### 5. The Playbook Compiles Into A Graph — But The Graph Is Derived, Never Authored

The playbook is prose. But enterprises need to *see* the topology — “show me how this agent works” means “show me a diagram.” The critical architectural principle: **the graph is DERIVED, not AUTHORED.** You never draw the flow. You write the playbook, and the system compiles it into a graph for visualization. This is the opposite of traditional flow builders.

The compilation process:

- Parse the playbook for `@trigger` references → these become **entry nodes** (how the loop starts)
- Parse `@tool`, `@connector`, `@agent` references in context → these become **process nodes** (what the loop does)
- Parse conditional prose (“if amount exceeds $50k”, “when the policy is flagged”) → these become **decision diamonds**
- Parse `@guard` references → these become **gate nodes** with pass/fail branches
- Parse `@skill` activations → these become **colored region overlays** encompassing the nodes they affect
- Parse `@doc` references → these become **grounding input nodes** feeding into process nodes
- Parse `@schema` references → these become **output shape nodes** at the terminus

The result is a read-only DAG. Clicking any node highlights the corresponding line in the playbook. You CANNOT edit the graph — you go back to the playbook, make changes, and the graph recompiles. The graph is the “explain this to my manager” view. The playbook is the source of truth.

This gives the editor three tabs of the same agent: **Document** (prose, the authoring surface), **Flow** (compiled graph, the visualization surface), and **Notebook** (cells, the development surface). Same source of truth, three lenses.

**Design implication**: Screen 1 gets a tab bar: Document | Flow | Notebook. The Flow tab shows the compiled graph. It’s the most visually impressive screen — a clean DAG with colored nodes matching chip types, animated data flow along edges when running a test, and click-to-source navigation.

### 6. The Agent Is Text — So Versioning Is Diffing

This is the final payoff of “the document IS the agent.” Because the agent definition is markdown with typed `@` references, every change to the agent is a text diff. Not a serialized config change buried in a database. Not a graph mutation in a proprietary format. A human-readable text diff that anyone can review.

But the diff view should be **chip-aware, not raw text**. A raw diff shows `+@connector(slack)` as a string insertion. A chip-aware diff shows it as a semantic change: “Added Slack connector — agent can now search messages and post to channels. This expands the action space by 2 actions.” The diff understands what changed *structurally* because the `@` references are typed.

This enables a complete agent lifecycle through text operations:

- **Version history**: identical to Google Docs revision history. Every save is a version. Scrub through time and see the agent evolve. Maps to Artifact Registry versioned entries.
- **Chip-aware diff**: side-by-side or inline diff view that renders chips in both versions. Added chips glow green. Removed chips glow red. Changed parameters are highlighted. Prose changes show standard text diff.
- **Semantic change summary**: auto-generated from the diff: “v2.1 → v2.2: Added @connector(slack) for team notifications. Removed @guard(legacy-filter). Changed escalation threshold from $50k to $25k. Added @trigger(schedule:weekday-9am) for daily batch processing.”
- **Graph diff**: the compiled Flow tab can overlay two versions. Added nodes pulse green. Removed nodes ghost red. Changed edges highlight yellow. The viewer sees how the agent’s topology evolved.
- **Branching**: fork a playbook to experiment. The fork is a copy of the document — branch and merge use text merge semantics. Conflicts are visible as conflicting `@` reference changes.
- **Review workflow**: before publishing a new version, share the diff with reviewers. Comments attach to specific lines/chips, exactly like Google Docs suggestion mode. “Approve” promotes the version to production.
- **Rollback**: revert to any previous version instantly. Because it’s a document, rollback is just restoring a previous revision. The compiled graph, triggers, and all `@` reference bindings revert with it.

**Design implication**: The editor top bar gets a version indicator and history button. A new Screen 10 shows the full version history + diff view. The publish button should enforce a version bump (semver) and optionally require review approval before promotion to production.

-----

## Backend: adk-fluent — The Engine Behind The Editor

The UI mockup suite visualizes what **adk-fluent** (`pip install adk-fluent`) computes. adk-fluent is a fluent builder API for Google's Agent Development Kit (ADK) that reduces agent creation from 22+ lines to 1-3 lines while producing identical native ADK objects. **The playbook editor IS the visual surface of adk-fluent's expression language.**

Repository: `github.com/vamsiramakrishnan/adk-fluent`

### How adk-fluent Maps To The UI

Every `@` chip type in the editor corresponds to a real adk-fluent construct:

| UI `@` Chip | adk-fluent Construct | What It Does |
|---|---|---|
| `@agent(name)` | `Agent("name", "model").instruct(...)` | LLM agent with instructions, tools, callbacks. `.build()` returns native ADK `LlmAgent`. |
| `@tool(name)` | `FunctionTool(fn)` / `MCPToolset(...)` / `ToolRegistry.search(...)` | Function tools, MCP server tools, OpenAPI tools. BM25-indexed discovery via `T.search("query")`. |
| `@guard(name)` | `G.pii("redact") \| G.budget(5000) \| G.json()` | Composable guards via the `G` namespace. PII detection (regex + Cloud DLP), toxicity (LLM judge), budget, schema validation, topic blocking, hallucination detection. Guards compile to `before_model_callback` / `after_model_callback`. |
| `@skill(name)` | `Skill("path/to/SKILL.md")` | SKILL.md-backed capability bundles. Parsed from YAML frontmatter + markdown body. Contains `agents:` block (multi-agent topology), `topology:` expression, `input:`/`output:` schemas, `eval:` cases. Skills compose with `>>`, `\|`, `*` operators like any builder. |
| `@connector(name)` | `ApplicationIntegrationToolset(...)` / `BigQueryToolset(...)` / `GoogleApiToolset(...)` | ADK's native connector toolsets — Salesforce, Jira, Slack via Application Integration; BigQuery, Bigtable, Spanner, PubSub via dedicated toolsets; Gmail, Calendar, Docs, Sheets, Slides, YouTube via Google API toolsets. |
| `@data(name)` | `S.capture("key")` / `S.pick(...)` / `S.rename(...)` | State transforms via the `S` namespace. Capture user input, project/rename keys, merge data — all zero-cost (no LLM call). |
| `@schema(name)` | `agent @ OutputSchema` | The `@` operator constrains output to a Pydantic `BaseModel`. The agent's response must conform to the schema. |
| `@doc(name)` | `VertexAiSearchTool(...)` / `DiscoveryEngineSearchTool(...)` | Grounding via Vertex AI Search data stores. Documents are indexed and retrieved at reasoning time. |
| `@trigger(type)` | `StreamRunner` / `PubSubToolset` / Cloud Scheduler / Eventarc | Entry points: chat (streaming), inbox (Pub/Sub queue), event (Eventarc webhook from connectors), schedule (Cloud Scheduler cron). |

### The Expression Language IS The Flow Tab

adk-fluent's 9 operators compile to the exact DAG shown in the Flow tab:

```
Operator    │ Meaning              │ ADK Type          │ Flow Tab Node
────────────┼──────────────────────┼───────────────────┼──────────────────
a >> b      │ Sequential           │ SequentialAgent   │ Directed edge
a | b       │ Parallel             │ ParallelAgent     │ Fork/join
a * 3       │ Loop (fixed)         │ LoopAgent         │ Loop back-edge
a * until() │ Loop (conditional)   │ LoopAgent + check │ Loop with predicate
a @ Schema  │ Typed output         │ output_schema     │ Output node (slate)
a // b      │ Fallback             │ First-success     │ Fallback branch
Route("k")  │ Deterministic branch │ RoutingAgent      │ Decision diamond
tap(fn)     │ Observe (no mutate)  │ Custom BaseAgent  │ Tap node
gate(pred)  │ Human approval       │ EventActions      │ Gate node (rose)
```

**The Flow tab is `viz.ir_to_mermaid()` rendered as interactive SVG.** adk-fluent already has an IR (intermediate representation) with node types that map 1:1 to Flow tab nodes:

- `AgentNode` → Process node (indigo for tools, blue for connectors, amber for delegation)
- `SequenceNode` → Directed edges between children
- `ParallelNode` → Fork/join with concurrent branches
- `LoopNode` → Loop back-edge with max iteration badge
- `RouteNode` → Decision diamond with conditional edges
- `GateNode` → Gate node with pass/fail branches (rose)
- `TransformNode` → Zero-cost state transform (no LLM icon)
- `FallbackNode` → Try children in order, first success wins
- `UINode` → A2UI surface render (declarative UI output)

### The Guard System — `G` Namespace

Guards are the `@guard` chips. adk-fluent's `G` namespace provides composable, chainable guard specs:

```python
# These compile to before_model / after_model callbacks
agent.guard(
    G.pii("redact", detector=G.dlp("my-project"))  # Cloud DLP PII detection
    | G.toxicity(0.8, judge=G.llm_judge())          # LLM-based toxicity check
    | G.budget(5000)                                  # Token budget limit
    | G.json()                                        # JSON schema validation
    | G.length(min=10, max=500)                       # Output length bounds
    | G.grounded("sources")                           # Hallucination check
    | G.topic(deny=["politics", "religion"])           # Topic blocking
    | G.output(ClaimsResponse)                        # Pydantic schema validation
)
```

Guard types and their UI representation:
- **Structural**: `G.json()`, `G.length()`, `G.output(Schema)` → validate response shape
- **Policy**: `G.budget()`, `G.rate_limit()`, `G.max_turns()` → enforce operational limits
- **Content Safety**: `G.pii()`, `G.toxicity()`, `G.topic()`, `G.grounded()`, `G.hallucination()` → content filtering
- **Conditional**: `G.when(predicate, guard)` → apply guards conditionally based on state

Guards appear as **gate nodes** in the compiled Flow view with pass/fail branches. In the Test Cell's Loop Iteration Visualizer, guard checks appear as interstitial bars: "✓ @guard(pii-redaction) passed" or "✗ @guard(fraud-detection) BLOCKED."

### The Skill System — SKILL.md Format

Skills are the `@skill` chips. The SKILL.md format parsed by adk-fluent:

```yaml
---
name: apac-compliance
description: >
  Use when handling regulatory compliance in APAC markets.
  Covers MAS, APRA, RBI, OJK, and FSC regulations.
version: "1.2.0"
tags: [compliance, apac, regulatory]
agents:
  jurisdiction_check:
    model: gemini-2.5-flash
    instruct: "Identify customer jurisdiction from context."
    tools: [regtech_api]
    writes: jurisdiction
  compliance_advisor:
    model: gemini-2.5-pro
    instruct: "Advise on {jurisdiction} regulatory requirements."
    reads: [jurisdiction]
    writes: advice
topology: jurisdiction_check >> compliance_advisor
input:
  query: string
output:
  advice: string
  jurisdiction: string
eval:
  - prompt: "KYC requirements for Singapore clients?"
    expect_contains: "MAS"
---

# APAC Compliance Skill

## Regional Rules
When handling Singapore customers, reference @doc(mas-guidelines-2024)
and apply @guard(pdpa-compliance)...
```

Key skill concepts reflected in the UI:
- **`agents:` block** → defines the multi-agent topology within the skill (visible in Skill Cell)
- **`topology:` expression** → uses the same `>>`, `|`, `*` operators to wire agents (shown in Skill Cell's mini-flow)
- **`input:`/`output:` schemas** → the skill's contract (shown in Skill Cell footer)
- **`eval:` cases** → built-in test cases (used by "Test Activation" button)
- **Skill body** (markdown below frontmatter) → instructions with `@` chip references, same as a playbook
- **`SkillRegistry("skills/")`** → directory scanner that indexes all SKILL.md files for discovery in autocomplete

### The Tool System — `T` Namespace & Registry

Tools are the `@tool` chips. adk-fluent supports multiple tool types that the UI should represent:

- **`FunctionTool(fn)`** → Python function wrapped as a tool. The most common type. Schema auto-inferred from type hints.
- **`MCPToolset(server_params)`** → MCP (Model Context Protocol) server tools. External tool servers.
- **`OpenAPIToolset(spec)`** → Tools from OpenAPI/Swagger specs. Auto-generated from endpoint definitions.
- **`ToolboxToolset(url)`** → ADK Toolbox — managed tool hosting.
- **`GoogleSearchTool()`** → Built-in Google Search grounding.
- **`VertexAiSearchTool(data_store_id)`** → Enterprise search via Vertex AI data stores.
- **`ToolRegistry`** → BM25-indexed catalog for tool discovery. `T.search("lookup customer")` returns ranked matches. Powers the `@tool` autocomplete in the editor.

### Connector Toolsets — The `@connector` Chips

Connectors are ADK toolsets that wrap enterprise system integrations:

**Google-native (via dedicated toolsets):**
- `BigQueryToolset(project, dataset)` → SQL queries, schema inspection
- `BigtableToolset(project, instance)` → NoSQL row operations
- `SpannerToolset(project, instance, database)` → Distributed SQL
- `PubSubToolset(project, topic)` → Message publish/subscribe
- `CalendarToolset()` → Google Calendar CRUD
- `GmailToolset()` → Email search, send, labels
- `DocsToolset()` → Google Docs read/write
- `SheetsToolset()` → Google Sheets read/write
- `SlidesToolset()` → Google Slides CRUD
- `YouTubeToolset()` → YouTube data API

**Third-party (via Application Integration):**
- `ApplicationIntegrationToolset(project, location, integration, triggers)` → Jira, Salesforce, Slack, ServiceNow, SharePoint, Confluence, GitHub, Box, etc. via Google Cloud Application Integration connectors.

**Enterprise search (via data stores):**
- `VertexAiSearchTool(data_store_specs)` → Vertex AI Search over ingested/federated data
- `DiscoveryEngineSearchTool(data_store_id)` → Discovery Engine full-text search

### Context Engineering — The `C` Namespace

Context engineering controls what each agent sees. Not directly a chip type, but critical to how the playbook's instructions are delivered to the LLM:

```python
# What history does this agent see?
agent.context(
    C.window(n=3)           # Last 3 conversation turns
    + C.from_state("topic") # Inject state["topic"] as context
    + C.user_only()         # Only user messages, no agent messages
    + C.relevant("query")   # Semantic relevance filtering
    + C.summarize()         # LLM-summarized history
)
```

This is relevant to the **Inspector sidebar's Details tab** — when a playbook section is selected, the inspector can show what context strategy is active for that agent.

### Agent-to-Agent (A2A) Protocol

The `@agent` chips for delegation use adk-fluent's A2A support:

```python
# Local sub-agent (same process)
senior = Agent("senior-adjuster", "gemini-2.5-pro").instruct("...")

# Remote agent (A2A protocol over HTTP)
remote = RemoteAgent("fraud-specialist", "http://fraud-agent:8001")
# or discover via well-known URL
remote = RemoteAgent.discover("fraud", "fraud.agents.acme.com")

# Both compose identically
pipeline = classifier >> senior   # local delegation
pipeline = classifier >> remote   # remote A2A delegation
```

`A2AServer(agent).port(8001).health_check().build()` publishes any agent as an A2A-discoverable service. `AgentRegistry` provides centralized discovery — this powers the `@agent` section in the autocomplete dropdown.

### Agent-to-UI (A2UI) — Declarative UI Composition

adk-fluent's `UI` namespace enables agents to generate structured UI output — not just text:

```python
from adk_fluent import UI

surface = UI.surface("claims-form",
    UI.column(
        UI.text("Submit Your Claim", variant="h1"),
        UI.text_field("policy_id", label="Policy Number", bind="/form/policy"),
        UI.select("claim_type", label="Claim Type",
            options=["auto", "home", "health"], bind="/form/type"),
        UI.button("submit", label="Submit Claim", action="submit_claim"),
    ),
)

# Compile to A2UI protocol messages
messages = surface.compile()
```

This connects to the **Schema Cell** in the Notebook — when an agent uses `@schema(claims-form-v2)`, the schema isn't just JSON validation, it can be a full A2UI surface definition that renders as an interactive form in the chat interface.

### Composition Patterns — Pre-built Workflows

adk-fluent's `patterns` module provides higher-order constructors that map to common playbook patterns:

```python
from adk_fluent.patterns import review_loop, fan_out_merge, cascade, conditional

# Review loop: writer → reviewer → repeat until quality
review_loop(worker=writer, reviewer=critic, target="good", max_rounds=3)

# Fan-out research + merge results
fan_out_merge(web_agent, papers_agent, news_agent, merge_key="research")

# Cascading fallback models (try fast, fall back to smart)
cascade(Agent("fast").model("gemini-2.0-flash"), Agent("smart").model("gemini-2.5-pro"))

# Supervised agent with human approval gate
supervised(worker=claims_agent, gate_condition=lambda s: s["amount"] > 50000)
```

These patterns are what the compiled Flow tab visualizes. The playbook prose ("If claim amount exceeds $50,000, route to @agent(senior-adjuster)") compiles to these patterns behind the scenes.

### The Playbook Parser — Compiling Prose to Graph

The critical bridge between the playbook document and the compiled Flow tab is the **playbook parser**. This is the system that:

1. **Extracts `@` references** from the playbook markdown — finding every `@type(name)` token
2. **Resolves references** against the registry — checking that each `@tool(policy-lookup)` exists and is accessible
3. **Infers topology** from prose structure — "When a customer submits a claim: 1. Use @tool(policy-lookup)... 2. Search @connector(salesforce)..." implies a sequential pipeline
4. **Identifies conditional logic** — "If claim amount exceeds $50,000, route to @agent(senior-adjuster)" becomes a decision diamond
5. **Compiles to IR** — produces the same `AgentNode`, `SequenceNode`, `RouteNode`, `GateNode` IR nodes that adk-fluent uses internally
6. **Generates the DAG** — the IR is laid out as a left-to-right directed acyclic graph for the Flow tab

The parser uses the same `_skill_parser.py` tokenizer and topology expression parser (`>>`, `|`, `*`) that SKILL.md files use. The playbook is essentially a rich SKILL.md with prose wrapping the topology.

### Presets — Reusable Configuration Bundles

`Preset` in adk-fluent is a reusable bundle of builder configuration:

```python
enterprise = Preset(
    model="gemini-2.5-pro",
    before_model=audit_callback,
    after_model=compliance_check,
)

# Apply to any agent
agent = Agent("claims").use(enterprise).instruct("Process claims.")
```

Presets map to **workspace-level configuration** in the UI — an org can define standard presets that all playbooks inherit, ensuring consistent model selection, compliance callbacks, and guard policies.

### How The Backend Powers Each Screen

| Screen | adk-fluent Backend |
|---|---|
| **Screen 1: Playbook Editor** | Playbook parser extracts `@` refs → resolves against `ToolRegistry` + `SkillRegistry` → compiles to IR → `viz.ir_to_mermaid()` renders Flow tab |
| **Screen 2: Notebook** | Each cell type maps to a builder: Tool Cell → `FunctionTool`, Skill Cell → `Skill("SKILL.md")`, Test Cell → `.ask()` with event streaming, Code Cell → raw `BuiltInCodeExecutor` |
| **Screen 3: Registry** | `ToolRegistry` (BM25-indexed tools) + `SkillRegistry` (SKILL.md scanner) + connector catalog from `ApplicationIntegrationToolset` |
| **Screen 4: Permissions** | ADK's `AuthCredential` + `ServiceAccount` + IAM bindings per tool/connector |
| **Screen 5: Live Authoring** | Meta-circular: the authoring agent itself uses `Agent("author").tool(registry_search).instruct("Build playbooks from user descriptions")` |
| **Screen 8: Skill Editor** | Direct visual editor for SKILL.md format — `parse_skill_file()` + `SkillDefinition` data model |
| **Screen 9: Connector Hub** | Inventory of all ADK toolset types — `BigQueryToolset`, `ApplicationIntegrationToolset`, `GoogleApiToolset`, etc. |
| **Screen 10: Version History** | Playbook text diff + chip-aware annotations from parsed `@` references + IR graph diff between versions |

-----

## Design Direction

**Aesthetic**: Google Material Design 3 evolved — clean, professional, warm neutrals with sharp accent colors for chip types. NOT generic SaaS. NOT dashboard-heavy. The feel should be *editorial* — like writing in a beautifully typeset document that happens to be executable. Think Notion’s calm density meets Google Docs’ collaborative DNA meets Colab’s computational cells.

**Typography**: Use Google Fonts. `Google Sans` (or fallback `Product Sans` → `Inter` as last resort) for UI chrome. A refined serif like `Literata` or `Source Serif 4` for playbook body text — the document should feel like a *document*, not a code editor. Monospace (`JetBrains Mono` or `Fira Code`) only inside tool/code cells.

**Color System**:

- Background: warm white `#FAFAF9` with subtle paper texture
- Chip colors by type (critical — these must be visually distinct):
  - `@doc` → Teal `#0D9488` (knowledge)
  - `@tool` → Indigo `#4F46E5` (capability)
  - `@agent` → Amber `#D97706` (delegation)
  - `@guard` → Rose `#E11D48` (policy/safety)
  - `@data` → Emerald `#059669` (data binding)
  - `@schema` → Slate `#475569` (structure)
  - `@connector` → Blue `#2563EB` (Gemini Enterprise connector — Jira, Salesforce, Slack, etc.)
  - `@skill` → Violet `#7C3AED` (reusable agent skill — SKILL.md-backed capability bundle)
  - `@trigger` → Orange `#EA580C` (invocation surface — how the agent loop starts: inbox, chat, event, schedule)
  - Unresolved reference → Red outline, dashed `#DC2626`
  - Draft reference → Yellow outline `#EAB308`
  - Ready/published → Solid filled chip with white text
- Accent: Google Blue `#1A73E8` for primary actions
- Sidebar/chrome: `#F3F4F6` with `#E5E7EB` borders

**Interaction Model**: Everything should be interactive. Chips are clickable. Cells are expandable. The registry is searchable. Hover states show resolution metadata. This is a *working prototype*, not a wireframe.

-----

## Mockup Suite — Build These Screens

### Screen 1: Playbook Editor (Primary Screen)

**The hero mockup.** A full-screen editor with three views of the same agent. The document is the source of truth; the other views are derived.

**Layout:**

- Top bar: document title (“Claims Processing Agent v2.1”), **version badge** (clickable, shows “v2.1 — Published” with dropdown: v2.1 Published, v2.0 Published, v1.3 Deprecated, v1.2 Archived), **diff button** (icon: split-screen, opens version comparison), share button, publish button (with draft/staging/prod dropdown + semver bump selector: patch/minor/major), **history button** (clock icon, opens Screen 10 version timeline)
- **Tab bar below top bar**: **Document** | **Flow** | **Notebook** — three views of the same agent, same source of truth
- Left sidebar (collapsible): file tree of playbooks in the workspace, grouped by team/folder — mirrors Drive structure
- Main canvas (content depends on active tab — see below)
- Right sidebar (collapsible): “Inspector” panel with two tabs:
  - **Details Tab**: metadata for whatever’s selected — if a chip is selected, show its registry entry, version, permissions, usage stats
  - **Space Tab**: Problem Space Visualizer — a radial/concentric diagram showing the agent’s current action space as defined by all `@` references in the playbook:
    - **Top arc**: **Triggers** (orange) — entry points showing how the loop starts (chat bubble, inbox tray, webhook arrow, clock icons)
    - Center: the agent (loop icon, pulsing subtly)
    - Inner ring: **Skills** (violet segments) — expertise constraints currently active, each labeled
    - Middle ring: **Tools** (indigo) + **Connectors** (blue) + **Data** (emerald) — available actions and data sources, sized by usage frequency
    - Outer ring: **Guards** (rose) — hard boundary walls, visually solid/impermeable
    - **Docs** float as teal anchors between inner and middle rings (grounding the reasoning)
    - **Schemas** appear as slate output funnels at the bottom (constraining output shape)
    - When you add a new `@` reference to the playbook, the diagram animates: adding a connector expands the middle ring, adding a guard adds a wall to the outer ring, adding a skill reshapes the inner ring, adding a trigger adds an entry arrow at the top
    - When you remove a reference, the space contracts
    - Hovering a segment highlights every line in the playbook that references it
    - The entire diagram communicates: “This is what this agent can and cannot do, and how it gets invoked. The boundary is clear.”

**Document Tab** (default): the playbook document with rich markdown rendering — the primary authoring surface. All smart chips rendered inline. This is where you write.

**Flow Tab** (compiled graph — READ-ONLY): a DAG automatically derived from the playbook content:

- **Entry nodes** (orange, left edge): one node per `@trigger` — chat bubble for chat trigger, inbox icon for queue trigger, webhook arrow for event triggers, clock for schedule triggers. Shows trigger configuration on hover.
- **Grounding inputs** (teal, top): `@doc` references feeding into the reasoning context
- **Skill regions** (violet translucent overlays): `@skill` activations shown as colored background regions encompassing the nodes they affect — like a colored zone on a map
- **Process nodes** (indigo for tools, blue for connectors, amber for agent delegation): each `@tool`, `@connector` action, or `@agent` call. Labeled with the chip name. Shows parameters on hover.
- **Decision diamonds** (white with dark border): compiled from conditional prose in the playbook (“if claim amount exceeds $50,000”, “if the policy is flagged”). The system infers these from conditional language around `@` references.
- **Gate nodes** (rose): `@guard` checks with two outgoing edges: ✓ Pass and ✗ Block/Escalate
- **Output nodes** (slate, right edge): `@schema` references showing the response shape
- **Edges**: directed arrows showing data flow. Animated with flowing dots when a test is running.
- **Click interaction**: clicking ANY node highlights the corresponding line(s) in the playbook Document tab. A “Go to source ↩” button switches to the Document tab with that line scrolled into view.
- **The graph is NEVER directly editable.** If the user tries to drag nodes or add connections, show a gentle tooltip: “This view is compiled from your playbook. Edit the document to change the flow.” This reinforces: the document is the source of truth.
- The graph layout should use a left-to-right DAG arrangement (triggers on left → processing in middle → output on right), auto-laid-out, with no manual positioning needed.
- A “Fit to screen” button and zoom controls in the corner.

**Notebook Tab**: switches to the cell-based development view (Screen 2 content). Same content, different editing surface.

**The Playbook Content (write this actual content into the editor):**

```
# Claims Processing Agent

## Role
You are an insurance claims processing assistant for ACME Insurance, 
serving customers across APAC markets.

## Triggers
This agent is invoked by:
- @trigger(chat) — real-time customer conversations via Gemini Enterprise web app
- @trigger(inbox:claims-queue) — async claims submitted via web portal, processed in priority order
- @trigger(jira:issue-created) — when a new claim ticket is created in @connector(jira) project CLAIMS
- @trigger(drive:file-uploaded) — when supporting documents are uploaded to @connector(google-drive) /claims-inbox/
- @trigger(schedule:weekday-9am) — daily at 9am, process overnight claims backlog

## Skills
This agent uses @skill(customer-empathy) for tone and de-escalation 
patterns, and @skill(apac-compliance) for regional regulatory awareness.

## Knowledge Sources
Use @doc(claims-policy-2024) as the primary policy reference.
For regional variations, consult @doc(apac-regulatory-matrix).

## Connected Systems
This agent connects to the following enterprise systems:
- @connector(salesforce) for customer account and policy data
- @connector(jira) to create and track claims tickets
- @connector(google-drive) for supporting document retrieval
- @connector(slack) to notify the claims team channel

## Process

When a customer submits a claim:

1. Greet the customer and collect their policy number
2. Use @tool(policy-lookup) to retrieve their policy details
3. Search @connector(salesforce) for the customer's account history
4. Use @tool(claims-history) to check for prior claims in the last 12 months
5. Validate the claim against @doc(claims-policy-2024) coverage rules

### Escalation Rules
- If claim amount exceeds $50,000, route to @agent(senior-adjuster)
- If the policy is flagged, apply @guard(fraud-detection) before proceeding
- For claims involving @data(high-risk-categories), require manager approval
- Create a tracking ticket in @connector(jira) for all escalations
- Notify @connector(slack) #claims-escalations channel

### Response Format
All responses must conform to @schema(claims-response-v2) and include
the claim reference number and estimated processing time.

## Compliance
All interactions are subject to @guard(pii-redaction) and 
@guard(apac-compliance-rules). Never disclose internal policy thresholds.
```

**Smart Chip Behavior:**

- Each `@type(name)` renders as an inline chip — colored pill with an icon prefix
- Typing `@` opens an autocomplete dropdown, categorized by type (docs, tools, agents, guards, data, schemas) — filtered by IAM permissions
- Hovering a chip shows a popover card:
  - Name, type, version (e.g., “v2.3”), owner
  - Status badge: Draft | Published | Deprecated
  - Last updated timestamp
  - “Open in Registry →” link
  - For tools: parameter summary and endpoint URL
  - For docs: snippet preview of content
  - For agents: sub-agent description and its own chip references
  - For connectors: product logo, sync status (Last synced: 2 min ago), entity types available (e.g., “Issues, Comments, Worklogs”), supported actions list (e.g., “Search Issues, Create Issue, Add Comment, Upload Attachment”), data store region, auth method (OAuth/API Token), and “Manage in Console →” link
  - For skills: SKILL.md name + description from frontmatter, activation mode (Pinned/On-Demand), scope (Workspace/User/Extension), bundled resources count (scripts, templates, references), “View SKILL.md →” link
- Clicking a chip opens the Inspector sidebar with full details
- Unresolved chips (referenced but not in registry) show as dashed-outline red chips with a ⚠️ icon and a “Create →” action button
- Draft chips show as yellow-outline chips

**The `@` Autocomplete Dropdown:**

- Trigger: typing `@` anywhere in the document
- Sections: Recently Used | Triggers | Connectors | Skills | Documents | Tools | Agents | Guards | Data | Schemas
- **Triggers section** shows available invocation patterns:
  - `@trigger(chat)` — real-time streaming conversation
  - `@trigger(inbox:...)` — async queue with named queue ID
  - Event triggers from connected systems: `@trigger(slack:message-posted)`, `@trigger(drive:file-uploaded)`, `@trigger(sheets:cell-changed)`, `@trigger(jira:issue-created)`, `@trigger(gmail:new-message)`, etc. — these are dynamically populated from active `@connector` configurations
  - `@trigger(schedule:...)` — cron expressions with human-readable preview (e.g., “Every weekday at 9:00 AM”)
  - `@trigger(webhook:custom)` — raw webhook endpoint with generated URL
  - Each trigger shows: icon, type label, associated connector (if event-based), current status (active/paused)
- **Connectors section** shows all Gemini Enterprise connectors configured for this org:
  - Google-native: Drive, Calendar, Gmail, BigQuery, Cloud Storage, Spanner, etc.
  - Third-party: Jira Cloud, Salesforce, Confluence, Slack, ServiceNow, SharePoint, Box, Dropbox, HubSpot, Monday, GitHub, Outlook, OneDrive, etc.
  - Each connector shows: icon (product logo), name, sync status (Active/Syncing/Error), entity count, available actions (e.g., “Search, Create Issue, Add Comment” for Jira)
  - Connectors that are available at org level but not yet connected for this project show as “Available — Connect →”
- **Skills section** shows installable/reusable capability bundles (SKILL.md backed):
  - Each skill shows: name, description, activation status, scope (Workspace/User/Extension)
  - Skills can be pinned to an agent (always active) or on-demand (activated when the LLM identifies a matching task)
  - Example skills: “customer-empathy”, “apac-compliance”, “code-reviewer”, “data-analyst”, “sop-writer”
- Each item shows: icon, name, brief description, version badge, permission level (viewer/invoker/editor)
- Search/filter bar at top
- “Create new…” option at bottom of each section
- Items the user doesn’t have permission to use are greyed out with a lock icon and “Request Access” link
- Show keyboard shortcut hints (e.g., `@t:` to filter to tools, `@c:` to filter to connectors, `@s:` to filter to skills)

### Screen 2: Notebook / Scratchpad View

**A Colab-style notebook for agent development.** Accessible via the “Notebook” tab in the Playbook Editor (same source of truth, different editing surface).

**Cell Types (each visually distinct):**

1. **Trigger Cell** (always at the top of the notebook)
- Orange left-border with a “⚡ Triggers” header
- Each trigger rendered as an interactive row:
  - Trigger type icon (chat bubble, inbox tray, webhook arrow, clock, connector logo for events)
  - `@trigger` chip (e.g., `@trigger(jira:issue-created)`)
  - Configuration panel (inline, expandable):
    - For **chat**: model selector, streaming toggle, max turns
    - For **inbox**: queue name, priority rules (e.g., “VIP customers first”), concurrency limit
    - For **event triggers**: source connector chip (e.g., `@connector(slack)`), event type dropdown (message-posted, reaction-added, file-shared), filter rules (e.g., “channel = #claims-intake”, “file type = PDF”)
    - For **schedule**: cron expression builder with human-readable preview, timezone selector, “next 5 runs” preview
    - For **webhook**: auto-generated endpoint URL with copy button, auth method (API key / OAuth / none), payload schema preview
  - Status toggle: Active / Paused
  - “Test trigger” button: simulates an incoming event and runs the agent loop
- Multiple triggers on the same agent are listed as rows — the agent can be invoked multiple ways simultaneously
- Visual annotation: “These are the entry points of the agent loop. Each trigger starts an Observe→Reason→Act cycle.”
1. **Playbook Cell** (markdown + smart chips)
- Same rendering as the main editor
- Light teal left-border accent
1. **Tool Definition Cell**
- Header: tool name, version, MCP server badge
- Body: structured form OR code editor for the tool schema
- Show as a card with indigo left-border
- Fields: name, description, parameters (table), authentication method, endpoint URL
- “Deploy to Cloud Run” button with status indicator
- “Test” button that opens an inline request/response panel
1. **Test Cell**
- Input: sample user message / scenario
- Output: **Loop Iteration Visualizer** — NOT a linear trace, but discrete loop iterations:
  - Each iteration is a collapsible card showing:
    - **Observe**: what the agent saw (user input on iteration 1, tool result on subsequent iterations)
    - **Reason**: which section of the playbook the LLM attended to (highlighted excerpt), which skill activated, confidence score
    - **Act**: which `@` reference it resolved and called (chip rendered inline), parameters sent
    - **Result**: what came back, with timing (e.g., “@tool(policy-lookup) → 340ms → { policy_id: …, coverage: … }”)
    - **Decision**: “Loop again” (with reason: “need more data”) or “Respond” (final output)
  - The iteration cards stack vertically, numbered: Loop 1 → Loop 2 → Loop 3 → Final Response
  - A mini Problem Space diagram in the corner dims the `@` references already used (showing the agent narrowing its own space through the loop)
  - Guard checks appear as interstitial bars between iterations: “✓ @guard(pii-redaction) passed” or “✗ @guard(fraud-detection) BLOCKED — escalating”
- Green left-border
- “Run” button with total execution time, token count, and loop count display
- Visual makes the loop *boring and obvious* — the viewer sees there’s no magic, just observe-reason-act repeated
1. **Data Cell**
- Embedded mini-spreadsheet (5-10 rows) or BigQuery preview
- Emerald left-border
- “Connect to Sheet” / “Connect to BigQuery” buttons
- Shows live row count and last sync time
1. **Schema Cell**
- JSON Schema editor with visual form mode toggle
- Slate left-border
- Shows example output conforming to the schema
1. **Skill Cell** (NEW — maps to SKILL.md format)
- Header: skill name, version, scope badge (Workspace/User/Extension), activation mode toggle (Pinned/On-Demand)
- Body mirrors SKILL.md structure:
  - YAML frontmatter section: `name`, `description` (editable inline)
  - Markdown body: the skill instructions (rich editor with smart chips!)
  - Resource panel: collapsible list of bundled files (scripts/, references/, assets/)
- Violet left-border
- Skills are composable: a skill’s instruction body can itself contain `@doc`, `@tool`, `@connector` references
- “Install to Workspace” / “Install to User” / “Publish to Registry” buttons
- “Test Activation” button: simulates a user prompt and shows whether the LLM would activate this skill
- Visual indicator showing skill precedence: Workspace > User > Extension (like Gemini CLI)
1. **Connector Cell** (maps to Gemini Enterprise data stores)
- Header: connector product logo + name (e.g., “Jira Cloud”), sync status indicator
- Body shows:
  - Entity types as toggleable rows: Issues ✓, Comments ✓, Worklogs ✗, Attachments ✓
  - Actions list with enable/disable toggles: Search Issues, Create Issue, Add Comment, Upload Attachment
  - Sync configuration: Full sync frequency, Incremental sync frequency
  - Auth status: “Connected as user@company.com” with re-auth button
  - Data store region selector
- Blue left-border
- “Open in Gemini Enterprise Console →” link
- Mini query tester: type a natural language query and see what the connector returns
1. **Code Execution Cell (The Escape Hatch)** ⚠️
- Behind an admin toggle: “Enable unrestricted code execution” (off by default)
- Red/orange left-border with a warning stripe pattern — visually distinct from all other cells
- Header: “⚠️ Unrestricted Code Execution” with badges: “Dev Only” | “Not available in production”
- Body: full code editor (Monaco) with Python/TypeScript selector
- The agent can write AND execute arbitrary code in this cell — the omnipotent harness
- Output panel shows execution result, stdout/stderr, timing
- **Purpose**: prototyping. Before you build a proper `@tool` or `@connector`, you test the raw capability here. “Can I call the Jira API? Let me write the code and see.” Once it works, you promote it: a “Convert to Tool” button extracts the code into a Tool Cell with proper schema. A “Convert to Skill” button wraps it as a skill with a SKILL.md.
- Shows the **spectrum**: this cell is the “infinite problem space.” Every other cell type is a reduction of this. The playbook with `@` references is the maximally constrained version. The code cell is the unconstrained version. Same loop underneath.
- In production deployments (shown as a toggle in the top bar), code cells are disabled and hidden. Only governed `@` references remain. This communicates the journey: prototype in the open space → harden into governed components → deploy the constrained version.

**Key Interaction: Unresolved Reference → Cell Creation**

- When someone types `@tool(shipping-status)` in a playbook cell and it doesn’t exist:
  - The chip renders as unresolved (red dashed)
  - An inline action appears: “This tool doesn’t exist. Create it?”
  - Clicking “Create” offers a choice:
    - **“Scaffold Tool”** → inserts a new Tool Definition Cell below, pre-populated with inferred parameters and a stub MCP server endpoint
    - **“Prototype First”** → inserts a Code Execution Cell where the user can write raw code to test the capability before formalizing it as a tool
    - **“Use Existing Connector”** → searches connectors for matching capability (e.g., “shipping-status” might match a Shopify or SAP connector action)
  - The chip transitions from red → yellow (draft) → green (ready) as the tool is defined and deployed
- Same pattern works for `@connector(...)` references: if the connector isn’t configured, the system offers “Connect in Gemini Enterprise Console →” or “Prototype with code first”

### Screen 3: Registry & Catalog Browser

**An asset catalog for all @-referenceable resources.** Accessible from the editor sidebar or as a standalone view.

**Layout:**

- Search bar with type filters (chips as toggle buttons: All | Connectors | Skills | Docs | Tools | Agents | Guards | Data | Schemas)
- Grid/List toggle
- Sort: relevance, recently updated, most referenced, alphabetical

**Each Registry Entry Card:**

- Type icon + colored badge
- Name and version
- Description (2 lines, truncated)
- Owner avatar + name
- Status: Draft | Published | Deprecated (with visual treatment)
- Usage count: “Referenced in 12 playbooks”
- Last updated: relative time
- Permission indicator: what the current user can do (view/invoke/edit/admin)
- Tags/labels for organization

**Detail View (when card is clicked):**

- Full metadata
- Version history timeline
- Dependency graph: “Referenced by” (which playbooks use this) and “Depends on” (what this asset itself references)
- Permission panel showing IAM bindings (groups and users with their roles)
- For tools: live health status, latency p50/p95, error rate (from Apigee metrics)
- For agents: conversation volume, satisfaction metrics
- “Open in Editor” / “Open in Notebook” buttons

### Screen 4: Permission & Sharing Modal

**Mirrors Google Docs sharing dialog but for agent assets.**

**Layout:**

- Asset name and type at top
- “People and groups with access” list:
  - Each row: avatar, name/email, role dropdown (Viewer | Invoker | Editor | Admin)
  - Google Groups show with group icon and member count
  - “Inherited from: APAC Support Team catalog” label where permissions cascade
- “Add people or groups” input field
- “General access” section:
  - “Restricted” (only people with explicit access)
  - “Organization” (anyone in the Google Workspace org can discover)
  - “Published” (available in the public registry for cross-org sharing)
- Link sharing toggle
- Advanced: “Service Perimeter: apac-finance-perimeter” label showing VPC-SC binding
- Note at bottom: “Permissions determine @-reference visibility. Users without Invoker access cannot reference this asset in playbooks.”

### Screen 5: Gemini Live Authoring Session

**A split-screen showing a Gemini Live conversation on the left and a playbook being generated on the right. The authoring agent is ITSELF an agent running the same loop — this meta-circularity should be visible.**

**Left Panel: Conversation Interface**

- Voice waveform visualization at top (showing active Gemini Live session)
- Chat-style transcript below:
  - User: “I need an agent that handles our customer refund process. It should check the order status in Shopify, verify the refund policy, and either process the refund or escalate to a manager.”
  - Gemini: “I’ll create a refund processing agent. I found some existing assets in your registry that might be relevant: @tool(shopify-orders) for order lookup, @doc(refund-policy-q4) for policy rules, and @agent(support-manager) for escalation. I also see you have @connector(salesforce) and @connector(slack) connected — should the agent pull customer data from Salesforce and notify the team on Slack when a refund is processed?”
  - User: “Yes, use Salesforce for customer lookup. And add Slack notifications for refunds over a thousand dollars.”
  - Gemini: “Got it. I’ll also apply @skill(customer-empathy) for tone guidance and @guard(pii-redaction) since we’re handling customer data. I need a new tool to check if the item has been returned to your warehouse — should I scaffold @tool(warehouse-return-check) as a draft?”
  - User: “Yes, scaffold it. My engineering team can implement the endpoint.”
  - Gemini: “Done. I’ve created the playbook with the loop running across your connected systems. The agent observes the customer request, reasons against the refund policy doc, acts via Salesforce lookup and Shopify order check, and either processes the refund or escalates. Here’s the draft…”
- Microphone button with pulse animation (active listening state)

**Right Panel: Live Playbook Generation**

- The playbook document populating in real-time as the conversation progresses
- Smart chips appearing as Gemini mentions assets — connectors, skills, tools, docs, guards all rendering in their respective colors
- Yellow highlight on newly added sections (like Google Docs’ “just typed” highlight)
- The unresolved `@tool(warehouse-return-check)` shows as yellow/draft chip
- “Accept Draft” / “Keep Editing” buttons at bottom

**Bottom Drawer (collapsible): “Meta — The Authoring Agent”**

- A subtle, collapsible panel showing that the Gemini Live authoring agent is itself running the same loop:
  - Its own playbook context: “You are an agent-authoring assistant. You have access to the registry, connectors, and skills catalog.”
  - Its own `@` references visible: `@skill(skill-creator)` (from Gemini CLI), `@connector(google-drive)` (to search for existing docs), `@data(registry-catalog)` (to suggest existing assets)
  - A mini loop trace: “Observe: user described refund process → Reason: matched ‘Shopify’ to existing tool, ‘customer data’ to Salesforce connector → Act: queried registry for matching assets → Observe: found 3 matches → Reason: assembled playbook draft”
  - This panel is *not* prominent — it’s a disclosure for power users. But its existence communicates: the system that builds agents is itself an agent. Same loop. Same `@` references. Turtles all the way down, but all the same shape.

### Screen 6: Embedded Agent in Google Docs (Workspace Integration Mockup)

**A mockup showing a regular Google Doc with an embedded agent block.**

- Standard Google Docs chrome (toolbar, menu bar, rulers)
- Regular document content above: a team SOP document with normal prose
- A special embedded block (visually distinct, like a Docs smart canvas embed):
  - Header bar: “🤖 Embedded Agent: Customer Inquiry Router” + status badge + edit/expand icons
  - Compact playbook view (collapsed, showing first 3-4 lines with chip references)
  - “Try it” button that opens an inline chat panel within the Doc
  - “Open full editor →” link
- Below the embed: more regular document prose

### Screen 7: Sheets as Tool Schema Definition

**A Google Sheets mockup where a spreadsheet defines a tool’s parameter schema.**

- Standard Sheets chrome
- Sheet tab named “Tool: policy-lookup”
- Column headers: Parameter | Type | Required | Description | Validation | Default | Example
- 4-5 rows of parameter data:
  - policy_id | string | yes | The customer’s policy ID | regex: POL-[A-Z]{2}-[0-9]{6} | — | POL-SG-001234
  - include_riders | boolean | no | Include policy riders/addons | — | false | true
  - effective_date | date | no | Check policy as of this date | must be ≤ today | today | 2024-01-15
  - format | enum | no | Response format | oneOf: summary, full, minimal | summary | full
- A sidebar panel: “Agent Builder” showing:
  - Generated OpenAPI spec preview (read-only, auto-derived from the sheet)
  - “Register as @tool(policy-lookup)” button
  - Version: v2.1 | Status: Published
  - “Sync changes” toggle (auto-update tool schema when sheet is edited)
  - MCP Server endpoint URL with copy button

### Screen 8: Skill Editor (SKILL.md Authoring)

**A dedicated editor for creating and managing agent skills — the reusable capability bundles that follow the SKILL.md format from Gemini CLI / skills.sh.**

This screen demonstrates that a skill is itself a document with the same smart-chip-powered authoring experience. Skills are meta: they’re instructions that teach agents how to behave in specific domains.

**Layout:**

- Top bar: skill name (“apac-compliance”), version, scope selector (Workspace | User | Extension), activation mode (Pinned | On-Demand)
- Left panel: SKILL.md editor with two sections:
  - **Frontmatter** (rendered as a structured form card):
    - `name`: editable text field
    - `description`: editable textarea — “Use this skill when the agent handles regulatory compliance questions in APAC markets. Covers MAS, APRA, RBI, OJK, and FSC regulations.”
    - These fields determine when the LLM auto-activates the skill
  - **Body** (rich markdown editor with smart chips):
    
    ```
    # APAC Compliance Skill
    
    ## Regional Rules
    When handling queries involving Singapore customers, always reference
    @doc(mas-guidelines-2024) and apply @guard(pdpa-compliance).
    
    For Australian customers, consult @doc(apra-prudential-standards) 
    and ensure responses conform to @schema(apra-disclosure-format).
    
    ## Connected Data
    Search @connector(salesforce) for customer jurisdiction data.
    Verify regulatory status via @tool(regtech-api).
    
    ## Escalation
    If a query involves cross-border transactions, route to 
    @agent(compliance-officer) with full context attached.
    ```
- Right panel: “Skill Resources” file browser:
  - `scripts/` — **executable code bundled with the skill** (Python, TypeScript). These are audited, versioned scripts the agent can run WITHIN the skill boundary. This is the “omnipotent harness, governed”: the agent gets code execution, but only the code that’s been reviewed and bundled.
    - Example: `scripts/validate_kyc.py` — a Python script that checks KYC requirements against a regulatory database
    - Example: `scripts/format_disclosure.ts` — formats output per APRA requirements
    - Each script shows: language icon, last audit date, “Run Test” button
  - `references/` — reference docs, regulatory PDFs, templates
  - `assets/` — images, diagrams, decision trees
  - Upload button to add resources
  - Each resource shows file size, type icon
  - **A visual annotation** connecting scripts/ to the skill body: arrows showing which instruction lines invoke which scripts. This makes visible that the skill is instructions + code + resources — not just a prompt.
- Bottom panel: “Test Activation” area:
  - Input: sample user prompt (e.g., “What are the KYC requirements for our Singapore clients?”)
  - Output: shows whether this skill would activate, the activation confidence score, and a simulated response using the skill’s instructions
  - If the skill includes scripts, shows the code execution trace: “Activated validate_kyc.py → checked SG jurisdiction → returned compliant”
  - “Activate manually” toggle for testing

**Key Concept to Demonstrate:**
Skills are the bridge between the “omnipotent harness” and the “governed enterprise deployment.” They are:

- **Cached expertise**: instructions that reduce the reasoning space (the agent doesn’t explore “what do I know about APAC compliance?” from scratch)
- **Cached code execution**: bundled scripts that give the agent Turing-completeness WITHIN the skill boundary, but not beyond it
- **Composable**: a skill’s instruction body uses the SAME `@` reference system as a playbook — skills can reference docs, tools, connectors, guards, schemas, and even other skills
- **The same format everywhere**: identical SKILL.md structure whether authored in Gemini CLI (for developers), in this editor (for business analysts), or in Gemini Enterprise Agent Designer (for no-code users)
- Skills installed at workspace level are available to ALL playbooks in that workspace
- The skill precedence hierarchy (Workspace > User > Extension) is visualized
- Show the promotion flow: Code Execution Cell → test and validate → “Promote to Skill” → bundles the code into scripts/, wraps instructions into SKILL.md, registers in the catalog

### Screen 9: Connector Hub (Gemini Enterprise Data Sources)

**A management view showing all Gemini Enterprise connectors available to this workspace, their sync status, available actions, and how they map to `@connector` references in playbooks.**

This screen bridges the Gemini Enterprise admin console and the playbook editor — showing connectors not as infrastructure but as capabilities the agent can use.

**Layout:**

- Header: “Connected Systems” with “Add Connector +” button
- Two sections:

**Google Sources** (cards in a grid):

- Google Drive: icon, “Active”, “3.2M documents indexed”, entities: files, folders
- Gmail: icon, “Active”, last sync 5 min ago, entities: messages, threads, labels, actions: “Search, Send Message”
- Google Calendar: icon, “Active”, actions: “Search Events, Create Event, Update Event”
- BigQuery: icon, “Active”, “12 datasets connected”, data store region: us-central1
- Cloud Storage: icon, “Active”, “47 buckets”, supports unstructured + structured data
- Google Groups: icon, “Active”, used for identity resolution

**Third-Party Sources** (cards in a grid):

- Jira Cloud: Atlassian logo, “Active”, last sync 12 min ago
  - Entities: Issues ✓, Comments ✓, Worklogs ✓, Attachments ✓
  - Actions: Search Issues, Create Issue, Add Comment, Update Issue, Upload Attachment
  - Auth: OAuth (user@company.atlassian.net)
  - “Federated” badge (real-time) vs “Ingested” badge (periodic sync)
- Salesforce: SF logo, “Active”, V2 connector
  - Entities: Accounts, Contacts, Opportunities, Cases
  - Actions: Search, Create Record, Update Record
  - Auth: OAuth connected app
- Slack: Slack logo, “Active”
  - Entities: Messages, Channels, Files
  - Actions: Search Messages, Post Message
  - Rate limit: ~10 req/min shown
- Confluence Cloud: Atlassian logo, “Active”
  - Entities: Pages, Blog Posts, Spaces
  - Actions: Search Content
- ServiceNow: logo, “Active”
  - Entities: Incidents, Knowledge Articles, Change Requests
  - Actions: Search, Create Incident, Update Incident
- SharePoint Online: Microsoft logo, “Active”
  - Entities: Documents, Lists, Sites
  - Actions: Search, Download File
- GitHub: logo, “Active”
  - Actions: Search Repos, Create Branch, Create/Update File, Add Comment to PR, Merge PR
- Box: logo, “Draft” (being configured)
- HubSpot: logo, “Available — Connect →” (not yet connected)

**Each connector card interaction:**

- Click → expands to show full detail panel:
  - Sync schedule and history (timeline of sync events with success/error status)
  - Entity data store IDs (for API reference)
  - Action configuration: which actions are enabled, auth per action
  - ACL/Identity mapping status: “Using Google Identity” or “Workforce Identity Federation configured”
  - VPC Service Controls perimeter assignment
  - Data residency/region configuration
  - Usage metrics: queries/day, actions/day, error rate
- Hover → shows quick stats: “Referenced in 8 playbooks, 3 agents”
- The card shows a visual “health” indicator matching what you’d see in the Gemini Enterprise console

**Key Concept to Demonstrate — Connectors as Governed Space Expansion:**
Connectors are the bridge between Gemini Enterprise’s data infrastructure and the playbook editor. But more importantly, they visually demonstrate the “reducing the problem space” idea:

- **Expansion visual**: When you toggle a connector ON (e.g., activate Jira Cloud), its actions appear in the agent’s available action space. Show this as an animation: the connector card “opens” and its actions flow outward into an “Available Actions” summary bar at the top of the screen. The agent’s capability surface visibly grows.
- **Reduction visual**: When you toggle a connector OFF, those actions retract. The capability surface shrinks. Show a counter: “Agent can perform 23 actions across 6 systems” → toggling off Jira → “Agent can perform 17 actions across 5 systems.”
- **The contrast with code execution**: A small annotation at the bottom of the hub: “Without connectors, the agent could write raw code to call these APIs. Connectors provide the same capabilities with governance, authentication, sync, and audit built in.” This communicates: connectors are cached, governed expansions of the omnipotent code execution space.
- **ACL enforcement visualization**: Show that connector access is governed by the same IAM model as everything else. A connector’s actions are only available if the user (and the agent’s service account) have the right permissions. Grey out actions the current user can’t invoke. Show: “Salesforce: Create Record requires roles/agentbuilder.connector.writer — Request Access →”

### Screen 10: Version History & Diff View

**The agent’s full version timeline with chip-aware diffing. This screen makes the “agent is text, so versioning is diffing” concept tangible.**

Accessible from the history button (clock icon) in the editor top bar, or by clicking the version badge.

**Layout — Three Panels:**

**Left Panel: Version Timeline**

- Vertical timeline, newest at top, scrollable
- Each version entry shows:
  - Version number: `v2.2` with semver badge (patch = grey, minor = blue, major = orange)
  - Status badge: Draft | Staging | Production | Rolled Back | Deprecated
  - Author avatar + name + timestamp (“Priya Sharma · 2 hours ago”)
  - **Auto-generated semantic change summary** (1-2 lines):
    - “Added @connector(slack) for team notifications. Changed escalation threshold $50k → $25k.”
    - “Removed @guard(legacy-filter). Added @trigger(schedule:weekday-9am).”
    - “Initial version. 3 tools, 2 connectors, 1 guard.”
  - **Chip diff badges**: small colored pills showing what changed:
    - Green `+@connector(slack)` — added
    - Red `-@guard(legacy-filter)` — removed
    - Yellow `~@tool(policy-lookup)` — modified
    - Orange `+@trigger(schedule:weekday-9am)` — added
  - Click to select this version for comparison
  - “Restore this version” button (with confirmation modal)
  - “Fork from this version” button (creates a new branch/copy)
- Current production version has a prominent “LIVE” badge with green pulse
- A compare mode: select any two versions with checkboxes to diff them

**Center Panel: Chip-Aware Diff View**

- Split-screen or unified diff (toggle between the two)
- The diff is NOT raw text. It’s the rendered playbook with smart chips, where changes are visually annotated:
  - **Added lines**: green background, chips render in their normal colors with a green glow border
  - **Removed lines**: red background with strikethrough, chips render faded/ghosted with red glow border
  - **Modified lines**: yellow background, with inline change markers showing old→new values
  - **Unchanged lines**: normal rendering, collapsed by default (expand to see full context)
- **Chip-level change detail**: when a chip is modified (e.g., tool parameters changed), hovering shows a mini-diff popover:
  - “@tool(policy-lookup) v2.1 → v2.3: added `include_riders` parameter, changed endpoint URL”
  - “@guard(fraud-detection) threshold changed: $50,000 → $25,000”
  - “@trigger(jira:issue-created) filter changed: project=CLAIMS → project=CLAIMS-APAC”
- **Structural annotations** in the diff margin:
  - “⊕ New trigger added — agent now invoked on Drive file upload”
  - “⊖ Guard removed — PII redaction no longer enforced (⚠️ review recommended)”
  - “↔ Connector upgraded — Salesforce V1 → V2”
  - These annotations are auto-generated from the typed nature of the `@` references — the system knows the *semantic meaning* of each change because the chips are typed

**Right Panel: Graph Diff (compiled flow comparison)**

- The compiled Flow view, but showing TWO versions overlaid:
  - **Added nodes**: pulse green, drawn with solid borders, labeled “NEW”
  - **Removed nodes**: ghost red, drawn with dashed borders, semi-transparent, labeled “REMOVED”
  - **Unchanged nodes**: normal rendering
  - **Modified nodes**: yellow border glow, with change indicator
  - **Added edges**: green animated flow
  - **Removed edges**: red dashed lines, fading out
  - **Added trigger entry points**: new orange entry nodes appearing on the left
  - **Skill region changes**: if a skill was added/removed, the colored overlay region appears/disappears
- This is the “explain what changed to my manager” view. A non-technical stakeholder can see: “a new Slack notification path was added, the old filter was removed, and a scheduled trigger was added.”
- Toggle: “Show changes only” (hides unchanged nodes) vs “Show full graph” (shows everything with changes highlighted)

**Key Interactions:**

- **Version comparison**: drag-select any two versions on the timeline → diff updates in center and right panels
- **Review workflow**: “Request Review” button on a Draft version opens a sharing dialog. Reviewers see the diff, add comments on specific lines/chips, and “Approve” or “Request Changes”. This mirrors Google Docs suggestion mode but for agent changes.
- **Publish with version bump**: clicking “Publish” requires selecting semver bump:
  - **Patch** (v2.1 → v2.1.1): “Bug fixes, minor wording changes, no structural changes”
  - **Minor** (v2.1 → v2.2): “New capabilities added (tools, connectors, triggers), existing behavior preserved”
  - **Major** (v2.1 → v3.0): “Breaking changes: guards removed, escalation logic restructured, triggers changed”
  - The system suggests the bump level based on the diff: “This change adds a connector and modifies a guard. Suggested: Minor version bump.”
- **Rollback**: “Restore this version” on any historical version creates a new version that copies the old content. The timeline shows: “v2.3 — Rolled back to v2.1 by Vamsi K · 5 min ago”. This is non-destructive — the intermediate versions remain in history.
- **Branch/Fork**: “Fork from this version” creates a copy of the playbook at that version. The fork lives as a separate document in Drive, linked back to the original. Useful for experimenting with major changes before merging back.
- **Audit trail**: for regulated industries, the version timeline IS the audit trail. “Who changed the escalation logic and when?” is answered by clicking through versions. Each version shows the author, timestamp, change summary, and approval status. Maps to Artifact Registry audit logging.

**Visual Design:**

- The timeline should feel like Google Docs version history — familiar, clean, chronological
- The chip-aware diff should feel like a GitHub PR diff but with rendered smart chips instead of raw code
- The graph diff should feel like a before/after architectural diagram — the kind of thing you’d put in a change management deck
- Use animation: when switching between versions, chips should smoothly transition (morph, fade in/out) rather than hard-cutting

-----

## Technical Implementation Notes

### Stack

- **React** with TypeScript
- **Tailwind CSS** for styling (but with extensive custom CSS for the editorial/document feel)
- Use **Zustand** or React Context for state management across screens
- **Monaco Editor** (from VS Code) for code cells in the notebook — import via CDN
- **Framer Motion** for animations (chip insertion, cell expansion, panel transitions)

### Build as a Single React App with Routing

- `/editor` → Screen 1 (Playbook Editor)
- `/notebook` → Screen 2 (Notebook View)
- `/registry` → Screen 3 (Registry Browser)
- `/permissions` → Screen 4 (as modal overlay, triggerable from any screen)
- `/live-authoring` → Screen 5 (Gemini Live)
- `/docs-embed` → Screen 6 (Google Docs mockup)
- `/sheets-schema` → Screen 7 (Sheets mockup)
- `/skill-editor` → Screen 8 (Skill Editor)
- `/connectors` → Screen 9 (Connector Hub)
- `/history` → Screen 10 (Version History & Diff)
- `/` → Landing/nav page with cards linking to each screen

### Smart Chip Data Model

```typescript
type ChipType = 'doc' | 'tool' | 'agent' | 'guard' | 'data' | 'schema' | 'connector' | 'skill' | 'trigger';

type ChipStatus = 'resolved' | 'draft' | 'unresolved' | 'deprecated';

interface SmartChip {
  id: string;
  type: ChipType;
  name: string;                    // display name
  registryId: string;              // full registry path
  version: string;                 // semver
  status: ChipStatus;
  owner: string;
  description: string;
  permissions: {
    currentUser: 'viewer' | 'invoker' | 'editor' | 'admin';
  };
  metadata: Record<string, any>;   // type-specific metadata
  lastUpdated: string;             // ISO timestamp
  usageCount: number;              // how many playbooks reference this
  endpoint?: string;               // for tools — MCP server URL
  healthStatus?: 'healthy' | 'degraded' | 'down'; // for tools
}

// Connector-specific metadata (extends SmartChip.metadata)
interface ConnectorMetadata {
  provider: 'google' | 'third-party';
  product: string;                 // "Jira Cloud", "Salesforce", "Gmail", etc.
  productIcon: string;             // URL to product logo
  syncStatus: 'active' | 'syncing' | 'error' | 'paused';
  lastSyncTime: string;            // ISO timestamp
  syncMode: 'federated' | 'ingested'; // real-time vs periodic
  entities: Array<{
    name: string;                  // "Issues", "Comments", etc.
    enabled: boolean;
    documentCount: number;
  }>;
  actions: Array<{
    name: string;                  // "Create Issue", "Search", etc.
    enabled: boolean;
    authRequired: boolean;
  }>;
  authMethod: 'oauth' | 'api-token' | 'service-account';
  authUser?: string;               // connected user identity
  dataStoreId: string;             // Gemini Enterprise data store ID
  dataStoreRegion: string;         // "global", "us", "eu"
  vpcPerimeter?: string;           // VPC Service Controls perimeter name
  identityProvider: 'google' | 'workforce-identity-federation';
}

// Skill-specific metadata (extends SmartChip.metadata)
interface SkillMetadata {
  scope: 'workspace' | 'user' | 'extension';
  activationMode: 'pinned' | 'on-demand';
  frontmatter: {
    name: string;
    description: string;           // determines when LLM auto-activates
  };
  resources: {
    scripts: string[];             // filenames in scripts/
    references: string[];          // filenames in references/
    assets: string[];              // filenames in assets/
  };
  referencedChips: string[];       // IDs of chips used within the skill body
  precedenceLevel: number;         // for conflict resolution
  installSource?: string;          // "skills.sh", "manual", "registry"
}

// Trigger-specific metadata (extends SmartChip.metadata)
interface TriggerMetadata {
  triggerType: 'chat' | 'inbox' | 'event' | 'schedule' | 'webhook';
  status: 'active' | 'paused';
  // Chat triggers
  streamingEnabled?: boolean;
  maxTurns?: number;
  // Inbox triggers
  queueName?: string;
  priorityRules?: string;
  concurrencyLimit?: number;
  // Event triggers (from connectors)
  sourceConnectorId?: string;      // which @connector provides this event
  eventType?: string;              // "issue-created", "file-uploaded", "message-posted"
  filterRules?: Record<string, string>; // "channel": "#claims-intake"
  // Schedule triggers
  cronExpression?: string;         // "0 9 * * 1-5"
  humanReadableSchedule?: string;  // "Every weekday at 9:00 AM"
  timezone?: string;               // "Asia/Singapore"
  nextRuns?: string[];             // next 5 scheduled execution times
  // Webhook triggers
  webhookUrl?: string;             // auto-generated endpoint
  authMethod?: 'api-key' | 'oauth' | 'none';
  payloadSchema?: Record<string, any>;
  // Maps to Google Cloud services
  gcpService: 'gemini-enterprise' | 'pubsub' | 'eventarc' | 'cloud-scheduler' | 'cloud-functions';
}

// Compiled graph node (derived from playbook — NEVER authored directly)
interface CompiledGraphNode {
  id: string;
  type: 'trigger-entry' | 'process' | 'decision' | 'gate' | 'grounding' | 'output';
  chipRef?: string;                // ID of the SmartChip this node represents
  label: string;
  sourceLines: number[];           // line numbers in the playbook that generated this node
  position?: { x: number; y: number }; // auto-laid-out, not user-editable
}

interface CompiledGraphEdge {
  from: string;                    // node ID
  to: string;                      // node ID
  label?: string;                  // "pass", "fail", "if amount > $50k"
  type: 'flow' | 'conditional-true' | 'conditional-false' | 'guard-pass' | 'guard-block';
}

interface CompiledGraph {
  nodes: CompiledGraphNode[];
  edges: CompiledGraphEdge[];
  skillRegions: Array<{            // colored overlay regions
    skillChipId: string;
    nodeIds: string[];             // which nodes fall within this skill's scope
  }>;
}

// Version & Diff Model
type VersionStatus = 'draft' | 'staging' | 'production' | 'rolled-back' | 'deprecated';
type SemverBump = 'patch' | 'minor' | 'major';

interface PlaybookVersion {
  version: string;                 // semver e.g. "2.1.0"
  status: VersionStatus;
  author: {
    name: string;
    email: string;
    avatarUrl: string;
  };
  timestamp: string;               // ISO timestamp
  changeSummary: string;           // auto-generated semantic summary
  chipChanges: ChipChange[];       // structured list of @-reference changes
  reviewStatus?: 'pending' | 'approved' | 'changes-requested';
  reviewers?: string[];            // email addresses
  content: string;                 // the full playbook text at this version
  compiledGraph: CompiledGraph;    // the compiled graph at this version
}

type ChipChangeAction = 'added' | 'removed' | 'modified';

interface ChipChange {
  action: ChipChangeAction;
  chipType: ChipType;
  chipName: string;
  detail?: string;                 // "threshold changed $50k → $25k", "added include_riders parameter"
}

interface VersionDiff {
  from: PlaybookVersion;
  to: PlaybookVersion;
  lines: DiffLine[];               // line-by-line diff with chip awareness
  chipChanges: ChipChange[];       // aggregated chip-level changes
  graphDiff: {                     // compiled graph diff
    addedNodes: string[];          // node IDs added
    removedNodes: string[];        // node IDs removed
    modifiedNodes: string[];       // node IDs modified
    addedEdges: string[];          // edge IDs added
    removedEdges: string[];        // edge IDs removed
  };
  suggestedBump: SemverBump;       // system-suggested version bump based on change magnitude
  suggestedBumpReason: string;     // "Adds connector and trigger, modifies guard → Minor"
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  lineNumber: { old?: number; new?: number };
  content: string;
  chips?: Array<{                  // chips on this line, with their change status
    chipId: string;
    changeAction?: ChipChangeAction;
  }>;
}
```

### Registry Data (Pre-populate with Realistic Data)

Create a `registry.ts` file with ~30 mock assets across all types:

- 5 docs (policy documents, regulatory guides, FAQs)
- 5 tools (CRM lookup, policy lookup, claims history, payment processor, notification sender)
- 3 agents (senior adjuster, fraud specialist, customer support)
- 3 guards (PII redaction, fraud detection, compliance rules)
- 2 data sources (risk categories sheet, claims database)
- 2 schemas (claims response, escalation request)
- 6 connectors (these map to real Gemini Enterprise connector types):
  - Google Drive (google, active, 3.2M docs, ingested)
  - Gmail (google, active, actions: Search/Send Message)
  - Google Calendar (google, active, actions: Search/Create/Update Events)
  - Jira Cloud (third-party, active, entities: Issues/Comments/Worklogs/Attachments, actions: Search/Create/Update/Comment)
  - Salesforce V2 (third-party, active, entities: Accounts/Contacts/Opportunities/Cases, actions: Search/Create/Update)
  - Slack (third-party, active, entities: Messages/Channels/Files, actions: Search/Post Message, rate limit note)
- 4 skills (SKILL.md-backed capability bundles):
  - “customer-empathy” (workspace scope, pinned, guides tone and de-escalation)
  - “apac-compliance” (workspace scope, on-demand, regional regulatory rules referencing @doc and @guard chips)
  - “data-analyst” (user scope, on-demand, guides data querying and viz)
  - “sop-writer” (extension scope, on-demand, guides SOP document creation)
- 5 triggers (invocation configurations):
  - chat (type: chat, active, streaming enabled)
  - claims-queue (type: inbox, active, priority: VIP-first, concurrency: 5)
  - jira:issue-created (type: event, active, source: Jira Cloud connector, filter: project=CLAIMS)
  - drive:file-uploaded (type: event, active, source: Google Drive connector, filter: folder=/claims-inbox/, filetype=PDF)
  - weekday-9am (type: schedule, active, cron: “0 9 * * 1-5”, timezone: Asia/Singapore, gcpService: cloud-scheduler)

Give them realistic names, descriptions, owners, versions, and usage counts. Some should be draft, some deprecated. At least one should be unresolved (referenced but not yet created). Connectors should have realistic sync timestamps and entity counts. Skills should have realistic frontmatter descriptions that demonstrate when the LLM would activate them.

Create a `connectors.ts` file with the full connector data model including:

- All Google-native connectors: Drive, Gmail, Calendar, BigQuery, Cloud Storage, Spanner, Firestore, Bigtable, AlloyDB, Cloud SQL, Google Sites, Google Groups
- All third-party connectors: Jira Cloud, Confluence Cloud, Salesforce, Slack, ServiceNow, SharePoint Online, OneDrive, Outlook, Box, Dropbox, GitHub, HubSpot, Monday
- Each with: product name, icon placeholder, category (google/third-party), connection status (active/available/draft/error), supported entities, supported actions, auth method
- This data powers both the Connector Hub (Screen 9) and the `@connector` autocomplete dropdown

Create a `versions.ts` file with mock version history for the Claims Processing Agent playbook (5-7 versions showing realistic evolution):

- v1.0.0 (deprecated): “Initial version. Basic claims lookup with @tool(policy-lookup) and @tool(claims-history). Manual escalation only.”
  - Author: Priya Sharma, 3 months ago, status: deprecated
- v1.1.0 (deprecated): “Added @doc(apac-regulatory-matrix) for regional compliance. Added @guard(pii-redaction).”
  - Author: Priya Sharma, 2.5 months ago, status: deprecated, chipChanges: [+@doc(apac-regulatory-matrix), +@guard(pii-redaction)]
- v2.0.0 (rolled-back): “Major restructure. Added @connector(salesforce) and @connector(jira). Introduced @agent(senior-adjuster) escalation. Added @skill(customer-empathy).”
  - Author: Vamsi K, 6 weeks ago, status: rolled-back, chipChanges: [+@connector(salesforce), +@connector(jira), +@agent(senior-adjuster), +@skill(customer-empathy)]
- v2.1.0 (production, LIVE): “Added @guard(fraud-detection). Changed escalation threshold from $100k to $50k. Added @skill(apac-compliance).”
  - Author: Vamsi K, 2 weeks ago, status: production, reviewStatus: approved, chipChanges: [+@guard(fraud-detection), ~escalation threshold, +@skill(apac-compliance)]
- v2.2.0 (staging): “Added @connector(slack) for team notifications. Added @trigger(schedule:weekday-9am) for batch processing. Removed @guard(legacy-filter).”
  - Author: Wei Chen, 2 hours ago, status: staging, reviewStatus: pending, chipChanges: [+@connector(slack), +@trigger(schedule:weekday-9am), -@guard(legacy-filter)]
- v3.0.0-draft (draft): “Experimental: Added @trigger(drive:file-uploaded) for document intake. Restructured escalation to use @agent(compliance-officer) for cross-border cases.”
  - Author: Priya Sharma, 30 min ago, status: draft, chipChanges: [+@trigger(drive:file-uploaded), +@agent(compliance-officer), ~escalation logic]
    The diff between v2.1.0 and v2.2.0 should be the default comparison shown in Screen 10. Pre-compute the line-level diff, chip changes, and graph diff for this pair.

### Key Interactions to Implement

1. **`@` Autocomplete**: In the playbook editor, typing `@` should open a real dropdown with filtered results from the registry, including connectors and skills sections. Selecting an item inserts a styled chip. This is the most important interaction — spend time making it feel polished. The connector section should show product logos. The skills section should show scope badges.
1. **Chip Hover Popovers**: Hovering any chip shows a metadata card. Make these beautiful — they’re the primary way users understand what’s wired up. Connector popovers show sync status and available actions. Skill popovers show frontmatter description and activation mode.
1. **Unresolved → Create Flow**: Clicking “Create” on an unresolved chip should offer the three-way choice: Scaffold Tool / Prototype First (code cell) / Use Existing Connector. Animate the new cell appearing.
1. **Loop Iteration Visualizer**: The test cell “Run” button should show simulated loop iterations (not a linear trace). Each iteration shows Observe→Reason→Act→Result as a collapsible card. Use realistic timing (tool calls 200-800ms, guard checks 50ms, connector queries 300-1200ms). Show 2-4 iterations before the final response. The mini Problem Space diagram should dim used references at each iteration.
1. **Problem Space Visualizer**: The radial diagram in the Inspector’s Space Tab should reactively update as `@` references are added/removed from the playbook. Adding a `@connector` should animate the middle ring expanding. Adding a `@guard` should animate a wall appearing on the outer ring. This is the key visual that makes the “reducing the problem space” idea tangible.
1. **Connector Expansion Animation**: In the Connector Hub, toggling a connector ON should animate its actions flowing into an “Available Actions” summary. The action counter should increment. Toggling OFF should retract the actions and decrement.
1. **Code Cell → Tool Promotion**: In the Code Execution Cell, the “Convert to Tool” button should animate the code cell collapsing into a Tool Definition Cell, extracting parameter schema from the code. “Convert to Skill” should wrap it into a Skill Cell with SKILL.md structure.
1. **Sharing Modal**: The permission dialog should feel identical to Google Docs sharing — users should recognize the pattern immediately.
1. **Gemini Live Transcript**: The conversation should auto-scroll and the playbook panel should update with a typewriter effect as “Gemini” generates content. The meta-circularity drawer should show the authoring agent’s own loop trace updating in real time.
1. **Skill Activation Simulation**: In the Skill Editor’s test panel, entering a prompt should show a confidence bar for whether the skill would activate based on its frontmatter description match, then a simulated response with code execution traces if the skill bundles scripts.
1. **Version Timeline Navigation**: In Screen 10, clicking a version on the timeline should update the center diff panel and right graph diff panel. Selecting two versions via checkboxes should show the comparison between them. The default view compares the current production version (v2.1.0) with the latest staging version (v2.2.0).
1. **Chip-Aware Diff Rendering**: The diff view should render smart chips in both versions with their proper colors and hover popovers. Added chips glow green. Removed chips ghost red with strikethrough. Modified chips glow yellow with a hover popover showing the specific parameter changes.
1. **Graph Diff Overlay**: The right panel graph diff should animate when switching between version comparisons. Added nodes fade in green. Removed nodes fade out red. A toggle switches between “Changes only” (sparse, focused) and “Full graph” (complete topology with changes highlighted).
1. **Publish Flow with Semver**: Clicking “Publish” in the editor top bar should show a modal with: the diff summary, auto-suggested semver bump with reason, reviewer selector (Google Groups + individuals), and an optional change description field. The system suggests: “This change adds 1 connector, 1 trigger, and removes 1 guard → Suggested: Minor (v2.1 → v2.2).”
1. **Review Comments on Diff**: In the diff view, clicking any line or chip should open a comment thread (like Google Docs comments). Reviewers can “Approve”, “Request Changes”, or add line-specific feedback. Comments attach to the specific chip or line, not just a line number — so “I’m concerned about removing @guard(legacy-filter)” is attached to that specific chip change.

### Visual Polish Requirements

- Chips must have subtle shadows and smooth hover transitions
- The editor should have a slight paper-like texture background
- Cell borders should use the accent color system consistently
- Use skeleton loading states where appropriate
- Smooth panel open/close animations (200ms ease-out)
- The `@` dropdown should have a subtle blur-behind effect
- Status badges (Draft/Published/Deprecated) should use distinct shapes, not just colors (accessibility)
- Add subtle grid/dot pattern on the notebook background to differentiate from the document view

### What NOT to Build

- No actual backend / API calls — all data is mocked
- No actual Gemini API integration — the Live authoring screen is scripted
- No actual MCP server deployment — just the UI flow
- No actual Google Docs embed — mock the Docs chrome in HTML/CSS
- No actual code execution — the Code Execution Cell (escape hatch) shows a code editor and a fake output panel, but doesn’t actually run code
- No actual connector sync — connector status, sync times, and entity counts are all mock data
- No actual loop execution — the Loop Iteration Visualizer shows pre-scripted iterations with realistic timing, not real LLM calls
- No actual Problem Space computation — the radial diagram is a reactive visualization driven by which chips are in the mock playbook, not computed from real agent state
- Don’t implement actual markdown parsing — the playbook content can be hardcoded with smart chip components inserted at the right positions
- The skill activation test can show a scripted confidence score and response — no real LLM matching needed

### File Structure

```
src/
  components/
    chips/
      SmartChip.tsx          # The inline chip component
      ChipPopover.tsx        # Hover metadata card (handles all types including connector/skill)
      ChipAutocomplete.tsx   # The @ dropdown (sections: Connectors, Skills, Docs, Tools, etc.)
    editor/
      PlaybookEditor.tsx     # Main editor with Document|Flow|Notebook tabs (Screen 1)
      EditorToolbar.tsx      # Top bar with publish/share/version actions
      InspectorSidebar.tsx   # Right sidebar for chip details + Problem Space Visualizer
      CompiledFlowView.tsx   # Read-only DAG compiled from playbook (Flow tab)
      FlowNode.tsx           # Individual node in compiled graph (trigger/process/decision/gate)
      FlowEdge.tsx           # Directed edge with animation support
      VersionBadge.tsx       # Clickable version indicator in top bar
    notebook/
      NotebookView.tsx       # Notebook layout (Screen 2)
      TriggerCell.tsx        # Trigger configuration cell (always at top)
      PlaybookCell.tsx       # Markdown + chips cell
      ToolCell.tsx           # Tool definition cell
      TestCell.tsx           # Test execution cell with loop iteration visualizer
      DataCell.tsx           # Data preview cell
      SchemaCell.tsx         # Schema editor cell
      SkillCell.tsx          # SKILL.md editor cell (frontmatter + body + resources)
      ConnectorCell.tsx      # Connector config cell (entities, actions, sync, auth)
      CodeExecutionCell.tsx  # Escape hatch code cell with promote-to-tool/skill buttons
    registry/
      RegistryCatalog.tsx    # Grid/list browser (Screen 3)
      RegistryCard.tsx       # Individual asset card (polymorphic for all types)
      RegistryDetail.tsx     # Full detail view
    permissions/
      SharingModal.tsx       # Google-Docs-style sharing (Screen 4)
    live/
      LiveAuthoring.tsx      # Split screen Gemini Live (Screen 5)
      ConversationPanel.tsx  # Chat transcript
      LivePlaybookPanel.tsx  # Real-time playbook generation
    workspace/
      DocsEmbed.tsx          # Fake Google Docs with agent embed (Screen 6)
      SheetsSchema.tsx       # Fake Google Sheets as tool schema (Screen 7)
    skills/
      SkillEditor.tsx        # Full skill authoring view (Screen 8)
      SkillFrontmatter.tsx   # YAML frontmatter editor (name, description)
      SkillBody.tsx          # Rich markdown editor for skill instructions
      SkillResources.tsx     # File browser for scripts/references/assets
      SkillTestPanel.tsx     # Activation testing panel
    connectors/
      ConnectorHub.tsx       # All connectors grid view (Screen 9)
      ConnectorCard.tsx      # Individual connector card (logo, status, entities, actions)
      ConnectorDetail.tsx    # Expanded detail view (sync history, auth, ACL, VPC-SC)
      ConnectorQueryTester.tsx # Mini natural-language query testing panel
    versioning/
      VersionHistory.tsx     # Full version timeline + diff view (Screen 10)
      VersionTimeline.tsx    # Left panel: scrollable version list with semantic summaries
      ChipAwareDiff.tsx      # Center panel: rendered diff with chip-level change annotations
      GraphDiff.tsx          # Right panel: compiled flow overlay showing added/removed/changed nodes
      PublishModal.tsx       # Publish flow with semver bump, reviewer selection, change description
      ReviewThread.tsx       # Comment threads attachable to specific lines/chips in diff
      DiffChip.tsx           # SmartChip variant with added/removed/modified visual states
    shared/
      StatusBadge.tsx        # Draft/Published/Deprecated/Production/Staging badges
      SyncStatusBadge.tsx    # Active/Syncing/Error/Paused for connectors
      ScopeBadge.tsx         # Workspace/User/Extension for skills
      SemverBadge.tsx        # Version number with patch/minor/major color coding
      PermissionIndicator.tsx
      Navigation.tsx         # Top-level nav between screens
  data/
    registry.ts              # All mock registry data (docs, tools, agents, guards, data, schemas, skills, triggers)
    connectors.ts            # Full connector catalog (Google + third-party, entities, actions, auth)
    skills.ts                # Mock skill definitions with frontmatter and bodies
    triggers.ts              # Mock trigger configurations (chat, inbox, event, schedule, webhook)
    versions.ts              # Mock version history with semantic change summaries and chip diffs
    compiledGraph.ts         # Pre-computed compiled graph for the sample playbook + diff between v2.1 and v2.2
    playbook.ts              # The sample playbook content (current version)
    conversation.ts          # Scripted Gemini Live conversation
  styles/
    tokens.css               # Design tokens (colors, spacing, typography)
  App.tsx
  main.tsx
```

-----

## Success Criteria

When the mockup suite is complete, a viewer should:

1. **Immediately understand** that the playbook document IS the agent definition — not a spec that gets translated into something else
1. **Feel the power** of the `@` reference system — that typing `@` gives you access to an entire organizational catalog of capabilities including Gemini Enterprise connectors (Jira, Salesforce, Slack, etc.), reusable skills, and trigger configurations
1. **See the loop** — the Test Cell’s iteration visualizer should make it obvious that every agent is just Observe→Reason→Act→Observe. No magic. No complex state machines. A loop with a governed action space.
1. **Grasp the space** — the Problem Space Visualizer should make it visceral that each `@` reference shapes the agent’s action manifold. Skills reduce. Connectors expand (governedly). Guards constrain. Triggers define entry points. The playbook IS the manifold definition.
1. **Understand the spectrum** — from the Code Execution Cell (omnipotent, unconstrained) to the production playbook (fully governed). Every tool, connector, and skill is a cached reduction of the code execution space. The mockup should show the promotion flow: prototype in code → harden into a tool/skill → deploy the constrained version.
1. **See the three lenses** — Document (prose authoring), Flow (compiled graph visualization), Notebook (cell-based development) are three views of the SAME agent. The Flow tab is derived and read-only — never authored directly. Clicking a graph node navigates to the source line. This should feel like an inevitable design, not a feature.
1. **Understand triggers as entry points** — the `@trigger` system defines HOW the loop starts (chat, inbox, event, schedule, webhook). Event triggers resolve against the same connectors the agent uses for actions — the connector is both the ear and the hand. Triggers appear as orange entry nodes in the compiled graph.
1. **Trust the version history** — the chip-aware diff view should make it immediately clear what changed between any two versions of the agent. Semantic change summaries, colored chip badges (+added, -removed, ~modified), and the graph diff overlay should make agent changes reviewable by non-technical stakeholders. The diff should feel like a GitHub PR but for agent topology, not code.
1. **See the review workflow** — publishing a new version requires a semver bump and optionally review approval. The system suggests the bump level. Reviewers comment on specific chip changes. This is change management for agents using text-native tooling.
1. **Recognize Google Workspace patterns** — sharing, collaboration, version history, document editing — all applied to agent building. Connectors map to real Gemini Enterprise data stores. IAM governs everything. Version history mirrors Google Docs revisions.
1. **See the notebook as a development environment** — trigger cells, tool cells, test cells, skill cells, connector cells, data cells, and the escape hatch code cell make this a real workspace spanning the full capability spectrum
1. **Understand the permission model** — that who can see and use what is governed by familiar Google IAM/Groups patterns, and that this extends to connector access, skill visibility, and version publishing rights
1. **Grasp the Gemini Live authoring flow** — that speaking a process description produces a structured playbook, and that the authoring agent is itself an agent running the same loop (meta-circularity)
1. **See skills as the key organizational primitive** — same SKILL.md format whether authored in Gemini CLI, this editor, or Agent Designer. Skills are cached expertise + cached code execution + composable `@` references. They bridge developer and business analyst workflows.
1. **Believe this could ship** — the fidelity should be high enough that it feels like a real Google product in early access, not a wireframe. The connector list should match real Gemini Enterprise connectors. The skill format should match real Gemini CLI skills. The version history should feel like Google Docs revision history. The compiled graph should feel like a natural output of the playbook, not a separate artifact.
