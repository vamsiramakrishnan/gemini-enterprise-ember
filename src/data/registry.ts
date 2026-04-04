/**
 * Registry — Mock data for all @-referenceable assets.
 *
 * ~35 entries across all 9 chip types, with realistic names, descriptions,
 * owners, versions, and usage counts. These power the ParserDemo's reference
 * resolution, the Registry Browser (Screen 3), and chip autocomplete.
 */

import type { SmartChip, ConnectorMetadata, SkillMetadata, TriggerMetadata } from '../parser/types';

// ─── Helper ───────────────────────────────────────────────────────────

function chip(
  id: string,
  type: SmartChip['type'],
  name: string,
  overrides: Partial<SmartChip> = {},
): SmartChip {
  return {
    id,
    type,
    name,
    registryId: `registry/${type}/${name}`,
    version: '1.0.0',
    status: 'resolved',
    owner: 'platform-team@acme.com',
    description: '',
    permissions: { currentUser: 'invoker' },
    metadata: {},
    lastUpdated: '2026-03-20T10:00:00Z',
    usageCount: 5,
    ...overrides,
  };
}

// ─── Documents (5) ────────────────────────────────────────────────────

export const DOCS: SmartChip[] = [
  chip('doc-claims-policy-2024', 'doc', 'claims-policy-2024', {
    version: '2.4.0',
    description: 'Master claims processing policy for ACME Insurance. Covers coverage rules, deductibles, claim limits, and processing SLAs across all product lines.',
    owner: 'policy-ops@acme.com',
    usageCount: 18,
    lastUpdated: '2026-02-15T08:30:00Z',
    permissions: { currentUser: 'viewer' },
  }),
  chip('doc-apac-regulatory-matrix', 'doc', 'apac-regulatory-matrix', {
    version: '3.1.0',
    description: 'Regulatory compliance matrix for APAC markets: MAS (Singapore), APRA (Australia), RBI (India), OJK (Indonesia), FSC (Taiwan). Updated quarterly.',
    owner: 'compliance@acme.com',
    usageCount: 11,
    lastUpdated: '2026-01-10T14:00:00Z',
  }),
  chip('doc-mas-guidelines-2024', 'doc', 'mas-guidelines-2024', {
    version: '1.2.0',
    description: 'Monetary Authority of Singapore guidelines for insurance claim handling and customer communication.',
    owner: 'compliance@acme.com',
    usageCount: 6,
    lastUpdated: '2026-03-01T09:00:00Z',
  }),
  chip('doc-apra-prudential-standards', 'doc', 'apra-prudential-standards', {
    version: '2.0.0',
    description: 'APRA prudential standards reference for Australian market operations.',
    owner: 'compliance@acme.com',
    usageCount: 4,
    lastUpdated: '2025-12-20T11:00:00Z',
  }),
  chip('doc-refund-policy-q4', 'doc', 'refund-policy-q4', {
    version: '1.0.0',
    status: 'draft',
    description: 'Q4 refund policy updates for APAC markets. Pending legal review.',
    owner: 'policy-ops@acme.com',
    usageCount: 1,
    lastUpdated: '2026-03-28T16:00:00Z',
  }),
];

// ─── Tools (5) ────────────────────────────────────────────────────────

export const TOOLS: SmartChip[] = [
  chip('tool-policy-lookup', 'tool', 'policy-lookup', {
    version: '2.3.0',
    description: 'Retrieve policy details by policy ID. Returns coverage, riders, deductibles, and claim history summary. Backed by Spanner.',
    owner: 'platform-team@acme.com',
    usageCount: 22,
    endpoint: 'https://tools.acme.internal/mcp/policy-lookup',
    healthStatus: 'healthy',
    permissions: { currentUser: 'invoker' },
  }),
  chip('tool-claims-history', 'tool', 'claims-history', {
    version: '1.5.0',
    description: 'Check prior claims for a customer within a date range. Returns claim IDs, amounts, statuses, and resolution times.',
    owner: 'platform-team@acme.com',
    usageCount: 15,
    endpoint: 'https://tools.acme.internal/mcp/claims-history',
    healthStatus: 'healthy',
  }),
  chip('tool-payment-processor', 'tool', 'payment-processor', {
    version: '3.0.1',
    description: 'Process refund or payout to customer bank account. Supports SWIFT and local payment rails across APAC.',
    owner: 'finops@acme.com',
    usageCount: 8,
    endpoint: 'https://tools.acme.internal/mcp/payment-processor',
    healthStatus: 'healthy',
    permissions: { currentUser: 'editor' },
  }),
  chip('tool-notification-sender', 'tool', 'notification-sender', {
    version: '1.1.0',
    description: 'Send email or SMS notifications to customers. Supports template rendering with claim data.',
    owner: 'platform-team@acme.com',
    usageCount: 12,
    endpoint: 'https://tools.acme.internal/mcp/notification-sender',
    healthStatus: 'degraded',
  }),
  chip('tool-regtech-api', 'tool', 'regtech-api', {
    version: '0.9.0',
    status: 'draft',
    description: 'Query the RegTech compliance database for real-time regulatory status checks. In beta.',
    owner: 'compliance@acme.com',
    usageCount: 2,
    endpoint: 'https://tools.acme.internal/mcp/regtech-api',
    healthStatus: 'healthy',
  }),
];

