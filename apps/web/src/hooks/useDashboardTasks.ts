"use client";

import { useCallback, useMemo, useState } from "react";

import { useDashboardCommunicationQuery } from "@/hooks/use-dashboard-communication-query";
import { DashboardApi } from "@/lib/client/dashboard-api";

export type DashboardTask = {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string;
};

function payloadItems(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of ["tasks", "data", "items"] as const) {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeDashboardTasks(payload: unknown): DashboardTask[] {
  return payloadItems(payload).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const task = candidate as Record<string, unknown>;
    const idValue = task.id ?? task.task_id;
    const titleValue = task.title ?? task.name;
    const id = typeof idValue === "string" ? idValue.trim() : "";
    const title = typeof titleValue === "string" ? titleValue.trim() : "";
    if (!id || !title) return [];

    return [{
      id,
      title,
      description: typeof task.description === "string" ? task.description : undefined,
      due_date: typeof task.due_date === "string"
        ? task.due_date
        : typeof task.dueDate === "string"
          ? task.dueDate
          : undefined,
      status: typeof task.status === "string" ? task.status.toLowerCase() : "open",
    }];
  });
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error("Task request failed.");
}

export function useDashboardTasks() {
  const query = useDashboardCommunicationQuery<unknown>("/api/tasks", DashboardApi.getTasks);
  const [mutationError, setMutationError] = useState<Error | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const tasks = useMemo(() => normalizeDashboardTasks(query.data), [query.data]);

  const completeTask = useCallback(async (id: string) => {
    setMutationError(null);
    setPendingIds((current) => new Set(current).add(id));
    try {
      await DashboardApi.completeTask(id);
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

  return {
    tasks,
    isLoading: query.isLoading,
    error: query.error,
    mutationError,
    pendingIds,
    completeTask,
    refetch: query.refetch,
  };
}
