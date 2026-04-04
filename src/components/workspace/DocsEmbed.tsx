/**
 * DocsEmbed — Screen 6: Embedded Agent in Google Docs
 *
 * A mockup of a Google Docs document with an embedded agent block,
 * demonstrating how agent playbooks integrate into existing Workspace docs.
 */

import { Link } from 'react-router-dom';

// ─── Fake Toolbar Icons ──────────────────────────────────────────────

function ToolbarSep() {
  return <div className="w-px h-5 bg-gray-300 mx-1" />;
}

function ToolbarBtn({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <button
      className={`px-1.5 py-0.5 rounded text-sm hover:bg-gray-200 transition-colors ${active ? 'bg-gray-200' : ''}`}
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      {children}
    </button>
  );
}

// ─── Smart Chip (inline, minimal) ────────────────────────────────────

function MiniChip({ type, name }: { type: string; name: string }) {
  const colors: Record<string, string> = {
    tool: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    connector: 'bg-blue-100 text-blue-700 border-blue-200',
    doc: 'bg-teal-100 text-teal-700 border-teal-200',
    guard: 'bg-rose-100 text-rose-700 border-rose-200',
    agent: 'bg-amber-100 text-amber-700 border-amber-200',
    schema: 'bg-slate-100 text-slate-600 border-slate-200',
    skill: 'bg-violet-100 text-violet-700 border-violet-200',
  };

  const icons: Record<string, string> = {
    tool: '\u2699',
    connector: '\u26A1',
    doc: '\uD83D\uDCC4',
    guard: '\uD83D\uDEE1',
    agent: '\uD83E\uDD16',
    schema: '\u2B1C',
    skill: '\u2726',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[type] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
      style={{ fontFamily: 'var(--font-ui)', fontSize: '11px' }}
    >
      <span className="text-[10px]">{icons[type] ?? '@'}</span>
      @{type}({name})
    </span>
  );
}

// ─── Docs Menu Bar ───────────────────────────────────────────────────

