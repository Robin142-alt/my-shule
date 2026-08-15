"use client";

import { useCallback, useMemo, useState } from "react";

import { useDashboardCommunicationQuery } from "@/hooks/use-dashboard-communication-query";
import { DashboardApi } from "@/lib/client/dashboard-api";

export type DashboardApproval = {
  id: string;
  title: string;
  reason?: string;
};

function normalizeApprovals(payload: unknown): DashboardApproval[] {
  const items = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { approvals?: unknown }).approvals)
      ? (payload as { approvals: unknown[] }).approvals
      : payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)
        ? (payload as { data: unknown[] }).data
        : [];

  return items.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const approval = candidate as Record<string, unknown>;
    const id = typeof approval.id === "string" ? approval.id.trim() : "";
    const title = typeof approval.title === "string" ? approval.title.trim() : "";
    if (!id || !title) return [];
    return [{
      id,
      title,
      reason: typeof approval.reason === "string" ? approval.reason : undefined,
    }];
  });
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error("Approval request failed.");
}

export function useApprovals() {
  const query = useDashboardCommunicationQuery<unknown>("/api/approvals", DashboardApi.getApprovals);
  const [mutationError, setMutationError] = useState<Error | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const approvals = useMemo(() => normalizeApprovals(query.data), [query.data]);

  const runDecision = useCallback(async (
    id: string,
    decision: () => Promise<unknown>,
  ) => {
    setMutationError(null);
    setPendingIds((current) => new Set(current).add(id));
    try {
      await decision();
      await query.refetch();
    } catch (error) {
      const normalizedError = toError(error);
      setMutationError(normalizedError);
      throw normalizedError;
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }, [query]);

  const approve = useCallback((id: string, comment?: string) =>
    runDecision(id, () => DashboardApi.approveRequest(id, comment)), [runDecision]);

  const reject = useCallback((id: string, reason: string) =>
    runDecision(id, () => DashboardApi.rejectRequest(id, reason)), [runDecision]);

  return {
    approvals,
    isLoading: query.isLoading,
    error: query.error,
    mutationError,
    pendingIds,
    approve,
    reject,
    refetch: query.refetch,
  };
}