// ─── Agents (3) ───────────────────────────────────────────────────────

export const AGENTS: SmartChip[] = [
  chip('agent-senior-adjuster', 'agent', 'senior-adjuster', {
    version: '2.0.0',
    description: 'Senior claims adjuster agent for high-value claims (>$50k). Has access to extended policy tools and approval authority.',
    owner: 'claims-team@acme.com',
    usageCount: 7,
    permissions: { currentUser: 'invoker' },
  }),
  chip('agent-fraud-specialist', 'agent', 'fraud-specialist', {
    version: '1.3.0',
    description: 'Specialized fraud detection and investigation agent. Activated when fraud signals exceed threshold.',
    owner: 'security@acme.com',
    usageCount: 4,
  }),
  chip('agent-compliance-officer', 'agent', 'compliance-officer', {
    version: '1.0.0',
    status: 'draft',
    description: 'Cross-border compliance review agent. Handles regulatory checks for multi-jurisdiction claims.',
    owner: 'compliance@acme.com',
    usageCount: 1,
    lastUpdated: '2026-03-30T10:00:00Z',
  }),
];

// ─── Guards (3) ───────────────────────────────────────────────────────

export const GUARDS: SmartChip[] = [
  chip('guard-pii-redaction', 'guard', 'pii-redaction', {
    version: '2.1.0',
    description: 'Redacts PII (names, emails, phone numbers, policy IDs) from all agent outputs. Uses Cloud DLP + regex patterns. Maps to G.pii("redact").',
    owner: 'security@acme.com',
    usageCount: 24,
    permissions: { currentUser: 'viewer' },
  }),
  chip('guard-fraud-detection', 'guard', 'fraud-detection', {
    version: '1.4.0',
    description: 'Pre-processing fraud signal detection. Checks claim patterns against known fraud indicators. Blocks and escalates on high confidence. Maps to G.topic() + custom.',
    owner: 'security@acme.com',
    usageCount: 9,
  }),
  chip('guard-apac-compliance-rules', 'guard', 'apac-compliance-rules', {
    version: '1.2.0',
    description: 'Enforces APAC-specific regulatory constraints on agent responses. Prevents disclosure of internal thresholds. Maps to G.grounded() + G.topic().',
    owner: 'compliance@acme.com',
    usageCount: 11,
  }),
];

// ─── Data Sources (2) ─────────────────────────────────────────────────

export const DATA_SOURCES: SmartChip[] = [
  chip('data-high-risk-categories', 'data', 'high-risk-categories', {
    version: '1.0.0',
    description: 'Reference dataset of high-risk claim categories requiring additional review: fire, flood, theft >$10k, liability, medical malpractice.',
    owner: 'claims-team@acme.com',
    usageCount: 6,
  }),
  chip('data-claims-database', 'data', 'claims-database', {
    version: '4.0.0',
    description: 'BigQuery dataset containing all historical claims. 2.3M records, updated daily. Used for trend analysis and anomaly detection.',
    owner: 'data-eng@acme.com',
    usageCount: 3,
    permissions: { currentUser: 'editor' },
  }),
];

// ─── Schemas (2) ──────────────────────────────────────────────────────

