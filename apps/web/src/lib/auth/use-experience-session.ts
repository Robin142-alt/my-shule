"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { authFetch } from "@/lib/auth/auth-fetch";
import { getCsrfToken } from "@/lib/auth/csrf-client";
import type { ExperienceAudience } from "@/lib/auth/experience-audience";
import type { SchoolDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import type { PublicExperienceGatewaySession } from "@/lib/auth/server-session";
import { getPostLogoutPath } from "@/lib/pwa/installed-mode";
import { readRetryAfterSeconds } from "@/lib/auth/retry-after";

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
    readonly retryAt?: number,
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
      response.status === 429
        ? Date.now() + readRetryAfterSeconds(response.headers?.get("retry-after")) * 1000
        : undefined,
    );
  }

  if (!json || !("session" in json) || !json.session || !json.user) {
    throw new Error("The session could not be verified. Please retry.");
  }
  return json;
}

export const SESSION_VERIFICATION_TIMEOUT_MS = 15_000;
export const SESSION_REVALIDATION_MS = 60_000;
const SESSION_QUERY_ROOT = ["experience-session"] as const;
// Hooks share the cache, so delayed credential responses must also share a
// revision across consumers (for example, a header logout during a refresh).
const sessionRevisions = new WeakMap<QueryClient, number>();
// Query errors are cleared when a new fetch starts, so preserve server cooldowns
// independently across remounts. They contain no credentials or session data.
const sessionCooldowns = new WeakMap<QueryClient, Map<string, ExperienceSessionRequestError>>();

function advanceSessionRevision(client: QueryClient) {
  const revision = (sessionRevisions.get(client) ?? 0) + 1;
  sessionRevisions.set(client, revision);
  return revision;
}

function sessionQueryKey(audience: ExperienceAudience, tenantSlug?: string | null) {
  return [...SESSION_QUERY_ROOT, audience, tenantSlug?.trim() || null] as const;
}

