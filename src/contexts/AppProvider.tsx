/**
 * AppProvider — Composes all context providers into a single wrapper.
 *
 * Nesting order matters: inner providers can access outer ones.
 * WorkspaceProvider wraps RegistryProvider so the registry can
 * scope its view to the current workspace.
 */

import type { ReactNode } from 'react';
import { NotificationProvider } from './NotificationContext';
import { AuthProvider } from './AuthContext';
import { WorkspaceProvider } from './WorkspaceContext';
import { PlaybookProvider } from './PlaybookContext';
import { RegistryProvider } from './RegistryContext';
import { ConnectorProvider } from './ConnectorContext';
import { TestProvider } from './TestContext';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <AuthProvider>
        <WorkspaceProvider>
          <PlaybookProvider>
            <RegistryProvider>
              <ConnectorProvider>
                <TestProvider>{children}</TestProvider>
              </ConnectorProvider>
            </RegistryProvider>
          </PlaybookProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
