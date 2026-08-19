"use client";

// AuthProvider holds the signed-in user + access token in a React Context.
// On mount it hydrates from localStorage (via auth-storage), and falls back
// to /auth/refresh once if the access token is stale. login() and logout()
// keep localStorage + cookie + state in lockstep — the cookie is what
// middleware reads to decide whether to redirect.
//
// Note: this is a client component. It can be safely placed in the root
// layout because Next.js will only run it in the browser, and server-
// rendered pages happily ignore the context (they don't read it).

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  ApiRequestError,
  authApi,
  type AuthResponse,
  type UserProfile,
} from "@/lib/api";
import {
  clearTokens,
  readTokens,
  writeTokens,
} from "@/lib/auth-storage";
import { DEV_BYPASS_AUTH, DEV_BYPASS_USER } from "@/lib/dev-bypass-auth";

interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;

  /** Persist tokens + user. Caller passes the AuthResponse from /login or /refresh. */
  login: (resp: AuthResponse) => void;
  /** Server-side logout (best-effort), then wipe local state regardless. */
  logout: () => Promise<void>;
  /** Try the refresh token. Returns true on success. */
  refreshSession: () => Promise<boolean>;
  /** Pull /auth/me again to refresh the cached user object (e.g. after KYC). */
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On first mount, restore session from storage. Try the access token
  // first; fall back to refresh if it expired (most common case after a
  // longer absence).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { accessToken: stored, refreshToken: storedRefresh } = readTokens();

      if (!stored || !storedRefresh) {
        if (!cancelled) {
          if (DEV_BYPASS_AUTH) {
            setUser(DEV_BYPASS_USER);
            setAccessToken("dev-bypass");
          }
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await authApi.getProfile(stored);
        if (cancelled) return;
        setUser(profile);
        setAccessToken(stored);
      } catch (err) {
        const isAuthErr = err instanceof ApiRequestError && err.status === 401;
        if (!isAuthErr) {
          // Network/server issue — keep tokens so a retry can succeed.
          if (!cancelled) setIsLoading(false);
          return;
        }
        try {
          const refreshed = await authApi.refreshToken(storedRefresh);
          if (cancelled) return;
          writeTokens(refreshed.access_token, refreshed.refresh_token);
          setUser(refreshed.user);
          setAccessToken(refreshed.access_token);
        } catch {
          if (cancelled) return;
          clearTokens();
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((resp: AuthResponse) => {
    writeTokens(resp.access_token, resp.refresh_token);
    setUser(resp.user);
    setAccessToken(resp.access_token);
  }, []);

  const logout = useCallback(async () => {
    const { accessToken: tok } = readTokens();
    if (tok) {
      // Best-effort — even if the request fails, we wipe local state.
      try {
        await authApi.logout(tok);
      } catch {
        /* ignore */
      }
    }
    clearTokens();
    setUser(null);
    setAccessToken(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const { refreshToken } = readTokens();
    if (!refreshToken) return false;
    try {
      const r = await authApi.refreshToken(refreshToken);
      writeTokens(r.access_token, r.refresh_token);
      setUser(r.user);
      setAccessToken(r.access_token);
      return true;
    } catch {
      clearTokens();
      setUser(null);
      setAccessToken(null);
      return false;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    const { accessToken: tok } = readTokens();
    if (!tok) return null;
    try {
      const profile = await authApi.getProfile(tok);
      setUser(profile);
      return profile;
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        const ok = await refreshSession();
        if (!ok) return null;
        const fresh = readTokens().accessToken;
        if (!fresh) return null;
        try {
          const p = await authApi.getProfile(fresh);
          setUser(p);
          return p;
        } catch {
          return null;
        }
      }
      return null;
    }
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        accessToken,
        login,
        logout,
        refreshSession,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
