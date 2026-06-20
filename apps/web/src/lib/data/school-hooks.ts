
"use client";

import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation";

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
export function useSchoolQuery<T>(path: string | null, options?: SchoolQueryOptions<T>) {
  const activeTenantId = options?.tenantId || getCurrentSchoolId();
  const queryTenantId = activeTenantId || "session";

  return useQuery<T, Error>({
    queryKey: ["school", queryTenantId, path],
    queryFn: async () => {
      if (!path) return null as T;

      try {
        return await requestDashboardApi<T>(path, {
          ...(activeTenantId ? { tenantId: activeTenantId } : {}),
        });
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
  method: "POST" | "PATCH" | "DELETE" | "PUT" = "POST",
  options?: Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn"> & {
    tenantId?: string;
  }
) {
  const activeTenantId = options?.tenantId || getCurrentSchoolId();

  // Helper to safely extract a module name from the path for the sync queue
  const getModuleAndAction = (resolvedPath: string) => {
    try {
      // Typically paths look like "/api/students/enroll" or "students/enroll"
      const clean = resolvedPath.startsWith('/api/') ? resolvedPath.replace('/api/', '') : resolvedPath;
      const parts = clean.split('/');
      return {
        module: parts[0] || 'global',
        action: clean,
      };
    } catch {
      return { module: 'global', action: 'unknown' };
    }
  };

  return useOfflineMutation<TData, Error, TVariables>({
    module: typeof path === "string" ? getModuleAndAction(path).module : "dynamic",
    action: typeof path === "string" ? getModuleAndAction(path).action : "dynamic",
    schoolId: activeTenantId || "session",
    mutationFn: async (variables) => {
      const resolvedPath = typeof path === "function" ? path(variables) : path;
      try {
        return await requestDashboardApi<TData>(resolvedPath, {
          method,
          ...(activeTenantId ? { tenantId: activeTenantId } : {}),
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