function DocsMenuBar() {
  const menus = ['File', 'Edit', 'View', 'Insert', 'Format', 'Tools', 'Extensions', 'Help'];
  return (
    <div className="flex items-center gap-0.5 px-3 py-1">
      {menus.map((m) => (
        <button
          key={m}
          className="px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// ─── Formatting Toolbar ──────────────────────────────────────────────

function FormattingToolbar() {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-200">
      {/* Undo / Redo */}
      <ToolbarBtn>&#x21B6;</ToolbarBtn>
      <ToolbarBtn>&#x21B7;</ToolbarBtn>
      <ToolbarBtn>&#x1F5B6;</ToolbarBtn>
      <ToolbarSep />

      {/* Zoom */}
      <div className="flex items-center px-2 py-0.5 text-xs text-gray-600 border border-gray-300 rounded" style={{ fontFamily: 'var(--font-ui)' }}>
        100%
      </div>
      <ToolbarSep />

      {/* Paragraph style */}
      <div className="flex items-center px-2 py-0.5 text-xs text-gray-600 border border-gray-300 rounded min-w-[100px]" style={{ fontFamily: 'var(--font-ui)' }}>
        Normal text
      </div>
      <ToolbarSep />

      {/* Font */}
      <div className="flex items-center px-2 py-0.5 text-xs text-gray-600 border border-gray-300 rounded min-w-[80px]" style={{ fontFamily: 'var(--font-ui)' }}>
        Arial
      </div>

      {/* Font size */}
      <div className="flex items-center px-2 py-0.5 text-xs text-gray-600 border border-gray-300 rounded w-10 justify-center" style={{ fontFamily: 'var(--font-ui)' }}>
        11
      </div>
      <ToolbarSep />

      {/* Bold / Italic / Underline / Strikethrough */}
      <ToolbarBtn><span className="font-bold">B</span></ToolbarBtn>
      <ToolbarBtn><span className="italic">I</span></ToolbarBtn>
      <ToolbarBtn><span className="underline">U</span></ToolbarBtn>
      <ToolbarBtn><span className="line-through">S</span></ToolbarBtn>
      <ToolbarSep />

      {/* Text color */}
      <ToolbarBtn>
        <span className="text-xs">A</span>
        <span className="block w-3 h-0.5 bg-black -mt-0.5 mx-auto" />
      </ToolbarBtn>

      {/* Highlight */}
      <ToolbarBtn>
        <span className="text-xs bg-yellow-200 px-0.5">A</span>
      </ToolbarBtn>
      <ToolbarSep />

      {/* Link / Comment / Image */}
      <ToolbarBtn>&#x1F517;</ToolbarBtn>
      <ToolbarBtn>&#x1F4AC;</ToolbarBtn>
      <ToolbarBtn>&#x1F5BC;</ToolbarBtn>
      <ToolbarSep />

      {/* Alignment */}
      <ToolbarBtn>&#x2261;</ToolbarBtn>
      <ToolbarSep />

      {/* List */}
      <ToolbarBtn>&#x2630;</ToolbarBtn>
      <ToolbarBtn>&#x2631;</ToolbarBtn>
    </div>
  );
}

// ─── Ruler ───────────────────────────────────────────────────────────

function Ruler() {
  return (
    <div className="h-6 border-b border-gray-200 bg-white relative overflow-hidden">
      <div className="absolute inset-x-0 top-3 h-px bg-gray-300 mx-20" />
      {/* Tick marks */}
      {Array.from({ length: 18 }).map((_, i) => (
        <div
          key={i}
          className="absolute top-2 w-px bg-gray-400"
          style={{ left: `${80 + i * 40}px`, height: i % 2 === 0 ? '8px' : '4px' }}
        />
      ))}
      {/* Numbers */}
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="absolute text-[9px] text-gray-400"
          style={{ left: `${78 + i * 80}px`, top: '0px', fontFamily: 'var(--font-ui)' }}
        >
          {i + 1}
        </div>
      ))}
      {/* Indent markers */}
      <div className="absolute left-[78px] top-3 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-blue-400" />
      <div className="absolute right-[78px] top-3 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-blue-400" />
    </div>
  );
}

// ─── Embedded Agent Block ────────────────────────────────────────────

function EmbeddedAgentBlock() {
  return (
    <div className="my-6 border border-blue-200 rounded-lg shadow-sm bg-gradient-to-br from-white to-blue-50/30 overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-50 to-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2.5">
          <span className="text-lg" role="img" aria-label="robot">&#x1F916;</span>
          <span className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'var(--font-ui)' }}>
            Embedded Agent: Claims Processing Agent
          </span>
          <span
            className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            v2.1
          </span>
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Published
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors text-sm" title="Expand">
            &#x2197;
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors text-sm" title="Settings">
            &#x2699;
          </button>
        </div>
      </div>

      {/* Compact playbook preview */}
      <div className="px-4 py-3 space-y-2" style={{ fontFamily: 'var(--font-body)', fontSize: '13px', lineHeight: '1.7' }}>
        <p className="text-gray-700">
          Process incoming insurance claims using{' '}
          <MiniChip type="tool" name="policy-lookup" /> to retrieve policy details and{' '}
          <MiniChip type="connector" name="salesforce" /> for customer account history.
        </p>
        <p className="text-gray-700">
          Apply{' '}
          <MiniChip type="skill" name="customer-empathy" /> for tone guidance.
          Validate against{' '}
          <MiniChip type="doc" name="claims-policy-2024" /> coverage rules.
        </p>
        <p className="text-gray-700">
          Escalations over $50k route to{' '}
          <MiniChip type="agent" name="senior-adjuster" />.
          All outputs conform to{' '}
          <MiniChip type="schema" name="claims-response-v2" />.
        </p>
        <p className="text-gray-500 text-xs italic mt-1">
          Protected by <MiniChip type="guard" name="pii-redaction" /> and{' '}
          <MiniChip type="guard" name="fraud-detection" />
        </p>
      </div>

      {/* Footer with actions */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-blue-100">
        <div className="text-[11px] text-gray-400" style={{ fontFamily: 'var(--font-ui)' }}>
          9 references &middot; 5 triggers &middot; Last tested 4h ago
        </div>
        <div className="flex items-center gap-3">
          <button
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-[#1A73E8] hover:bg-[#1557B0] transition-colors shadow-sm"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            Try it &rarr;
          </button>
          <button
            className="text-xs font-medium text-[#1A73E8] hover:underline"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            Open full editor &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function DocsEmbed() {
  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      {/* Back nav */}
      <div className="px-6 py-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-[#1A73E8] hover:underline"
          style={{ fontFamily: 'var(--font-ui)' }}
        >
          &larr; Back to Home
        </Link>
      </div>

      {/* Google Docs chrome wrapper */}
      <div className="max-w-[1100px] mx-auto">
        {/* Top title bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* Docs icon */}
            <div className="w-8 h-10 flex items-center justify-center">
              <svg viewBox="0 0 24 30" className="w-6 h-8">
                <rect x="0" y="0" width="24" height="30" rx="2" fill="#4285F4" />
                <rect x="4" y="6" width="10" height="1.5" rx="0.5" fill="white" />
                <rect x="4" y="10" width="14" height="1.5" rx="0.5" fill="white" />
                <rect x="4" y="14" width="14" height="1.5" rx="0.5" fill="white" />
                <rect x="4" y="18" width="11" height="1.5" rx="0.5" fill="white" />
                <rect x="4" y="22" width="14" height="1.5" rx="0.5" fill="white" />
              </svg>
            </div>
            <div>
              <div className="text-base font-medium text-gray-800" style={{ fontFamily: 'var(--font-ui)' }}>
                Customer Claims SOP
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-ui)' }}>
                <span className="text-yellow-500">&#x2605;</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium">Saved to Drive</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Last edit info */}
            <span className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-ui)' }}>
              Last edit was 2 hours ago
            </span>
            {/* Comments */}
            <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors text-lg" title="Comments">
              &#x1F4AC;
            </button>
            {/* Meet */}
            <button className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors text-lg" title="Meet">
              &#x1F3A5;
            </button>
            {/* Share */}
            <button
              className="px-5 py-2 rounded-full text-sm font-medium text-white bg-[#1A73E8] hover:bg-[#1557B0] transition-colors shadow-sm"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              Share
            </button>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">
              PS
            </div>
          </div>
        </div>

        {/* Menu bar */}
        <div className="bg-[#F8F9FA] border-b border-gray-200">
          <DocsMenuBar />
        </div>

        {/* Formatting toolbar */}
        <div className="bg-[#F8F9FA]">
          <FormattingToolbar />
        </div>

        {/* Ruler */}
        <Ruler />

        {/* Document body */}
        <div className="bg-[#F0F0F0] py-8">
          <div
            className="max-w-[700px] mx-auto bg-white shadow-md rounded-sm px-16 py-14"
            style={{ minHeight: '900px' }}
          >
            {/* Document title */}
            <h1
              className="text-2xl font-normal text-gray-900 mb-1"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              Customer Claims Standard Operating Procedure
            </h1>
            <p
              className="text-sm text-gray-500 mb-8"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              Last updated: March 2026
            </p>

            {/* Section 1 */}
            <h2
              className="text-lg font-bold text-gray-800 mb-2"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              1. Overview
            </h2>
            <p
              className="text-sm text-gray-700 mb-2 leading-relaxed"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              This document outlines the standard operating procedure for processing customer insurance claims at ACME Insurance. All team members should follow these guidelines when handling claims submissions, escalations, and resolutions.
            </p>
            <p
              className="text-sm text-gray-700 mb-6 leading-relaxed"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              For questions about this SOP, contact the Claims Operations team at claims-ops@acme-insurance.com.
            </p>

            {/* Section 2 */}
            <h2
              className="text-lg font-bold text-gray-800 mb-2"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              2. Automated Claims Agent
            </h2>
            <p
              className="text-sm text-gray-700 mb-3 leading-relaxed"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              The following agent handles initial claims processing automatically. It was built using the Agent Playbook Editor and is connected to our enterprise systems:
            </p>

            {/* ── Embedded Agent Block ── */}
            <EmbeddedAgentBlock />

            <p
              className="text-sm text-gray-700 mb-6 leading-relaxed"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              The agent processes approximately 340 claims per day during peak periods. All interactions are logged and auditable through the Version History panel in the Playbook Editor.
            </p>

            {/* Section 3 */}
            <h2
              className="text-lg font-bold text-gray-800 mb-2"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              3. Manual Override Process
            </h2>
            <p
              className="text-sm text-gray-700 mb-2 leading-relaxed"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              In cases where the automated agent escalates or encounters errors, follow the manual process below:
            </p>
            <ol
              className="list-decimal list-inside text-sm text-gray-700 space-y-1.5 mb-6 ml-2"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <li>Open the escalated claim in Jira (project: CLAIMS)</li>
              <li>Review the agent's processing log attached to the ticket</li>
              <li>Verify the customer's policy status in Salesforce</li>
              <li>Apply the appropriate resolution per the claims policy handbook</li>
              <li>Update the Jira ticket with your resolution and close</li>
            </ol>

            {/* Section 4 */}
            <h2
              className="text-lg font-bold text-gray-800 mb-2"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              4. Escalation Contacts
            </h2>
            <p
              className="text-sm text-gray-700 mb-2 leading-relaxed"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              For claims exceeding the automated agent's authority:
            </p>
            <ul
              className="list-disc list-inside text-sm text-gray-700 space-y-1 mb-6 ml-2"
              style={{ fontFamily: 'Arial, sans-serif' }}
            >
              <li><strong>Claims under $50,000:</strong> Senior Adjuster team (Slack: #claims-escalations)</li>
              <li><strong>Claims $50,000+:</strong> Claims Director — Priya Sharma</li>
              <li><strong>Fraud suspected:</strong> Fraud Investigation Unit — immediate escalation required</li>
            </ul>

            {/* Cursor blink simulation */}
            <div className="h-4 mt-8">
              <div
                className="w-0.5 h-4 bg-blue-500 animate-pulse"
                style={{ animationDuration: '1s' }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
