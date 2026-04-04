/**
 * LiveAuthoring — Screen 5: Gemini Live Authoring Session.
 *
 * Split-screen showing a Gemini Live conversation on the left
 * and a playbook being generated on the right. The authoring agent
 * is itself an agent running the same loop (meta-circularity).
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';

// ─── Chip Color Map ──────────────────────────────────────────────────

type ChipType = 'doc' | 'tool' | 'agent' | 'guard' | 'connector' | 'skill' | 'trigger' | 'data';

const CHIP_COLORS: Record<ChipType, string> = {
  doc: '#0D9488',
  tool: '#4F46E5',
  agent: '#D97706',
  guard: '#E11D48',
  connector: '#2563EB',
  skill: '#7C3AED',
  trigger: '#EA580C',
  data: '#059669',
};

const CHIP_ICONS: Record<ChipType, string> = {
  doc: '\u{1F4C4}',
  tool: '\u{1F527}',
  agent: '\u{1F916}',
  guard: '\u{1F6E1}',
  connector: '\u{1F50C}',
  skill: '\u{2728}',
  trigger: '\u{26A1}',
  data: '\u{1F4CA}',
};

// ─── Inline Chip Renderer ────────────────────────────────────────────

interface ChipRef {
  type: ChipType;
  name: string;
  isDraft?: boolean;
}

function InlineChip({ type, name, isDraft }: ChipRef) {
  const color = CHIP_COLORS[type];
  const icon = CHIP_ICONS[type];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold mx-0.5 whitespace-nowrap"
      style={{
        background: isDraft ? 'transparent' : `${color}15`,
        color: color,
        border: isDraft ? `1.5px dashed #EAB308` : `1px solid ${color}30`,
        ...(isDraft ? { color: '#92700C' } : {}),
      }}
    >
      <span className="text-[10px]">{icon}</span>
      @{type}({name})
    </span>
  );
}

// ─── Parse text with @type(name) references into React nodes ─────────

function parseChipText(text: string, draftChips?: string[]): React.ReactNode[] {
  const regex = /@(doc|tool|agent|guard|connector|skill|trigger|data)\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const chipType = match[1] as ChipType;
    const chipName = match[2];
    const isDraft = draftChips?.includes(`${chipType}:${chipName}`);
    parts.push(
      <InlineChip key={`${match.index}`} type={chipType} name={chipName} isDraft={isDraft} />
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return parts;
}

// ─── Conversation Data ───────────────────────────────────────────────

interface Message {
  role: 'user' | 'gemini';
  text: string;
}

const CONVERSATION: Message[] = [
  {
    role: 'user',
    text: 'I need an agent that handles our customer refund process. It should check the order status in Shopify, verify the refund policy, and either process the refund or escalate to a manager.',
  },
  {
    role: 'gemini',
    text: "I'll create a refund processing agent. I found some existing assets in your registry: @tool(shopify-orders) for order lookup, @doc(refund-policy-q4) for policy rules, and @agent(support-manager) for escalation. I also see @connector(salesforce) and @connector(slack) \u2014 should the agent pull customer data from Salesforce and notify on Slack?",
  },
  {
    role: 'user',
    text: 'Yes, use Salesforce for customer lookup. And add Slack notifications for refunds over a thousand dollars.',
  },
  {
    role: 'gemini',
    text: "Got it. I'll also apply @skill(customer-empathy) for tone guidance and @guard(pii-redaction) since we're handling customer data. I need a new tool for warehouse return checks \u2014 should I scaffold @tool(warehouse-return-check) as a draft?",
  },
  {
    role: 'user',
    text: 'Yes, scaffold it. My engineering team can implement the endpoint.',
  },
  {
    role: 'gemini',
    text: "Done. I've created the playbook with the loop running across your connected systems. Here's the draft...",
  },
];

// ─── Playbook Content (structured for rendering) ─────────────────────

interface PlaybookLine {
  type: 'h1' | 'h2' | 'text' | 'list' | 'blank';
  content: string;
  indent?: number;
  isDraftLine?: boolean;
}

const PLAYBOOK_LINES: PlaybookLine[] = [
  { type: 'h1', content: 'Refund Processing Agent' },
  { type: 'blank', content: '' },
  { type: 'h2', content: 'Role' },
  { type: 'text', content: 'You are a customer refund processing assistant for ACME Retail.' },
  { type: 'blank', content: '' },
  { type: 'h2', content: 'Triggers' },
  { type: 'list', content: '@trigger(chat) \u2014 real-time customer conversations' },
  { type: 'blank', content: '' },
  { type: 'h2', content: 'Skills' },
  { type: 'text', content: 'Uses @skill(customer-empathy) for tone and de-escalation.' },
  { type: 'blank', content: '' },
  { type: 'h2', content: 'Knowledge' },
  { type: 'text', content: 'Reference @doc(refund-policy-q4) for refund rules.' },
  { type: 'blank', content: '' },
  { type: 'h2', content: 'Connected Systems' },
  { type: 'list', content: '@connector(salesforce) for customer account data' },
  { type: 'list', content: '@connector(slack) for team notifications' },
  { type: 'blank', content: '' },
  { type: 'h2', content: 'Process' },
  { type: 'list', content: '1. Greet customer and collect order number', indent: 1 },
  { type: 'list', content: '2. Use @tool(shopify-orders) to check order status', indent: 1 },
  { type: 'list', content: '3. Search @connector(salesforce) for customer history', indent: 1 },
  { type: 'list', content: '4. Validate against @doc(refund-policy-q4)', indent: 1 },
  { type: 'list', content: '5. If refund > $1,000, notify @connector(slack)', indent: 1 },
  { type: 'list', content: '6. If complex, escalate to @agent(support-manager)', indent: 1 },
  { type: 'blank', content: '' },
  { type: 'h2', content: 'Guards' },
  { type: 'text', content: 'All interactions subject to @guard(pii-redaction).' },
  { type: 'blank', content: '' },
  { type: 'h2', content: 'Draft Tools' },
  { type: 'text', content: '@tool(warehouse-return-check) \u2014 pending implementation', isDraftLine: true },
];

// ─── Voice Waveform ──────────────────────────────────────────────────

function VoiceWaveform() {
  const barCount = 28;
  return (
    <div className="flex items-center justify-center gap-[2px] h-12 px-6">
      {Array.from({ length: barCount }).map((_, i) => {
        const delay = (i * 0.07).toFixed(2);
        const baseHeight = 8 + Math.sin(i * 0.7) * 12 + Math.cos(i * 0.3) * 8;
        return (
          <div
            key={i}
            className="rounded-full bg-[var(--color-accent)]"
            style={{
              width: '3px',
              height: `${baseHeight}px`,
              opacity: 0.5 + Math.sin(i * 0.5) * 0.3,
              animation: `waveformPulse 1.4s ease-in-out ${delay}s infinite alternate`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
          isUser ? 'bg-gray-500' : 'bg-[var(--color-accent)]'
        }`}
      >
        {isUser ? 'U' : 'G'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div className="text-[10px] text-gray-400 mb-1 px-1" style={{ fontFamily: 'var(--font-ui)' }}>
          {isUser ? 'You' : 'Gemini'}
        </div>
        <div
          className={`rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
            isUser
              ? 'bg-gray-100 text-gray-800 rounded-tr-sm'
              : 'bg-blue-50 text-gray-800 rounded-tl-sm border border-blue-100'
          }`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {parseChipText(message.text)}
        </div>
      </div>
    </div>
  );
}

// ─── Microphone Button ───────────────────────────────────────────────

function MicButton() {
  return (
    <div className="flex items-center justify-center py-4">
      <button
        className="relative w-14 h-14 rounded-full bg-[var(--color-accent)] text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
        title="Microphone — active listening"
      >
        {/* Pulse rings */}
        <span
          className="absolute inset-0 rounded-full bg-[var(--color-accent)]"
          style={{ animation: 'micPulse 2s ease-out infinite' }}
        />
        <span
          className="absolute inset-0 rounded-full bg-[var(--color-accent)]"
          style={{ animation: 'micPulse 2s ease-out 0.6s infinite' }}
        />
        {/* Mic icon (SVG) */}
        <svg className="w-6 h-6 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 01-14 0v-1" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </button>
    </div>
  );
}