export const SCHEMAS: SmartChip[] = [
  chip('schema-claims-response-v2', 'schema', 'claims-response-v2', {
    version: '2.0.0',
    description: 'Standard response schema for claims processing. Includes claim_ref, status, estimated_time, next_steps, and customer_message fields.',
    owner: 'platform-team@acme.com',
    usageCount: 14,
  }),
  chip('schema-escalation-request', 'schema', 'escalation-request', {
    version: '1.1.0',
    description: 'Schema for escalation payloads sent to senior agents. Includes claim context, reason, priority, and source agent details.',
    owner: 'platform-team@acme.com',
    usageCount: 5,
  }),
];

// ─── Connectors (6) ──────────────────────────────────────────────────

export const CONNECTORS: SmartChip[] = [
  chip('connector-salesforce', 'connector', 'salesforce', {
    version: '2.0.0',
    description: 'Salesforce CRM connector. Access customer accounts, contacts, opportunities, and cases. OAuth connected app.',
    owner: 'integrations@acme.com',
    usageCount: 16,
    metadata: {
      provider: 'third-party',
      product: 'Salesforce',
      productIcon: 'salesforce',
      adkToolset: 'ApplicationIntegrationToolset',
      syncStatus: 'active',
      lastSyncTime: '2026-04-03T08:45:00Z',
      syncMode: 'federated',
      entities: [
        { name: 'Accounts', enabled: true, documentCount: 45000 },
        { name: 'Contacts', enabled: true, documentCount: 120000 },
        { name: 'Opportunities', enabled: true, documentCount: 8500 },
        { name: 'Cases', enabled: true, documentCount: 32000 },
      ],
      actions: [
        { name: 'Search', enabled: true, authRequired: true },
        { name: 'Create Record', enabled: true, authRequired: true },
        { name: 'Update Record', enabled: true, authRequired: true },
      ],
      authMethod: 'oauth',
      authUser: 'integration-svc@acme.com',
      dataStoreId: 'ds-salesforce-prod',
      dataStoreRegion: 'us-central1',
      identityProvider: 'workforce-identity-federation',
    } satisfies ConnectorMetadata,
  }),
  chip('connector-jira', 'connector', 'jira', {
    version: '1.3.0',
    description: 'Jira Cloud connector. Create and track claims tickets, add comments, manage workflows in CLAIMS project.',
    owner: 'integrations@acme.com',
    usageCount: 13,
    metadata: {
      provider: 'third-party',
      product: 'Jira Cloud',
      productIcon: 'jira',
      adkToolset: 'ApplicationIntegrationToolset',
      syncStatus: 'active',
      lastSyncTime: '2026-04-03T08:30:00Z',
      syncMode: 'federated',
      entities: [
        { name: 'Issues', enabled: true, documentCount: 15000 },
        { name: 'Comments', enabled: true, documentCount: 67000 },
        { name: 'Worklogs', enabled: true, documentCount: 23000 },
        { name: 'Attachments', enabled: true, documentCount: 8900 },
      ],
      actions: [
        { name: 'Search Issues', enabled: true, authRequired: true },
        { name: 'Create Issue', enabled: true, authRequired: true },
        { name: 'Add Comment', enabled: true, authRequired: true },
        { name: 'Update Issue', enabled: true, authRequired: true },
        { name: 'Upload Attachment', enabled: true, authRequired: true },
      ],
      authMethod: 'oauth',
      authUser: 'svc-jira@acme.atlassian.net',
      dataStoreId: 'ds-jira-prod',
      dataStoreRegion: 'us-central1',
      identityProvider: 'workforce-identity-federation',
    } satisfies ConnectorMetadata,
  }),
  chip('connector-google-drive', 'connector', 'google-drive', {
    version: '1.0.0',
    description: 'Google Drive connector. Retrieve and search supporting documents from /claims-inbox/ and shared drives.',
    owner: 'integrations@acme.com',
    usageCount: 10,
    metadata: {
      provider: 'google',
      product: 'Google Drive',
      productIcon: 'drive',
      adkToolset: 'GoogleApiToolset',
      syncStatus: 'active',
      lastSyncTime: '2026-04-03T09:00:00Z',
      syncMode: 'ingested',
      entities: [
        { name: 'Files', enabled: true, documentCount: 3200000 },
        { name: 'Folders', enabled: true, documentCount: 180000 },
      ],
      actions: [
        { name: 'Search', enabled: true, authRequired: false },
        { name: 'Download File', enabled: true, authRequired: false },
        { name: 'Upload File', enabled: true, authRequired: true },
      ],
      authMethod: 'service-account',
      dataStoreId: 'ds-drive-prod',
      dataStoreRegion: 'global',
      identityProvider: 'google',
    } satisfies ConnectorMetadata,
  }),
  chip('connector-slack', 'connector', 'slack', {
    version: '1.1.0',
    description: 'Slack connector. Notify the claims team channel, search messages, and post updates for escalations.',
    owner: 'integrations@acme.com',
    usageCount: 8,
    metadata: {
      provider: 'third-party',
      product: 'Slack',
      productIcon: 'slack',
      adkToolset: 'ApplicationIntegrationToolset',
      syncStatus: 'active',
      lastSyncTime: '2026-04-03T08:50:00Z',
      syncMode: 'federated',
      entities: [
        { name: 'Messages', enabled: true, documentCount: 0 },
        { name: 'Channels', enabled: true, documentCount: 0 },
        { name: 'Files', enabled: true, documentCount: 0 },
      ],
      actions: [
        { name: 'Search Messages', enabled: true, authRequired: true },
        { name: 'Post Message', enabled: true, authRequired: true },
      ],
      authMethod: 'oauth',
      authUser: 'claims-bot@acme.slack.com',
      dataStoreId: 'ds-slack-prod',
      dataStoreRegion: 'us-central1',
      identityProvider: 'workforce-identity-federation',
    } satisfies ConnectorMetadata,
  }),
  chip('connector-gmail', 'connector', 'gmail', {
    version: '1.0.0',
    description: 'Gmail connector. Search and send email messages for customer communications and notifications.',
    owner: 'integrations@acme.com',
    usageCount: 5,
    metadata: {
      provider: 'google',
      product: 'Gmail',
      productIcon: 'gmail',
      adkToolset: 'GoogleApiToolset',
      syncStatus: 'active',
      lastSyncTime: '2026-04-03T09:05:00Z',
      syncMode: 'federated',
      entities: [
        { name: 'Messages', enabled: true, documentCount: 0 },
        { name: 'Threads', enabled: true, documentCount: 0 },
        { name: 'Labels', enabled: true, documentCount: 0 },
      ],
      actions: [
        { name: 'Search', enabled: true, authRequired: false },
        { name: 'Send Message', enabled: true, authRequired: true },
      ],
      authMethod: 'service-account',
      dataStoreId: 'ds-gmail-prod',
      dataStoreRegion: 'global',
      identityProvider: 'google',
    } satisfies ConnectorMetadata,
  }),
  chip('connector-bigquery', 'connector', 'bigquery', {
    version: '1.0.0',
    description: 'BigQuery connector. Query claims analytics datasets and historical trend data. 12 datasets connected.',
    owner: 'data-eng@acme.com',
    usageCount: 3,
    metadata: {
      provider: 'google',
      product: 'BigQuery',
      productIcon: 'bigquery',
      adkToolset: 'BigQueryToolset',
      syncStatus: 'active',
      lastSyncTime: '2026-04-03T06:00:00Z',
      syncMode: 'federated',
      entities: [
        { name: 'Datasets', enabled: true, documentCount: 12 },
        { name: 'Tables', enabled: true, documentCount: 347 },
      ],
      actions: [
        { name: 'Query', enabled: true, authRequired: true },
        { name: 'List Tables', enabled: true, authRequired: false },
      ],
      authMethod: 'service-account',
      dataStoreId: 'ds-bq-prod',
      dataStoreRegion: 'us-central1',
      identityProvider: 'google',
    } satisfies ConnectorMetadata,
  }),
];

