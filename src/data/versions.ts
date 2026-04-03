/**
 * Versions — Mock version history for the Claims Processing Agent.
 *
 * 6 versions showing realistic evolution from v1.0.0 to v3.0.0-draft.
 * Includes semantic change summaries, chip diffs, and pre-computed
 * line-level diffs between v2.1.0 and v2.2.0 (the default comparison).
 */

import type { ChipChange, ChipChangeAction, ChipType, VersionStatus, SemverBump } from '../parser/types';

export interface VersionEntry {
  version: string;
  status: VersionStatus;
  author: { name: string; email: string; avatarUrl: string };
  timestamp: string;
  changeSummary: string;
  chipChanges: ChipChange[];
  reviewStatus?: 'pending' | 'approved' | 'changes-requested';
  reviewers?: string[];
}

function cc(action: ChipChangeAction, chipType: ChipType, chipName: string, detail?: string): ChipChange {
  return { action, chipType, chipName, detail };
}

export const VERSIONS: VersionEntry[] = [
  {
    version: '1.0.0',
    status: 'deprecated',
    author: { name: 'Priya Sharma', email: 'priya@acme.com', avatarUrl: '' },
    timestamp: '2026-01-03T10:00:00Z',
    changeSummary: 'Initial version. Basic claims lookup with @tool(policy-lookup) and @tool(claims-history). Manual escalation only.',
    chipChanges: [
      cc('added', 'tool', 'policy-lookup'),
      cc('added', 'tool', 'claims-history'),
      cc('added', 'doc', 'claims-policy-2024'),
    ],
  },
  {
    version: '1.1.0',
    status: 'deprecated',
    author: { name: 'Priya Sharma', email: 'priya@acme.com', avatarUrl: '' },
    timestamp: '2026-01-18T14:00:00Z',
    changeSummary: 'Added @doc(apac-regulatory-matrix) for regional compliance. Added @guard(pii-redaction).',
    chipChanges: [
      cc('added', 'doc', 'apac-regulatory-matrix'),
      cc('added', 'guard', 'pii-redaction'),
    ],
  },
  {
    version: '2.0.0',
    status: 'rolled-back',
    author: { name: 'Vamsi K', email: 'vamsi@acme.com', avatarUrl: '' },
    timestamp: '2026-02-15T09:00:00Z',
    changeSummary: 'Major restructure. Added @connector(salesforce) and @connector(jira). Introduced @agent(senior-adjuster) escalation. Added @skill(customer-empathy).',
    chipChanges: [
      cc('added', 'connector', 'salesforce'),
      cc('added', 'connector', 'jira'),
      cc('added', 'agent', 'senior-adjuster'),
      cc('added', 'skill', 'customer-empathy'),
      cc('added', 'trigger', 'chat'),
      cc('added', 'trigger', 'inbox:claims-queue'),
    ],
  },
  {
    version: '2.1.0',
    status: 'production',
    author: { name: 'Vamsi K', email: 'vamsi@acme.com', avatarUrl: '' },
    timestamp: '2026-03-20T11:00:00Z',
    changeSummary: 'Added @guard(fraud-detection). Changed escalation threshold from $100k to $50k. Added @skill(apac-compliance).',
    chipChanges: [
      cc('added', 'guard', 'fraud-detection'),
      cc('modified', 'agent', 'senior-adjuster', 'escalation threshold $100k → $50k'),
      cc('added', 'skill', 'apac-compliance'),
      cc('added', 'guard', 'apac-compliance-rules'),
    ],
    reviewStatus: 'approved',
    reviewers: ['priya@acme.com', 'wei@acme.com'],
  },
  {
    version: '2.2.0',
    status: 'staging',
    author: { name: 'Wei Chen', email: 'wei@acme.com', avatarUrl: '' },
    timestamp: '2026-04-03T07:00:00Z',
    changeSummary: 'Added @connector(slack) for team notifications. Added @trigger(schedule:weekday-9am) for batch processing. Added @connector(google-drive) for document retrieval.',
    chipChanges: [
      cc('added', 'connector', 'slack'),
      cc('added', 'connector', 'google-drive'),
      cc('added', 'trigger', 'schedule:weekday-9am'),
      cc('added', 'trigger', 'jira:issue-created'),
      cc('added', 'trigger', 'drive:file-uploaded'),
    ],
    reviewStatus: 'pending',
    reviewers: ['vamsi@acme.com'],
  },
  {
    version: '3.0.0-draft',
    status: 'draft',
    author: { name: 'Priya Sharma', email: 'priya@acme.com', avatarUrl: '' },
    timestamp: '2026-04-03T08:30:00Z',
    changeSummary: 'Experimental: Added @agent(compliance-officer) for cross-border cases. Restructured escalation logic.',
    chipChanges: [
      cc('added', 'agent', 'compliance-officer'),
      cc('modified', 'agent', 'senior-adjuster', 'escalation logic restructured'),
    ],
  },
];

