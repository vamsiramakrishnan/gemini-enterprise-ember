/**
 * SheetsSchema — Screen 7: Google Sheets as Tool Schema Definition
 *
 * A mockup of a Google Sheets spreadsheet where a sheet defines
 * a tool's parameter schema, with an Agent Builder sidebar panel.
 */

import { Link } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────

interface CellData {
  value: string;
  bold?: boolean;
  bg?: string;
  selected?: boolean;
  italic?: boolean;
  color?: string;
}

// ─── Sheet Data ──────────────────────────────────────────────────────

const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

const HEADER_ROW: CellData[] = [
  { value: 'Parameter', bold: true, bg: '#F3F4F6' },
  { value: 'Type', bold: true, bg: '#F3F4F6' },
  { value: 'Required', bold: true, bg: '#F3F4F6' },
  { value: 'Description', bold: true, bg: '#F3F4F6' },
  { value: 'Validation', bold: true, bg: '#F3F4F6' },
  { value: 'Default', bold: true, bg: '#F3F4F6' },
  { value: 'Example', bold: true, bg: '#F3F4F6' },
];

const DATA_ROWS: CellData[][] = [
  [
    { value: 'policy_id' },
    { value: 'string', selected: true },
    { value: 'yes', bold: true },
    { value: "The customer's policy ID" },
    { value: 'regex: POL-[A-Z]{2}-[0-9]{6}', italic: true, color: '#6B7280' },
    { value: '\u2014', color: '#9CA3AF' },
    { value: 'POL-SG-001234', color: '#4F46E5' },
  ],
  [
    { value: 'include_riders' },
    { value: 'boolean' },
    { value: 'no' },
    { value: 'Include policy riders/addons' },
    { value: '\u2014', color: '#9CA3AF' },
    { value: 'false' },
    { value: 'true', color: '#4F46E5' },
  ],
  [
    { value: 'effective_date' },
    { value: 'date' },
    { value: 'no' },
    { value: 'Check policy as of this date' },
    { value: 'must be \u2264 today', italic: true, color: '#6B7280' },
    { value: 'today' },
    { value: '2024-01-15', color: '#4F46E5' },
  ],
  [
    { value: 'format' },
    { value: 'enum' },
    { value: 'no' },
    { value: 'Response format' },
    { value: 'oneOf: summary, full, minimal', italic: true, color: '#6B7280' },
    { value: 'summary' },
    { value: 'full', color: '#4F46E5' },
  ],
  // Empty rows
  [
    { value: '' }, { value: '' }, { value: '' }, { value: '' },
    { value: '' }, { value: '' }, { value: '' },
  ],
  [
    { value: '' }, { value: '' }, { value: '' }, { value: '' },
    { value: '' }, { value: '' }, { value: '' },
  ],
  [
    { value: '' }, { value: '' }, { value: '' }, { value: '' },
    { value: '' }, { value: '' }, { value: '' },
  ],
];

// Column widths
const COL_WIDTHS = [120, 80, 80, 200, 190, 80, 120];

// ─── Cell Component ──────────────────────────────────────────────────

function Cell({ data, width }: { data: CellData; width: number }) {
  return (
    <td
      className={`border border-gray-200 px-2 py-1.5 text-xs truncate ${data.selected ? 'ring-2 ring-blue-500 ring-inset z-10 relative' : ''}`}
      style={{
        width: `${width}px`,
        minWidth: `${width}px`,
        maxWidth: `${width}px`,
        fontFamily: 'var(--font-ui)',
        fontWeight: data.bold ? 600 : 400,
        fontStyle: data.italic ? 'italic' : 'normal',
        backgroundColor: data.bg ?? 'white',
        color: data.color ?? '#1F2937',
      }}
    >
      {data.value}
    </td>
  );
}

// ─── Agent Builder Sidebar ───────────────────────────────────────────