// ─── Skills (4) ───────────────────────────────────────────────────────

export const SKILLS: SmartChip[] = [
  chip('skill-customer-empathy', 'skill', 'customer-empathy', {
    version: '1.2.0',
    description: 'Guides agent tone for customer interactions. Teaches de-escalation patterns, empathetic phrasing, and active listening. Always active (pinned).',
    owner: 'cx-team@acme.com',
    usageCount: 19,
    metadata: {
      scope: 'workspace',
      activationMode: 'pinned',
      frontmatter: {
        name: 'customer-empathy',
        description: 'Use this skill when interacting with customers. Provides empathetic tone, de-escalation patterns, and active listening techniques.',
      },
      agents: [{ name: 'empathy-guide', model: null, instruct: 'Respond with empathy...', tools: [], reads: [], writes: null, describe: null }],
      topology: null,
      inputSchema: {},
      outputSchema: {},
      evalCases: [
        { prompt: 'My claim was denied and I am furious', expect_contains: 'understand your frustration' },
      ],
      resources: { scripts: [], references: ['tone-guidelines.md'], assets: [] },
      referencedChips: [],
      precedenceLevel: 1,
      installSource: 'registry',
    } satisfies SkillMetadata,
  }),
  chip('skill-apac-compliance', 'skill', 'apac-compliance', {
    version: '2.0.0',
    description: 'Regional regulatory awareness for APAC markets. Covers MAS, APRA, RBI, OJK, and FSC regulations. Activated when handling APAC-jurisdiction queries.',
    owner: 'compliance@acme.com',
    usageCount: 11,
    metadata: {
      scope: 'workspace',
      activationMode: 'on-demand',
      frontmatter: {
        name: 'apac-compliance',
        description: 'Use this skill when the agent handles regulatory compliance questions in APAC markets. Covers MAS, APRA, RBI, OJK, and FSC regulations.',
      },
      agents: [{ name: 'compliance-checker', model: null, instruct: 'Check regional compliance...', tools: ['regtech-api'], reads: ['jurisdiction'], writes: null, describe: null }],
      topology: null,
      inputSchema: { jurisdiction: 'string', query: 'string' },
      outputSchema: { compliant: 'boolean', notes: 'string' },
      evalCases: [
        { prompt: 'What KYC is needed for Singapore clients?', expect_contains: 'MAS' },
      ],
      resources: {
        scripts: ['validate_kyc.py', 'format_disclosure.ts'],
        references: ['mas-guidelines-2024.pdf', 'apra-standards.pdf'],
        assets: [],
      },
      referencedChips: ['doc-mas-guidelines-2024', 'doc-apra-prudential-standards', 'guard-apac-compliance-rules', 'tool-regtech-api'],
      precedenceLevel: 1,
      installSource: 'registry',
    } satisfies SkillMetadata,
  }),
  chip('skill-data-analyst', 'skill', 'data-analyst', {
    version: '1.0.0',
    description: 'Guides data querying, analysis, and visualization. Teaches the agent to write SQL, interpret results, and present findings.',
    owner: 'data-eng@acme.com',
    usageCount: 3,
    metadata: {
      scope: 'user',
      activationMode: 'on-demand',
      frontmatter: {
        name: 'data-analyst',
        description: 'Use this skill when the user asks for data analysis, trend reports, or SQL queries against claims data.',
      },
      agents: [{ name: 'analyst', model: null, instruct: 'Analyze data...', tools: [], reads: [], writes: null, describe: null }],
      topology: null,
      inputSchema: { question: 'string' },
      outputSchema: { answer: 'string', sql: 'string' },
      evalCases: [],
      resources: { scripts: ['run_query.py'], references: [], assets: ['chart-templates/'] },
      referencedChips: ['connector-bigquery', 'data-claims-database'],
      precedenceLevel: 2,
      installSource: 'registry',
    } satisfies SkillMetadata,
  }),
  chip('skill-sop-writer', 'skill', 'sop-writer', {
    version: '0.8.0',
    status: 'draft',
    description: 'Guides creation of Standard Operating Procedure documents. Structures content with proper headings, steps, and compliance references.',
    owner: 'ops@acme.com',
    usageCount: 1,
    metadata: {
      scope: 'extension',
      activationMode: 'on-demand',
      frontmatter: {
        name: 'sop-writer',
        description: 'Use this skill when the user wants to create or update a Standard Operating Procedure document.',
      },
      agents: [],
      topology: null,
      inputSchema: { topic: 'string' },
      outputSchema: { document: 'string' },
      evalCases: [],
      resources: { scripts: [], references: ['sop-template.md'], assets: [] },
      referencedChips: [],
      precedenceLevel: 3,
      installSource: 'manual',
    } satisfies SkillMetadata,
  }),
];

