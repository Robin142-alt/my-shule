"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import { getCsrfToken } from "@/lib/auth/csrf-client";
import type { ExperienceAudience } from "@/lib/auth/experience-audience";
import type { SchoolDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import type { PublicExperienceGatewaySession } from "@/lib/auth/server-session";
import { getPostLogoutPath } from "@/lib/pwa/installed-mode";

type LoginInput = {
  identifier: string;
  password: string;
  verificationCode?: string;
  tenantSlug?: string | null;
  rememberSession?: boolean;
};

type SessionResponse = {
  redirectTo?: string;
  roleContext?: SchoolDashboardRoleContext;
  session: PublicExperienceGatewaySession;
  user: PublicExperienceGatewaySession["user"];
};

type DashboardRolesResponse = {
  roleContext: SchoolDashboardRoleContext;
};

export class ExperienceSessionRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ExperienceSessionRequestError";
  }
}

async function parseResponse(response: Response) {
  const json = (await response.json().catch(() => null)) as
    | { message?: string }
    | SessionResponse
    | null;

  if (!response.ok) {
    throw new ExperienceSessionRequestError(
      json && "message" in json && json.message
        ? json.message
        : "Unable to complete the authentication request.",
      response.status,
    );
  }

  if (!json || !("session" in json) || !json.session || !json.user) {
    throw new Error("The session could not be verified. Please retry.");
  }
  return json;
}

export const SESSION_VERIFICATION_TIMEOUT_MS = 15_000;

async function requestSession(audience: ExperienceAudience, tenantSlug?: string | null) {
  const query = new URLSearchParams({ audience });
  if (tenantSlug) query.set("tenantSlug", tenantSlug);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SESSION_VERIFICATION_TIMEOUT_MS);
  try {
    return await parseResponse(await fetch(`/api/auth/me?${query.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    }));
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error("Session verification took too long. Please retry.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function useExperienceSession(
  audience: ExperienceAudience,
  options?: {
    tenantSlug?: string | null;
    autoLoad?: boolean;
    logoutPath?: string;
  },
) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [session, setSession] = useState<PublicExperienceGatewaySession | null>(null);
  const [user, setUser] = useState<PublicExperienceGatewaySession["user"] | null>(null);
  const [isLoading, setIsLoading] = useState(options?.autoLoad ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionVersion = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const requestVersion = sessionVersion.current;

    async function load() {
      if (!options?.autoLoad) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const payload = await requestSession(audience, options?.tenantSlug);

        if (!cancelled && requestVersion === sessionVersion.current) {
          setSession(payload.session);
          setUser(payload.user);
          setError(null);
        }
      } catch (loadError) {
        if (!cancelled && requestVersion === sessionVersion.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the current session.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [audience, options?.autoLoad, options?.tenantSlug]);

  const reloadSession = async () => {
    const requestVersion = ++sessionVersion.current;
    setIsLoading(true);
    setError(null);
    try {
      const payload = await requestSession(audience, options?.tenantSlug);
      if (requestVersion === sessionVersion.current) {
        setSession(payload.session);
        setUser(payload.user);
      }
      return payload;
    } catch (loadError) {
      if (requestVersion === sessionVersion.current) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load the current session.");
      }
      throw loadError;
    } finally {
      if (requestVersion === sessionVersion.current) setIsLoading(false);
    }
  };

  const login = async (input: LoginInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          audience,
          ...input,
          tenantSlug: input.tenantSlug ?? options?.tenantSlug ?? null,
        }),
      });
      const payload = await parseResponse(response);
      setSession(payload.session);
      setUser(payload.user);
      return payload;
    } catch (loginError) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in right now.";
      setError(message);
      throw loginError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const logout = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        credentials: "same-origin",
        body: JSON.stringify({ audience }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; success?: boolean }
        | null;

      if (!response.ok || payload?.success !== true) {
        throw new ExperienceSessionRequestError(
          payload?.message ?? "Unable to sign out securely. Please try again.",
          response.status,
        );
      }

      setSession(null);
      setUser(null);
      setError(null);
      queryClient.clear();
      router.replace(getPostLogoutPath(audience, undefined, options?.logoutPath));
    } catch (logoutError) {
      const message = logoutError instanceof Error
        ? logoutError.message
        : "Unable to sign out securely. Please try again.";
      setError(message);
      throw logoutError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const refresh = async () => {
    const requestVersion = sessionVersion.current;
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        credentials: "same-origin",
        body: JSON.stringify({
          audience,
          tenantSlug: options?.tenantSlug ?? null,
        }),
      });
      const payload = await parseResponse(response);
      if (requestVersion === sessionVersion.current) {
        setSession(payload.session);
        setUser(payload.user);
        setError(null);
      }
      return payload;
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to refresh the current session.";
      if (requestVersion === sessionVersion.current) setError(message);
      throw refreshError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadDashboardRoles = async () => {
    if (audience !== "school") {
      throw new Error("Dashboard roles are available only for school sessions.");
    }

    const response = await fetch("/api/auth/dashboard-roles", {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | DashboardRolesResponse
      | { message?: string }
      | null;

    if (!response.ok || !payload || !("roleContext" in payload)) {
      throw new ExperienceSessionRequestError(
        payload && "message" in payload && payload.message
          ? payload.message
          : "Unable to load your dashboard roles.",
        response.status,
      );
    }

    return payload.roleContext;
  };

  const switchRole = async (roleCode: string) => {
    if (audience !== "school") {
      throw new Error("Dashboard switching is available only for school sessions.");
    }

    sessionVersion.current += 1;
    setIsSwitchingRole(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/active-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-myshule-csrf": await getCsrfToken(),
        },
        credentials: "same-origin",
        body: JSON.stringify({ role_code: roleCode }),
      });
      const payload = await parseResponse(response);
      const requestedRole = roleCode.trim().toLowerCase();
      if (
        payload?.session?.roleContext?.activeAuthorizationRoleCode.trim().toLowerCase() !== requestedRole
        || payload.session.user.role.trim().toLowerCase() !== requestedRole
        || (payload.roleContext && payload.roleContext.activeAuthorizationRoleCode.trim().toLowerCase() !== requestedRole)
      ) {
        throw new Error("The server did not confirm the requested dashboard role.");
      }
      setSession(payload.session);
      setUser(payload.user);
      setError(null);
      return payload;
    } catch (switchError) {
      const message = switchError instanceof Error
        ? switchError.message
        : "Unable to switch dashboards.";
      setError(message);
      throw switchError;
    } finally {
      setIsSwitchingRole(false);
    }
  };

  return {
    session,
    user,
    isLoading,
    isSubmitting,
    isSwitchingRole,
    error,
    login,
    logout,
    refresh,
    reloadSession,
    loadDashboardRoles,
    switchRole,
    clearError: () => setError(null),
  };
}
