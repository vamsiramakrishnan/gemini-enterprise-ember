/**
 * Connectors — Full connector catalog for the Connector Hub (Screen 9).
 *
 * Google-native + third-party connectors, each with entities, actions,
 * sync status, and auth configuration.
 */

export interface ConnectorEntry {
  id: string;
  product: string;
  provider: 'google' | 'third-party';
  icon: string;
  status: 'active' | 'available' | 'draft' | 'error';
  description: string;
  entities: Array<{ name: string; enabled: boolean; count: number }>;
  actions: Array<{ name: string; enabled: boolean }>;
  authMethod: string;
  authUser?: string;
  lastSync?: string;
  syncMode?: 'federated' | 'ingested';
  region?: string;
  referencedInPlaybooks: number;
}

export const GOOGLE_CONNECTORS: ConnectorEntry[] = [
  {
    id: 'google-drive',
    product: 'Google Drive',
    provider: 'google',
    icon: 'GD',
    status: 'active',
    description: 'Search and retrieve documents across shared drives and My Drive.',
    entities: [
      { name: 'Files', enabled: true, count: 3200000 },
      { name: 'Folders', enabled: true, count: 180000 },
    ],
    actions: [
      { name: 'Search', enabled: true },
      { name: 'Download File', enabled: true },
      { name: 'Upload File', enabled: true },
    ],
    authMethod: 'Service Account',
    lastSync: '2026-04-03T09:00:00Z',
    syncMode: 'ingested',
    region: 'global',
    referencedInPlaybooks: 10,
  },
  {
    id: 'gmail',
    product: 'Gmail',
    provider: 'google',
    icon: 'GM',
    status: 'active',
    description: 'Search and send email messages for customer communications.',
    entities: [
      { name: 'Messages', enabled: true, count: 0 },
      { name: 'Threads', enabled: true, count: 0 },
      { name: 'Labels', enabled: true, count: 0 },
    ],
    actions: [
      { name: 'Search', enabled: true },
      { name: 'Send Message', enabled: true },
    ],
    authMethod: 'Service Account',
    lastSync: '2026-04-03T09:05:00Z',
    syncMode: 'federated',
    region: 'global',
    referencedInPlaybooks: 5,
  },
  {
    id: 'google-calendar',
    product: 'Google Calendar',
    provider: 'google',
    icon: 'GC',
    status: 'active',
    description: 'Search, create, and update calendar events.',
    entities: [
      { name: 'Events', enabled: true, count: 0 },
      { name: 'Calendars', enabled: true, count: 0 },
    ],
    actions: [
      { name: 'Search Events', enabled: true },
      { name: 'Create Event', enabled: true },
      { name: 'Update Event', enabled: true },
    ],
    authMethod: 'Service Account',
    lastSync: '2026-04-03T08:55:00Z',
    syncMode: 'federated',
    region: 'global',
    referencedInPlaybooks: 3,
  },
  {
    id: 'bigquery',
    product: 'BigQuery',
    provider: 'google',
    icon: 'BQ',
    status: 'active',
    description: 'Query analytics datasets and historical trend data. 12 datasets connected.',
    entities: [
      { name: 'Datasets', enabled: true, count: 12 },
      { name: 'Tables', enabled: true, count: 347 },
    ],
    actions: [
      { name: 'Query', enabled: true },
      { name: 'List Tables', enabled: true },
    ],
    authMethod: 'Service Account',
    lastSync: '2026-04-03T06:00:00Z',
    syncMode: 'federated',
    region: 'us-central1',
    referencedInPlaybooks: 3,
  },
  {
    id: 'cloud-storage',
    product: 'Cloud Storage',
    provider: 'google',
    icon: 'CS',
    status: 'active',
    description: 'Access blobs and objects in GCS buckets. 47 buckets connected.',
    entities: [
      { name: 'Buckets', enabled: true, count: 47 },
      { name: 'Objects', enabled: true, count: 0 },
    ],
    actions: [
      { name: 'List', enabled: true },
      { name: 'Download', enabled: true },
      { name: 'Upload', enabled: true },
    ],
    authMethod: 'Service Account',
    syncMode: 'federated',
    region: 'us-central1',
    referencedInPlaybooks: 1,
  },
  {
    id: 'spanner',
    product: 'Spanner',
    provider: 'google',
    icon: 'SP',
    status: 'available',
    description: 'Globally distributed relational database. Available for connection.',
    entities: [],
    actions: [{ name: 'Query', enabled: false }],
    authMethod: 'Service Account',
    region: 'global',
    referencedInPlaybooks: 0,
  },
];