// ─── Triggers (5) ─────────────────────────────────────────────────────

export const TRIGGERS: SmartChip[] = [
  chip('trigger-chat', 'trigger', 'chat', {
    version: '1.0.0',
    description: 'Real-time streaming conversation via Gemini Enterprise web app. Maps to adk-fluent StreamRunner.',
    owner: 'platform-team@acme.com',
    usageCount: 20,
    metadata: {
      triggerType: 'chat',
      status: 'active',
      streamingEnabled: true,
      maxTurns: 25,
      gcpService: 'gemini-enterprise',
    } satisfies TriggerMetadata,
  }),
  chip('trigger-claims-queue', 'trigger', 'inbox:claims-queue', {
    version: '1.0.0',
    description: 'Async claims submitted via web portal, processed in priority order. VIP customers first. Maps to Pub/Sub.',
    owner: 'platform-team@acme.com',
    usageCount: 12,
    metadata: {
      triggerType: 'inbox',
      status: 'active',
      queueName: 'claims-queue',
      priorityRules: 'VIP customers first, then by submission time',
      concurrencyLimit: 5,
      gcpService: 'pubsub',
    } satisfies TriggerMetadata,
  }),
  chip('trigger-jira-issue-created', 'trigger', 'jira:issue-created', {
    version: '1.0.0',
    description: 'Triggered when a new claim ticket is created in Jira project CLAIMS. Maps to Eventarc via Jira connector.',
    owner: 'integrations@acme.com',
    usageCount: 8,
    metadata: {
      triggerType: 'event',
      status: 'active',
      sourceConnectorId: 'connector-jira',
      eventType: 'issue-created',
      filterRules: { project: 'CLAIMS' },
      gcpService: 'eventarc',
    } satisfies TriggerMetadata,
  }),
  chip('trigger-drive-file-uploaded', 'trigger', 'drive:file-uploaded', {
    version: '1.0.0',
    description: 'Triggered when supporting documents are uploaded to /claims-inbox/ in Google Drive. Maps to Eventarc.',
    owner: 'integrations@acme.com',
    usageCount: 5,
    metadata: {
      triggerType: 'event',
      status: 'active',
      sourceConnectorId: 'connector-google-drive',
      eventType: 'file-uploaded',
      filterRules: { folder: '/claims-inbox/', filetype: 'PDF' },
      gcpService: 'eventarc',
    } satisfies TriggerMetadata,
  }),
  chip('trigger-weekday-9am', 'trigger', 'schedule:weekday-9am', {
    version: '1.0.0',
    description: 'Daily at 9am SGT, process overnight claims backlog. Maps to Cloud Scheduler.',
    owner: 'platform-team@acme.com',
    usageCount: 7,
    metadata: {
      triggerType: 'schedule',
      status: 'active',
      cronExpression: '0 9 * * 1-5',
      humanReadableSchedule: 'Every weekday at 9:00 AM',
      timezone: 'Asia/Singapore',
      nextRuns: [
        '2026-04-04T09:00:00+08:00',
        '2026-04-07T09:00:00+08:00',
        '2026-04-08T09:00:00+08:00',
        '2026-04-09T09:00:00+08:00',
        '2026-04-10T09:00:00+08:00',
      ],
      gcpService: 'cloud-scheduler',
    } satisfies TriggerMetadata,
  }),
];

// ─── Unresolved placeholder (referenced but not in registry) ──────────

export const UNRESOLVED_CHIP_NAMES = ['shipping-status', 'warehouse-return-check'];

// ─── Full Registry ────────────────────────────────────────────────────

export const REGISTRY: SmartChip[] = [
  ...DOCS,
  ...TOOLS,
  ...AGENTS,
  ...GUARDS,
  ...DATA_SOURCES,
  ...SCHEMAS,
  ...CONNECTORS,
  ...SKILLS,
  ...TRIGGERS,
];

/** Look up a chip by type + name. */
export function findChip(type: SmartChip['type'], name: string): SmartChip | undefined {
  return REGISTRY.find((c) => c.type === type && c.name === name);
}

/** Look up a chip by ID. */
export function findChipById(id: string): SmartChip | undefined {
  return REGISTRY.find((c) => c.id === id);
}

/** Get all chips of a given type. */
export function chipsByType(type: SmartChip['type']): SmartChip[] {
  return REGISTRY.filter((c) => c.type === type);
}
