/**
 * Workspace model — Organizes agents and their assets into projects.
 *
 * A workspace is a container for one agent playbook and all the assets
 * it references (tools, connectors, skills, guards, etc.). Teams can
 * have multiple workspaces. Assets can be scoped to a workspace or
 * shared across the organization.
 *
 * This replaces the flat "everything in one registry" model with
 * a project-oriented structure that scales to teams.
 */

export interface Workspace {
  id: string;
  name: string;
  /** The primary agent/playbook in this workspace */
  agentName: string;
  agentVersion: string;
  /** Who owns this workspace */
  owner: { name: string; email: string; avatar: string };
  /** Team members with access */
  members: Array<{ name: string; email: string; avatar: string; role: 'admin' | 'editor' | 'viewer' }>;
  /** IDs of assets scoped to this workspace */
  assetIds: string[];
  /** Color accent for the workspace (for sidebar/nav visual identity) */
  color: string;
  /** Icon emoji or letter */
  icon: string;
  /** Status */
  status: 'active' | 'archived';
  lastUpdated: string;
  createdAt: string;
}

// ─── Mock data ───────────────────────────────────────────────────────

export const WORKSPACES: Workspace[] = [
  {
    id: 'ws-claims',
    name: 'Claims Processing',
    agentName: 'Claims Processing Agent',
    agentVersion: '2.1.0',
    owner: { name: 'Vamsi K', email: 'vamsi@acme.com', avatar: 'VK' },
    members: [
      { name: 'Vamsi K', email: 'vamsi@acme.com', avatar: 'VK', role: 'admin' },
      { name: 'Priya Sharma', email: 'priya@acme.com', avatar: 'PS', role: 'editor' },
      { name: 'Wei Chen', email: 'wei@acme.com', avatar: 'WC', role: 'editor' },
    ],
    assetIds: [
      'tool-policy-lookup', 'tool-claims-history', 'tool-payment-processor',
      'connector-salesforce', 'connector-jira', 'connector-slack', 'connector-google-drive',
      'skill-customer-empathy', 'skill-apac-compliance',
      'guard-pii-redaction', 'guard-fraud-detection', 'guard-apac-compliance-rules',
      'doc-claims-policy-2024', 'doc-apac-regulatory-matrix',
      'schema-claims-response-v2',
      'trigger-chat', 'trigger-claims-queue', 'trigger-jira-issue-created',
    ],
    color: '#2563EB',
    icon: '📋',
    status: 'active',
    lastUpdated: '2026-04-11T08:30:00Z',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: 'ws-refund',
    name: 'Refund Processing',
    agentName: 'Refund Agent',
    agentVersion: '1.0.0',
    owner: { name: 'Priya Sharma', email: 'priya@acme.com', avatar: 'PS' },
    members: [
      { name: 'Priya Sharma', email: 'priya@acme.com', avatar: 'PS', role: 'admin' },
      { name: 'Vamsi K', email: 'vamsi@acme.com', avatar: 'VK', role: 'viewer' },
    ],
    assetIds: [
      'tool-policy-lookup', 'connector-salesforce', 'connector-slack',
      'guard-pii-redaction', 'doc-refund-policy-q4',
    ],
    color: '#7C3AED',
    icon: '💳',
    status: 'active',
    lastUpdated: '2026-04-10T14:20:00Z',
    createdAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'ws-onboarding',
    name: 'Employee Onboarding',
    agentName: 'Onboarding Assistant',
    agentVersion: '0.3.0',
    owner: { name: 'Wei Chen', email: 'wei@acme.com', avatar: 'WC' },
    members: [
      { name: 'Wei Chen', email: 'wei@acme.com', avatar: 'WC', role: 'admin' },
    ],
    assetIds: ['connector-slack', 'connector-google-drive'],
    color: '#059669',
    icon: '🚀',
    status: 'active',
    lastUpdated: '2026-04-09T16:45:00Z',
    createdAt: '2026-04-01T11:00:00Z',
  },
];