export const THIRD_PARTY_CONNECTORS: ConnectorEntry[] = [
  {
    id: 'jira-cloud',
    product: 'Jira Cloud',
    provider: 'third-party',
    icon: 'JC',
    status: 'active',
    description: 'Create and track claims tickets, manage workflows in CLAIMS project.',
    entities: [
      { name: 'Issues', enabled: true, count: 15000 },
      { name: 'Comments', enabled: true, count: 67000 },
      { name: 'Worklogs', enabled: true, count: 23000 },
      { name: 'Attachments', enabled: true, count: 8900 },
    ],
    actions: [
      { name: 'Search Issues', enabled: true },
      { name: 'Create Issue', enabled: true },
      { name: 'Add Comment', enabled: true },
      { name: 'Update Issue', enabled: true },
      { name: 'Upload Attachment', enabled: true },
    ],
    authMethod: 'OAuth',
    authUser: 'svc-jira@acme.atlassian.net',
    lastSync: '2026-04-03T08:30:00Z',
    syncMode: 'federated',
    region: 'us-central1',
    referencedInPlaybooks: 13,
  },
  {
    id: 'salesforce',
    product: 'Salesforce',
    provider: 'third-party',
    icon: 'SF',
    status: 'active',
    description: 'Customer accounts, contacts, opportunities, and cases. V2 connector.',
    entities: [
      { name: 'Accounts', enabled: true, count: 45000 },
      { name: 'Contacts', enabled: true, count: 120000 },
      { name: 'Opportunities', enabled: true, count: 8500 },
      { name: 'Cases', enabled: true, count: 32000 },
    ],
    actions: [
      { name: 'Search', enabled: true },
      { name: 'Create Record', enabled: true },
      { name: 'Update Record', enabled: true },
    ],
    authMethod: 'OAuth',
    authUser: 'integration-svc@acme.com',
    lastSync: '2026-04-03T08:45:00Z',
    syncMode: 'federated',
    region: 'us-central1',
    referencedInPlaybooks: 16,
  },
  {
    id: 'slack',
    product: 'Slack',
    provider: 'third-party',
    icon: 'SL',
    status: 'active',
    description: 'Search messages, post to channels, and share files with the claims team.',
    entities: [
      { name: 'Messages', enabled: true, count: 0 },
      { name: 'Channels', enabled: true, count: 0 },
      { name: 'Files', enabled: true, count: 0 },
    ],
    actions: [
      { name: 'Search Messages', enabled: true },
      { name: 'Post Message', enabled: true },
    ],
    authMethod: 'OAuth',
    authUser: 'claims-bot@acme.slack.com',
    lastSync: '2026-04-03T08:50:00Z',
    syncMode: 'federated',
    region: 'us-central1',
    referencedInPlaybooks: 8,
  },
  {
    id: 'confluence',
    product: 'Confluence Cloud',
    provider: 'third-party',
    icon: 'CF',
    status: 'active',
    description: 'Search knowledge base pages, blog posts, and documentation spaces.',
    entities: [
      { name: 'Pages', enabled: true, count: 4200 },
      { name: 'Blog Posts', enabled: true, count: 380 },
      { name: 'Spaces', enabled: true, count: 24 },
    ],
    actions: [{ name: 'Search Content', enabled: true }],
    authMethod: 'OAuth',
    lastSync: '2026-04-03T07:00:00Z',
    syncMode: 'ingested',
    region: 'us-central1',
    referencedInPlaybooks: 2,
  },
  {
    id: 'servicenow',
    product: 'ServiceNow',
    provider: 'third-party',
    icon: 'SN',
    status: 'active',
    description: 'IT service management — incidents, knowledge articles, and change requests.',
    entities: [
      { name: 'Incidents', enabled: true, count: 9800 },
      { name: 'Knowledge Articles', enabled: true, count: 1500 },
      { name: 'Change Requests', enabled: true, count: 3200 },
    ],
    actions: [
      { name: 'Search', enabled: true },
      { name: 'Create Incident', enabled: true },
      { name: 'Update Incident', enabled: true },
    ],
    authMethod: 'OAuth',
    lastSync: '2026-04-03T07:30:00Z',
    syncMode: 'federated',
    region: 'us-central1',
    referencedInPlaybooks: 4,
  },
  {
    id: 'sharepoint',
    product: 'SharePoint Online',
    provider: 'third-party',
    icon: 'MS',
    status: 'active',
    description: 'Documents, lists, and sites from Microsoft SharePoint.',
    entities: [
      { name: 'Documents', enabled: true, count: 28000 },
      { name: 'Lists', enabled: true, count: 150 },
      { name: 'Sites', enabled: true, count: 12 },
    ],
    actions: [
      { name: 'Search', enabled: true },
      { name: 'Download File', enabled: true },
    ],
    authMethod: 'OAuth',
    syncMode: 'ingested',
    region: 'us-central1',
    referencedInPlaybooks: 1,
  },
  {
    id: 'github',
    product: 'GitHub',
    provider: 'third-party',
    icon: 'GH',
    status: 'active',
    description: 'Repository search, branch creation, file management, and PR workflows.',
    entities: [
      { name: 'Repositories', enabled: true, count: 85 },
      { name: 'Pull Requests', enabled: true, count: 0 },
      { name: 'Issues', enabled: true, count: 0 },
    ],
    actions: [
      { name: 'Search Repos', enabled: true },
      { name: 'Create Branch', enabled: true },
      { name: 'Create/Update File', enabled: true },
      { name: 'Add Comment to PR', enabled: true },
      { name: 'Merge PR', enabled: true },
    ],
    authMethod: 'OAuth',
    syncMode: 'federated',
    region: 'global',
    referencedInPlaybooks: 2,
  },
  {
    id: 'box',
    product: 'Box',
    provider: 'third-party',
    icon: 'BX',
    status: 'draft',
    description: 'Cloud content management. Currently being configured.',
    entities: [],
    actions: [],
    authMethod: 'OAuth',
    referencedInPlaybooks: 0,
  },
  {
    id: 'hubspot',
    product: 'HubSpot',
    provider: 'third-party',
    icon: 'HS',
    status: 'available',
    description: 'CRM, marketing, and sales automation. Available — not yet connected.',
    entities: [],
    actions: [],
    authMethod: 'OAuth',
    referencedInPlaybooks: 0,
  },
];

export const ALL_CONNECTORS = [...GOOGLE_CONNECTORS, ...THIRD_PARTY_CONNECTORS];
