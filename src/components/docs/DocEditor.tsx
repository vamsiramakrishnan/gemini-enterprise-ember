/**
 * DocEditor -- Dedicated editor for @doc chip type.
 *
 * Maps to VertexAiSearchTool(...) / DiscoveryEngineSearchTool(...) in adk-fluent.
 * Provides configuration for knowledge sources used to ground agent reasoning.
 *
 * Two-panel layout via EditorShell:
 *   Left  (60%) -- Configuration: identity, source type, source config, document list, indexing status
 *   Right (40%) -- Preview: search tester, document preview, CodePreview
 *   Bottom       -- Test Panel for search queries
 */

import { useState, useCallback, type ReactNode } from 'react';
import { EditorShell, SegmentedControl, CodePreview, TestPanel } from '../../components/editors';

// ─── Colors for doc type ────────────────────────────────────────────────

const DOC_COLORS = {
  accent: '#0D9488',
  bg: '#F4FAFA',
  text: '#0F766E',
  border: '#B2E5DF',
  tint: '#E0F5F2',
} as const;

// ─── SVG Icons ──────────────────────────────────────────────────────────

function FileIcon({ type }: { type: string }) {
  const iconColors: Record<string, string> = {
    PDF: '#DC2626',
    Excel: '#059669',
    Markdown: '#6B7280',
  };
  const color = iconColors[type] || '#9CA3AF';

  if (type === 'PDF') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" className="flex-shrink-0">
        <rect x="2" y="1" width="12" height="14" rx="1.5" stroke={color} strokeWidth="1" fill="none" />
        <path d="M5 5.5h6M5 8h5M5 10.5h3" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === 'Excel') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" className="flex-shrink-0">
        <rect x="2" y="1" width="12" height="14" rx="1.5" stroke={color} strokeWidth="1" fill="none" />
        <path d="M5 5l3 3-3 3M8 5l3 3-3 3" stroke={color} strokeWidth="0.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg width="16" height="16" viewBox="0 0 16 16" className="flex-shrink-0">
      <rect x="2" y="1" width="12" height="14" rx="1.5" stroke={color} strokeWidth="1" fill="none" />
      <path d="M5 5.5h6M5 8h4M5 10.5h5" stroke={color} strokeWidth="0.8" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="flex-shrink-0">
      <circle cx="6" cy="6" r="4" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" className="flex-shrink-0">
      <path d="M10 14V4M7 7l3-3 3 3M3 16h14" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RelevanceBar({ score }: { score: number }) {
  const width = Math.round(score);
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 rounded-full"
        style={{ width: '48px', background: '#E5E7EB' }}
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${width}%`, background: DOC_COLORS.accent }}
        />
      </div>
      <span className="text-[10px] font-medium" style={{ color: DOC_COLORS.text }}>
        {score}%
      </span>
    </div>
  );
}

// ─── Types ──────────────────────────────────────────────────────────────

type SourceType = 'vertex-ai-search' | 'discovery-engine' | 'manual';

type IndexingStatus = 'indexed' | 'indexing' | 'pending';

interface DocFile {
  name: string;
  fileType: string;
  size: string;
  status: IndexingStatus;
}

interface SearchResult {
  title: string;
  snippet: string;
  relevance: number;
}

// ─── Mock Data ──────────────────────────────────────────────────────────

const MOCK_DOCUMENTS: DocFile[] = [
  { name: 'claims-policy-2024.pdf', fileType: 'PDF', size: '2.4 MB', status: 'indexed' },
  { name: 'apac-addendum.pdf', fileType: 'PDF', size: '890 KB', status: 'indexed' },
  { name: 'coverage-matrix.xlsx', fileType: 'Excel', size: '1.1 MB', status: 'indexing' },
  { name: 'faq-claims.md', fileType: 'Markdown', size: '245 KB', status: 'indexed' },
  { name: 'rider-definitions.pdf', fileType: 'PDF', size: '3.2 MB', status: 'pending' },
];

const MOCK_SEARCH_RESULTS: SearchResult[] = [
  {
    title: 'Section 4.2 -- Claims Eligibility Criteria',
    snippet: 'A claim is eligible for processing when the policyholder has an active policy with coverage matching the reported incident type. Claims must be filed within 90 days of the incident...',
    relevance: 94,
  },
  {
    title: 'Section 7.1 -- Escalation Procedures',
    snippet: 'Claims exceeding $50,000 in value must be routed to a senior adjuster for review. All fraud-flagged claims require mandatory escalation regardless of amount...',
    relevance: 82,
  },
  {
    title: 'Appendix B -- APAC Regional Variations',
    snippet: 'For Singapore-domiciled policyholders, additional MAS regulatory requirements apply. Claims involving cross-border incidents require dual-jurisdiction review...',
    relevance: 71,
  },
];

const MOCK_PREVIEW_TEXT = `ACME Insurance -- Claims Processing Policy 2024

1. Purpose
This document establishes the standard operating procedures for processing insurance claims across all ACME Insurance product lines in the APAC region.

2. Scope
Applies to all claims submitted through web portal, mobile app, email, or agent-assisted channels. Covers auto, home, health, and commercial lines.

3. Definitions
- "Claim": A formal request by a policyholder for coverage or compensation under the terms of an insurance policy.
- "Adjuster": An authorized ACME employee responsible for evaluating and settling claims.
- "Threshold": The monetary limit above which additional review is required.`;

const REGION_OPTIONS = [
  { value: 'us-central1', label: 'US Central (Iowa)' },
  { value: 'europe-west1', label: 'Europe West (Belgium)' },
  { value: 'asia-southeast1', label: 'Asia Southeast (Singapore)' },
  { value: 'global', label: 'Global (Multi-region)' },
];

// ─── Status Badge ───────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IndexingStatus }) {
  const styles: Record<IndexingStatus, { bg: string; text: string; label: string }> = {
    indexed: { bg: '#F0FDF4', text: '#15803D', label: 'Indexed' },
    indexing: { bg: '#FFFBEB', text: '#B45309', label: 'Indexing...' },
    pending: { bg: '#F3F4F6', text: '#6B7280', label: 'Pending' },
  };
  const s = styles[status];

  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
      style={{ background: s.bg, color: s.text }}
    >
      {status === 'indexing' && (
        <span
          className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: s.text }}
        />
      )}
      {status === 'indexed' && (
        <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
          <path d="M2 5.5L4 7.5L8 3" stroke={s.text} strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {s.label}
    </span>
  );
}

// ─── Input Field ────────────────────────────────────────────────────────

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        className="block text-[11px] font-medium"
        style={{ color: 'var(--color-text-secondary, #6B7280)' }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-[11px] px-3 py-2 rounded-lg border transition-colors outline-none"
      style={{
        fontFamily: 'var(--font-ui)',
        borderColor: 'var(--color-border, #E5E7EB)',
        background: 'var(--color-bg-surface, #FFFFFF)',
        color: 'var(--color-text-primary, #111827)',
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = DOC_COLORS.accent; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border, #E5E7EB)'; }}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-[11px] px-3 py-2 rounded-lg border transition-colors outline-none appearance-none cursor-pointer"
      style={{
        fontFamily: 'var(--font-ui)',
        borderColor: 'var(--color-border, #E5E7EB)',
        background: 'var(--color-bg-surface, #FFFFFF)',
        color: 'var(--color-text-primary, #111827)',
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%239CA3AF' stroke-width='1.3' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 10px center',
        paddingRight: '28px',
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = DOC_COLORS.accent; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border, #E5E7EB)'; }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── Section Card ───────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  accentLeft,
}: {
  title?: string;
  children: ReactNode;
  accentLeft?: boolean;
}) {
  return (
    <div
      className="rounded-lg border overflow-hidden"
      style={{
        borderColor: 'var(--color-border, #E5E7EB)',
        background: 'var(--color-bg-surface, #FFFFFF)',
        borderLeft: accentLeft ? `3px solid ${DOC_COLORS.accent}` : undefined,
      }}
    >
      {title && (
        <div
          className="px-4 py-2.5 border-b"
          style={{ borderColor: 'var(--color-border, #E5E7EB)' }}
        >
          <h3
            className="text-[11px] font-semibold"
            style={{ color: 'var(--color-text-primary, #111827)' }}
          >
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────

export function DocEditor() {
  // Identity
  const [name] = useState('claims-policy-2024');
  const [description, setDescription] = useState(
    'Primary policy reference document for ACME Insurance claims processing. Contains eligibility criteria, escalation procedures, coverage rules, and APAC regional variations.'
  );

  // Source configuration
  const [sourceType, setSourceType] = useState<SourceType>('vertex-ai-search');
  const [dataStoreId, setDataStoreId] = useState('claims-docs-store-prod');
  const [region, setRegion] = useState('asia-southeast1');
  const [projectId, setProjectId] = useState('acme-insurance-prod');

  // Document list
  const [documents] = useState<DocFile[]>(MOCK_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<string>('claims-policy-2024.pdf');

  // Derived stats
  const indexedCount = documents.filter((d) => d.status === 'indexed').length;
  const totalCount = documents.length;

  // ── Source config section ─────────────────────────────────────────────

  const sourceTypeOptions: { value: SourceType; label: string }[] = [
    { value: 'vertex-ai-search', label: 'Vertex AI Search' },
    { value: 'discovery-engine', label: 'Discovery Engine' },
    { value: 'manual', label: 'Manual' },
  ];

  function renderSourceConfig() {
    if (sourceType === 'manual') {
      return (
        <div
          className="rounded-lg border-2 border-dashed flex flex-col items-center justify-center py-8 px-4 cursor-pointer transition-colors"
          style={{
            borderColor: DOC_COLORS.border,
            background: DOC_COLORS.bg,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = DOC_COLORS.accent; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = DOC_COLORS.border; }}
        >
          <span style={{ color: DOC_COLORS.accent }}>
            <UploadIcon />
          </span>
          <p
            className="text-[12px] font-medium mt-2"
            style={{ color: DOC_COLORS.text }}
          >
            Drop files here or click to upload
          </p>
          <p
            className="text-[10px] mt-1"
            style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
          >
            Supports PDF, DOCX, XLSX, Markdown, TXT
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <FormField label="Data Store ID">
          <TextInput
            value={dataStoreId}
            onChange={setDataStoreId}
            placeholder="Enter data store ID"
          />
        </FormField>
        <FormField label="Region">
          <SelectInput
            value={region}
            onChange={setRegion}
            options={REGION_OPTIONS}
          />
        </FormField>
        {sourceType === 'vertex-ai-search' && (
          <FormField label="Project ID">
            <TextInput
              value={projectId}
              onChange={setProjectId}
              placeholder="Enter GCP project ID"
            />
          </FormField>
        )}
      </div>
    );
  }

  // ── Document table ────────────────────────────────────────────────────

  function renderDocumentTable() {
    return (
      <div className="space-y-3">
        <div
          className="rounded-lg border overflow-hidden"
          style={{ borderColor: 'var(--color-border, #E5E7EB)' }}
        >
          <table className="w-full text-[11px]" style={{ fontFamily: 'var(--font-ui)' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-secondary, #F3F4F6)' }}>
                <th
                  className="text-left px-3 py-2 font-semibold"
                  style={{ color: 'var(--color-text-secondary, #6B7280)' }}
                >
                  Document
                </th>
                <th
                  className="text-left px-3 py-2 font-semibold"
                  style={{ color: 'var(--color-text-secondary, #6B7280)' }}
                >
                  Type
                </th>
                <th
                  className="text-left px-3 py-2 font-semibold"
                  style={{ color: 'var(--color-text-secondary, #6B7280)' }}
                >
                  Size
                </th>
                <th
                  className="text-left px-3 py-2 font-semibold"
                  style={{ color: 'var(--color-text-secondary, #6B7280)' }}
                >
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const isSelected = doc.name === selectedDoc;
                return (
                  <tr
                    key={doc.name}
                    className="cursor-pointer transition-colors"
                    style={{
                      background: isSelected ? DOC_COLORS.bg : 'var(--color-bg-surface, #FFFFFF)',
                      borderBottom: '1px solid var(--color-border, #E5E7EB)',
                    }}
                    onClick={() => setSelectedDoc(doc.name)}
                    onMouseEnter={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--color-bg-secondary, #F3F4F6)';
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) e.currentTarget.style.background = 'var(--color-bg-surface, #FFFFFF)';
                    }}
                  >
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <FileIcon type={doc.fileType} />
                        <span
                          className="font-medium"
                          style={{
                            color: isSelected
                              ? DOC_COLORS.text
                              : 'var(--color-text-primary, #111827)',
                          }}
                        >
                          {doc.name}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-3 py-2.5"
                      style={{ color: 'var(--color-text-secondary, #6B7280)' }}
                    >
                      {doc.fileType}
                    </td>
                    <td
                      className="px-3 py-2.5"
                      style={{ color: 'var(--color-text-secondary, #6B7280)' }}
                    >
                      {doc.size}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={doc.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Indexing summary */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: 'var(--color-bg-tertiary, #E5E7EB)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(indexedCount / totalCount) * 100}%`,
                  background: DOC_COLORS.accent,
                }}
              />
            </div>
          </div>
          <span
            className="text-[11px] font-medium whitespace-nowrap"
            style={{ color: DOC_COLORS.text }}
          >
            {indexedCount} of {totalCount} documents indexed
          </span>
        </div>
      </div>
    );
  }

  // ── Code preview data ─────────────────────────────────────────────────

  const codeExpression =
    sourceType === 'discovery-engine'
      ? `DiscoveryEngineSearchTool(data_store_id="${dataStoreId}")`
      : `VertexAiSearchTool(data_store_specs=[...])`;

  const codePython =
    sourceType === 'discovery-engine'
      ? `from google.adk.tools import DiscoveryEngineSearchTool

doc_tool = DiscoveryEngineSearchTool(
    data_store_id="${dataStoreId}",
    region="${region}",
)

agent = Agent("claims-processor", "gemini-2.5-pro")
    .instruct("Process insurance claims...")
    .tool(doc_tool)
    .build()`
      : sourceType === 'manual'
        ? `from google.adk.tools import VertexAiSearchTool

# Manual upload -- documents indexed via Vertex AI Search
doc_tool = VertexAiSearchTool(
    data_store_specs=[
        VertexAiSearchTool.DataStoreSpec(
            project="${projectId}",
            location="${region}",
            data_store_id="${dataStoreId}",
        )
    ]
)

agent = Agent("claims-processor", "gemini-2.5-pro")
    .instruct("Process insurance claims...")
    .tool(doc_tool)
    .build()`
        : `from google.adk.tools import VertexAiSearchTool

doc_tool = VertexAiSearchTool(
    data_store_specs=[
        VertexAiSearchTool.DataStoreSpec(
            project="${projectId}",
            location="${region}",
            data_store_id="${dataStoreId}",
        )
    ]
)

agent = Agent("claims-processor", "gemini-2.5-pro")
    .instruct("Process insurance claims...")
    .tool(doc_tool)
    .build()`;

  // ── Test panel handler ────────────────────────────────────────────────

  const handleTestRun = useCallback(async (query: string): Promise<SearchResult[]> => {
    // Simulate network delay between 300-600ms
    const delay = 300 + Math.random() * 300;
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Return mock results adjusted to the query
    const lowerQuery = query.toLowerCase();
    const results: SearchResult[] = [];

    if (lowerQuery.includes('eligib') || lowerQuery.includes('claim') || lowerQuery.includes('process')) {
      results.push({
        title: 'Section 4.2 -- Claims Eligibility Criteria',
        snippet: 'A claim is eligible for processing when the policyholder has an active policy with coverage matching the reported incident type. Claims must be filed within 90 days...',
        relevance: 96,
      });
    }
    if (lowerQuery.includes('escalat') || lowerQuery.includes('amount') || lowerQuery.includes('threshold')) {
      results.push({
        title: 'Section 7.1 -- Escalation Procedures',
        snippet: 'Claims exceeding $50,000 in value must be routed to a senior adjuster for review. All fraud-flagged claims require mandatory escalation...',
        relevance: 89,
      });
    }
    if (lowerQuery.includes('apac') || lowerQuery.includes('singapore') || lowerQuery.includes('region')) {
      results.push({
        title: 'Appendix B -- APAC Regional Variations',
        snippet: 'For Singapore-domiciled policyholders, additional MAS regulatory requirements apply. Claims involving cross-border incidents require dual-jurisdiction review...',
        relevance: 84,
      });
    }

    // Always return at least 2 results
    if (results.length < 2) {
      results.push(
        {
          title: 'Section 3.1 -- Coverage Definitions',
          snippet: `Policy coverage is determined by the active riders and base plan at the time of the incident. Search query: "${query}" matched via semantic search...`,
          relevance: 72,
        },
        {
          title: 'Section 5.3 -- Documentation Requirements',
          snippet: 'All claims must include supporting documentation: incident report, photos (if applicable), police report (for theft/vandalism), and medical records (for health claims)...',
          relevance: 65,
        },
      );
    }

    return results.slice(0, 3);
  }, []);

  const renderTestResult = useCallback((result: unknown) => {
    const results = result as SearchResult[];
    return (
      <div className="space-y-2.5">
        {results.map((r, i) => (
          <div
            key={i}
            className="rounded-lg border p-3 transition-colors"
            style={{
              borderColor: 'var(--color-border, #E5E7EB)',
              background: 'var(--color-bg-surface, #FFFFFF)',
            }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4
                className="text-[11px] font-semibold"
                style={{ color: DOC_COLORS.text }}
              >
                {r.title}
              </h4>
              <RelevanceBar score={r.relevance} />
            </div>
            <p
              className="text-[10px] leading-relaxed"
              style={{ color: 'var(--color-text-secondary, #6B7280)' }}
            >
              {r.snippet}
            </p>
          </div>
        ))}
      </div>
    );
  }, []);

  // ── Left Panel ────────────────────────────────────────────────────────

  const leftPanel = (
    <>
      {/* Identity card */}
      <SectionCard title="Document Identity" accentLeft>
        <div className="space-y-3">
          <FormField label="Name">
            <div
              className="text-[12px] font-semibold px-3 py-2 rounded-lg"
              style={{ background: DOC_COLORS.bg, color: DOC_COLORS.text }}
            >
              {name}
            </div>
          </FormField>
          <FormField label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full text-[11px] px-3 py-2 rounded-lg border transition-colors outline-none resize-none"
              style={{
                fontFamily: 'var(--font-ui)',
                borderColor: 'var(--color-border, #E5E7EB)',
                background: 'var(--color-bg-surface, #FFFFFF)',
                color: 'var(--color-text-primary, #111827)',
                lineHeight: '1.5',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = DOC_COLORS.accent; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--color-border, #E5E7EB)'; }}
            />
          </FormField>
        </div>
      </SectionCard>

      {/* Source type */}
      <SectionCard title="Source Type">
        <div className="space-y-4">
          <SegmentedControl
            options={sourceTypeOptions}
            value={sourceType}
            onChange={setSourceType}
            accentColor={DOC_COLORS.accent}
          />
          {renderSourceConfig()}
        </div>
      </SectionCard>

      {/* Document list */}
      <SectionCard title="Documents">
        {renderDocumentTable()}
      </SectionCard>
    </>
  );

  // ── Right Panel ───────────────────────────────────────────────────────

  const rightPanel = (
    <>
      {/* Search tester */}
      <SectionCard title="Search Preview">
        <div className="space-y-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg border"
            style={{
              borderColor: 'var(--color-border, #E5E7EB)',
              background: 'var(--color-bg-primary, #F9FAFB)',
            }}
          >
            <span style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
              <SearchIcon />
            </span>
            <span
              className="text-[11px]"
              style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}
            >
              What are the claims eligibility criteria?
            </span>
          </div>

          <div className="space-y-2">
            {MOCK_SEARCH_RESULTS.map((result, i) => (
              <div
                key={i}
                className="rounded-lg border p-3"
                style={{
                  borderColor: 'var(--color-border, #E5E7EB)',
                  background: 'var(--color-bg-primary, #F9FAFB)',
                }}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4
                    className="text-[11px] font-semibold"
                    style={{ color: DOC_COLORS.text }}
                  >
                    {result.title}
                  </h4>
                  <RelevanceBar score={result.relevance} />
                </div>
                <p
                  className="text-[10px] leading-relaxed"
                  style={{ color: 'var(--color-text-secondary, #6B7280)' }}
                >
                  {result.snippet}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Document preview */}
      <SectionCard title="Document Preview">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileIcon type={documents.find((d) => d.name === selectedDoc)?.fileType || 'PDF'} />
            <span
              className="text-[11px] font-medium"
              style={{ color: 'var(--color-text-primary, #111827)' }}
            >
              {selectedDoc}
            </span>
            <StatusBadge
              status={documents.find((d) => d.name === selectedDoc)?.status || 'pending'}
            />
          </div>
          <div
            className="rounded-lg border p-3 max-h-40 overflow-y-auto"
            style={{
              borderColor: 'var(--color-border, #E5E7EB)',
              background: 'var(--color-bg-primary, #F9FAFB)',
            }}
          >
            <pre
              className="text-[10px] leading-relaxed whitespace-pre-wrap"
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--color-text-secondary, #6B7280)',
              }}
            >
              {MOCK_PREVIEW_TEXT}
            </pre>
          </div>
        </div>
      </SectionCard>

      {/* Code preview */}
      <CodePreview
        expression={codeExpression}
        python={codePython}
        dependencies={['google-adk', 'adk-fluent']}
        accentColor={DOC_COLORS.accent}
      />
    </>
  );

  // ── Test Panel ────────────────────────────────────────────────────────

  const testPanel = (
    <TestPanel
      placeholder="Search knowledge base..."
      onRun={handleTestRun}
      renderResult={renderTestResult}
      accentColor={DOC_COLORS.accent}
    />
  );

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <EditorShell
      chipType="doc"
      chipName={name}
      version="2.1"
      leftPanel={leftPanel}
      leftPanelWidth="60%"
      leftPanelLabel="Configuration"
      rightPanel={rightPanel}
      rightPanelLabel="Preview"
      testPanel={testPanel}
      onPublish={() => {}}
    />
  );
}
