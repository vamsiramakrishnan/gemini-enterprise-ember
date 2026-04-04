/**
 * LiveAuthoring — Screen 5: Gemini Live Authoring Session.
 *
 * Split-screen showing a Gemini Live conversation on the left
 * and a playbook being generated on the right. The authoring agent
 * is itself an agent running the same loop (meta-circularity).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNotifications } from '../../contexts/AppContext';

// ─── Chip Color Map ──────────────────────────────────────────────────

type ChipType = 'doc' | 'tool' | 'agent' | 'guard' | 'connector' | 'skill' | 'trigger' | 'data';

const CHIP_COLORS: Record<ChipType, { bg: string; text: string; border: string; accent: string }> = {
  doc:       { bg: '#F0FDFA', text: '#0F766E', border: '#99F6E4', accent: '#0D9488' },
  tool:      { bg: '#EEF2FF', text: '#4338CA', border: '#C7D2FE', accent: '#4F46E5' },
  agent:     { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', accent: '#D97706' },
  guard:     { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', accent: '#E11D48' },
  connector: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', accent: '#2563EB' },
  skill:     { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', accent: '#7C3AED' },
  trigger:   { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', accent: '#EA580C' },
  data:      { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', accent: '#059669' },
};

// ─── Inline Chip Renderer ────────────────────────────────────────────

interface ChipRef {
  type: ChipType;
  name: string;
  isDraft?: boolean;
}

function InlineChip({ type, name, isDraft }: ChipRef) {
  const c = CHIP_COLORS[type];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold mx-0.5 whitespace-nowrap"
      style={{
        background: isDraft ? 'transparent' : c.bg,
        color: isDraft ? '#92700C' : c.text,
        border: isDraft ? '1.5px dashed #EAB308' : `1px solid ${c.border}`,
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
    <div className="flex items-center justify-center px-4 md:px-6">
      <svg
        className="w-full max-w-[280px]"
        height="40"
        viewBox="0 0 280 40"
        preserveAspectRatio="xMidYMid meet"
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
              fill="var(--color-accent)"
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
    <div className={`flex gap-2 md:gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-white text-[9px] md:text-[10px] font-bold flex-shrink-0 ${
          isUser ? 'bg-[var(--color-text-secondary)]' : 'bg-[var(--color-accent)]'
        }`}
      >
        {isUser ? 'U' : 'G'}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] md:max-w-[85%] ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`rounded-lg px-3 py-2 md:px-4 md:py-3 text-[13px] leading-relaxed ${
            isUser
              ? 'bg-[var(--color-surface-2)] text-[var(--color-text-primary)]'
              : 'bg-white text-[var(--color-text-primary)] border border-[var(--color-border)]'
          }`}
          style={{ fontFamily: 'var(--font-body)' }}
        >
          {parseChipText(message.text)}
        </div>
        <div
          className="text-[10px] text-[var(--color-border-strong)] mt-1 px-1"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          {isUser ? 'You' : 'Gemini'} · {message.timestamp}
        </div>
      </div>
    </div>
  );
}

// ─── Mock Gemini Responses ──────────────────────────────────────────

const MOCK_RESPONSES = [
  "I can help with that. Let me check the registry for relevant assets and update the playbook accordingly.",
  "Good idea. I've noted that change and will incorporate it into the playbook draft. Anything else you'd like to adjust?",
  "Understood. I'll update the escalation rules and add the appropriate @guard(compliance-check) to enforce that policy.",
  "I've found @connector(google-drive) in your workspace which could be useful for document retrieval. Want me to add it?",
  "That makes sense. I'll refine the process steps and add @tool(status-checker) as a draft for your team to implement.",
];

const MOCK_PLAYBOOK_ADDITIONS: string[] = [
  '\n## Additional Notes\nIncorporate user feedback on escalation routing.',
  '\n- Use @tool(status-checker) for order verification',
  '\n- Apply @guard(compliance-check) for regulatory adherence',
];

// ─── Input Area ─────────────────────────────────────────────────────

function InputArea({ onSend, onMic }: { onSend: (text: string) => void; onMic: () => void }) {
  const [inputText, setInputText] = useState('');

  const handleSend = () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-[var(--color-border)] bg-white px-3 py-2 md:px-4 md:py-3">
      <div className="flex items-center gap-2">
        <button
          onClick={onMic}
          className="w-9 h-9 rounded-lg bg-[var(--color-accent)] text-white flex items-center justify-center hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer flex-shrink-0"
          title="Microphone"
        >
          <MicrophoneIcon className="w-4 h-4" />
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or use voice..."
            className="w-full px-3 py-2 text-[13px] text-[var(--color-text-primary)] bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-lg outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]/20 transition-colors"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
        <button
          onClick={handleSend}
          className="w-9 h-9 rounded-lg border border-[var(--color-border)] text-[var(--color-text-tertiary)] flex items-center justify-center hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] transition-colors cursor-pointer flex-shrink-0"
          title="Send"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

// ─── Playbook Renderer ───────────────────────────────────────────────

function PlaybookDocument({ extraLines = [] }: { extraLines?: PlaybookLine[] }) {
  const draftChips = ['tool:warehouse-return-check'];
  const allLines = [...PLAYBOOK_LINES, ...extraLines];

  return (
    <div className="px-4 py-4 md:px-8 md:py-6">
      {allLines.map((line, i) => {
        if (line.type === 'blank') {
          return <div key={i} className="h-3" />;
        }
        if (line.type === 'h1') {
          return (
            <h1
              key={i}
              className="text-xl font-bold text-[var(--color-text-primary)] mb-1"
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
              className="text-[11px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider mt-3 mb-1"
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
            className={`text-[13px] leading-relaxed text-[var(--color-text-primary)] ${
              line.type === 'list' ? (isNumberedList ? 'ml-2 mb-0.5' : 'ml-1 mb-0.5') : 'mb-1'
            } ${line.isDraftLine ? 'opacity-80' : ''}`}
            style={{ fontFamily: 'var(--font-body)' }}
          >
            {line.type === 'list' && !isNumberedList && (
              <span className="text-[var(--color-text-tertiary)] mr-1.5">&bull;</span>
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
        className="w-full flex items-center gap-2 px-4 py-2 md:px-6 md:py-2.5 text-[11px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-1)] transition-colors cursor-pointer"
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
        <div className="px-3 pb-3 md:px-6 md:pb-4 animate-in">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-3 md:p-4">
            <p className="text-[11px] text-[var(--color-text-tertiary)] mb-3" style={{ fontFamily: 'var(--font-ui)' }}>
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
                    {i < loopSteps.length - 1 && <div className="w-px flex-1 bg-[var(--color-border)] my-0.5" />}
                  </div>
                  <div className="flex-1 pb-1">
                    <div
                      className="text-[11px] font-semibold text-[var(--color-text-primary)]"
                      style={{ fontFamily: 'var(--font-ui)' }}
                    >
                      {step.phase}
                    </div>
                    <div
                      className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed"
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
  const { addNotification } = useNotifications();
  const [messages, setMessages] = useState<Message[]>([...CONVERSATION]);
  const [isTyping, setIsTyping] = useState(false);
  const [extraPlaybookLines, setExtraPlaybookLines] = useState<PlaybookLine[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responseIndexRef = useRef(0);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback((text: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    // Add user message
    const userMsg: Message = { role: 'user', text, timestamp };
    setMessages(prev => [...prev, userMsg]);
    addNotification({ type: 'info', title: 'Message sent' });

    // Show typing indicator then add mock Gemini response
    setIsTyping(true);
    const delay = 1000 + Math.random() * 1000;
    setTimeout(() => {
      setIsTyping(false);
      const idx = responseIndexRef.current % MOCK_RESPONSES.length;
      responseIndexRef.current += 1;
      const geminiMsg: Message = {
        role: 'gemini',
        text: MOCK_RESPONSES[idx],
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, geminiMsg]);

      // Append to playbook panel
      const playbookIdx = idx % MOCK_PLAYBOOK_ADDITIONS.length;
      const addition = MOCK_PLAYBOOK_ADDITIONS[playbookIdx];
      setExtraPlaybookLines(prev => [
        ...prev,
        { type: 'blank' as const, content: '' },
        { type: 'text' as const, content: addition.trim() },
      ]);
    }, delay);
  }, [addNotification]);

  const handleMic = useCallback(() => {
    addNotification({ type: 'info', title: 'Voice input', message: 'Gemini Live voice mode would activate here' });
  }, [addNotification]);

  const handleAcceptDraft = useCallback(() => {
    addNotification({ type: 'success', title: 'Draft accepted', message: 'Playbook saved to editor' });
  }, [addNotification]);

  const handleKeepEditing = useCallback(() => {
    addNotification({ type: 'info', title: 'Continuing edit session' });
  }, [addNotification]);

  return (
    <div className="h-full bg-white flex flex-col">
      {/* CSS Keyframes + Responsive layout */}
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
        /* Responsive split panels */
        @media (min-width: 768px) {
          .live-panel-conversation { width: 55%; flex: none; }
          .live-panel-playbook { width: 45%; flex: none; }
        }
      `}</style>

      {/* Header */}
      <header
        className="flex flex-wrap items-center gap-2 px-4 py-2.5 md:px-6 md:py-3 bg-white"
        style={{ borderBottom: '1px solid var(--color-border)', fontFamily: 'var(--font-ui)' }}
      >
        <h1 className="text-[13px] font-semibold text-[var(--color-text-primary)]">
          Gemini Live Authoring
        </h1>
        <div className="flex-1 min-w-0" />
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#166534] font-semibold">
          SESSION ACTIVE
        </span>
      </header>

      {/* Main Split View */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left Panel — Conversation (full width on mobile, 55% on md+) */}
        <div
          className="live-panel-conversation flex flex-col bg-white min-h-0 flex-1 md:flex-none md:border-r"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {/* Waveform Header */}
          <div className="bg-[var(--color-surface-1)] py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-success)] animate-pulse" />
              <span
                className="text-[10px] text-[var(--color-text-tertiary)] uppercase tracking-wider font-medium"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                Gemini Live — Listening
              </span>
            </div>
            <VoiceWaveform />
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 md:px-5 md:py-4 space-y-3 md:space-y-4">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {isTyping && (
              <div className="flex gap-2 md:gap-3 flex-row">
                <div className="w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-white text-[9px] md:text-[10px] font-bold flex-shrink-0 bg-[var(--color-accent)]">
                  G
                </div>
                <div className="rounded-lg px-3 py-2 md:px-4 md:py-3 text-[13px] bg-white border border-[var(--color-border)]">
                  <span className="inline-flex gap-1 items-center text-[var(--color-text-tertiary)]">
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="animate-pulse" style={{ animationDelay: '0.4s' }}>.</span>
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <InputArea onSend={handleSend} onMic={handleMic} />
        </div>

        {/* Right Panel — Live Playbook (full width on mobile, 45% on md+) */}
        <div className="live-panel-playbook flex flex-col bg-white min-h-0 flex-1 md:flex-none border-t md:border-t-0" style={{ borderColor: 'var(--color-border)' }}>
          {/* Panel Header */}
          <div
            className="px-4 py-2.5 md:px-6 md:py-3 flex items-center justify-between bg-white"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-[13px] font-semibold text-[var(--color-text-primary)]"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                Generated Playbook
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse" />
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
            <PlaybookDocument extraLines={extraPlaybookLines} />
          </div>

          {/* Action Buttons */}
          <div
            className="px-4 py-2.5 md:px-6 md:py-3 flex items-center justify-end gap-2 md:gap-3 bg-white"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <button
              onClick={handleKeepEditing}
              className="px-4 py-2 text-[12px] font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-1)] transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              Keep Editing
            </button>
            <button
              onClick={handleAcceptDraft}
              className="px-5 py-2 text-[12px] font-semibold text-white bg-[var(--color-accent)] rounded-lg hover:bg-[var(--color-accent-hover)] transition-colors cursor-pointer"
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