// ─── Playbook Renderer ───────────────────────────────────────────────

function PlaybookDocument() {
  const draftChips = ['tool:warehouse-return-check'];

  return (
    <div className="px-8 py-6">
      {PLAYBOOK_LINES.map((line, i) => {
        if (line.type === 'blank') {
          return <div key={i} className="h-3" />;
        }
        if (line.type === 'h1') {
          return (
            <h1
              key={i}
              className="text-2xl font-bold text-gray-900 mb-1"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              {line.content}
            </h1>
          );
        }
        if (line.type === 'h2') {
          return (
            <h2
              key={i}
              className="text-sm font-semibold text-gray-600 uppercase tracking-wider mt-2 mb-1"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              {line.content}
            </h2>
          );
        }
        const isNumberedList = /^\d+\./.test(line.content);
        return (
          <div
            key={i}
            className={`text-[13px] leading-relaxed text-gray-700 ${
              line.type === 'list' ? (isNumberedList ? 'ml-2 mb-0.5' : 'ml-1 mb-0.5') : 'mb-1'
            } ${line.isDraftLine ? 'opacity-80' : ''}`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {line.type === 'list' && !isNumberedList && (
              <span className="text-gray-400 mr-1.5">&bull;</span>
            )}
            {parseChipText(line.content, draftChips)}
          </div>
        );
      })}
    </div>
  );
}

// ─── Meta Drawer — The Authoring Agent ───────────────────────────────

function MetaDrawer() {
  const [open, setOpen] = useState(false);

  const loopSteps = [
    {
      phase: 'Observe',
      detail: 'User described refund process involving Shopify, escalation, manager routing',
    },
    {
      phase: 'Reason',
      detail:
        'Matched "Shopify" to @tool(shopify-orders), "customer data" to @connector(salesforce), "escalate to manager" to @agent(support-manager). Identified need for @guard(pii-redaction) from customer data handling context.',
    },
    {
      phase: 'Act',
      detail:
        'Queried registry for matching assets (3 found). Assembled playbook draft with 5 triggers, 2 connectors, 3 tools, 1 skill, 1 guard. Scaffolded @tool(warehouse-return-check) as draft.',
    },
  ];

  const metaChips: ChipRef[] = [
    { type: 'skill', name: 'skill-creator' },
    { type: 'connector', name: 'google-drive' },
    { type: 'data', name: 'registry-catalog' },
  ];

  return (
    <div className="border-t border-[var(--color-border)]">
      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-6 py-3 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
        style={{ fontFamily: 'var(--font-ui)' }}
      >
        <svg
          className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Show meta: how this agent was built
      </button>

      {/* Expandable Content */}
      {open && (
        <div className="px-6 pb-5 animate-in">
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
            <p className="text-[11px] text-gray-500 mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
              The authoring agent itself uses the same loop:
            </p>

            {/* Agent's own chips */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {metaChips.map((c) => (
                <InlineChip key={c.name} type={c.type} name={c.name} />
              ))}
            </div>

            {/* Mini loop trace */}
            <div className="space-y-2">
              {loopSteps.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                        step.phase === 'Observe'
                          ? 'bg-teal-500'
                          : step.phase === 'Reason'
                          ? 'bg-indigo-500'
                          : 'bg-amber-500'
                      }`}
                    >
                      {i + 1}
                    </div>
                    {i < loopSteps.length - 1 && <div className="w-px flex-1 bg-gray-200 my-0.5" />}
                  </div>
                  <div className="flex-1 pb-1">
                    <div
                      className="text-[11px] font-semibold text-gray-700"
                      style={{ fontFamily: 'var(--font-ui)' }}
                    >
                      {step.phase}
                    </div>
                    <div
                      className="text-[11px] text-gray-500 leading-relaxed"
                      style={{ fontFamily: 'var(--font-body)' }}
                    >
                      {parseChipText(step.detail)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function LiveAuthoring() {
  return (
    <div className="min-h-screen bg-[#FAFAF9] flex flex-col">
      {/* CSS Keyframes */}
      <style>{`
        @keyframes waveformPulse {
          0% { transform: scaleY(0.5); }
          100% { transform: scaleY(1.5); }
        }
        @keyframes micPulse {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        .animate-in {
          animation: slideIn 0.2s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Top Bar */}
      <header className="border-b border-[var(--color-border)] bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-4 px-6 py-3">
          <Link
            to="/"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Home
          </Link>
          <div className="w-px h-5 bg-[var(--color-border)]" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--color-accent)] flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 01-14 0v-1" />
              </svg>
            </div>
            <h1 className="text-sm font-semibold text-gray-900" style={{ fontFamily: 'var(--font-ui)' }}>
              Gemini Live Authoring
            </h1>
          </div>
          <div className="flex-1" />
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
            SESSION ACTIVE
          </span>
        </div>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel — Conversation (55%) */}
        <div className="w-[55%] flex flex-col bg-white border-r border-[var(--color-border)]">
          {/* Waveform Header */}
          <div className="border-b border-gray-100 bg-gradient-to-b from-blue-50/60 to-white py-3">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold" style={{ fontFamily: 'var(--font-ui)' }}>
                Gemini Live — Listening
              </span>
            </div>
            <VoiceWaveform />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {CONVERSATION.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
          </div>

          {/* Mic Button */}
          <div className="border-t border-gray-100">
            <MicButton />
          </div>
        </div>

        {/* Right Panel — Live Playbook (45%) */}
        <div className="w-[45%] flex flex-col bg-[#FDFDFB]">
          {/* Panel Header */}
          <div className="border-b border-[var(--color-border)] px-6 py-3 flex items-center justify-between bg-white/60">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-teal-100 flex items-center justify-center">
                <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-gray-700" style={{ fontFamily: 'var(--font-ui)' }}>
                Generated Playbook
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-medium">
                DRAFT
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              generating...
            </div>
          </div>

          {/* Playbook Content */}
          <div className="flex-1 overflow-y-auto">
            <PlaybookDocument />
          </div>

          {/* Action Buttons */}
          <div className="border-t border-[var(--color-border)] px-6 py-4 flex items-center justify-end gap-3 bg-white/60">
            <button
              className="px-4 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              Keep Editing
            </button>
            <button
              className="px-5 py-2 text-xs font-semibold text-white bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors shadow-sm cursor-pointer"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              Accept Draft
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Drawer — Meta */}
      <MetaDrawer />
    </div>
  );
}