function AgentBuilderSidebar() {
  const openApiYaml = `openapi: "3.0.3"
info:
  title: policy-lookup
  version: "2.1.0"
paths:
  /lookup:
    post:
      parameters:
        - name: policy_id
          in: query
          required: true
          schema:
            type: string
            pattern: "^POL-[A-Z]{2}-\\\\d{6}$"`;

  return (
    <div
      className="w-[280px] flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto"
      style={{ fontFamily: 'var(--font-ui)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <div className="w-5 h-5 rounded bg-[#1A73E8] flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">A</span>
        </div>
        <span className="text-sm font-semibold text-gray-800">Agent Builder</span>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-5">
        {/* Generated OpenAPI Spec */}
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            Generated OpenAPI Spec
          </div>
          <div
            className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-[10px] leading-relaxed overflow-x-auto"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            <pre className="text-gray-700 whitespace-pre">{openApiYaml}</pre>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5">
            Auto-generated from sheet columns. Read-only.
          </p>
        </div>

        {/* Register button */}
        <button
          className="w-full px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-[#1A73E8] hover:bg-[#1557B0] transition-colors shadow-sm flex items-center justify-center gap-2"
        >
          <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[10px] font-semibold border border-indigo-200">
            @tool
          </span>
          Register as @tool(policy-lookup)
        </button>

        {/* Version and Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Version:</span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-600 border border-gray-200"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              v2.1
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Status:</span>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700 border border-green-200">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Published
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Sync toggle */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium text-gray-700">Sync changes</div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Auto-update tool schema when sheet is edited
            </div>
          </div>
          {/* Toggle switch (static, showing ON state) */}
          <div className="relative w-9 h-5 rounded-full bg-[#1A73E8] cursor-pointer flex-shrink-0">
            <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform" />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* MCP Server endpoint */}
        <div>
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
            MCP Server Endpoint
          </div>
          <div className="flex items-center gap-1">
            <div
              className="flex-1 px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-l-lg text-[10px] text-gray-600 truncate"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              https://mcp.acme.cloud/tools/policy-lookup
            </div>
            <button
              className="px-2.5 py-2 bg-gray-100 border border-gray-200 border-l-0 rounded-r-lg text-xs text-gray-500 hover:bg-gray-200 transition-colors"
              title="Copy"
            >
              &#x1F4CB;
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Usage info */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Usage
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Referenced in</span>
            <span className="font-medium text-gray-700">12 playbooks</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Calls today</span>
            <span className="font-medium text-gray-700">1,847</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Latency (p50)</span>
            <span className="font-medium text-gray-700">142ms</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Error rate</span>
            <span className="font-medium text-green-600">0.03%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function SheetsSchema() {
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

      {/* Sheets chrome wrapper */}
      <div className="max-w-[1200px] mx-auto flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* Sheets icon */}
            <div className="w-8 h-10 flex items-center justify-center">
              <svg viewBox="0 0 24 30" className="w-6 h-8">
                <rect x="0" y="0" width="24" height="30" rx="2" fill="#0F9D58" />
                <rect x="4" y="6" width="7" height="4" rx="0.5" fill="white" opacity="0.9" />
                <rect x="13" y="6" width="7" height="4" rx="0.5" fill="white" opacity="0.9" />
                <rect x="4" y="12" width="7" height="4" rx="0.5" fill="white" opacity="0.7" />
                <rect x="13" y="12" width="7" height="4" rx="0.5" fill="white" opacity="0.7" />
                <rect x="4" y="18" width="7" height="4" rx="0.5" fill="white" opacity="0.5" />
                <rect x="13" y="18" width="7" height="4" rx="0.5" fill="white" opacity="0.5" />
              </svg>
            </div>
            <div>
              <div className="text-base font-medium text-gray-800" style={{ fontFamily: 'var(--font-ui)' }}>
                Tool: policy-lookup &mdash; Parameter Schema
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5" style={{ fontFamily: 'var(--font-ui)' }}>
                <span className="text-yellow-500">&#x2605;</span>
                <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-600 font-medium">Saved to Drive</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400" style={{ fontFamily: 'var(--font-ui)' }}>
              All changes saved
            </span>
            <button
              className="px-5 py-2 rounded-full text-sm font-medium text-white bg-[#0F9D58] hover:bg-[#0B8043] transition-colors shadow-sm"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              Share
            </button>
            <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white text-xs font-bold">
              VK
            </div>
          </div>
        </div>

        {/* Menu bar */}
        <div className="bg-[#F8F9FA] border-b border-gray-200">
          <div className="flex items-center gap-0.5 px-3 py-1">
            {['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools', 'Extensions', 'Help'].map((m) => (
              <button
                key={m}
                className="px-2.5 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded transition-colors"
                style={{ fontFamily: 'var(--font-ui)' }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Sheets toolbar */}
        <div className="bg-[#F8F9FA] border-b border-gray-200 flex items-center gap-1 px-3 py-1.5">
          <button className="px-1.5 py-0.5 rounded text-sm text-gray-500 hover:bg-gray-200 transition-colors">&#x21B6;</button>
          <button className="px-1.5 py-0.5 rounded text-sm text-gray-500 hover:bg-gray-200 transition-colors">&#x21B7;</button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button className="px-1.5 py-0.5 rounded text-sm text-gray-500 hover:bg-gray-200 transition-colors">&#x1F5B6;</button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <div className="px-2 py-0.5 text-xs text-gray-600 border border-gray-300 rounded" style={{ fontFamily: 'var(--font-ui)' }}>
            100%
          </div>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <div className="px-2 py-0.5 text-xs text-gray-600 border border-gray-300 rounded" style={{ fontFamily: 'var(--font-ui)' }}>
            $ % .0 .00
          </div>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button className="px-1.5 py-0.5 rounded text-sm hover:bg-gray-200 transition-colors font-bold text-gray-600">B</button>
          <button className="px-1.5 py-0.5 rounded text-sm hover:bg-gray-200 transition-colors italic text-gray-600">I</button>
          <button className="px-1.5 py-0.5 rounded text-sm hover:bg-gray-200 transition-colors underline text-gray-600">U</button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button className="px-1.5 py-0.5 rounded text-sm hover:bg-gray-200 transition-colors text-gray-600">
            <span className="text-xs">A</span>
            <span className="block w-3 h-0.5 bg-black -mt-0.5 mx-auto" />
          </button>
          <button className="px-1.5 py-0.5 rounded text-sm hover:bg-gray-200 transition-colors text-gray-600">
            <span className="w-4 h-3 inline-block border border-gray-400 bg-yellow-100" />
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button className="px-1.5 py-0.5 rounded text-sm hover:bg-gray-200 transition-colors text-gray-600">
            <span className="border border-gray-400 inline-block w-4 h-3" />
          </button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <button className="px-1.5 py-0.5 rounded text-sm hover:bg-gray-200 transition-colors text-gray-600">&#x2261;</button>
        </div>

        {/* Formula bar */}
        <div className="flex items-center bg-white border-b border-gray-200">
          <div className="flex items-center px-2 py-1.5 border-r border-gray-200 min-w-[70px]">
            <span
              className="text-xs font-medium text-gray-600"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              B2
            </span>
          </div>
          <div className="flex items-center px-2 py-1.5 border-r border-gray-200">
            <span className="text-xs text-gray-400 font-medium" style={{ fontFamily: 'var(--font-ui)' }}>
              <em>f</em><sub>x</sub>
            </span>
          </div>
          <div className="flex-1 px-3 py-1.5">
            <span
              className="text-xs text-gray-700"
              style={{ fontFamily: 'var(--font-ui)' }}
            >
              string
            </span>
          </div>
        </div>

        {/* Main content area: spreadsheet + sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Spreadsheet area */}
          <div className="flex-1 overflow-auto bg-white">
            <table className="border-collapse w-full" style={{ fontFamily: 'var(--font-ui)' }}>
              <thead>
                {/* Column headers */}
                <tr>
                  {/* Row number header (corner) */}
                  <th className="w-10 min-w-[40px] bg-[#F8F9FA] border border-gray-200 text-center text-[10px] text-gray-400 font-normal py-1">
                    &nbsp;
                  </th>
                  {COLUMNS.map((col, i) => (
                    <th
                      key={col}
                      className={`bg-[#F8F9FA] border border-gray-200 text-center text-[10px] text-gray-500 font-medium py-1 ${col === 'B' ? 'bg-blue-100 text-blue-600' : ''}`}
                      style={{ width: `${COL_WIDTHS[i]}px`, minWidth: `${COL_WIDTHS[i]}px` }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Header row */}
                <tr>
                  <td className="bg-[#F8F9FA] border border-gray-200 text-center text-[10px] text-gray-500 font-medium py-1">
                    1
                  </td>
                  {HEADER_ROW.map((cell, i) => (
                    <Cell key={i} data={cell} width={COL_WIDTHS[i]} />
                  ))}
                </tr>

                {/* Data rows */}
                {DATA_ROWS.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td
                      className={`bg-[#F8F9FA] border border-gray-200 text-center text-[10px] text-gray-500 font-medium py-1 ${rowIdx === 0 ? 'bg-blue-100 text-blue-600' : ''}`}
                    >
                      {rowIdx + 2}
                    </td>
                    {row.map((cell, colIdx) => (
                      <Cell key={colIdx} data={cell} width={COL_WIDTHS[colIdx]} />
                    ))}
                  </tr>
                ))}

                {/* Extra empty rows to fill space */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="bg-[#F8F9FA] border border-gray-200 text-center text-[10px] text-gray-500 font-medium py-1">
                      {i + 9}
                    </td>
                    {COLUMNS.map((_, colIdx) => (
                      <td
                        key={colIdx}
                        className="border border-gray-200 px-2 py-1.5"
                        style={{
                          width: `${COL_WIDTHS[colIdx]}px`,
                          minWidth: `${COL_WIDTHS[colIdx]}px`,
                          backgroundColor: 'white',
                        }}
                      >
                        &nbsp;
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Agent Builder sidebar */}
          <AgentBuilderSidebar />
        </div>

        {/* Sheet tabs at bottom */}
        <div className="flex items-center bg-[#F8F9FA] border-t border-gray-200 px-2 py-1 gap-1">
          <button className="p-1 text-gray-400 hover:text-gray-600 text-sm" title="Add sheet">+</button>
          <div className="w-px h-5 bg-gray-300 mx-1" />
          <div
            className="px-4 py-1.5 bg-white border border-gray-200 border-b-white rounded-t text-xs font-medium text-gray-700 -mb-px relative z-10"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            Tool: policy-lookup
          </div>
          <div
            className="px-4 py-1.5 bg-[#F0F0F0] border border-transparent rounded-t text-xs text-gray-400 hover:bg-gray-200 cursor-pointer transition-colors"
            style={{ fontFamily: 'var(--font-ui)' }}
          >
            Sheet2
          </div>
        </div>
      </div>
    </div>
  );
}
