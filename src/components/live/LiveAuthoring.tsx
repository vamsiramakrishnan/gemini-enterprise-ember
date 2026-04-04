/**
 * LiveAuthoring — Screen 5: Gemini Live Authoring Session.
 *
 * Split-screen showing a Gemini Live conversation on the left
 * and a playbook being generated on the right. The authoring agent
 * is itself an agent running the same loop (meta-circularity).
 */

import { useState } from 'react';

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

// ─── Inline Chip Renderer ────────────────────────────────────────────

interface ChipRef {
  type: ChipType;
  name: string;
  isDraft?: boolean;
}

function InlineChip({ type, name, isDraft }: ChipRef) {
  const color = CHIP_COLORS[type];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold mx-0.5 whitespace-nowrap"
      style={{
        background: isDraft ? 'transparent' : `${color}15`,
        color: isDraft ? '#92700C' : color,
        border: isDraft ? '1.5px dashed #EAB308' : `1px solid ${color}30`,
      }}
    >
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
  timestamp: string;
}

const CONVERSATION: Message[] = [
  {
    role: 'user',
    text: 'I need an agent that handles our customer refund process. It should check the order status in Shopify, verify the refund policy, and either process the refund or escalate to a manager.',
    timestamp: '2:34 PM',
  },
  {
    role: 'gemini',
    text: "I'll create a refund processing agent. I found some existing assets in your registry: @tool(shopify-orders) for order lookup, @doc(refund-policy-q4) for policy rules, and @agent(support-manager) for escalation. I also see @connector(salesforce) and @connector(slack) \u2014 should the agent pull customer data from Salesforce and notify on Slack?",
    timestamp: '2:34 PM',
  },
  {
    role: 'user',
    text: 'Yes, use Salesforce for customer lookup. And add Slack notifications for refunds over a thousand dollars.',
    timestamp: '2:35 PM',
  },
  {
    role: 'gemini',
    text: "Got it. I'll also apply @skill(customer-empathy) for tone guidance and @guard(pii-redaction) since we're handling customer data. I need a new tool for warehouse return checks \u2014 should I scaffold @tool(warehouse-return-check) as a draft?",
    timestamp: '2:35 PM',
  },
  {
    role: 'user',
    text: 'Yes, scaffold it. My engineering team can implement the endpoint.',
    timestamp: '2:36 PM',
  },
  {
    role: 'gemini',
    text: "Done. I've created the playbook with the loop running across your connected systems. Here's the draft...",
    timestamp: '2:36 PM',
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
  const barCount = 32;
  return (
    <div className="flex items-center justify-center px-6">
      <svg
        width="280"
        height="40"
        viewBox="0 0 280 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {Array.from({ length: barCount }).map((_, i) => {
          const x = 4 + i * (272 / barCount);
          const baseHeight = 6 + Math.sin(i * 0.7) * 10 + Math.cos(i * 0.3) * 6;
          const y = (40 - baseHeight) / 2;
          const delay = (i * 0.07).toFixed(2);
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width="3"
              height={baseHeight}
              rx="1.5"
              fill="#2563EB"
              opacity={0.4 + Math.sin(i * 0.5) * 0.3}
              style={{
                transformOrigin: `${x + 1.5}px 20px`,
                animation: `waveformPulse 1.4s ease-in-out ${delay}s infinite alternate`,
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ─── SVG Icons ───────────────────────────────────────────────────────

function MicrophoneIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a4 4 0 00-4 4v6a4 4 0 008 0V5a4 4 0 00-4-4z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v1a7 7 0 01-14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SendIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ─── Message Bubble ──────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
          isUser ? 'bg-[#6B7280]' : 'bg-[#2563EB]'
        }`}
      >
        {isUser ? 'U' : 'G'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`rounded-lg px-4 py-3 text-[13px] leading-relaxed ${
            isUser
              ? 'bg-[#F3F4F6] text-[#1F2937]'
              : 'bg-white text-[#1F2937] border border-[#E5E7EB]'
          }`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {parseChipText(message.text)}
        </div>
        <div
          className="text-[10px] text-[#D1D5DB] mt-1 px-1"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          {isUser ? 'You' : 'Gemini'} · {message.timestamp}
        </div>
      </div>
    </div>
  );
}

// ─── Input Area ─────────────────────────────────────────────────────

function InputArea() {
  return (
    <div className="border-t border-[#E5E7EB] bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <button
          className="w-9 h-9 rounded-lg bg-[#2563EB] text-white flex items-center justify-center hover:bg-[#1D4ED8] transition-colors cursor-pointer flex-shrink-0"
          title="Microphone"
        >
          <MicrophoneIcon className="w-4 h-4" />
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Type a message or use voice..."
            className="w-full px-3 py-2 text-[13px] text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
        <button
          className="w-9 h-9 rounded-lg border border-[#E5E7EB] text-[#9CA3AF] flex items-center justify-center hover:text-[#6B7280] hover:border-[#D1D5DB] transition-colors cursor-pointer flex-shrink-0"
          title="Send"
        >
          <SendIcon />
        </button>
      </div>
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
              className="text-xl font-bold text-[#111827] mb-1"
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
              className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider mt-3 mb-1"
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
            className={`text-[13px] leading-relaxed text-[#374151] ${
              line.type === 'list' ? (isNumberedList ? 'ml-2 mb-0.5' : 'ml-1 mb-0.5') : 'mb-1'
            } ${line.isDraftLine ? 'opacity-80' : ''}`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {line.type === 'list' && !isNumberedList && (
              <span className="text-[#9CA3AF] mr-1.5">&bull;</span>
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
    <div className="border-t border-[#E5E7EB]">
      {/* Toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-6 py-2.5 text-[11px] text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
        style={{ fontFamily: 'var(--font-ui)' }}
      >
        <svg
          className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Show authoring agent trace
      </button>

      {/* Expandable Content */}
      {open && (
        <div className="px-6 pb-4 animate-in">
          <div className="rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-4">
            <p className="text-[11px] text-[#9CA3AF] mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
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
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                        step.phase === 'Observe'
                          ? 'bg-[#0D9488]'
                          : step.phase === 'Reason'
                          ? 'bg-[#4F46E5]'
                          : 'bg-[#D97706]'
                      }`}
                    >
                      {i + 1}
                    </div>
                    {i < loopSteps.length - 1 && <div className="w-px flex-1 bg-[#E5E7EB] my-0.5" />}
                  </div>
                  <div className="flex-1 pb-1">
                    <div
                      className="text-[11px] font-semibold text-[#374151]"
                      style={{ fontFamily: 'var(--font-ui)' }}
                    >
                      {step.phase}
                    </div>
                    <div
                      className="text-[11px] text-[#6B7280] leading-relaxed"
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
    <div className="h-full bg-white flex flex-col">
      {/* CSS Keyframes */}
      <style>{`
        @keyframes waveformPulse {
          0% { transform: scaleY(0.5); }
          100% { transform: scaleY(1.5); }
        }
        .animate-in {
          animation: slideIn 0.2s ease-out;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes highlightFade {
          0% { background-color: #FFFBEB; }
          100% { background-color: transparent; }
        }
      `}</style>

      {/* Header */}
      <header
        className="flex items-center gap-3 px-6 py-3 bg-white"
        style={{ borderBottom: '1px solid #E5E7EB', fontFamily: 'var(--font-ui)' }}
      >
        <h1 className="text-[13px] font-semibold text-[#111827]">
          Gemini Live Authoring
        </h1>
        <div className="flex-1" />
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#166534] font-semibold">
          SESSION ACTIVE
        </span>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel — Conversation (55%) */}
        <div
          className="flex flex-col bg-white"
          style={{ width: '55%', borderRight: '1px solid #E5E7EB' }}
        >
          {/* Waveform Header */}
          <div className="bg-[#F9FAFB] py-3" style={{ borderBottom: '1px solid #E5E7EB' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
              <span
                className="text-[10px] text-[#9CA3AF] uppercase tracking-wider font-medium"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                Gemini Live — Listening
              </span>
            </div>
            <VoiceWaveform />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {CONVERSATION.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
          </div>

          {/* Input Area */}
          <InputArea />
        </div>

        {/* Right Panel — Live Playbook (45%) */}
        <div className="flex flex-col bg-white" style={{ width: '45%' }}>
          {/* Panel Header */}
          <div
            className="px-6 py-3 flex items-center justify-between bg-white"
            style={{ borderBottom: '1px solid #E5E7EB' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[13px] font-semibold text-[#374151]"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                Generated Playbook
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            </div>
            <span
              className="text-[10px] px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] font-medium"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              DRAFT
            </span>
          </div>

          {/* Playbook Content */}
          <div className="flex-1 overflow-y-auto">
            <PlaybookDocument />
          </div>

          {/* Action Buttons */}
          <div
            className="px-6 py-3 flex items-center justify-end gap-3 bg-white"
            style={{ borderTop: '1px solid #E5E7EB' }}
          >
            <button
              className="px-4 py-2 text-[12px] font-medium text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              Keep Editing
            </button>
            <button
              className="px-5 py-2 text-[12px] font-semibold text-white bg-[#2563EB] rounded-lg hover:bg-[#1D4ED8] transition-colors cursor-pointer"
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
