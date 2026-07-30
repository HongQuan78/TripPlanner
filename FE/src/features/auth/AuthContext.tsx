import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { authService } from './authService';
import { AuthContext } from './useAuth';
import type { AuthContextValue } from './useAuth';
import { httpClient } from '@/shared/api/httpClient';
import type { AuthResponse } from '@/shared/api/models/auth/authResponse';

export const AUTH_STORAGE_KEY = 'tripplanner.auth';

export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

function readStoredSession(): AuthResponse | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as AuthResponse;
    if (typeof parsed?.token === 'string' && typeof parsed?.email === 'string') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthResponse | null>(readStoredSession);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;
  const location = useLocation();
  const locationRef = useRef(location);
  locationRef.current = location;

  httpClient.setTokenProvider(() => sessionRef.current?.token ?? null);
  httpClient.setOnUnauthorized(() => {
    if (!sessionRef.current) {
      return;
    }
    sessionRef.current = null;
    setSession(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    const current = locationRef.current;
    const returnTo = encodeURIComponent(current.pathname + current.search);
    navigateRef.current(`/login?returnTo=${returnTo}`, { replace: true });
  });

  useEffect(() => {
    return () => {
      httpClient.setTokenProvider(() => null);
      httpClient.setOnUnauthorized(null);
    };
  }, []);

  const login = useCallback((next: AuthResponse) => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(next));
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout().catch(() => undefined);
    sessionRef.current = null;
    setSession(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    navigateRef.current('/');
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user: session ? { id: session.id, email: session.email, role: session.role } : null,
      token: session?.token ?? null,
      isAuthenticated: session !== null,
      login,
      logout,
    };
  }, [session, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
