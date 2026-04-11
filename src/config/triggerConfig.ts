/**
 * triggerConfig — Registry for trigger types.
 *
 * To add a new trigger type:
 *   1. Add to TriggerMetadata.triggerType union in parser/types.ts
 *   2. Add one entry here in TRIGGER_CONFIG
 *   3. Done — wizard form fields, descriptions, GCP mappings all derive automatically.
 */

export type TriggerType = 'chat' | 'inbox' | 'event' | 'schedule' | 'webhook';

export interface TriggerFormField {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'number';
}

export interface TriggerTypeConfig {
  label: string;
  description: string;
  /** GCP service this maps to */
  gcpService: string;
  /** Icon hint for UI rendering */
  iconHint: string;
  /** Additional form fields shown when this trigger type is selected */
  formFields: TriggerFormField[];
}

export const TRIGGER_CONFIG: Record<TriggerType, TriggerTypeConfig> = {
  chat: {
    label: 'Chat (real-time streaming)',
    description: 'Real-time conversational interface via Gemini Enterprise.',
    gcpService: 'gemini-enterprise',
    iconHint: 'chat-bubble',
    formFields: [],
  },
  inbox: {
    label: 'Inbox (async queue)',
    description: 'Requests accumulate in a Pub/Sub queue, processed in priority order.',
    gcpService: 'pubsub',
    iconHint: 'inbox-tray',
    formFields: [
      { key: 'queueName', label: 'Queue Name', placeholder: 'e.g. claims-queue' },
    ],
  },
  event: {
    label: 'Event (webhook from connector)',
    description: 'Agent wakes up when something happens in an external system.',
    gcpService: 'eventarc',
    iconHint: 'webhook-arrow',
    formFields: [
      { key: 'eventSource', label: 'Source Connector', placeholder: 'e.g. slack, jira, google-drive' },
      { key: 'eventType', label: 'Event Type', placeholder: 'e.g. message-posted, issue-created, file-uploaded' },
    ],
  },
  schedule: {
    label: 'Schedule (cron)',
    description: 'Time-based execution via Cloud Scheduler.',
    gcpService: 'cloud-scheduler',
    iconHint: 'clock',
    formFields: [
      { key: 'cronExpression', label: 'Cron Expression', placeholder: '0 9 * * 1-5 (weekdays at 9am)' },
    ],
  },
  webhook: {
    label: 'Webhook (custom endpoint)',
    description: 'Raw webhook endpoint with auto-generated URL.',
    gcpService: 'cloud-functions',
    iconHint: 'webhook',
    formFields: [],
  },
};

/** Ordered list for form dropdowns. */
export const TRIGGER_TYPES = Object.keys(TRIGGER_CONFIG) as TriggerType[];

/** Select options — derived from config. */
export const TRIGGER_OPTIONS = TRIGGER_TYPES.map((type) => ({
  value: type,
  label: TRIGGER_CONFIG[type].label,
}));
