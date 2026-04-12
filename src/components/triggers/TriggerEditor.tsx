/**
 * TriggerEditor — Dedicated editor for @trigger chip type.
 *
 * Maps to `StreamRunner` / `PubSubToolset` / `Eventarc` / `Cloud Scheduler`
 * in adk-fluent. Provides trigger type selection, type-specific config,
 * GCP service mapping, and test panel for trigger simulation.
 */

import { useState, useMemo, useCallback } from 'react';
import { EditorShell, SegmentedControl, CodePreview, TestPanel, ChipLinker } from '../editors';
import { TRIGGER_CONFIG } from '../../config/triggerConfig';
import type { TriggerType } from '../../config/triggerConfig';

// ─── Colors ──────────────────────────────────────────────────────────

const C = {
  accent: '#EA580C',
  bg: '#FEF6EE',
  text: '#C2410C',
  border: '#FAD5B0',
  tint: '#FDEAD0',
} as const;

// ─── Options ─────────────────────────────────────────────────────────

const TYPE_OPTIONS: { value: TriggerType; label: string }[] = [
  { value: 'chat', label: 'Chat' },
  { value: 'inbox', label: 'Inbox' },
  { value: 'event', label: 'Event' },
  { value: 'schedule', label: 'Schedule' },
  { value: 'webhook', label: 'Webhook' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
];

const WEBHOOK_AUTH_OPTIONS = [
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth', label: 'OAuth' },
  { value: 'none', label: 'None' },
];

// ─── GCP service mapping ────────────────────────────────────────────

const GCP_MAP: Record<TriggerType, { service: string; icon: string }> = {
  chat: { service: 'Gemini Enterprise', icon: '💬' },
  inbox: { service: 'Cloud Pub/Sub', icon: '📥' },
  event: { service: 'Eventarc', icon: '⚡' },
  schedule: { service: 'Cloud Scheduler', icon: '🕐' },
  webhook: { service: 'Cloud Functions', icon: '🔗' },
};

// ─── Mock data ───────────────────────────────────────────────────────

const MOCK = {
  name: 'claims-queue',
  version: '1.1.0',
  nextRuns: [
    'Mon Apr 14, 2026 09:00 SGT',
    'Tue Apr 15, 2026 09:00 SGT',
    'Wed Apr 16, 2026 09:00 SGT',
    'Thu Apr 17, 2026 09:00 SGT',
    'Fri Apr 18, 2026 09:00 SGT',
  ],
  webhookUrl: 'https://agents.acme.com/hooks/claims-intake-7f3a',
  filterRules: [
    { key: 'project', value: 'CLAIMS' },
    { key: 'priority', value: 'High,Critical' },
  ],
};

// ─── Styles ──────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  border: '1px solid var(--color-border, #E5E7EB)',
  borderRadius: 12,
  padding: 16,
  background: 'var(--color-bg-surface, #FFFFFF)',
};

const label: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: 'var(--color-text-tertiary, #9CA3AF)',
  fontFamily: 'var(--font-ui)',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid var(--color-border, #E5E7EB)',
  background: 'var(--color-bg-primary, #F9FAFB)',
  color: 'var(--color-text-primary, #111827)',
  fontFamily: 'var(--font-ui)',
  outline: 'none',
};

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[11px] font-semibold mb-2" style={{ color: C.text, fontFamily: 'var(--font-ui)' }}>
      {children}
    </h3>
  );
}

// ─── Component ───────────────────────────────────────────────────────

