"use client";

import { useEffect } from "react";
import { useQueryClient, type UseMutationOptions } from "@tanstack/react-query";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useOptionalAuth } from "@/lib/auth/auth-context";
import { useOptionalSchoolTenantId } from "@/lib/data/school-tenant-scope";
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";
import { syncPendingLaboratoryOperations, type QueuedLaboratoryRequest } from "./laboratory-sync";

function stableRequestBody(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableRequestBody);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableRequestBody(entry)]),
  );
}

export function createLaboratoryQueueDedupeKey(
  method: QueuedLaboratoryRequest["method"],
  path: string,
  requestBody: Record<string, unknown>,
) {
  const submissionId = requestBody.submission_id;
  return typeof submissionId === "string" && submissionId.trim()
    ? `${method}:${path}:${submissionId.trim()}`
    : `${method}:${path}:body:${JSON.stringify(stableRequestBody(requestBody))}`;
}

export function useLaboratoryMutation<TData, TVariables>({
  action,
  method = "POST",
  path,
  body,
  ...options
}: {
  action: string;
  method?: "POST" | "PATCH" | "PUT" | "DELETE";
  path: string | ((variables: TVariables) => string);
  body?: (variables: TVariables) => Record<string, unknown>;
} & Omit<UseMutationOptions<TData, Error, TVariables>, "mutationFn">) {
  const scopedTenantId = useOptionalSchoolTenantId();
  const schoolId = (scopedTenantId || getCurrentSchoolId()).trim();
  const actorUserId = useOptionalAuth()?.user?.id?.trim() ?? "";
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!schoolId || !actorUserId) return;
    const sync = () => {
      if (typeof navigator !== "undefined" && !navigator.onLine) return;
      void syncPendingLaboratoryOperations(schoolId, actorUserId).then(({ synced }) => {
        if (synced > 0) void queryClient.invalidateQueries({ queryKey: ["school", schoolId] });
      });
    };
    if (typeof navigator !== "undefined" && navigator.onLine) sync();
    window.addEventListener("online", sync);
    return () => {
      window.removeEventListener("online", sync);
    };
  }, [actorUserId, queryClient, schoolId]);

  return useOfflineMutation<TData, Error, TVariables, unknown>({
    module: "labs",
    action,
    schoolId,
    mutationFn: (variables) => requestDashboardApi<TData>(
      typeof path === "function" ? path(variables) : path,
      {
        method,
        tenantId: schoolId,
        body: body ? body(variables) : variables as Record<string, unknown>,
      },
    ),
    offlinePayload: (variables): QueuedLaboratoryRequest => ({
      __laboratory_request: true,
      path: typeof path === "function" ? path(variables) : path,
      method,
      body: body ? body(variables) : variables as Record<string, unknown>,
    }),
    queueDedupeKey: (variables) => {
      const requestPath = typeof path === "function" ? path(variables) : path;
      const requestBody = body ? body(variables) : variables as Record<string, unknown>;
      return createLaboratoryQueueDedupeKey(method, requestPath, requestBody);
    },
    queueServerFailures: true,
    requireAuthenticatedQueueActor: true,
    queryKeysToInvalidate: [["school", schoolId]],
    ...options,
  });
}

export function isPendingSync(value: unknown): value is { _offline: true } {
  return Boolean(value && typeof value === "object" && "_offline" in value && (value as { _offline?: boolean })._offline);
}

export function createSubmissionId(prefix: string) {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}:${random}`;
}
