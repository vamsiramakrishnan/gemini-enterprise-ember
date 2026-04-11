/**
 * CodePreview — Dark-theme code panel showing adk-fluent expression + Python.
 *
 * Every editor uses this to show the generated adk-fluent code for the asset.
 * Collapsible, with copy button and dependency list.
 */

import { useState, useCallback } from 'react';

interface CodePreviewProps {
  /** The adk-fluent one-liner expression */
  expression: string;
  /** Full Python code block */
  python: string;
  /** pip dependencies */
  dependencies?: string[];
  /** Default collapsed? */
  defaultOpen?: boolean;
  accentColor?: string;
}

function CopyIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
      <path d="M8.5 3.5V2a1 1 0 00-1-1H2a1 1 0 00-1 1v5.5a1 1 0 001 1h1.5" stroke="currentColor" strokeWidth="1" fill="none" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}>
      <path d="M3 1.5L7 5L3 8.5" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CodePreview({
  expression,
  python,
  dependencies = [],
  defaultOpen = true,
  accentColor = '#4F46E5',
}: CodePreviewProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(python).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [python]);

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border, #E5E7EB)' }}>
      {/* Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center gap-2 text-[11px] font-medium transition-colors"
        style={{ background: '#1E1E2E', color: '#A6ADC8' }}
      >
        <ChevronIcon open={open} />
        <svg width="12" height="12" viewBox="0 0 12 12" className="flex-shrink-0">
          <path d="M2 3l4 3-4 3V3zM7 3l4 3-4 3V3z" fill={accentColor} opacity="0.8" />
        </svg>
        adk-fluent Code Preview
        <span className="flex-1" />
        {open && (
          <span
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded hover:bg-white/10 transition-colors cursor-pointer"
            style={{ color: copied ? '#A6E3A1' : '#A6ADC8' }}
          >
            <CopyIcon />
            {copied ? 'Copied' : 'Copy'}
          </span>
        )}
      </button>

      {open && (
        <div style={{ background: '#1E1E2E' }}>
          {/* Expression one-liner */}
          <div className="px-4 py-2 border-b" style={{ borderColor: '#313244' }}>
            <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#585B70' }}>
              Expression
            </div>
            <code className="text-[11px] font-medium" style={{ fontFamily: 'var(--font-mono)', color: '#CDD6F4' }}>
              <span style={{ color: accentColor }}>{expression}</span>
            </code>
          </div>

          {/* Python code */}
          <div className="px-4 py-3">
            <div className="text-[9px] font-bold uppercase tracking-wider mb-2" style={{ color: '#585B70' }}>
              Python
            </div>
            <pre
              className="text-[11px] leading-relaxed whitespace-pre-wrap"
              style={{ fontFamily: 'var(--font-mono)', color: '#CDD6F4' }}
            >
              {python}
            </pre>
          </div>

          {/* Dependencies */}
          {dependencies.length > 0 && (
            <div className="px-4 py-2 border-t" style={{ borderColor: '#313244' }}>
              <div className="text-[9px] font-bold uppercase tracking-wider mb-1" style={{ color: '#585B70' }}>
                Dependencies
              </div>
              <div className="flex flex-wrap gap-1.5">
                {dependencies.map((dep) => (
                  <span
                    key={dep}
                    className="text-[10px] px-2 py-0.5 rounded"
                    style={{ background: '#313244', color: '#A6ADC8' }}
                  >
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
