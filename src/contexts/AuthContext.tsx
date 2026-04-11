/**
 * AuthContext — Mock authenticated user state.
 *
 * In production this would integrate with Google IAM / Firebase Auth.
 * For the mockup, provides a static admin user after a brief delay.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

// ─── Types ───────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'editor' | 'viewer';
  org: string;
}

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
}

// ─── Mock data ───────────────────────────────────────────────────────

export const MOCK_USER: User = {
  id: 'user-vamsi',
  name: 'Vamsi K',
  email: 'vamsi@acme.com',
  avatar: 'VK',
  role: 'admin',
  org: 'ACME Insurance',
};

// ─── Context ─────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AppProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setUser(MOCK_USER);
      setLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
