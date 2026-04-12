/**
 * HealthIndicator — Colored dot + label for asset health status.
 * Used by ToolEditor + ConnectorEditor.
 */

interface HealthIndicatorProps {
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  latencyP50?: number;
  latencyP99?: number;
  lastChecked?: string;
}

const STATUS_CONFIG = {
  healthy:  { color: '#059669', bg: '#ECFDF5', label: 'Healthy', dot: '#10B981' },
  degraded: { color: '#D97706', bg: '#FFFBEB', label: 'Degraded', dot: '#F59E0B' },
  down:     { color: '#DC2626', bg: '#FEF2F2', label: 'Down', dot: '#EF4444' },
  unknown:  { color: '#6B7280', bg: '#F3F4F6', label: 'Unknown', dot: '#9CA3AF' },
};

export function HealthIndicator({ status, latencyP50, latencyP99, lastChecked }: HealthIndicatorProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: 'var(--color-border, #E5E7EB)', background: cfg.bg }}>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-40"
            style={{ background: cfg.dot }}
          />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: cfg.dot }} />
        </span>
        <span className="text-[11px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
      </div>

      {(latencyP50 != null || latencyP99 != null) && (
        <div className="flex gap-4 text-[10px]" style={{ color: 'var(--color-text-secondary, #6B7280)' }}>
          {latencyP50 != null && <span>p50: <strong>{latencyP50}ms</strong></span>}
          {latencyP99 != null && <span>p99: <strong>{latencyP99}ms</strong></span>}
        </div>
      )}

      {lastChecked && (
        <div className="text-[10px]" style={{ color: 'var(--color-text-tertiary, #9CA3AF)' }}>
          Last checked: {lastChecked}
        </div>
      )}
    </div>
  );
}
