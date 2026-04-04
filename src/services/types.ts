import type { SmartChip, ChipType, CompiledGraph, SemverBump } from '../parser/types';
import type { VersionEntry } from '../data/versions';
import type { ConnectorEntry } from '../data/connectors';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'viewer' | 'invoker' | 'editor' | 'admin';
  org: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

export interface PublishRequest {
  bump: SemverBump;
  description: string;
  reviewers: string[];
  targetEnv: 'staging' | 'production';
}

export interface PlaybookService {
  getContent(): Promise<string>;
  saveContent(content: string): Promise<void>;
  publish(request: PublishRequest): Promise<VersionEntry>;
  getVersions(): Promise<VersionEntry[]>;
  restoreVersion(version: string): Promise<void>;
  getCompiledGraph(): Promise<CompiledGraph>;
}

export interface RegistryService {
  getAll(): Promise<SmartChip[]>;
  getByType(type: ChipType): Promise<SmartChip[]>;
  search(query: string): Promise<SmartChip[]>;
  getById(id: string): Promise<SmartChip | null>;
  create(chip: Partial<SmartChip>): Promise<SmartChip>;
  update(id: string, updates: Partial<SmartChip>): Promise<SmartChip>;
  delete(id: string): Promise<void>;
}

export interface ConnectorService {
  getAll(): Promise<ConnectorEntry[]>;
  toggle(id: string, enabled: boolean): Promise<ConnectorEntry>;
  sync(id: string): Promise<void>;
  getActions(id: string): Promise<ConnectorEntry['actions']>;
  testQuery(id: string, query: string): Promise<{ results: string[]; latencyMs: number }>;
}

export interface AuthService {
  getCurrentUser(): Promise<User>;
  checkPermission(resourceId: string, action: string): Promise<boolean>;
  getSharedUsers(resourceId: string): Promise<Array<{ user: User; role: string; inherited?: string }>>;
  shareWith(resourceId: string, email: string, role: string): Promise<void>;
  updateRole(resourceId: string, email: string, role: string): Promise<void>;
  removeAccess(resourceId: string, email: string): Promise<void>;
}

export interface LoopIteration {
  index: number;
  observe: string;
  reason: string;
  act: { chipRef: string; chipType: ChipType; params?: Record<string, unknown> };
  result: string;
  durationMs: number;
  decision: 'loop' | 'respond';
  guardChecks?: Array<{ guard: string; passed: boolean; detail?: string }>;
}

export interface TestResult {
  id: string;
  input: string;
  iterations: LoopIteration[];
  finalResponse: string;
  totalDurationMs: number;
  tokenCount: number;
  status: 'running' | 'completed' | 'error';
}

export interface TestService {
  runTest(input: string): Promise<TestResult>;
  runToolTest(toolId: string, params: Record<string, unknown>): Promise<{ output: unknown; durationMs: number }>;
  runSkillActivation(skillId: string, prompt: string): Promise<{ activated: boolean; confidence: number; response?: string }>;
  simulateTrigger(triggerId: string): Promise<TestResult>;
}
