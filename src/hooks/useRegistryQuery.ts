/**
 * useRegistryQuery — React Query hook for fetching registry data.
 *
 * Currently uses mock data (same as RegistryContext), but the interface
 * is ready for a real backend. When the API arrives, replace `fetchRegistry`
 * with an actual fetch call and add Zod validation:
 *
 *   async function fetchRegistry() {
 *     const res = await fetch('/api/registry');
 *     const json = await res.json();
 *     return z.array(SmartChipSchema).parse(json.data);
 *   }
 */

import { useQuery } from '@tanstack/react-query';
import type { SmartChip } from '../parser/types';
import { REGISTRY } from '../data/registry';

// ─── Query keys (centralized to prevent typo bugs) ──────────────────

export const registryKeys = {
  all: ['registry'] as const,
  list: (filters?: { type?: string; status?: string }) =>
    [...registryKeys.all, 'list', filters] as const,
  detail: (id: string) => [...registryKeys.all, 'detail', id] as const,
};

// ─── Mock fetcher (swap for real API later) ──────────────────────────

async function fetchRegistry(): Promise<SmartChip[]> {
  // Simulate network latency
  await new Promise((r) => setTimeout(r, 100));
  return [...REGISTRY];
}

async function fetchChipById(id: string): Promise<SmartChip | null> {
  await new Promise((r) => setTimeout(r, 50));
  return REGISTRY.find((c) => c.id === id) ?? null;
}

// ─── Hooks ───────────────────────────────────────────────────────────

/** Fetch the full registry. Cached for 30s (from QueryClient defaults). */
export function useRegistryQuery(filters?: { type?: string; status?: string }) {
  return useQuery({
    queryKey: registryKeys.list(filters),
    queryFn: fetchRegistry,
    select: (data) => {
      let result = data;
      if (filters?.type) result = result.filter((c) => c.type === filters.type);
      if (filters?.status) result = result.filter((c) => c.status === filters.status);
      return result;
    },
  });
}

/** Fetch a single chip by ID. */
export function useChipQuery(id: string | null) {
  return useQuery({
    queryKey: registryKeys.detail(id ?? ''),
    queryFn: () => fetchChipById(id!),
    enabled: !!id,
  });
}
