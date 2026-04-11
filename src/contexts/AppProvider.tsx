/**
 * AppProvider — Composes all context providers into a single wrapper.
 *
 * Wrap your app in <AppProvider> to get access to all contexts.
 * The nesting order matters: inner providers can access outer ones
 * (e.g., PlaybookProvider uses NotificationContext).
 */

import type { ReactNode } from 'react';
import { NotificationProvider } from './NotificationContext';
import { AuthProvider } from './AuthContext';
import { PlaybookProvider } from './PlaybookContext';
import { RegistryProvider } from './RegistryContext';
import { ConnectorProvider } from './ConnectorContext';
import { TestProvider } from './TestContext';

export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <AuthProvider>
        <PlaybookProvider>
          <RegistryProvider>
            <ConnectorProvider>
              <TestProvider>{children}</TestProvider>
            </ConnectorProvider>
          </RegistryProvider>
        </PlaybookProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
