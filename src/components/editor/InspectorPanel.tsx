/**
 * InspectorPanel — Inspector sidebar content components for the Playbook Editor.
 *
 * Contains three sub-components:
 *
 * - ContextStrategyCard: displays the adk-fluent context engineering strategy
 *   (C namespace) — window size, state injections, filtering, and summarization.
 *
 * - InspectorCodeExport: expandable panel showing the adk-fluent Python code
 *   for the selected chip, with copy-to-clipboard support.
 *
 * - InspectorDetails: full detail view for a selected chip — metadata, status,
 *   version, permissions, guard phase info, skill topology, source line link,
 *   and the code export + context strategy cards.
 */

import React from 'react';
import { CHIP_COLORS } from '../../parser/types';
import type { ChipType, SmartChip } from '../../parser/types';
import { useNotifications } from '../../contexts/AppContext';
import { InlineChip } from '../chips/InlineChip';

// ─── ContextStrategyCard ────────────────────────────────────────────────

/**
 * Displays the adk-fluent context engineering strategy (C namespace) for the
 * selected agent section. Shows window size, state injections, message filtering,
 * and summarization mode.
 */
export function ContextStrategyCard() {
  const stateKeys = [
    { key: 'topic', color: '#059669' },
    { key: 'jurisdiction', color: '#059669' },
    { key: 'claim_id', color: '#059669' },
  ];

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2.5">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-indigo-500 font-bold" style={{ lineHeight: 1 }}>C</span>
        <span className="text-[11px] font-semibold text-gray-600" style={{ fontFamily: 'var(--font-ui)' }}>
          Context Strategy
        </span>
      </div>

      {/* Window */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Window</div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-0.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-sm"
                style={{
                  width: 10, height: 14,
                  background: `rgba(79, 70, 229, ${0.15 + i * 0.12})`,
                  border: '1px solid rgba(79, 70, 229, 0.25)',
                }}
              />
            ))}
          </div>
          <span className="text-[10px] text-gray-600">Last 3 turns</span>
          <span className="text-[10px] text-gray-400 font-mono">C.window(3)</span>
        </div>
      </div>

      {/* State Injections */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">State Injections</div>
        <div className="flex flex-wrap gap-1">
          {stateKeys.map(({ key, color }) => (
            <span
              key={key}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
            >
              {key}
            </span>
          ))}
        </div>
        <div className="text-[10px] text-gray-400 font-mono">C.from_state(&quot;topic&quot;, &quot;jurisdiction&quot;, &quot;claim_id&quot;)</div>
      </div>

      {/* Filtering */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Filtering</div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100">
          User messages only
        </span>
        <div className="text-[10px] text-gray-400 font-mono">C.user_only()</div>
      </div>

      {/* Summarization */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Summarization</div>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
          LLM-summarized
        </span>
        <div className="text-[10px] text-gray-400 font-mono">C.summarize()</div>
      </div>

      {/* Annotation */}
      <div className="pt-1 border-t border-gray-200">
        <div className="text-[9px] text-gray-400 leading-relaxed italic">
          Controls what the LLM sees on each iteration of the loop.
        </div>
      </div>
    </div>
  );
}

// ─── InspectorCodeExport ────────────────────────────────────────────────

/**
 * Expandable panel that generates and displays the adk-fluent Python code
 * for a given SmartChip. Uses the adk-fluent service to produce the code
 * snippet and provides a copy-to-clipboard action.
 */
export function InspectorCodeExport({ chip }: { chip: SmartChip }) {
  const [code, setCode] = React.useState<import('../../services/adk-fluent').AssetCodeResult | null>(null);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const { addNotification } = useNotifications();

  React.useEffect(() => {
    if (!open || code) return;
    setLoading(true);
    import('../../services/adk-fluent').then(({ getAdkFluentService }) =>
      getAdkFluentService()
        .generateAssetCode({ type: chip.type, name: chip.name, description: chip.description, metadata: chip.metadata ?? {} })
        .then((r) => { setCode(r); setLoading(false); })
        .catch(() => setLoading(false))
    );
  }, [open, code, chip.type, chip.name, chip.description, chip.metadata]);

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        style={{ color: '#7C3AED' }}
      >
        <span className="font-mono text-[10px] font-semibold">adk-fluent</span>
        <span style={{ color: '#374151' }}>{open ? 'Hide' : 'View'} Python Code</span>
        <span className="ml-auto">{open ? '\u25BE' : '\u25B8'}</span>
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg overflow-hidden border border-gray-200">
          {loading ? (
            <div className="px-3 py-3 text-[10px] text-gray-400 text-center">Generating...</div>
          ) : code ? (
            <>
              <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <code className="text-[10px] font-mono text-violet-700">{code.expression}</code>
              </div>
              <pre className="m-0 px-3 py-2 text-[10px] leading-relaxed font-mono overflow-x-auto max-h-48 overflow-y-auto" style={{ background: '#1E1E2E', color: '#CDD6F4' }}>
                {code.python}
              </pre>
              <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-200 flex items-center gap-1.5">
                <button
                  className="text-[9px] font-medium px-2 py-0.5 rounded bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(code.python).then(() => {
                      addNotification({ type: 'success', title: 'Copied!', message: 'adk-fluent code copied to clipboard.' });
                    });
                  }}
                >
                  Copy Code
                </button>
                <span className="text-[9px] text-gray-400 ml-auto">{code.dependencies.join(', ')}</span>
              </div>
            </>
          ) : (
            <div className="px-3 py-2 text-[10px] text-gray-400">Not available</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── InspectorDetails ───────────────────────────────────────────────────

/**
 * Full detail view for a selected chip. Shows metadata (version, owner,
 * permissions, usage, status), guard phase information, skill internal
 * topology, adk-fluent code export, source line navigation, and the
 * context strategy card.
 */
export function InspectorDetails({
  chip, chipType, chipName, sourceLine, onGoToSource, onCreateChip,
}: {
  chip: SmartChip | null; chipType: ChipType; chipName: string;
  sourceLine?: number; onGoToSource?: () => void;
  onCreateChip?: (type: ChipType, name: string) => void;
}) {
  if (!chip) {
    return (
      <div className="p-4">
        <div className="mb-3"><InlineChip type={chipType} name={chipName} /></div>
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <div className="font-semibold mb-1">Unresolved Reference</div>
          <div className="text-xs text-red-500">@{chipType}({chipName}) is not in the registry.</div>
          <button
            className="mt-2 px-3 py-1 bg-red-600 text-white text-xs rounded-md hover:bg-red-700"
            onClick={() => onCreateChip?.(chipType, chipName)}
          >Create →</button>
        </div>
      </div>
    );
  }

  const colors = CHIP_COLORS[chip.type];
  return (
    <div className="p-4 space-y-4">
      <div>
        <InlineChip type={chip.type} name={chip.name} />
        <div className="mt-2 text-xs text-gray-500">{chip.registryId}</div>
      </div>

      {/* Source line link */}
      {sourceLine != null && onGoToSource && (
        <button
          onClick={onGoToSource}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <span>↩</span>
          <span>Go to source — Line {sourceLine}</span>
        </button>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
        {[
          ['Version', chip.version],
          ['Owner', chip.owner],
          ['Permission', chip.permissions.currentUser],
          ['Usage', `${chip.usageCount} playbooks`],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-gray-500">{label}</span>
            <span className="font-medium text-gray-700">{value}</span>
          </div>
        ))}
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Status</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold"
            style={{
              background: chip.status === 'resolved' ? '#DCFCE7' : chip.status === 'draft' ? '#FEF9C3' : '#FEE2E2',
              color: chip.status === 'resolved' ? '#166534' : chip.status === 'draft' ? '#854D0E' : '#991B1B',
            }}>
            {chip.status.toUpperCase()}
          </span>
        </div>
        {chip.type === 'guard' && (() => {
          const guardPhases: Record<string, { phase: string; label: string; description: string }> = {
            'pii-redaction': { phase: 'post_model', label: 'post_model', description: 'Fires after LLM responds' },
            'fraud-detection': { phase: 'pre_model', label: 'pre_model', description: 'Fires before LLM call' },
            'apac-compliance-rules': { phase: 'context', label: 'context', description: 'Fires during context assembly' },
          };
          const phaseInfo = guardPhases[chip.name] || { phase: 'post_model', label: 'post_model', description: 'Fires after LLM responds' };
          return (
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500">Phase</span>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                style={{ background: '#FFF1F2', color: '#9F1239' }}
                title={phaseInfo.description}
              >
                {phaseInfo.phase === 'pre_model' ? '⬆' : phaseInfo.phase === 'post_model' ? '⬇' : '⟳'}{' '}
                {phaseInfo.label}
              </span>
            </div>
          );
        })()}
        {chip.endpoint && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Endpoint</span>
            <span className="text-gray-700 font-mono text-[10px] truncate max-w-32">{chip.endpoint}</span>
          </div>
        )}
        {chip.healthStatus && (
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Health</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{
                background: chip.healthStatus === 'healthy' ? '#16A34A' : chip.healthStatus === 'degraded' ? '#EAB308' : '#DC2626'
              }} />
              <span className="text-gray-700">{chip.healthStatus}</span>
            </span>
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-medium text-gray-500 mb-1">Description</div>
        <div className="text-xs text-gray-700 leading-relaxed">{chip.description}</div>
      </div>

      {/* Skill Internal Topology */}
      {chip.type === 'skill' && (
        <div className="bg-violet-50 rounded-lg border border-violet-200 p-3 space-y-2">
          <div className="text-[11px] font-semibold text-violet-700" style={{ fontFamily: 'var(--font-ui)' }}>
            Internal Topology
          </div>
          {chip.name === 'apac-compliance' ? (
            <svg viewBox="0 0 260 52" className="w-full" style={{ maxHeight: 52 }}>
              {/* jurisdiction_check box */}
              <rect x={4} y={8} width={100} height={36} rx={6}
                fill="#F5F3FF" stroke="#7C3AED" strokeWidth={1.2} />
              <text x={54} y={30} textAnchor="middle" fill="#6D28D9"
                fontSize={8} fontWeight={600} style={{ fontFamily: 'var(--font-ui)' }}>
                jurisdiction_check
              </text>
              {/* arrow */}
              <line x1={108} y1={26} x2={148} y2={26}
                stroke="#7C3AED" strokeWidth={1.2} markerEnd="url(#skill-arrow)" />
              {/* compliance_advisor box */}
              <rect x={152} y={8} width={104} height={36} rx={6}
                fill="#F5F3FF" stroke="#7C3AED" strokeWidth={1.2} />
              <text x={204} y={30} textAnchor="middle" fill="#6D28D9"
                fontSize={8} fontWeight={600} style={{ fontFamily: 'var(--font-ui)' }}>
                compliance_advisor
              </text>
              {/* arrow marker */}
              <defs>
                <marker id="skill-arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                  <polygon points="0 0, 8 3, 0 6" fill="#7C3AED" />
                </marker>
              </defs>
            </svg>
          ) : chip.name === 'customer-empathy' ? (
            <svg viewBox="0 0 260 52" className="w-full" style={{ maxHeight: 52 }}>
              <rect x={70} y={8} width={120} height={36} rx={6}
                fill="#F5F3FF" stroke="#7C3AED" strokeWidth={1.2} />
              <text x={130} y={30} textAnchor="middle" fill="#6D28D9"
                fontSize={9} fontWeight={600} style={{ fontFamily: 'var(--font-ui)' }}>
                empathy_advisor
              </text>
            </svg>
          ) : (
            <div className="text-[10px] text-violet-400 italic">
              Single-agent skill
            </div>
          )}
          <div className="text-[9px] text-violet-400">
            {chip.name === 'apac-compliance'
              ? 'jurisdiction_check >> compliance_advisor'
              : 'Single agent topology'}
          </div>
        </div>
      )}

      {/* adk-fluent Code Export */}
      <InspectorCodeExport chip={chip} />

      <button className="w-full text-left px-3 py-2 text-xs rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        style={{ color: colors.accent }}>
        Open in Registry →
      </button>

      {/* Context Strategy Card */}
      <ContextStrategyCard />
    </div>
  );
}
