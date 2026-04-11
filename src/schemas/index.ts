/**
 * Zod schemas — Runtime validation for domain types.
 *
 * These mirror the TypeScript types in parser/types.ts but provide
 * runtime validation at system boundaries (API responses, file parsing,
 * external data). When the backend arrives, every API response passes
 * through z.parse() before entering the app.
 *
 * Usage:
 *   const chip = SmartChipSchema.parse(apiResponse);  // throws on invalid
 *   const result = SmartChipSchema.safeParse(data);    // returns { success, data, error }
 */

import { z } from 'zod';

// ─── Chip types ──────────────────────────────────────────────────────

export const ChipTypeSchema = z.enum([
  'doc', 'tool', 'agent', 'guard', 'data',
  'schema', 'connector', 'skill', 'trigger',
]);

export const ChipStatusSchema = z.enum([
  'resolved', 'draft', 'unresolved', 'deprecated',
]);

// ─── SmartChip ───────────────────────────────────────────────────────

export const SmartChipSchema = z.object({
  id: z.string(),
  type: ChipTypeSchema,
  name: z.string().min(1),
  registryId: z.string(),
  version: z.string().regex(/^\d+\.\d+\.\d+/, 'Must be semver'),
  status: ChipStatusSchema,
  owner: z.string(),
  description: z.string(),
  permissions: z.object({
    currentUser: z.enum(['viewer', 'invoker', 'editor', 'admin']),
  }),
  metadata: z.record(z.unknown()),
  lastUpdated: z.string().datetime(),
  usageCount: z.number().int().nonneg(),
  endpoint: z.string().url().optional(),
  healthStatus: z.enum(['healthy', 'degraded', 'down']).optional(),
});

export type SmartChipInput = z.input<typeof SmartChipSchema>;

// ─── Connector ───────────────────────────────────────────────────────

export const ConnectorEntitySchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  documentCount: z.number().int().nonneg(),
});

export const ConnectorActionSchema = z.object({
  name: z.string(),
  enabled: z.boolean(),
  authRequired: z.boolean(),
});

export const ConnectorEntrySchema = z.object({
  id: z.string(),
  product: z.string(),
  provider: z.enum(['google', 'third-party']),
  category: z.string(),
  status: z.enum(['active', 'available', 'draft', 'error']),
  icon: z.string(),
  entities: z.array(ConnectorEntitySchema),
  actions: z.array(ConnectorActionSchema),
  authMethod: z.enum(['oauth', 'api-token', 'service-account']),
  authUser: z.string().optional(),
  lastSync: z.string().optional(),
  syncMode: z.enum(['federated', 'ingested']).optional(),
  dataStoreRegion: z.string().optional(),
});

// ─── Version ─────────────────────────────────────────────────────────

export const VersionStatusSchema = z.enum([
  'draft', 'staging', 'production', 'rolled-back', 'deprecated',
]);

export const SemverBumpSchema = z.enum(['patch', 'minor', 'major']);

export const ChipChangeSchema = z.object({
  action: z.enum(['added', 'removed', 'modified']),
  chipType: ChipTypeSchema,
  chipName: z.string(),
  detail: z.string().optional(),
});

export const VersionEntrySchema = z.object({
  version: z.string(),
  status: VersionStatusSchema,
  author: z.object({
    name: z.string(),
    email: z.string().email(),
    avatarUrl: z.string(),
  }),
  timestamp: z.string(),
  changeSummary: z.string(),
  chipChanges: z.array(ChipChangeSchema),
  reviewStatus: z.enum(['pending', 'approved', 'changes-requested']).optional(),
  reviewers: z.array(z.string()).optional(),
});

// ─── Guard ───────────────────────────────────────────────────────────

export const GuardKindSchema = z.enum([
  'json', 'length', 'output', 'input', 'budget', 'rate_limit',
  'max_turns', 'pii', 'toxicity', 'topic', 'grounded',
  'hallucination', 'regex', 'a2ui',
]);

export const GuardPhaseSchema = z.enum([
  'pre_agent', 'pre_model', 'post_model', 'context', 'middleware',
]);

export const GuardSpecSchema = z.object({
  kind: GuardKindSchema,
  phase: GuardPhaseSchema,
  config: z.record(z.unknown()),
});

// ─── API Response wrappers ───────────────────────────────────────────
// Use these when validating API responses in query hooks

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    meta: z.object({
      requestId: z.string(),
      timestamp: z.string(),
    }).optional(),
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number().int().nonneg(),
    page: z.number().int().nonneg(),
    pageSize: z.number().int().positive(),
    hasMore: z.boolean(),
  });
