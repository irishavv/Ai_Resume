import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  fetchSession,
  login as loginRequest,
  logout as logoutRequest,
  setUnauthorizedHandler,
} from '../services/adminService.js';
import { clearAdminToken, getAdminToken } from '../lib/adminToken.js';

const AdminAuthContext = createContext(null);

/**
 * Holds the operator session for the console.
 *
 * The token itself lives in `lib/adminToken.js` (sessionStorage); this provider
 * only tracks whether that token is still accepted by the backend. A token the
 * backend rejects - expired, or revoked elsewhere - is dropped and the console
 * returns to the sign-in screen.
 */
export function AdminAuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState(() => (getAdminToken() ? 'loading' : 'anonymous'));
  const [session, setSession] = useState({ username: '', expiresAt: null });

  const forgetSession = useCallback(() => {
    clearAdminToken();
    setSession({ username: '', expiresAt: null });
    setStatus('anonymous');
    queryClient.removeQueries({ queryKey: ['admin'] });
  }, [queryClient]);

  // Any rejected console request means the session is gone.
  useEffect(() => {
    setUnauthorizedHandler(forgetSession);
    return () => setUnauthorizedHandler(null);
  }, [forgetSession]);

  // A token restored from sessionStorage is only trusted once the backend
  // confirms it, so a stale tab cannot show the console.
  useEffect(() => {
    if (!getAdminToken()) return undefined;
    let cancelled = false;

    fetchSession()
      .then((resolved) => {
        if (cancelled) return;
        setSession(resolved);
        setStatus('authenticated');
      })
      .catch(() => {
        if (cancelled) return;
        clearAdminToken();
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (credentials) => {
    const resolved = await loginRequest(credentials);
    setSession(resolved);
    setStatus('authenticated');
    return resolved;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // The session is local state; it is dropped even when the call fails.
    }
    forgetSession();
  }, [forgetSession]);

  const value = useMemo(
    () => ({
      status,
      isAuthenticated: status === 'authenticated',
      isResolving: status === 'loading',
      username: session.username,
      expiresAt: session.expiresAt,
      signIn,
      signOut,
    }),
    [session.expiresAt, session.username, signIn, signOut, status],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used inside an AdminAuthProvider.');
  }
  return context;
}

export default AdminAuthContext;
