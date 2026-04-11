/**
 * ErrorBoundary — Catches rendering errors and shows a fallback UI.
 *
 * Two levels:
 *   <RouteErrorBoundary> — wraps each route, shows a "go home" recovery
 *   <ComponentErrorBoundary> — wraps individual widgets, shows inline fallback
 *
 * Without these, any thrown error during render crashes the entire app.
 */

import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from './Button';

// ─── Types ───────────────────────────────────────────────────────────

interface ErrorBoundaryProps {
  children: ReactNode;
  /** What to show when an error is caught */
  fallback?: ReactNode;
  /** Called when an error is caught (for logging/telemetry) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Level determines the fallback UI style */
  level?: 'route' | 'component';
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ─── Core ErrorBoundary class component ──────────────────────────────

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);

    // In production, this would send to your error tracking service
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const level = this.props.level ?? 'component';

    if (level === 'route') {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="max-w-md text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke="var(--color-unresolved)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h2 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-ui)' }}>
              Something went wrong
            </h2>
            <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              This page encountered an error. Your work has been preserved.
            </p>
            {this.state.error && (
              <pre
                className="text-[11px] text-left mb-4 p-3 rounded-lg overflow-auto max-h-32"
                style={{
                  background: 'var(--color-surface-1)',
                  color: 'var(--color-unresolved)',
                  border: '1px solid var(--color-border)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <div className="flex items-center justify-center gap-2">
              <Button variant="primary" size="md" onClick={this.reset}>
                Try Again
              </Button>
              <Button variant="secondary" size="md" onClick={() => window.location.assign('/')}>
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Component-level: compact inline fallback
    return (
      <div
        className="flex items-center gap-2 p-3 rounded-lg text-[12px]"
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
          <path d="M12 9v4m0 4h.01" stroke="var(--color-draft)" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="9" stroke="var(--color-draft)" strokeWidth="1.5"/>
        </svg>
        <span>This section encountered an error.</span>
        <button
          onClick={this.reset}
          className="underline font-medium"
          style={{ color: 'var(--color-accent)' }}
        >
          Retry
        </button>
      </div>
    );
  }
}

// ─── Convenience wrappers ────────────────────────────────────────────

/** Route-level boundary — wraps a page, shows full recovery UI */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary level="route">{children}</ErrorBoundary>;
}

/** Component-level boundary — wraps a widget, shows inline fallback */
export function ComponentErrorBoundary({ children }: { children: ReactNode }) {
  return <ErrorBoundary level="component">{children}</ErrorBoundary>;
}
