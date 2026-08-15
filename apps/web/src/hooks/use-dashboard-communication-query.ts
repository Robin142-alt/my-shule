"use client";

import { useQuery, type UseQueryOptions } from "@tanstack/react-query";

import { useOptionalSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import { buildSchoolQueryKey } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";

type DashboardCommunicationQueryOptions<T> = Omit<
  UseQueryOptions<T, Error>,
  "queryKey" | "queryFn"
>;

export function useDashboardCommunicationQuery<T>(
  path: string,
  queryFn: () => Promise<T>,
  options?: DashboardCommunicationQueryOptions<T>,
) {
  const scopedTenantId = useOptionalSchoolTenantId();
  const dashboardRole = useOptionalSchoolDashboardRole();
  const tenantId = scopedTenantId?.trim() || dashboardRole?.tenantSlug?.trim() || null;
  const userId = dashboardRole?.userId?.trim() || null;
  const authorizationRole = dashboardRole?.activeAuthorizationRoleCode?.trim() || null;
  const identityVerified = Boolean(tenantId && userId && authorizationRole);
  const { enabled = true, ...queryOptions } = options ?? {};

  return useQuery<T, Error>({
    queryKey: buildSchoolQueryKey(
      tenantId ?? "unverified-tenant",
      userId ?? "unverified-user",
      authorizationRole ?? "unverified-role",
      path,
    ),
    queryFn,
    retry: 1,
    retryDelay: 250,
    staleTime: 15_000,
    ...queryOptions,
    enabled: identityVerified && enabled,
  });
}