// ─── Pre-computed diff: v2.1.0 → v2.2.0 ──────────────────────────────

export interface DiffLineEntry {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  content: string;
  chipType?: ChipType;
  chipName?: string;
  chipAction?: ChipChangeAction;
}

export const DIFF_V21_V22: DiffLineEntry[] = [
  { type: 'unchanged', content: '# Claims Processing Agent' },
  { type: 'unchanged', content: '' },
  { type: 'unchanged', content: '## Role' },
  { type: 'unchanged', content: 'You are an insurance claims processing assistant...' },
  { type: 'unchanged', content: '' },
  { type: 'unchanged', content: '## Triggers' },
  { type: 'unchanged', content: 'This agent is invoked by:' },
  { type: 'unchanged', content: '- @trigger(chat) — real-time customer conversations' },
  { type: 'unchanged', content: '- @trigger(inbox:claims-queue) — async claims via web portal' },
  { type: 'added', content: '- @trigger(jira:issue-created) — when a new claim ticket is created in @connector(jira)', chipType: 'trigger', chipName: 'jira:issue-created', chipAction: 'added' },
  { type: 'added', content: '- @trigger(drive:file-uploaded) — when documents uploaded to @connector(google-drive)', chipType: 'trigger', chipName: 'drive:file-uploaded', chipAction: 'added' },
  { type: 'added', content: '- @trigger(schedule:weekday-9am) — daily at 9am, process overnight backlog', chipType: 'trigger', chipName: 'schedule:weekday-9am', chipAction: 'added' },
  { type: 'unchanged', content: '' },
  { type: 'unchanged', content: '## Connected Systems' },
  { type: 'unchanged', content: '- @connector(salesforce) for customer account and policy data' },
  { type: 'unchanged', content: '- @connector(jira) to create and track claims tickets' },
  { type: 'added', content: '- @connector(google-drive) for supporting document retrieval', chipType: 'connector', chipName: 'google-drive', chipAction: 'added' },
  { type: 'added', content: '- @connector(slack) to notify the claims team channel', chipType: 'connector', chipName: 'slack', chipAction: 'added' },
  { type: 'unchanged', content: '' },
  { type: 'unchanged', content: '### Escalation Rules' },
  { type: 'unchanged', content: '- If claim amount exceeds $50,000, route to @agent(senior-adjuster)' },
  { type: 'unchanged', content: '- If the policy is flagged, apply @guard(fraud-detection)' },
  { type: 'modified', content: '- Create a tracking ticket in @connector(jira) for all escalations', chipType: 'connector', chipName: 'jira' },
  { type: 'added', content: '- Notify @connector(slack) #claims-escalations channel', chipType: 'connector', chipName: 'slack', chipAction: 'added' },
];

export const DIFF_SUMMARY: {
  suggestedBump: SemverBump;
  suggestedBumpReason: string;
} = {
  suggestedBump: 'minor',
  suggestedBumpReason: 'Adds 2 connectors and 3 triggers, no breaking changes → Minor (v2.1 → v2.2)',
};