export function TriggerEditor() {
  const [triggerType, setTriggerType] = useState<TriggerType>('inbox');
  const [status, setStatus] = useState('active');
  // Chat
  const [streaming, setStreaming] = useState(true);
  const [chatMaxTurns, setChatMaxTurns] = useState(25);
  // Inbox
  const [queueName, setQueueName] = useState('claims-queue');
  const [priorityRules, setPriorityRules] = useState('VIP customers first, then by submission time');
  const [concurrencyLimit, setConcurrencyLimit] = useState(5);
  // Event
  const [sourceConnector, setSourceConnector] = useState(['connector-jira']);
  const [eventType, setEventType] = useState('issue-created');
  // Schedule
  const [cronExpr, setCronExpr] = useState('0 9 * * 1-5');
  const [timezone, setTimezone] = useState('Asia/Singapore');
  // Webhook
  const [webhookAuth, setWebhookAuth] = useState('api-key');
  // Test
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const [testing, setTesting] = useState(false);

  const humanReadable = useMemo(() => {
    if (cronExpr === '0 9 * * 1-5') return 'Every weekday at 9:00 AM';
    if (cronExpr === '0 * * * *') return 'Every hour';
    return cronExpr;
  }, [cronExpr]);

  const codeExpression = useMemo(() => {
    switch (triggerType) {
      case 'chat': return `StreamRunner(agent, streaming=${streaming}, max_turns=${chatMaxTurns})`;
      case 'inbox': return `PubSubToolset(project="acme", topic="${queueName}")`;
      case 'event': return `Eventarc(source="jira", event_type="${eventType}")`;
      case 'schedule': return `CloudScheduler(cron="${cronExpr}", timezone="${timezone}")`;
      case 'webhook': return `CloudFunction(endpoint="${MOCK.webhookUrl}")`;
    }
  }, [triggerType, streaming, chatMaxTurns, queueName, eventType, cronExpr, timezone]);

  const codePython = useMemo(() => {
    switch (triggerType) {
      case 'chat':
        return `from adk_fluent import Agent
from adk.runners import StreamRunner

agent = Agent("claims-processor", "gemini-2.5-pro").build()
runner = StreamRunner(
    agent=agent,
    app_name="claims-app",
    streaming=${streaming ? 'True' : 'False'},
    max_turns=${chatMaxTurns},
)
runner.run()`;
      case 'inbox':
        return `from google.cloud import pubsub_v1

subscriber = pubsub_v1.SubscriberClient()
subscription = subscriber.subscription_path(
    "acme-insurance-prod", "${queueName}-sub"
)

def callback(message):
    agent.ask(message.data.decode())
    message.ack()

subscriber.subscribe(subscription, callback=callback)`;
      case 'event':
        return `from google.cloud import eventarc_v1

# Eventarc trigger: ${eventType}
# Source: @connector(jira)
# Filters: ${MOCK.filterRules.map(f => `${f.key}=${f.value}`).join(', ')}

trigger = eventarc_v1.Trigger(
    event_filters=[
        {"attribute": "type", "value": "${eventType}"},
    ],
    destination={"cloud_run": {"service": "claims-agent"}},
)`;
      case 'schedule':
        return `from google.cloud import scheduler_v1

job = scheduler_v1.Job(
    schedule="${cronExpr}",
    time_zone="${timezone}",
    http_target={"uri": "https://claims-agent.run.app/trigger"},
    description="${humanReadable}",
)`;
      case 'webhook':
        return `from google.cloud import functions_v2

# Webhook endpoint: ${MOCK.webhookUrl}
# Auth: ${webhookAuth}

@functions_v2.cloud_event
def handle_webhook(event):
    payload = event.data
    agent.ask(json.dumps(payload))`;
    }
  }, [triggerType, streaming, chatMaxTurns, queueName, eventType, cronExpr, timezone, humanReadable, webhookAuth]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestResult(null);
    await new Promise(r => setTimeout(r, 1600));
    setTestResult({
      status: 'success',
      triggerType,
      event: { type: triggerType === 'event' ? eventType : triggerType, source: triggerType === 'event' ? 'jira' : 'system', timestamp: new Date().toISOString() },
      agentResult: { iterations: 3, duration: '4.2s', status: 'completed' },
    });
    setTesting(false);
  }, [triggerType, eventType]);

  // ─── Type-specific config ────────────────────────────────────────

  function renderTypeConfig() {
    switch (triggerType) {
      case 'chat':
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={streaming} onChange={e => setStreaming(e.target.checked)} className="rounded" />
              <span className="text-[11px]" style={{ color: 'var(--color-text-secondary)' }}>Enable streaming responses</span>
            </label>
            <div>
              <div style={label}>Max Turns</div>
              <input type="number" value={chatMaxTurns} onChange={e => setChatMaxTurns(+e.target.value)} min={1} style={inputStyle} />
            </div>
          </div>
        );
      case 'inbox':
        return (
          <div className="space-y-3">
            <div>
              <div style={label}>Queue Name</div>
              <input type="text" value={queueName} onChange={e => setQueueName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={label}>Priority Rules</div>
              <textarea rows={2} value={priorityRules} onChange={e => setPriorityRules(e.target.value)} style={{ ...inputStyle, resize: 'vertical', fontSize: 11 }} />
            </div>
            <div>
              <div style={label}>Concurrency Limit</div>
              <input type="number" value={concurrencyLimit} onChange={e => setConcurrencyLimit(+e.target.value)} min={1} style={inputStyle} />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: C.tint }}>
              <span className="text-[10px] font-semibold" style={{ color: C.text }}>Messages in queue: 23</span>
            </div>
          </div>
        );
      case 'event':
        return (
          <div className="space-y-3">
            <ChipLinker filterType="connector" linkedIds={sourceConnector} onChange={setSourceConnector} multiple={false} label="Source Connector" />
            <div>
              <div style={label}>Event Type</div>
              <input type="text" value={eventType} onChange={e => setEventType(e.target.value)} placeholder="e.g. issue-created, file-uploaded" style={inputStyle} />
            </div>
            <div>
              <div style={label}>Filter Rules</div>
              <div className="space-y-1">
                {MOCK.filterRules.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <input type="text" defaultValue={f.key} style={{ ...inputStyle, width: '40%', fontFamily: 'var(--font-mono)' }} />
                    <input type="text" defaultValue={f.value} style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'schedule':
        return (
          <div className="space-y-3">
            <div>
              <div style={label}>Cron Expression</div>
              <input type="text" value={cronExpr} onChange={e => setCronExpr(e.target.value)} style={{ ...inputStyle, fontFamily: 'var(--font-mono, monospace)' }} />
              <p className="text-[10px] mt-1" style={{ color: C.text }}>{humanReadable}</p>
            </div>
            <div>
              <div style={label}>Timezone</div>
              <input type="text" value={timezone} onChange={e => setTimezone(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <div style={label}>Next 5 Runs</div>
              <div className="space-y-0.5">
                {MOCK.nextRuns.map((r, i) => (
                  <div key={i} className="text-[10px] px-2 py-1 rounded" style={{ background: i === 0 ? C.tint : 'transparent', color: i === 0 ? C.text : 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'webhook':
        return (
          <div className="space-y-3">
            <div>
              <div style={label}>Webhook URL</div>
              <div className="flex gap-2">
                <input type="text" value={MOCK.webhookUrl} readOnly style={{ ...inputStyle, fontFamily: 'var(--font-mono)' }} />
                <button className="text-[10px] font-medium px-3 rounded-lg whitespace-nowrap" style={{ background: C.tint, color: C.accent, border: `1px solid ${C.border}` }}>
                  Copy
                </button>
              </div>
            </div>
            <div>
              <div style={label}>Auth Method</div>
              <SegmentedControl options={WEBHOOK_AUTH_OPTIONS} value={webhookAuth} onChange={setWebhookAuth} accentColor={C.accent} size="sm" />
            </div>
          </div>
        );
    }
  }

  // ─── Left Panel ──────────────────────────────────────────────────

  const leftPanel = (
    <>
      {/* Identity */}
      <div style={card}>
        <SectionHeader>Trigger Identity</SectionHeader>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[15px] font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-ui)' }}>{MOCK.name}</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md" style={{ background: C.tint, color: C.accent }}>v{MOCK.version}</span>
        </div>
        <div style={label}>Status</div>
        <SegmentedControl options={STATUS_OPTIONS} value={status} onChange={setStatus} accentColor={status === 'active' ? '#059669' : '#9CA3AF'} size="sm" />
      </div>

      {/* Type Selector */}
      <div style={card}>
        <SectionHeader>Trigger Type</SectionHeader>
        <SegmentedControl options={TYPE_OPTIONS} value={triggerType} onChange={setTriggerType} accentColor={C.accent} />
        <p className="text-[10px] mt-2" style={{ color: 'var(--color-text-tertiary)' }}>
          {TRIGGER_CONFIG[triggerType].description}
        </p>
      </div>

      {/* Type-specific config */}
      <div style={card}>
        <SectionHeader>{TRIGGER_CONFIG[triggerType].label.split('(')[0].trim()} Configuration</SectionHeader>
        {renderTypeConfig()}
      </div>

      {/* GCP Service Mapping */}
      <div style={card}>
        <SectionHeader>GCP Service Mapping</SectionHeader>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: C.tint }}>
          <span className="text-lg">{GCP_MAP[triggerType].icon}</span>
          <div>
            <div className="text-[11px] font-semibold" style={{ color: C.text }}>{GCP_MAP[triggerType].service}</div>
            <div className="text-[9px]" style={{ color: 'var(--color-text-tertiary)' }}>Maps to {TRIGGER_CONFIG[triggerType].gcpService}</div>
          </div>
          <span className="flex-1" />
          <span className="text-[9px] cursor-pointer" style={{ color: C.accent }}>Open in Console →</span>
        </div>
      </div>
    </>
  );

  // ─── Right Panel ─────────────────────────────────────────────────

  const rightPanel = (
    <>
      {/* Status Card */}
      <div style={card}>
        <SectionHeader>Trigger Status</SectionHeader>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: status === 'active' ? '#10B981' : '#9CA3AF' }} />
          <span className="text-[11px] font-semibold" style={{ color: status === 'active' ? '#059669' : 'var(--color-text-tertiary)' }}>
            {status === 'active' ? 'Active' : 'Paused'}
          </span>
        </div>
        <div className="space-y-1.5">
          {[
            ['Last triggered', '2 hours ago'],
            ['Total invocations', '1,247'],
            ['Error rate', '0.1%'],
            ['Avg processing', '2.3s'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span>{k}</span><span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Code Preview */}
      <CodePreview expression={codeExpression} python={codePython} dependencies={['adk-fluent>=0.5.0', `google-cloud-${TRIGGER_CONFIG[triggerType].gcpService.replace(' ', '-').toLowerCase()}`]} accentColor={C.accent} />

      {/* Usage */}
      <div style={card}>
        <SectionHeader>Usage</SectionHeader>
        <div className="space-y-1.5">
          {[
            ['Attached to', '3 agents'],
            ['Last 24h', '47 invocations'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>
              <span>{k}</span><span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  // ─── Test Panel ──────────────────────────────────────────────────

  const testPanel = (
    <TestPanel
      placeholder="Enter a test event payload or trigger simulation..."
      accentColor={C.accent}
      onRun={handleTest}
      renderResult={() => {
        if (testing) return <div className="text-[11px] py-4 text-center" style={{ color: 'var(--color-text-tertiary)' }}>Simulating trigger...</div>;
        if (!testResult) return null;
        const r = testResult as { status: string; triggerType: string; event: Record<string, string>; agentResult: Record<string, unknown> };
        return (
          <div className="space-y-2 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: '#DCFCE7', color: '#166534' }}>TRIGGER FIRED</span>
              <span className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>{r.triggerType}</span>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'var(--color-bg-primary)' }}>
              <div className="text-[10px] space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
                <div>Event: <span style={{ fontFamily: 'var(--font-mono)' }}>{r.event.type}</span></div>
                <div>Source: <span style={{ fontFamily: 'var(--font-mono)' }}>{r.event.source}</span></div>
                <div>Agent loop: <span className="font-semibold">{String(r.agentResult.iterations)} iterations → {String(r.agentResult.status)} in {String(r.agentResult.duration)}</span></div>
              </div>
            </div>
          </div>
        );
      }}
    />
  );

  return (
    <EditorShell
      chipType="trigger"
      chipName={MOCK.name}
      version={MOCK.version}
      leftPanel={leftPanel}
      leftPanelLabel="Configuration"
      rightPanel={rightPanel}
      rightPanelLabel="Preview"
      testPanel={testPanel}
      onPublish={() => {}}
      onCreateNew={() => {}}
    />
  );
}
