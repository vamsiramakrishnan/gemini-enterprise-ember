/**
 * TestContext — Test execution with simulated loop iterations.
 *
 * Powers the Test Cell's Loop Iteration Visualizer. Runs pre-scripted
 * claims processing iterations that demonstrate the Observe→Reason→Act
 * loop, guard checks, and final response generation.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

import type { ChipType } from '../parser/types';

// ─── Types ───────────────────────────────────────────────────────────

export interface GuardCheck {
  chipRef: string;
  chipName: string;
  passed: boolean;
  durationMs: number;
  detail?: string;
}

export interface LoopIteration {
  index: number;
  observe: string;
  reason: string;
  act: { chipRef: string; chipType: ChipType; chipName: string; params?: string };
  result: string;
  durationMs: number;
  decision: 'loop' | 'respond';
  decisionReason?: string;
  guardChecks?: GuardCheck[];
}

export interface TestResult {
  id: string;
  input: string;
  iterations: LoopIteration[];
  finalResponse: string;
  totalDurationMs: number;
  tokenCount: number;
  status: 'running' | 'complete' | 'error';
}

export interface SkillActivationResult {
  activated: boolean;
  confidence: number;
  response?: string;
}

interface TestContextValue {
  results: TestResult[];
  running: boolean;
  currentResult: TestResult | null;
  runTest: (input: string) => void;
  runToolTest: (toolId: string, params: Record<string, unknown>) => void;
  runSkillActivation: (skillId: string, prompt: string) => Promise<SkillActivationResult>;
  clearResults: () => void;
}

// ─── Mock data ───────────────────────────────────────────────────────

function buildClaimsIterations(): LoopIteration[] {
  return [
    {
      index: 1,
      observe:
        'User submitted: "I was in a car accident last week. My policy number is POL-SG-004521. I need to file a claim for vehicle damage, estimated around $12,000."',
      reason:
        'Customer has provided a policy number and claim details. First step per playbook: retrieve policy details using policy-lookup tool to verify coverage and active status.',
      act: {
        chipRef: 'tool-policy-lookup',
        chipType: 'tool',
        chipName: 'policy-lookup',
        params: '{ "policy_id": "POL-SG-004521" }',
      },
      result:
        '{ "policy_id": "POL-SG-004521", "holder": "Sarah Chen", "type": "auto-comprehensive", "status": "active", "coverage_limit": 50000, "deductible": 1000, "region": "SG", "riders": ["roadside-assist"] }',
      durationMs: 340,
      decision: 'loop',
      decisionReason: 'Policy verified. Need to check claims history and Salesforce account data before proceeding.',
      guardChecks: [
        { chipRef: 'guard-pii-redaction', chipName: 'pii-redaction', passed: true, durationMs: 45, detail: 'No PII leaked in tool parameters' },
      ],
    },
    {
      index: 2,
      observe:
        'Policy lookup returned: active auto-comprehensive policy, $50k coverage limit, $1k deductible, SG region. Claim amount $12k is within coverage.',
      reason:
        'Policy is valid and covers the claim. Per playbook step 3: search Salesforce for customer account history to check for prior relationships and VIP status.',
      act: {
        chipRef: 'connector-salesforce',
        chipType: 'connector',
        chipName: 'salesforce',
        params: '{ "query": "Account where PolicyId = POL-SG-004521", "entities": ["Accounts", "Cases"] }',
      },
      result:
        '{ "account": { "id": "ACC-00891", "name": "Sarah Chen", "tier": "Gold", "since": "2019-03-15", "lifetime_value": 24500 }, "open_cases": 0, "prior_claims_12m": 1 }',
      durationMs: 620,
      decision: 'loop',
      decisionReason: 'Have customer data. Claim is under $50k threshold so no escalation needed. Need to validate against policy doc and prepare response.',
      guardChecks: [
        { chipRef: 'guard-pii-redaction', chipName: 'pii-redaction', passed: true, durationMs: 38 },
        { chipRef: 'guard-apac-compliance-rules', chipName: 'apac-compliance-rules', passed: true, durationMs: 52, detail: 'SG jurisdiction — MAS guidelines satisfied' },
      ],
    },
    {
      index: 3,
      observe:
        'Full context assembled: active policy (auto-comprehensive, $50k limit), Gold-tier customer since 2019, 1 prior claim in 12 months, claim amount $12k within coverage. Policy doc confirms auto collision is covered.',
      reason:
        'All data gathered. Claim is straightforward: amount under threshold, policy active, coverage confirmed per @doc(claims-policy-2024). Generate response conforming to @schema(claims-response-v2) with reference number and estimated processing time.',
      act: {
        chipRef: 'schema-claims-response-v2',
        chipType: 'schema',
        chipName: 'claims-response-v2',
        params: '{ "format": "claims-response-v2" }',
      },
      result:
        '{ "claim_ref": "CLM-2026-04-00891", "status": "submitted", "estimated_processing": "3-5 business days", "next_steps": ["Adjuster review", "Damage assessment scheduling"] }',
      durationMs: 180,
      decision: 'respond',
      decisionReason: 'All required data gathered, response formatted per schema. Ready to deliver final response to customer.',
      guardChecks: [
        { chipRef: 'guard-pii-redaction', chipName: 'pii-redaction', passed: true, durationMs: 41 },
        { chipRef: 'guard-fraud-detection', chipName: 'fraud-detection', passed: true, durationMs: 95, detail: 'Risk score: 0.12 (low). No fraud indicators.' },
      ],
    },
  ];
}

// ─── Context ─────────────────────────────────────────────────────────

const TestCtx = createContext<TestContextValue | null>(null);

export function useTest(): TestContextValue {
  const ctx = useContext(TestCtx);
  if (!ctx) throw new Error('useTest must be used within <AppProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────

export function TestProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<TestResult | null>(null);

  const runTest = useCallback((input: string) => {
    const id = `test-${Date.now()}`;
    const iterations = buildClaimsIterations();

    const result: TestResult = {
      id, input,
      iterations: [],
      finalResponse: '',
      totalDurationMs: 0,
      tokenCount: 0,
      status: 'running',
    };

    setRunning(true);
    setCurrentResult(result);
    setResults((prev) => [result, ...prev]);

    let accumulatedMs = 0;
    iterations.forEach((iteration, idx) => {
      accumulatedMs += iteration.durationMs + 200;
      const delay = accumulatedMs;
      const isLast = idx === iterations.length - 1;

      setTimeout(() => {
        setCurrentResult((prev) => {
          if (!prev || prev.id !== id) return prev;
          const updatedIterations = [...prev.iterations, iteration];
          const updated: TestResult = {
            ...prev,
            iterations: updatedIterations,
            totalDurationMs: updatedIterations.reduce((s, it) => s + it.durationMs, 0),
            tokenCount: updatedIterations.length * 1240,
            status: isLast ? 'complete' : 'running',
            finalResponse: isLast
              ? 'Thank you, Sarah. I\'ve submitted your vehicle damage claim (ref: CLM-2026-04-00891). Your auto-comprehensive policy covers this $12,000 claim with a $1,000 deductible. An adjuster will contact you within 3-5 business days to schedule a damage assessment. Is there anything else I can help with?'
              : '',
          };
          setResults((prev) => prev.map((r) => (r.id === id ? updated : r)));
          if (isLast) setRunning(false);
          return updated;
        });
      }, delay);
    });
  }, []);

  const runToolTest = useCallback(
    (toolId: string, params: Record<string, unknown>) => {
      runTest(`[Tool Test] ${toolId} with params: ${JSON.stringify(params)}`);
    },
    [runTest],
  );

  const runSkillActivation = useCallback(
    async (skillId: string, prompt: string): Promise<SkillActivationResult> => {
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));
      const confidence = 0.7 + Math.random() * 0.25;
      return {
        activated: confidence > 0.75,
        confidence: Math.round(confidence * 100) / 100,
        response: confidence > 0.75
          ? `Skill "${skillId}" activated for prompt: "${prompt.slice(0, 80)}..." — applied regional compliance rules and validated jurisdiction.`
          : undefined,
      };
    },
    [],
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setCurrentResult(null);
    setRunning(false);
  }, []);

  return (
    <TestCtx.Provider
      value={{ results, running, currentResult, runTest, runToolTest, runSkillActivation, clearResults }}
    >
      {children}
    </TestCtx.Provider>
  );
}
