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
  const sessionRoleContext = auth.session?.roleContext;
  const userId = auth.user?.user_id ?? null;
  const normalizedTenantSlug = tenantSlug?.trim() || auth.session?.tenantSlug || null;
  const loadDashboardRoles = useEffectEvent(() => auth.loadDashboardRoles());

  useEffect(() => {
    if (sessionRoleContext) {
      setRoleContext(sessionRoleContext);

      if (sessionRoleContext.activeRole !== initialRole) {
        const targetPath = readLastDashboardPath({
          tenantSlug: normalizedTenantSlug,
          userId,
          role: sessionRoleContext.activeRole,
          routeMode,
        }) ?? getDefaultDashboardRolePath(sessionRoleContext.activeRole, routeMode);
        router.replace(targetPath);
        router.refresh();
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
      if (auth.error) {
        setRoleError(auth.error);
      }
      return;
    }

    let cancelled = false;
    setIsLoadingRoles(true);

    void loadDashboardRoles()
      .then((nextContext) => {
        if (!cancelled) {
          setRoleContext(nextContext);
          setRoleError(null);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
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
  }, [auth.error, auth.isLoading, auth.session, auth.user, liveDataEnabled]);

  const reloadDashboardRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    setRoleError(null);

    try {
      const nextContext = await auth.loadDashboardRoles();
      setRoleContext(nextContext);
    } catch (error) {
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
    const normalizedAuthorizationRoleCode = authorizationRoleCode.trim().toLowerCase();
    const selectedOption = roleContext.availableRoles.find(
      (option) => option.authorizationRoleCode.trim().toLowerCase() === normalizedAuthorizationRoleCode,
    );
    if (!selectedOption) {
      setRoleError("That dashboard is not assigned to your school account.");
      return;
    }

    if (
      normalizedAuthorizationRoleCode
      === roleContext.activeAuthorizationRoleCode.trim().toLowerCase()
    ) {
      return;
    }

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
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: [
            "school",
            tenantKey,
            userKey,
            nextContext.activeAuthorizationRoleCode,
          ],
        }),
        queryClient.invalidateQueries({
          queryKey: [
            "permissions",
            tenantKey,
            userKey,
            nextContext.activeAuthorizationRoleCode,
          ],
        }),
      ]);

      const targetPath = readLastDashboardPath({
        tenantSlug: normalizedTenantSlug,
        userId,
        role: selectedOption.roleCode,
        routeMode,
      }) ?? getDefaultDashboardRolePath(selectedOption.roleCode, routeMode);
      router.replace(targetPath);
      router.refresh();
    } catch (error) {
      if (error instanceof ExperienceSessionRequestError && error.status === 401) {
        router.replace("/school/login?expired=1");
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
      throw error;
    } finally {
      setSwitchingToAuthorizationRoleCode(null);
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
