/**
 * CostCalculator — Live Cost & Impact Estimator panel.
 *
 * Shows real-time cost-per-conversation, projected monthly spend,
 * FTE equivalent savings, and ROI metrics. All calculations update
 * reactively as the user adjusts sliders.
 *
 * Design: Google Cloud Pricing Calculator feel — white card, blue
 * accent sliders, monospace cost numbers, green savings highlight.
 */

import { useState, useMemo, useCallback } from 'react';

// ─── Pricing Data ──────────────────────────────────────────────────────

interface ModelPricing {
  label: string;
  inputPer1K: number;
  outputPer1K: number;
}

const MODELS: Record<string, ModelPricing> = {
  'gemini-2.5-pro': {
    label: 'Gemini 2.5 Pro',
    inputPer1K: 0.00125,
    outputPer1K: 0.005,
  },
  'gemini-2.5-flash': {
    label: 'Gemini 2.5 Flash',
    inputPer1K: 0.0001875,
    outputPer1K: 0.00075,
  },
};

const TOOL_COST_PER_CALL = 0.001;
const CONNECTOR_COST_PER_CONVERSATION = 0.001;
const AVG_HANDLE_TIME_MANUAL_MIN = 12;
const AVG_HANDLE_TIME_ASSISTED_MIN = 3;
const AGENT_ASSIST_RATIO = 0.75;
const FTE_ANNUAL_COST = 70_000;
const FTE_WORKING_HOURS_PER_DAY = 8;
const FTE_WORKING_MINUTES_PER_DAY = FTE_WORKING_HOURS_PER_DAY * 60;
const CONFIDENCE_MARGIN = 0.15;

// ─── Helpers ───────────────────────────────────────────────────────────

function fmt(n: number, decimals = 2): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(decimals)}`;
}

function fmtCost(n: number): string {
  if (n < 0.001) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(3)}`;
}

function fmtPct(n: number): string {
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}%`;
}

// ─── Slider Component ──────────────────────────────────────────────────

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  onChange: (v: number) => void;
}

function Slider({ label, value, min, max, step = 1, unit = '', disabled, onChange }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600 font-medium">{label}</span>
        <span className="text-xs font-mono font-semibold text-gray-800">
          {value.toLocaleString()}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-default"
        style={{
          background: disabled
            ? '#E5E7EB'
            : `linear-gradient(to right, #1A73E8 0%, #1A73E8 ${pct}%, #E5E7EB ${pct}%, #E5E7EB 100%)`,
        }}
      />
    </div>
  );
}

// ─── Comparison Bar ────────────────────────────────────────────────────

