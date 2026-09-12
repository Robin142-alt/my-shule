"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  normalizeDashboardRoleContext,
  type SchoolDashboardRoleContext,
  type SchoolDashboardRoleOption,
} from "@/lib/auth/dashboard-role-context";
import {
  ExperienceSessionRequestError,
  useExperienceSession,
} from "@/lib/auth/use-experience-session";
import { getExpiredSessionLoginPath } from "@/lib/auth/session-expiry-client";
import { replaceDashboardDocument } from "@/lib/auth/dashboard-role-navigation";
import type { SchoolExperienceRole } from "@/lib/experiences/types";
import { getSchoolWorkspace } from "@/lib/experiences/school-data";
import { isSchoolSection } from "@/lib/routing/experience-routes";
import type { PublicExperienceGatewaySession } from "@/lib/auth/server-session";

export type SchoolDashboardRouteMode = "hosted" | "public";

type SchoolDashboardRoleContextValue = {
  activeRole: SchoolExperienceRole;
  activeAuthorizationRoleCode: string;
  primaryRole: SchoolExperienceRole;
  primaryAuthorizationRoleCode: string;
  assignedRoles: SchoolExperienceRole[];
  assignedAuthorizationRoleCodes: string[];
  availableRoles: SchoolDashboardRoleOption[];
  teacherDashboardEligible: boolean;
  tenantSlug: string | null;
  userId: string | null;
  userLabel: string;
  liveDataEnabled: boolean;
  authenticatedSession: PublicExperienceGatewaySession | null;
  authenticatedUser: PublicExperienceGatewaySession["user"] | null;
  isLoading: boolean;
  isSwitching: boolean;
  switchingToAuthorizationRoleCode: string | null;
  error: string | null;
  clearError: () => void;
  reloadDashboardRoles: () => Promise<void>;
  switchDashboardRole: (authorizationRoleCode: string) => Promise<void>;
};

const SchoolDashboardRoleContext = createContext<SchoolDashboardRoleContextValue | null>(null);

function dashboardPathStorageKey(input: {
  tenantSlug: string;
  userId: string;
  role: SchoolExperienceRole;
}) {
  return `myshule.dashboard-path:${encodeURIComponent(input.tenantSlug)}:${encodeURIComponent(input.userId)}:${input.role}`;
}

