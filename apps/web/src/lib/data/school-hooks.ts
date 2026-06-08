"use client";

import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";

export class PermissionDeniedError extends Error {
  constructor(message = "Permission denied") {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export class TenantMismatchError extends Error {
  constructor(message = "Tenant scope mismatch") {
    super(message);
    this.name = "TenantMismatchError";
  }
}

interface SchoolQueryOptions<T>
  extends Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn"> {
  tenantId?: string;
}

/**
 * Reusable data fetching hook scoped to the active tenant/school.
 * Enforces `tenantId` in the queryKey.
 */
export function useSchoolQuery<T>(path: string, options?: SchoolQueryOptions<T>) {
  const activeTenantId = options?.tenantId || getCurrentSchoolId();

  return useQuery<T, Error>({
    queryKey: ["school", activeTenantId, path],
    queryFn: async () => {
      if (!activeTenantId) {
        throw new Error("Missing active school context");
      }

      try {
        return await requestDashboardApi<T>(path, { tenantId: activeTenantId });
      } catch (err: unknown) {
        if (err instanceof Error && err.message?.includes("403")) throw new PermissionDeniedError();
        throw err;
      }
    },
    ...options,
  });
}

/**
 * Reusable data mutation hook scoped to the active tenant/school.
 */
export function useSchoolMutation<TData, TVariables>(
  path: string | ((vars: TVariables) => string),
  method: "POST" | "PATCH" = "POST",
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn"> & {
    tenantId?: string;
  }
) {
  const activeTenantId = options?.tenantId || getCurrentSchoolId();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      if (!activeTenantId) {
        throw new Error("Missing active school context");
      }

      const resolvedPath = typeof path === "function" ? path(variables) : path;
      try {
        return await requestDashboardApi<TData>(resolvedPath, {
          method,
          tenantId: activeTenantId,
          body: variables as Record<string, unknown>,
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message?.includes("403")) throw new PermissionDeniedError();
        throw err;
      }
    },
    ...options,
  });
}
