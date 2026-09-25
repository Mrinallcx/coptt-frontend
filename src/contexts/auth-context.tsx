"use client";

// AuthProvider holds the signed-in profile. Tokens are HttpOnly cookies:
// browser JavaScript never stores or reads them. `accessToken` remains a
// compatibility/session-ready sentinel for components that gate API calls.
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
import { DEV_BYPASS_AUTH, DEV_BYPASS_USER } from "@/lib/dev-bypass-auth";
const COOKIE_SESSION = "cookie-session";

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

  // Restore from the HttpOnly access cookie; if it expired, rotate the
  // HttpOnly refresh cookie once and use the returned profile.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // One-time cleanup for sessions created before the HttpOnly-cookie
      // migration. Never leave a usable refresh token in Web Storage.
      localStorage.removeItem("coptt_access_token");
      localStorage.removeItem("coptt_refresh_token");
      if (DEV_BYPASS_AUTH) {
        if (!cancelled) {
          setUser(DEV_BYPASS_USER);
          setAccessToken(COOKIE_SESSION);
          setIsLoading(false);
        }
        return;
      }
      try {
        const profile = await authApi.getProfile(COOKIE_SESSION);
        if (cancelled) return;
        setUser(profile);
        setAccessToken(COOKIE_SESSION);
      } catch (err) {
        const isAuthErr = err instanceof ApiRequestError && err.status === 401;
        if (!isAuthErr) {
          if (!cancelled) setIsLoading(false);
          return;
        }
        try {
          const refreshed = await authApi.refreshToken();
          if (cancelled) return;
          setUser(refreshed.user);
          setAccessToken(COOKIE_SESSION);
        } catch {
          // No valid refresh cookie.
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
    setUser(resp.user);
    setAccessToken(COOKIE_SESSION);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout(COOKIE_SESSION);
    } catch {
      /* clear local profile even if the network request failed */
    }
    setUser(null);
    setAccessToken(null);
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const r = await authApi.refreshToken();
      setUser(r.user);
      setAccessToken(COOKIE_SESSION);
      return true;
    } catch {
      setUser(null);
      setAccessToken(null);
      return false;
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<UserProfile | null> => {
    try {
      const profile = await authApi.getProfile(COOKIE_SESSION);
      setUser(profile);
      return profile;
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        const ok = await refreshSession();
        if (!ok) return null;
        try {
          const p = await authApi.getProfile(COOKIE_SESSION);
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
