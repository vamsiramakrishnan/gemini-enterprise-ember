/**
 * AppContext — Barrel re-export for backward compatibility.
 *
 * All context logic now lives in individual modules:
 *   NotificationContext.tsx — toast notifications
 *   AuthContext.tsx         — mock authenticated user
 *   PlaybookContext.tsx     — playbook content, versioning, publish
 *   RegistryContext.tsx     — smart chip registry with CRUD
 *   ConnectorContext.tsx    — enterprise connector catalog
 *   TestContext.tsx         — test execution with loop iterations
 *   AppProvider.tsx         — composed root provider
 *
 * Import from here for convenience, or import individual modules directly.
 */

// ─── Provider ────────────────────────────────────────────────────────
export { AppProvider } from './AppProvider';

// ─── Hooks ───────────────────────────────────────────────────────────
export { useNotifications } from './NotificationContext';
export { useAuth } from './AuthContext';
export { useWorkspace } from './WorkspaceContext';
export { usePlaybook } from './PlaybookContext';
export { useRegistry } from './RegistryContext';
export { useConnectors } from './ConnectorContext';
export { useTest } from './TestContext';

// ─── Types ───────────────────────────────────────────────────────────
export type { Notification, NotificationContextValue } from './NotificationContext';
export type { User, AuthContextValue } from './AuthContext';
export type { PlaybookContextValue } from './PlaybookContext';
export type { RegistryContextValue } from './RegistryContext';
export type { ConnectorContextValue } from './ConnectorContext';
export type {
  GuardCheck,
  LoopIteration,
  TestResult,
  SkillActivationResult,
} from './TestContext';
