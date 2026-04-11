/**
 * TriggerForm — Type-specific wizard form for creating triggers.
 */

import { Field, wizardStyles } from './WizardShared';

export interface TriggerFormState {
  triggerType: 'chat' | 'inbox' | 'event' | 'schedule' | 'webhook';
  cronExpression: string;
  queueName: string;
  eventSource: string;
  eventType: string;
}

export const INITIAL_TRIGGER_FORM: TriggerFormState = {
  triggerType: 'chat',
  cronExpression: '',
  queueName: '',
  eventSource: '',
  eventType: '',
};

export function TriggerForm({ state, onChange }: { state: TriggerFormState; onChange: (s: TriggerFormState) => void }) {
  return (
    <>
      <Field label="Trigger Type">
        <select
          style={wizardStyles.select}
          value={state.triggerType}
          onChange={(e) => onChange({ ...state, triggerType: e.target.value as TriggerFormState['triggerType'] })}
        >
          <option value="chat">Chat (real-time streaming)</option>
          <option value="inbox">Inbox (async queue)</option>
          <option value="event">Event (webhook from connector)</option>
          <option value="schedule">Schedule (cron)</option>
          <option value="webhook">Webhook (custom endpoint)</option>
        </select>
      </Field>
      {state.triggerType === 'schedule' && (
        <Field label="Cron Expression">
          <input
            style={wizardStyles.input}
            placeholder="0 9 * * 1-5 (weekdays at 9am)"
            value={state.cronExpression}
            onChange={(e) => onChange({ ...state, cronExpression: e.target.value })}
          />
        </Field>
      )}
      {state.triggerType === 'inbox' && (
        <Field label="Queue Name">
          <input
            style={wizardStyles.input}
            placeholder="e.g. claims-queue"
            value={state.queueName}
            onChange={(e) => onChange({ ...state, queueName: e.target.value })}
          />
        </Field>
      )}
      {state.triggerType === 'event' && (
        <>
          <Field label="Source Connector">
            <input
              style={wizardStyles.input}
              placeholder="e.g. slack, jira, google-drive"
              value={state.eventSource}
              onChange={(e) => onChange({ ...state, eventSource: e.target.value })}
            />
          </Field>
          <Field label="Event Type">
            <input
              style={wizardStyles.input}
              placeholder="e.g. message-posted, issue-created, file-uploaded"
              value={state.eventType}
              onChange={(e) => onChange({ ...state, eventType: e.target.value })}
            />
          </Field>
        </>
      )}
    </>
  );
}
