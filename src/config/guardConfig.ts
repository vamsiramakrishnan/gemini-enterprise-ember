/**
 * guardConfig — Registry for guard kinds.
 *
 * To add a new guard kind:
 *   1. Add to GuardKind union in parser/types.ts
 *   2. Add one entry here in GUARD_CONFIG
 *   3. Done — wizard form, inspector, and code generation derive automatically.
 */

import type { GuardKind, GuardPhase } from '../parser/types';

export interface GuardKindConfig {
  label: string;
  /** adk-fluent expression (e.g., "G.pii") */
  adkExpression: string;
  /** Default phase */
  defaultPhase: GuardPhase;
  /** Does this guard have a numeric threshold/limit field? */
  thresholdField?: {
    label: string;
    placeholder: string;
    step: string;
  };
  description: string;
}

export const GUARD_CONFIG: Record<GuardKind, GuardKindConfig> = {
  pii:            { label: 'PII Detection',      adkExpression: 'G.pii("redact")',     defaultPhase: 'post_model',  description: 'Detect and redact personally identifiable information using regex + Cloud DLP.' },
  toxicity:       { label: 'Toxicity Check',      adkExpression: 'G.toxicity()',        defaultPhase: 'post_model',  description: 'LLM-based toxicity judge with configurable threshold.', thresholdField: { label: 'Threshold (0-1)', placeholder: '0.8', step: '0.1' } },
  budget:         { label: 'Token Budget',         adkExpression: 'G.budget()',          defaultPhase: 'pre_model',   description: 'Enforce maximum token spend per request.', thresholdField: { label: 'Max Tokens', placeholder: '5000', step: '1' } },
  json:           { label: 'JSON Validation',      adkExpression: 'G.json()',            defaultPhase: 'post_model',  description: 'Validate that output is well-formed JSON.' },
  length:         { label: 'Output Length',         adkExpression: 'G.length()',          defaultPhase: 'post_model',  description: 'Enforce min/max output character length.', thresholdField: { label: 'Max Characters', placeholder: '500', step: '1' } },
  topic:          { label: 'Topic Blocking',        adkExpression: 'G.topic(deny=[...])', defaultPhase: 'post_model',  description: 'Block responses about denied topics.' },
  grounded:       { label: 'Hallucination Check',  adkExpression: 'G.grounded("sources")', defaultPhase: 'post_model', description: 'Verify output is grounded in provided sources.' },
  output:         { label: 'Schema Validation',    adkExpression: 'G.output(Schema)',    defaultPhase: 'post_model',  description: 'Validate output conforms to a Pydantic schema.' },
  input:          { label: 'Input Validation',     adkExpression: 'G.input(Schema)',     defaultPhase: 'pre_model',   description: 'Validate input conforms to a schema.' },
  rate_limit:     { label: 'Rate Limit',            adkExpression: 'G.rate_limit()',      defaultPhase: 'pre_agent',   description: 'Limit requests per minute.', thresholdField: { label: 'RPM', placeholder: '60', step: '1' } },
  max_turns:      { label: 'Max Turns',             adkExpression: 'G.max_turns()',       defaultPhase: 'pre_agent',   description: 'Limit conversation turn count.', thresholdField: { label: 'Max Turns', placeholder: '10', step: '1' } },
  hallucination:  { label: 'Factual Accuracy',     adkExpression: 'G.hallucination()',   defaultPhase: 'post_model',  description: 'Check factual accuracy with configurable threshold.', thresholdField: { label: 'Threshold (0-1)', placeholder: '0.9', step: '0.1' } },
  regex:          { label: 'Regex Match',            adkExpression: 'G.regex()',           defaultPhase: 'post_model',  description: 'Match or block output using regex patterns.' },
  a2ui:           { label: 'A2UI Validation',       adkExpression: 'G.a2ui()',            defaultPhase: 'post_model',  description: 'Validate A2UI component output.' },
};

/** Ordered list of guard kinds for form dropdowns. */
export const GUARD_KINDS = Object.keys(GUARD_CONFIG) as GuardKind[];

/** Guard kind options for select dropdowns — derived from config. */
export const GUARD_OPTIONS = GUARD_KINDS.map((kind) => ({
  value: kind,
  label: `${GUARD_CONFIG[kind].label} (${GUARD_CONFIG[kind].adkExpression.split('(')[0]})`,
}));

/** Guard phase options. */
export const GUARD_PHASES: { value: GuardPhase; label: string }[] = [
  { value: 'pre_agent', label: 'Before Agent (pre_agent)' },
  { value: 'pre_model', label: 'Before Model (pre_model)' },
  { value: 'post_model', label: 'After Model (post_model)' },
  { value: 'context', label: 'Context Assembly (context)' },
  { value: 'middleware', label: 'Middleware' },
];
