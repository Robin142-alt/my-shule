"use client";

import { useCallback } from "react";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { TenantMismatchError } from "@/lib/data/school-hooks";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";

type DashboardApiOptions = NonNullable<
  Parameters<typeof requestDashboardApi>[1]
>;

type PrincipalDashboardRequest = <T>(
  path: string,
  options?: Omit<DashboardApiOptions, "tenantId">,
) => Promise<T>;

/**
 * Binds every Principal mutation to the verified school scope supplied by
 * SchoolPages. The request is rejected before reaching the network if that
 * boundary is unavailable, instead of falling back to an ambient session.
 */
export function useVerifiedPrincipalDashboardApi(): PrincipalDashboardRequest {
  const tenantId = useOptionalSchoolTenantId();

  return useCallback(
    <T,>(
      path: string,
      options?: Omit<DashboardApiOptions, "tenantId">,
    ): Promise<T> => {
      const verifiedTenantId = tenantId?.trim();

      if (!verifiedTenantId) {
        return Promise.reject(
          new TenantMismatchError(
            "A verified school context is required before changing Principal records",
          ),
        );
      }

      return requestDashboardApi<T>(path, {
        ...options,
        tenantId: verifiedTenantId,
      });
    },
    [tenantId],
  );
}
