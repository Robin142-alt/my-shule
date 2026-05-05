"use client";

import { useEffect, useState } from "react";

import {
  fetchApiMe,
  isDashboardApiConfigured,
  loginToDashboardApi,
  type LiveAuthSession,
  type LiveAuthUser,
} from "@/lib/dashboard/api-client";

function storageKey(tenantId: string) {
  return `shulehub-live-session:${tenantId}`;
}

function readStoredSession(tenantId: string): LiveAuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(storageKey(tenantId));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LiveAuthSession;
  } catch {
    window.localStorage.removeItem(storageKey(tenantId));
    return null;
  }
}

function writeStoredSession(session: LiveAuthSession | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    return;
  }

  window.localStorage.setItem(storageKey(session.tenantId), JSON.stringify(session));
}

function clearStoredSession(tenantId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey(tenantId));
}

export function useLiveTenantSession(tenantId: string) {
  const apiConfigured = isDashboardApiConfigured();
  const [session, setSession] = useState<LiveAuthSession | null>(null);
  const [user, setUser] = useState<LiveAuthUser | null>(null);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(
    apiConfigured ? null : tenantId,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!apiConfigured) {
        return;
      }

      const storedSession = readStoredSession(tenantId);

      if (!storedSession) {
        if (!cancelled) {
          setSession(null);
          setUser(null);
          setError(null);
          setResolvedTenantId(tenantId);
        }
        return;
      }

      try {
        const hydratedUser = await fetchApiMe(storedSession);

        if (cancelled) {
          return;
        }

        setSession(storedSession);
        setUser(hydratedUser);
        setError(null);
      } catch {
        clearStoredSession(tenantId);

        if (!cancelled) {
          setSession(null);
          setUser(null);
          setError("Live session expired. Sign in again to use backend data.");
        }
      } finally {
        if (!cancelled) {
          setResolvedTenantId(tenantId);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [apiConfigured, tenantId]);

  const login = async (email: string, password: string) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const nextSession = await loginToDashboardApi({
        tenantId,
        email,
        password,
      });
      writeStoredSession(nextSession);
      setSession(nextSession);
      setUser(nextSession.user);
      setResolvedTenantId(tenantId);
    } catch (loginError) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in to the live backend right now.";
      setError(message);
      throw loginError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = () => {
    clearStoredSession(tenantId);
    setSession(null);
    setUser(null);
    setError(null);
    setResolvedTenantId(tenantId);
  };

  return {
    apiConfigured,
    session,
    user,
    isLoading: apiConfigured && resolvedTenantId !== tenantId,
    isSubmitting,
    error,
    login,
    logout,
    clearError: () => setError(null),
  };
}