async function requestSession(audience: ExperienceAudience, tenantSlug: string | null | undefined, signal: AbortSignal) {
  const query = new URLSearchParams({ audience });
  if (tenantSlug) query.set("tenantSlug", tenantSlug);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
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
      throw new ExperienceSessionRequestError("Session verification took too long. Please retry.", 503);
    }
    if (error instanceof TypeError) throw new ExperienceSessionRequestError("Unable to connect to the session service. Please retry.", 503);
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancel);
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
  const queryKey = sessionQueryKey(audience, options?.tenantSlug);
  const cooldownKey = JSON.stringify(queryKey);
  // AppProviders owns this in-memory cache across route changes. Only public
  // session metadata is shared; every data request still uses the secure gateway.
  const sessionQuery = useQuery<SessionResponse | null>({
    queryKey,
    queryFn: async ({ signal }) => {
      const previousError = sessionCooldowns.get(queryClient)?.get(cooldownKey);
      if (previousError instanceof ExperienceSessionRequestError && previousError.retryAt && previousError.retryAt > Date.now()) {
        throw previousError;
      }
      try {
        const result = await requestSession(audience, options?.tenantSlug, signal);
        sessionCooldowns.get(queryClient)?.delete(cooldownKey);
        return result;
      } catch (loadError) {
        if (!signal.aborted && loadError instanceof ExperienceSessionRequestError && loadError.retryAt) {
          const cooldowns = sessionCooldowns.get(queryClient) ?? new Map<string, ExperienceSessionRequestError>();
          cooldowns.set(cooldownKey, loadError);
          sessionCooldowns.set(queryClient, cooldowns);
        }
        // Transient transport/overload failures do not revoke an already verified
        // identity. All data/actions still pass backend authorization. Definitive
        // rejection clears every alias; cancellation cannot erase a newer login.
        const temporary = loadError instanceof ExperienceSessionRequestError
          && (loadError.status === 429 || loadError.status >= 500);
        if (!signal.aborted && !temporary) {
          queryClient.setQueriesData({ queryKey: [...SESSION_QUERY_ROOT, audience] }, null);
        }
        throw loadError;
      }
    },
    enabled: options?.autoLoad ?? false,
    staleTime: (query) => query.state.data ? SESSION_REVALIDATION_MS : 0,
    gcTime: 5 * SESSION_REVALIDATION_MS,
    retry: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    // Keep long-lived school sessions current even while no workspace is clicked.
    // Realtime appointment events invalidate the same query for immediate updates.
    refetchInterval: audience === "school" ? (query) => {
      const failure = query.state.error;
      return failure instanceof ExperienceSessionRequestError && failure.retryAt
        ? Math.max(1000, failure.retryAt - Date.now())
        : 30_000;
    } : false,
  });
  const session = sessionQuery.data?.session ?? null;
  const user = sessionQuery.data?.user ?? null;
  const isLoading = Boolean(options?.autoLoad && !session && sessionQuery.isFetching);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSwitchingRole, setIsSwitchingRole] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const publishSession = async (payload: SessionResponse, revision: number) => {
    if (revision !== (sessionRevisions.get(queryClient) ?? 0)) return;
    sessionCooldowns.delete(queryClient);
    await queryClient.cancelQueries({ queryKey: SESSION_QUERY_ROOT });
    if (revision !== (sessionRevisions.get(queryClient) ?? 0)) return;
    // Credentials are shared by the gateway. Never retain another identity,
    // audience or tenant alias after they rotate.
    queryClient.setQueriesData({ queryKey: SESSION_QUERY_ROOT }, null);
    queryClient.setQueryData(queryKey, payload);
    queryClient.setQueryData(sessionQueryKey(audience, payload.session.tenantSlug), payload);
    setError(null);
  };

  const reloadSession = async () => {
    setError(null);
    const result = await sessionQuery.refetch({ throwOnError: true });
    if (!result.data) throw new Error("The session could not be verified. Please retry.");
    return result.data;
  };

  const login = async (input: LoginInput) => {
    const revision = advanceSessionRevision(queryClient);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authFetch("/api/auth/login", {
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
      if (revision !== sessionRevisions.get(queryClient)) throw new Error("Your sign-in changed. Please try again.");
      await queryClient.cancelQueries();
      queryClient.clear();
      await publishSession(payload, revision);
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
    const revision = advanceSessionRevision(queryClient);
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await authFetch("/api/auth/logout", {
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

      if (revision !== sessionRevisions.get(queryClient)) throw new Error("Your sign-in changed. Please try again.");
      await queryClient.cancelQueries();
      queryClient.setQueriesData({ queryKey: SESSION_QUERY_ROOT }, null);
      sessionCooldowns.delete(queryClient);
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
    const requestVersion = sessionRevisions.get(queryClient) ?? 0;
    setIsSubmitting(true);

    try {
      const response = await authFetch("/api/auth/refresh", {
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
      if (requestVersion === (sessionRevisions.get(queryClient) ?? 0)) {
        await publishSession(payload, requestVersion);
      }
      return payload;
    } catch (refreshError) {
      const message =
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to refresh the current session.";
      if (requestVersion === (sessionRevisions.get(queryClient) ?? 0)) setError(message);
      throw refreshError;
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadDashboardRoles = async () => {
    if (audience !== "school") {
      throw new Error("Dashboard roles are available only for school sessions.");
    }

    const response = await authFetch("/api/auth/dashboard-roles", {
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

    const revision = advanceSessionRevision(queryClient);
    setIsSwitchingRole(true);
    setError(null);

    try {
      const response = await authFetch("/api/auth/active-role", {
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
      if (revision !== sessionRevisions.get(queryClient)) throw new Error("Your sign-in changed. Please try again.");
      await publishSession(payload, revision);
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
    error: error ?? sessionQuery.error?.message ?? null,
    errorStatus: sessionQuery.error instanceof ExperienceSessionRequestError ? sessionQuery.error.status : null,
    verificationError: sessionQuery.error ? {
      message: sessionQuery.error.message,
      status: sessionQuery.error instanceof ExperienceSessionRequestError ? sessionQuery.error.status : null,
      retryAt: sessionQuery.error instanceof ExperienceSessionRequestError ? sessionQuery.error.retryAt ?? null : null,
    } : null,
    login,
    logout,
    refresh,
    reloadSession,
    loadDashboardRoles,
    switchRole,
    clearError: () => setError(null),
  };
}
