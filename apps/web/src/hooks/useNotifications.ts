"use client";

import { useCallback, useMemo, useState } from "react";

import { useDashboardCommunicationQuery } from "@/hooks/use-dashboard-communication-query";
import { DashboardApi } from "@/lib/client/dashboard-api";

export type DashboardNotificationStatus =
  | "UNREAD"
  | "READ"
  | "ACTION_REQUIRED"
  | "ACTION_TAKEN"
  | "DISMISSED"
  | "EXPIRED"
  | "FAILED";

export type DashboardNotification = {
  id: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT" | null;
  status: DashboardNotificationStatus;
  module: string | null;
  actionUrl: string | null;
  actionLabel: string | null;
  createdAt: string | null;
};

export type NotificationBadges = {
  unreadCount: number;
  urgentCount: number;
  byModule: Record<string, number>;
};

function toError(error: unknown) {
  return error instanceof Error ? error : new Error("Notification request failed.");
}

function payloadItems(payload: unknown) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  for (const key of ["notifications", "data", "items"] as const) {
    const value = (payload as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

function normalizeStatus(value: unknown, isRead: boolean): DashboardNotificationStatus {
  const normalized = typeof value === "string" ? value.toUpperCase() : "";
  if (
    normalized === "UNREAD"
    || normalized === "READ"
    || normalized === "ACTION_REQUIRED"
    || normalized === "ACTION_TAKEN"
    || normalized === "DISMISSED"
    || normalized === "EXPIRED"
    || normalized === "FAILED"
  ) {
    return normalized;
  }
  return isRead ? "READ" : "UNREAD";
}

function normalizePriority(value: unknown): DashboardNotification["priority"] {
  const normalized = typeof value === "string" ? value.toUpperCase() : "";
  return normalized === "LOW" || normalized === "NORMAL" || normalized === "HIGH" || normalized === "URGENT"
    ? normalized
    : null;
}

export function normalizeNotifications(payload: unknown): DashboardNotification[] {
  return payloadItems(payload).flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const notification = candidate as Record<string, unknown>;
    const idValue = notification.id ?? notification.notification_id;
    const titleValue = notification.title ?? notification.subject;
    const id = typeof idValue === "string" ? idValue.trim() : "";
    const title = typeof titleValue === "string" ? titleValue.trim() : "";

    if (!id || !title) return [];

    const explicitRead = notification.is_read ?? notification.read;
    const status = normalizeStatus(notification.status, Boolean(explicitRead));
    const isRead = status !== "UNREAD" && status !== "ACTION_REQUIRED";
    const messageValue = notification.message ?? notification.body;
    const actionUrlValue = notification.actionUrl ?? notification.action_url;
    const actionLabelValue = notification.actionLabel ?? notification.action_label;
    const createdAtValue = notification.createdAt ?? notification.created_at;

    return [{
      id,
      title,
      message: typeof messageValue === "string" ? messageValue : "",
      is_read: isRead,
      priority: normalizePriority(notification.priority),
      status,
      module: typeof notification.module === "string" ? notification.module : null,
      actionUrl: typeof actionUrlValue === "string" && actionUrlValue.trim() ? actionUrlValue : null,
      actionLabel: typeof actionLabelValue === "string" && actionLabelValue.trim() ? actionLabelValue : null,
      createdAt: typeof createdAtValue === "string" && createdAtValue.trim() ? createdAtValue : null,
    }];
  });
}

function notificationQueryPath(status?: string) {
  const normalized = status?.trim();
  return normalized
    ? `/api/v1/notifications?status=${encodeURIComponent(normalized)}`
    : "/api/v1/notifications";
}

export function useNotifications(status?: "UNREAD" | "ACTION_REQUIRED") {
  const normalizedStatus = status?.trim();
  const queryPath = notificationQueryPath(normalizedStatus);
  const query = useDashboardCommunicationQuery<unknown>(
    queryPath,
    () => DashboardApi.getNotifications(normalizedStatus),
  );
  const [mutationError, setMutationError] = useState<Error | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const notifications = useMemo(() => normalizeNotifications(query.data), [query.data]);

  const refetch = useCallback(async () => {
    setMutationError(null);
    return query.refetch();
  }, [query]);

  const markAsRead = useCallback(async (id: string) => {
    setMutationError(null);
    setPendingIds((current) => new Set(current).add(id));
    try {
      await DashboardApi.markNotificationRead(id);
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

  const markAllAsRead = useCallback(async () => {
    setMutationError(null);
    setIsMarkingAllRead(true);
    try {
      await DashboardApi.markAllNotificationsRead();
      await query.refetch();
    } catch (error) {
      const normalizedError = toError(error);
      setMutationError(normalizedError);
      throw normalizedError;
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [query]);

  const unreadCount = notifications.filter((notification) => !notification.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    mutationError,
    pendingIds,
    isMarkingAllRead,
    markAsRead,
    markAllAsRead,
    refetch,
  };
}

function normalizeBadges(payload: unknown): NotificationBadges {
  const candidate = payload && typeof payload === "object" && "data" in payload
    ? (payload as { data: unknown }).data
    : payload;

  if (!candidate || typeof candidate !== "object") {
    throw new Error("Notification badge response was invalid.");
  }

  const record = candidate as Record<string, unknown>;
  const unreadCount = Number(record.unreadCount);
  const urgentCount = Number(record.urgentCount);
  const rawByModule = record.byModule;

  if (!Number.isInteger(unreadCount) || unreadCount < 0 || !Number.isInteger(urgentCount) || urgentCount < 0) {
    throw new Error("Notification badge counts were invalid.");
  }

  if (!rawByModule || typeof rawByModule !== "object" || Array.isArray(rawByModule)) {
    throw new Error("Notification module badges were invalid.");
  }

  const byModule = Object.fromEntries(
    Object.entries(rawByModule).flatMap(([moduleName, count]) => {
      const normalizedCount = Number(count);
      return Number.isInteger(normalizedCount) && normalizedCount >= 0
        ? [[moduleName, normalizedCount]]
        : [];
    }),
  );

  return { unreadCount, urgentCount, byModule };
}

export function useNotificationBadges() {
  const query = useDashboardCommunicationQuery<NotificationBadges>(
    "/api/v1/notifications/badges",
    async () => normalizeBadges(await DashboardApi.getNotificationBadges()),
    { refetchInterval: 30_000 },
  );

  return {
    badges: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
