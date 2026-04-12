/**
 * TestPanel — Reusable test execution panel for editors.
 *
 * Provides prompt input, run button, and result display area.
 * Each editor passes its own result renderer via children render prop.
 */

import { useState, useCallback, type ReactNode } from 'react';

interface TestPanelProps {
  placeholder?: string;
  /** Called when user clicks Run. Return result data. */
  onRun: (input: string) => Promise<unknown>;
  /** Render the result. Receives the data returned from onRun. */
  renderResult: (result: unknown) => ReactNode;
  accentColor?: string;
}

function PlayIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" className="flex-shrink-0">
      <path d="M2 1.5L8.5 5L2 8.5V1.5Z" fill="currentColor" />
    </svg>
  );
}

export function TestPanel({
  placeholder = 'Enter a test input...',
  onRun,
  renderResult,
  accentColor = '#4F46E5',
}: TestPanelProps) {
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const handleRun = useCallback(async () => {
    if (!input.trim() || running) return;
    setRunning(true);
    setResult(null);
    const start = Date.now();
    try {
      const res = await onRun(input);
      setElapsed(Date.now() - start);
      setResult(res);
    } finally {
      setRunning(false);
    }
  }, [input, running, onRun]);

  return (
    <div className="space-y-3">
      {/* Input row */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleRun()}
          placeholder={placeholder}
          className="flex-1 text-[11px] px-3 py-2 rounded-lg border transition-colors"
          style={{
            fontFamily: 'var(--font-ui)',
            borderColor: 'var(--color-border, #E5E7EB)',
            background: 'var(--color-bg-primary, #F9FAFB)',
            color: 'var(--color-text-primary, #111827)',
          }}
        />
        <button
          onClick={handleRun}
          disabled={running || !input.trim()}
          className="flex items-center gap-1.5 text-[11px] font-medium text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          style={{ background: accentColor }}
        >
          {running ? (
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <PlayIcon />
          )}
          {running ? 'Running...' : 'Run'}
        </button>
      </div>

      {/* Result area */}
      {result !== null && (
        <div
          className="rounded-lg border p-3"
          style={{ borderColor: 'var(--color-border, #E5E7EB)', background: 'var(--color-bg-primary, #F9FAFB)' }}
        >
          {elapsed !== null && (
            <div className="text-[10px] font-medium mb-2" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
              Completed in {elapsed}ms
            </div>
          )}
          {renderResult(result)}
        </div>
      )}
    </div>
  );
}