export function isValidDashboardRolePath(
  path: string,
  role: SchoolExperienceRole,
  routeMode: SchoolDashboardRouteMode,
) {
  const pathname = path.split(/[?#]/, 1)[0] ?? "";
  // Stored paths must remain on this origin and must not normalize into another role.
  if (
    !path.startsWith("/") || path.startsWith("//") || path.includes("\\")
    || Array.from(path).some((character) => character.charCodeAt(0) <= 32)
  ) {
    return false;
  }
  try {
    if (new URL(path, "https://dashboard.invalid").pathname !== pathname) return false;
  } catch {
    return false;
  }

  if (routeMode === "public") {
    const roleRoot = `/school/${role}`;
    if (pathname === roleRoot) {
      return true;
    }
    if (!pathname.startsWith(`${roleRoot}/`)) {
      return false;
    }

    const section = pathname.slice(roleRoot.length + 1).split("/")[0] ?? "";
    if (!isSchoolSection(section)) {
      return false;
    }

    return getSchoolWorkspace(role).navItems.some((item) => {
      const navSection = item.href.replace(/^\/+/, "").split("/")[0] ?? "";
      return navSection === section || item.id === section;
    });
  }

  if (pathname === "/dashboard") {
    return true;
  }

  const section = pathname.replace(/^\/+/, "").split("/")[0] ?? "";
  if (!section || !isSchoolSection(section)) {
    return false;
  }

  return getSchoolWorkspace(role).navItems.some((item) => {
    const navSection = item.href.replace(/^\/+/, "").split("/")[0] ?? "";
    return navSection === section || item.id === section;
  });
}

export function getDefaultDashboardRolePath(
  role: SchoolExperienceRole,
  routeMode: SchoolDashboardRouteMode,
) {
  return routeMode === "public" ? `/school/${role}` : "/dashboard";
}

export function resolveSchoolDashboardTenantBinding(input: {
  requestedTenantSlug?: string | null;
  authenticatedTenantSlug?: string | null;
  liveDataEnabled: boolean;
}) {
  const requestedTenantSlug = input.requestedTenantSlug?.trim() || null;
  const authenticatedTenantSlug = input.authenticatedTenantSlug?.trim() || null;

  return {
    tenantSlug: input.liveDataEnabled
      ? authenticatedTenantSlug
      : requestedTenantSlug ?? authenticatedTenantSlug,
    mismatch: Boolean(
      input.liveDataEnabled
      && requestedTenantSlug
      && authenticatedTenantSlug
      && requestedTenantSlug !== authenticatedTenantSlug,
    ),
  };
}

function readLastDashboardPath(input: {
  tenantSlug: string | null;
  userId: string | null;
  role: SchoolExperienceRole;
  routeMode: SchoolDashboardRouteMode;
}) {
  if (typeof window === "undefined" || !input.tenantSlug || !input.userId) {
    return null;
  }

  try {
    const path = window.sessionStorage.getItem(dashboardPathStorageKey({
      tenantSlug: input.tenantSlug,
      userId: input.userId,
      role: input.role,
    }));
    return path && isValidDashboardRolePath(path, input.role, input.routeMode)
      ? path
      : null;
  } catch {
    return null;
  }
}

function writeLastDashboardPath(input: {
  tenantSlug: string | null;
  userId: string | null;
  role: SchoolExperienceRole;
  routeMode: SchoolDashboardRouteMode;
  path: string;
}) {
  if (
    typeof window === "undefined"
    || !input.tenantSlug
    || !input.userId
    || !isValidDashboardRolePath(input.path, input.role, input.routeMode)
  ) {
    return;
  }

  try {
    window.sessionStorage.setItem(dashboardPathStorageKey({
      tenantSlug: input.tenantSlug,
      userId: input.userId,
      role: input.role,
    }), input.path);
  } catch {
    // Role switching remains available when browser storage is unavailable.
  }
}

export function SchoolDashboardRoleProvider({
  initialRole,
  tenantSlug,
  userLabel,
  routeMode,
  liveDataEnabled = true,
  children,
}: {
  initialRole: SchoolExperienceRole;
  tenantSlug?: string | null;
  userLabel?: string | null;
  routeMode: SchoolDashboardRouteMode;
  liveDataEnabled?: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const auth = useExperienceSession("school", {
    tenantSlug,
    autoLoad: liveDataEnabled,
  });
  const [roleContext, setRoleContext] = useState<SchoolDashboardRoleContext>(() =>
    normalizeDashboardRoleContext(null, initialRole),
  );
  const [isLoadingRoles, setIsLoadingRoles] = useState(liveDataEnabled);
  const [switchingToAuthorizationRoleCode, setSwitchingToAuthorizationRoleCode] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);
  const switchInProgress = useRef(false);
  const roleRequestVersion = useRef(0);
  const sessionRoleContext = auth.session?.roleContext;
  const userId = auth.user?.user_id ?? null;
  // Once the gateway has authenticated the request, its tenant is the only
  // trustworthy cache and dashboard scope. The route slug is merely the
  // requested school and must never override the signed-in session.
  const normalizedTenantSlug = resolveSchoolDashboardTenantBinding({
    requestedTenantSlug: tenantSlug,
    authenticatedTenantSlug: auth.session?.tenantSlug,
    liveDataEnabled,
  }).tenantSlug;
  const loadDashboardRoles = useEffectEvent(() => auth.loadDashboardRoles());

  useEffect(() => {
    if (!auth.session && auth.error) setRoleError(auth.error);
  }, [auth.error, auth.session]);

  useEffect(() => {
    if (switchInProgress.current) return;
    if (sessionRoleContext) {
      setRoleContext(sessionRoleContext);

      if (sessionRoleContext.activeRole !== initialRole) {
        const targetPath = readLastDashboardPath({
          tenantSlug: normalizedTenantSlug,
          userId,
          role: sessionRoleContext.activeRole,
          routeMode,
        }) ?? getDefaultDashboardRolePath(sessionRoleContext.activeRole, routeMode);
        replaceDashboardDocument(targetPath);
      }
    }
  }, [initialRole, normalizedTenantSlug, routeMode, router, sessionRoleContext, userId]);

  useEffect(() => {
    if (!liveDataEnabled) {
      setIsLoadingRoles(false);
      return;
    }

    if (auth.isLoading) {
      return;
    }

    if (!auth.session || !auth.user) {
      setIsLoadingRoles(false);
      return;
    }

    let cancelled = false;
    const requestVersion = roleRequestVersion.current;
    if (switchInProgress.current) return;
    setIsLoadingRoles(true);

    void loadDashboardRoles()
      .then((nextContext) => {
        if (!cancelled && requestVersion === roleRequestVersion.current) {
          setRoleContext(nextContext);
          setRoleError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled && requestVersion === roleRequestVersion.current) {
          setRoleError(
            error instanceof Error
              ? error.message
              : "Unable to load your dashboard roles.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingRoles(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [auth.isLoading, auth.session, auth.user, liveDataEnabled]);

  const reloadDashboardRoles = useCallback(async () => {
    if (switchInProgress.current) return;
    const requestVersion = ++roleRequestVersion.current;
    setIsLoadingRoles(true);
    setRoleError(null);

    try {
      const nextContext = await auth.loadDashboardRoles();
      if (requestVersion !== roleRequestVersion.current) return;
      setRoleContext(nextContext);
    } catch (error) {
      if (requestVersion !== roleRequestVersion.current) return;
      setRoleError(
        error instanceof Error
          ? error.message
          : "Unable to load your dashboard roles.",
      );
      throw error;
    } finally {
      setIsLoadingRoles(false);
    }
  }, [auth]);

  useEffect(() => {
    if (roleContext.activeRole !== initialRole) {
      return;
    }

    writeLastDashboardPath({
      tenantSlug: normalizedTenantSlug,
      userId,
      role: roleContext.activeRole,
      routeMode,
      path: pathname,
    });
  }, [initialRole, normalizedTenantSlug, pathname, roleContext.activeRole, routeMode, userId]);

  const switchDashboardRole = useCallback(async (authorizationRoleCode: string) => {
    // React state updates alone cannot stop two clicks in the same render frame.
    // Keep this lock until the new document opens, including same-URL hosted switches.
    if (switchInProgress.current) return;
    const normalizedAuthorizationRoleCode = authorizationRoleCode.trim().toLowerCase();
    const selectedOption = roleContext.availableRoles.find(
      (option) => option.authorizationRoleCode.trim().toLowerCase() === normalizedAuthorizationRoleCode,
    );
    if (!selectedOption) {
      const error = new Error("That dashboard is not assigned to your school account.");
      setRoleError(error.message);
      throw error;
    }

    if (
      normalizedAuthorizationRoleCode
      === roleContext.activeAuthorizationRoleCode.trim().toLowerCase()
    ) {
      return;
    }

    switchInProgress.current = true;
    roleRequestVersion.current += 1;
    setSwitchingToAuthorizationRoleCode(selectedOption.authorizationRoleCode);
    setRoleError(null);
    writeLastDashboardPath({
      tenantSlug: normalizedTenantSlug,
      userId,
      role: roleContext.activeRole,
      routeMode,
      path: pathname,
    });

    try {
      const result = await auth.switchRole(selectedOption.authorizationRoleCode);
      const nextContext = result.roleContext ?? result.session.roleContext;

      if (
        !nextContext
        || nextContext.activeRole !== selectedOption.roleCode
        || nextContext.activeAuthorizationRoleCode.trim().toLowerCase()
          !== normalizedAuthorizationRoleCode
      ) {
        throw new Error("The server did not confirm the requested dashboard role.");
      }

      setRoleContext(nextContext);
      const tenantKey = normalizedTenantSlug ?? "session";
      const userKey = userId ?? "session-user";
      await queryClient.cancelQueries({
        queryKey: [
          "school",
          tenantKey,
          userKey,
          roleContext.activeAuthorizationRoleCode,
        ],
      });
      // Do not refetch the outgoing workspace under the newly issued role.
      // The new document creates fresh query and permission caches.

      const targetPath = readLastDashboardPath({
        tenantSlug: normalizedTenantSlug,
        userId,
        role: selectedOption.roleCode,
        routeMode,
      }) ?? getDefaultDashboardRolePath(selectedOption.roleCode, routeMode);
      replaceDashboardDocument(targetPath);
    } catch (error) {
      if (error instanceof ExperienceSessionRequestError && error.status === 401) {
        router.replace(getExpiredSessionLoginPath("school"));
      }

      if (error instanceof ExperienceSessionRequestError && error.status === 403) {
        try {
          setRoleContext(await auth.loadDashboardRoles());
        } catch {
          // Preserve the current authorized dashboard when entitlement refresh fails.
        }
      }

      setRoleError(
        error instanceof Error
          ? error.message
          : "Unable to switch dashboards.",
      );
      switchInProgress.current = false;
      setSwitchingToAuthorizationRoleCode(null);
      throw error;
    }
  }, [auth, normalizedTenantSlug, pathname, queryClient, roleContext, routeMode, router, userId]);

  const effectiveRoleContext = sessionRoleContext
    && sessionRoleContext.activeAuthorizationRoleCode.trim().toLowerCase()
      !== roleContext.activeAuthorizationRoleCode.trim().toLowerCase()
    ? sessionRoleContext
    : roleContext;

  const value = useMemo<SchoolDashboardRoleContextValue>(() => ({
    activeRole: effectiveRoleContext.activeRole,
    activeAuthorizationRoleCode: effectiveRoleContext.activeAuthorizationRoleCode,
    primaryRole: effectiveRoleContext.primaryRole,
    primaryAuthorizationRoleCode: effectiveRoleContext.primaryAuthorizationRoleCode,
    assignedRoles: effectiveRoleContext.assignedRoles,
    assignedAuthorizationRoleCodes: effectiveRoleContext.assignedAuthorizationRoleCodes,
    availableRoles: effectiveRoleContext.availableRoles,
    teacherDashboardEligible: effectiveRoleContext.teacherDashboardEligible,
    tenantSlug: normalizedTenantSlug,
    userId,
    userLabel: auth.session?.userLabel?.trim() || userLabel?.trim() || "School user",
    liveDataEnabled,
    authenticatedSession: auth.session,
    authenticatedUser: auth.user,
    isLoading: auth.isLoading || isLoadingRoles,
    isSwitching: switchingToAuthorizationRoleCode !== null || auth.isSwitchingRole,
    switchingToAuthorizationRoleCode,
    error: roleError,
    clearError: () => setRoleError(null),
    reloadDashboardRoles,
    switchDashboardRole,
  }), [
    auth.isLoading,
    auth.isSwitchingRole,
    auth.session,
    auth.session?.userLabel,
    auth.user,
    isLoadingRoles,
    liveDataEnabled,
    normalizedTenantSlug,
    effectiveRoleContext,
    roleError,
    reloadDashboardRoles,
    switchDashboardRole,
    switchingToAuthorizationRoleCode,
    userId,
    userLabel,
  ]);

  return (
    <SchoolDashboardRoleContext.Provider value={value}>
      {children}
    </SchoolDashboardRoleContext.Provider>
  );
}

export function useSchoolDashboardRole() {
  const value = useContext(SchoolDashboardRoleContext);
  if (!value) {
    throw new Error("useSchoolDashboardRole must be used within SchoolDashboardRoleProvider");
  }

  return value;
}

export function useOptionalSchoolDashboardRole() {
  return useContext(SchoolDashboardRoleContext);
}

export function useOptionalSchoolDashboardActiveRole() {
  return useContext(SchoolDashboardRoleContext)?.activeRole ?? null;
}

export function useOptionalSchoolDashboardAuthorizationRole() {
  return useContext(SchoolDashboardRoleContext)?.activeAuthorizationRoleCode ?? null;
}
