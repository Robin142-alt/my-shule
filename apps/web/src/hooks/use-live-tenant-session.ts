"use client";

import { useExperienceSession } from "@/lib/auth/use-experience-session";
import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import type { LiveAuthSession } from "@/lib/dashboard/api-client";
import { isDashboardApiConfigured } from "@/lib/dashboard/api-client";

export function useLiveTenantSession(tenantId: string) {
  const apiConfigured = isDashboardApiConfigured();
  const dashboardRoleState = useOptionalSchoolDashboardRole();
  const scopedTenantId = dashboardRoleState?.tenantSlug?.trim() || tenantId;
  const authSession = useExperienceSession("school", {
    tenantSlug: scopedTenantId,
    autoLoad: apiConfigured && !dashboardRoleState,
  });
  const gatewaySession = dashboardRoleState?.authenticatedSession ?? authSession.session;
  const gatewayUser = dashboardRoleState?.authenticatedUser ?? authSession.user;

  const session: LiveAuthSession | null = gatewaySession
    ? {
        tenantId: gatewaySession.tenantSlug ?? scopedTenantId,
        user: gatewaySession.user,
      }
    : null;

  return {
    apiConfigured,
    session,
    user: gatewayUser,
    isLoading: apiConfigured
      ? (dashboardRoleState?.isLoading ?? authSession.isLoading)
      : false,
    isSubmitting: authSession.isSubmitting,
    error: dashboardRoleState?.error ?? authSession.error,
    login: async (email: string, password: string) => {
      await authSession.login({
        identifier: email,
        password,
        tenantSlug: scopedTenantId,
      });
    },
    logout: authSession.logout,
    clearError: authSession.clearError,
  };
}