function ComparisonBar({
  manualCost,
  laborCost,
  agentCost,
}: {
  manualCost: number;
  laborCost: number;
  agentCost: number;
}) {
  const totalAssisted = laborCost + agentCost;
  const maxVal = Math.max(manualCost, totalAssisted);
  const manualPct = (manualCost / maxVal) * 100;
  const laborPct = (laborCost / maxVal) * 100;
  const agentPct = (agentCost / maxVal) * 100;

  return (
    <div className="mt-4 space-y-2">
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-gray-500">Manual Process</span>
          <span className="text-[11px] font-mono font-semibold text-red-700">{fmt(manualCost)}</span>
        </div>
        <div className="w-full h-5 bg-gray-100 rounded-md overflow-hidden">
          <div
            className="h-full rounded-md transition-all duration-500 ease-out"
            style={{
              width: `${manualPct}%`,
              background: 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)',
            }}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-medium text-gray-500">Agent-Assisted</span>
          <span className="text-[11px] font-mono font-semibold text-blue-700">{fmt(totalAssisted)}</span>
        </div>
        <div className="w-full h-5 bg-gray-100 rounded-md overflow-hidden flex">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${laborPct}%`,
              background: 'linear-gradient(90deg, #3B82F6 0%, #2563EB 100%)',
            }}
          />
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: `${agentPct}%`,
              background: 'linear-gradient(90deg, #10B981 0%, #059669 100%)',
            }}
          />
        </div>
        <div className="flex gap-3 mt-1">
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
            <span className="w-2 h-2 rounded-sm" style={{ background: '#2563EB' }} /> Labor
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
            <span className="w-2 h-2 rounded-sm" style={{ background: '#059669' }} /> Agent
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Section Divider ───────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mt-5 mb-3">
      <div className="h-px flex-1 bg-gray-200" />
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
      <div className="h-px flex-1 bg-gray-200" />
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function CostCalculator() {
  const [model, setModel] = useState<string>('gemini-2.5-pro');
  const [conversationsPerDay, setConversationsPerDay] = useState(3200);
  const [turnsPerConversation, setTurnsPerConversation] = useState(4);
  const [tokensPerTurn, setTokensPerTurn] = useState(1200);
  const [toolCallsPerConversation, setToolCallsPerConversation] = useState(3);

  const pricing = MODELS[model];

  // Mock tool call latency derived from tool count (not editable)
  const avgToolLatency = useMemo(
    () => Math.round(180 + toolCallsPerConversation * 45 + Math.random() * 20),
    [toolCallsPerConversation],
  );

  const calc = useMemo(() => {
    const totalTokensPerConversation = turnsPerConversation * tokensPerTurn;
    // Assume ~60% input, ~40% output token split
    const inputTokens = totalTokensPerConversation * 0.6;
    const outputTokens = totalTokensPerConversation * 0.4;

    const llmCostPerConv =
      (inputTokens / 1000) * pricing.inputPer1K + (outputTokens / 1000) * pricing.outputPer1K;
    const toolCostPerConv = toolCallsPerConversation * TOOL_COST_PER_CALL;
    const connectorCostPerConv = CONNECTOR_COST_PER_CONVERSATION;
    const totalCostPerConv = llmCostPerConv + toolCostPerConv + connectorCostPerConv;

    const monthlyConversations = conversationsPerDay * 30;
    const monthlyProjected = totalCostPerConv * monthlyConversations;
    const annualProjected = monthlyProjected * 12;

    // FTE calculations — manual
    const totalDailyMinutesManual = conversationsPerDay * AVG_HANDLE_TIME_MANUAL_MIN;
    const ftesManual = totalDailyMinutesManual / FTE_WORKING_MINUTES_PER_DAY;
    const annualLaborManual = ftesManual * FTE_ANNUAL_COST;

    // FTE calculations — agent-assisted
    const agentHandled = conversationsPerDay * AGENT_ASSIST_RATIO;
    const humanHandled = conversationsPerDay - agentHandled;
    const totalDailyMinutesAssisted =
      humanHandled * AVG_HANDLE_TIME_MANUAL_MIN + agentHandled * AVG_HANDLE_TIME_ASSISTED_MIN;
    const ftesAssisted = totalDailyMinutesAssisted / FTE_WORKING_MINUTES_PER_DAY;
    const annualLaborAssisted = ftesAssisted * FTE_ANNUAL_COST;

    const netSavings = annualLaborManual - annualLaborAssisted - annualProjected;
    const roi = annualProjected > 0 ? (netSavings / annualProjected) * 100 : 0;
    const paybackDays = netSavings > 0 ? (annualProjected / (netSavings / 365)) : Infinity;

    return {
      llmCostPerConv,
      toolCostPerConv,
      connectorCostPerConv,
      totalCostPerConv,
      monthlyProjected,
      monthlyLow: monthlyProjected * (1 - CONFIDENCE_MARGIN),
      monthlyHigh: monthlyProjected * (1 + CONFIDENCE_MARGIN),
      annualProjected,
      ftesManual,
      annualLaborManual,
      ftesAssisted,
      annualLaborAssisted,
      annualAgentCost: annualProjected,
      netSavings,
      roi,
      paybackDays,
    };
  }, [model, conversationsPerDay, turnsPerConversation, tokensPerTurn, toolCallsPerConversation, pricing]);

  const handleDownload = useCallback(() => {
    const lines = [
      'Cost & Impact Estimate Report',
      `Generated: ${new Date().toISOString().slice(0, 10)}`,
      `Model: ${pricing.label}`,
      '',
      '--- Configuration ---',
      `Conversations/day: ${conversationsPerDay.toLocaleString()}`,
      `Turns/conversation: ${turnsPerConversation}`,
      `Tokens/turn: ${tokensPerTurn.toLocaleString()}`,
      `Tool calls/conversation: ${toolCallsPerConversation}`,
      '',
      '--- Cost Breakdown ---',
      `LLM cost/conversation: ${fmtCost(calc.llmCostPerConv)}`,
      `Tool cost/conversation: ${fmtCost(calc.toolCostPerConv)}`,
      `Connector cost/conversation: ${fmtCost(calc.connectorCostPerConv)}`,
      `Total cost/conversation: ${fmtCost(calc.totalCostPerConv)}`,
      `Monthly projected: ${fmt(calc.monthlyProjected)}`,
      `Annual projected: ${fmt(calc.annualProjected)}`,
      '',
      '--- Impact ---',
      `Manual FTEs: ${calc.ftesManual.toFixed(1)}`,
      `Manual annual labor: ${fmt(calc.annualLaborManual)}`,
      `Agent-assisted FTEs: ${calc.ftesAssisted.toFixed(1)}`,
      `Agent-assisted annual labor: ${fmt(calc.annualLaborAssisted)}`,
      `Annual agent cost: ${fmt(calc.annualAgentCost)}`,
      `Net annual savings: ${fmt(calc.netSavings)}`,
      `ROI: ${fmtPct(calc.roi)}`,
      `Payback period: ${calc.paybackDays < 999 ? `${calc.paybackDays.toFixed(1)} days` : 'N/A'}`,
      '',
      'Estimates based on Gemini Enterprise pricing as of Q1 2026. Actual costs may vary.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cost-impact-estimate.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [calc, pricing, conversationsPerDay, turnsPerConversation, tokensPerTurn, toolCallsPerConversation]);

  return (
    <div
      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      style={{ maxWidth: 420, fontFamily: "'Inter', 'Google Sans', system-ui, sans-serif" }}
    >
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2.5">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-sm"
          style={{ background: '#1A73E8' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <rect x="4" y="4" width="3" height="2" rx="0.5" fill="currentColor" />
            <rect x="9" y="4" width="3" height="2" rx="0.5" fill="currentColor" />
            <rect x="4" y="7.5" width="3" height="2" rx="0.5" fill="currentColor" />
            <rect x="9" y="7.5" width="3" height="2" rx="0.5" fill="currentColor" />
            <rect x="4" y="11" width="8" height="2" rx="0.5" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900 leading-tight">Cost & Impact Estimator</h3>
          <p className="text-[10px] text-gray-400 leading-tight">Live pricing for this agent configuration</p>
        </div>
      </div>

      <div className="px-5 py-4">
        {/* Model selector */}
        <div className="mb-4">
          <label className="text-xs font-medium text-gray-600 block mb-1.5">Model</label>
          <div className="flex gap-2">
            {Object.entries(MODELS).map(([key, m]) => (
              <button
                key={key}
                onClick={() => setModel(key)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  model === key
                    ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold">{m.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70">
                  ${m.inputPer1K}/1K in &middot; ${m.outputPer1K}/1K out
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <Slider
          label="Conversations / day"
          value={conversationsPerDay}
          min={100}
          max={50000}
          step={100}
          onChange={setConversationsPerDay}
        />
        <Slider
          label="Avg turns / conversation"
          value={turnsPerConversation}
          min={1}
          max={20}
          onChange={setTurnsPerConversation}
        />
        <Slider
          label="Avg tokens / turn"
          value={tokensPerTurn}
          min={500}
          max={5000}
          step={50}
          onChange={setTokensPerTurn}
        />
        <Slider
          label="Tool calls / conversation"
          value={toolCallsPerConversation}
          min={0}
          max={10}
          onChange={setToolCallsPerConversation}
        />
        <div className="flex items-center justify-between mb-1 mt-1">
          <span className="text-xs text-gray-400">Avg tool latency (computed)</span>
          <span className="text-xs font-mono text-gray-500">{avgToolLatency}ms</span>
        </div>

        {/* ── Cost Breakdown ─────────────────────────────────────── */}
        <SectionHeader title="Cost Breakdown" />

        <div className="space-y-1.5">
          <CostRow label="LLM cost / conversation" value={fmtCost(calc.llmCostPerConv)} />
          <CostRow label="Tool execution / conversation" value={fmtCost(calc.toolCostPerConv)} />
          <CostRow label="Connector / conversation" value={fmtCost(calc.connectorCostPerConv)} />
          <div className="h-px bg-gray-100 my-2" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-800">Total / conversation</span>
            <span className="text-base font-mono font-bold text-gray-900">{fmtCost(calc.totalCostPerConv)}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">Monthly projected</span>
            <span className="text-sm font-mono font-semibold text-gray-800">
              {fmt(calc.monthlyProjected)}
              <span className="text-[10px] text-gray-400 ml-1">
                ({fmt(calc.monthlyLow)} &ndash; {fmt(calc.monthlyHigh)})
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Annual projected</span>
            <span className="text-sm font-mono font-semibold text-gray-800">{fmt(calc.annualProjected)}</span>
          </div>
        </div>

        {/* ── Impact Comparison ──────────────────────────────────── */}
        <SectionHeader title="Impact Comparison" />

        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Manual */}
          <div className="rounded-lg border border-red-100 bg-red-50/40 p-3">
            <div className="text-[10px] font-semibold text-red-600 uppercase tracking-wider mb-2">Before (Manual)</div>
            <div className="space-y-1.5">
              <MetricRow label="Handle time" value={`${AVG_HANDLE_TIME_MANUAL_MIN} min`} />
              <MetricRow label="FTEs needed" value={calc.ftesManual.toFixed(1)} />
              <MetricRow label="Annual labor" value={fmt(calc.annualLaborManual)} />
            </div>
          </div>
          {/* Assisted */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
            <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider mb-2">After (Agent)</div>
            <div className="space-y-1.5">
              <MetricRow label="Handle time" value={`${AVG_HANDLE_TIME_ASSISTED_MIN} min`} />
              <MetricRow label="FTEs needed" value={calc.ftesAssisted.toFixed(1)} />
              <MetricRow label="Annual labor" value={fmt(calc.annualLaborAssisted)} />
              <MetricRow label="Agent cost" value={fmt(calc.annualAgentCost)} muted />
            </div>
          </div>
        </div>

        {/* Big savings callout */}
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-center mb-3">
          <div className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            Net Annual Savings
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-emerald-600">
              <path d="M9 14V4M9 4L5 8M9 4L13 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-2xl font-mono font-bold text-emerald-700">{fmt(calc.netSavings)}</span>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div>
              <span className="text-[10px] text-emerald-600">ROI</span>
              <div className="text-sm font-mono font-bold text-emerald-800">{fmtPct(calc.roi)}</div>
            </div>
            <div className="w-px h-6 bg-emerald-200" />
            <div>
              <span className="text-[10px] text-emerald-600">Payback</span>
              <div className="text-sm font-mono font-bold text-emerald-800">
                {calc.paybackDays < 999 ? `${calc.paybackDays.toFixed(1)} days` : '--'}
              </div>
            </div>
          </div>
        </div>

        {/* Visual comparison bar */}
        <ComparisonBar
          manualCost={calc.annualLaborManual}
          laborCost={calc.annualLaborAssisted}
          agentCost={calc.annualAgentCost}
        />
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <span className="text-[10px] text-gray-400 leading-snug max-w-[240px]">
          Estimates based on Gemini Enterprise pricing as of Q1 2026. Actual costs may vary.
        </span>
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors duration-150"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v6M6 8L3.5 5.5M6 8l2.5-2.5M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Download
        </button>
      </div>

      {/* Slider thumb custom styles — injected once */}
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #1A73E8;
          border: 2px solid #FFFFFF;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #1A73E8;
          border: 2px solid #FFFFFF;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// ─── Small helper components ───────────────────────────────────────────

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-mono font-medium text-gray-700">{value}</span>
    </div>
  );
}

function MetricRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={`text-[10px] ${muted ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
      <span className={`text-[11px] font-mono font-semibold ${muted ? 'text-gray-400' : 'text-gray-700'}`}>
        {value}
      </span>
    </div>
  );
}

export default CostCalculator;
