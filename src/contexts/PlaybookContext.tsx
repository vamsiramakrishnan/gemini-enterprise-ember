/**
 * PlaybookContext — Playbook document state, versioning, and publish flow.
 *
 * Manages the current playbook content (the source of truth for the agent),
 * tracks dirty state, handles save/publish/restore operations, and maintains
 * the version timeline.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';

import type { SemverBump, VersionStatus } from '../parser/types';
import type { VersionEntry } from '../data/versions';
import { VERSIONS } from '../data/versions';
import { CLAIMS_PLAYBOOK_CONTENT } from '../data/playbook';
import { NotificationContext } from './NotificationContext';
import { MOCK_USER } from './AuthContext';

// ─── Types ───────────────────────────────────────────────────────────

export interface PlaybookContextValue {
  content: string;
  dirty: boolean;
  saving: boolean;
  publishModalOpen: boolean;
  versions: VersionEntry[];
  currentVersion: string;
  setContent: (s: string) => void;
  save: () => void;
  openPublishModal: () => void;
  closePublishModal: () => void;
  publish: (
    bump: SemverBump,
    description: string,
    reviewers: string[],
    targetEnv: VersionStatus,
  ) => void;
  restoreVersion: (version: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function bumpVersion(current: string, bump: SemverBump): string {
  const clean = current.replace(/-.*$/, '');
  const parts = clean.split('.').map(Number);
  if (bump === 'major') return `${parts[0] + 1}.0.0`;
  if (bump === 'minor') return `${parts[0]}.${parts[1] + 1}.0`;
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}

// ─── Context ─────────────────────────────────────────────────────────

const PlaybookCtx = createContext<PlaybookContextValue | null>(null);

export function usePlaybook(): PlaybookContextValue {
  const ctx = useContext(PlaybookCtx);
  if (!ctx) throw new Error('usePlaybook must be used within <AppProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────

export function PlaybookProvider({ children }: { children: ReactNode }) {
  const [content, setContentRaw] = useState(CLAIMS_PLAYBOOK_CONTENT);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [versions, setVersions] = useState<VersionEntry[]>([...VERSIONS]);
  const [currentVersion, setCurrentVersion] = useState('2.1.0');

  const notifCtx = useContext(NotificationContext);

  const setContent = useCallback((s: string) => {
    setContentRaw(s);
    setDirty(true);
  }, []);

  const save = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
      notifCtx?.addNotification({ type: 'success', title: 'Playbook saved' });
    }, 300);
  }, [notifCtx]);

  const openPublishModal = useCallback(() => setPublishModalOpen(true), []);
  const closePublishModal = useCallback(() => setPublishModalOpen(false), []);

  const publish = useCallback(
    (bump: SemverBump, description: string, reviewers: string[], targetEnv: VersionStatus) => {
      const newVersion = bumpVersion(currentVersion, bump);
      const entry: VersionEntry = {
        version: newVersion,
        status: targetEnv,
        author: { name: MOCK_USER.name, email: MOCK_USER.email, avatarUrl: '' },
        timestamp: new Date().toISOString(),
        changeSummary: description || `Published ${newVersion} to ${targetEnv}.`,
        chipChanges: [],
        reviewStatus: reviewers.length > 0 ? 'pending' : undefined,
        reviewers: reviewers.length > 0 ? reviewers : undefined,
      };
      setVersions((prev) => [entry, ...prev]);
      setCurrentVersion(newVersion);
      setPublishModalOpen(false);
      setDirty(false);
      notifCtx?.addNotification({
        type: 'success',
        title: `Published v${newVersion}`,
        message: `Version ${newVersion} published to ${targetEnv}.`,
      });
    },
    [currentVersion, notifCtx],
  );

  const restoreVersion = useCallback(
    (version: string) => {
      setCurrentVersion(version);
      setDirty(false);
      notifCtx?.addNotification({
        type: 'info',
        title: `Restored to v${version}`,
        message: 'Playbook content restored. Save to persist.',
      });
    },
    [notifCtx],
  );

  return (
    <PlaybookCtx.Provider
      value={{
        content, dirty, saving, publishModalOpen, versions, currentVersion,
        setContent, save, openPublishModal, closePublishModal, publish, restoreVersion,
      }}
    >
      {children}
    </PlaybookCtx.Provider>
  );
}
