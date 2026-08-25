import { requestDashboardApi } from "@/lib/dashboard/api-client";

type DashboardPayload = Record<string, unknown>;

function encodePathSegment(value: string) {
  return encodeURIComponent(value);
}

function requestSessionApi<T>(
  path: string,
  method: "GET" | "POST" | "PATCH" = "GET",
  body?: DashboardPayload,
) {
  return requestDashboardApi<T>(path, {
    method,
    ...(body ? { body } : {}),
  });
}

function notificationPath(status?: string) {
  const normalizedStatus = status?.trim();
  return normalizedStatus
    ? `/api/v1/notifications?status=${encodeURIComponent(normalizedStatus)}`
    : "/api/v1/notifications";
}

export const DashboardApi = {
  getFeed: (role: string, limit = 20, offset = 0) =>
    requestSessionApi<unknown[]>(
      `/api/dashboard/feed?role=${encodeURIComponent(role)}&limit=${limit}&offset=${offset}`,
    ),

  getSummary: (role: string) =>
    requestSessionApi<unknown>(`/api/dashboard/communication-summary?role=${encodeURIComponent(role)}`),

  getNotifications: (status?: string) =>
    requestSessionApi<unknown>(notificationPath(status)),
  getNotificationBadges: () =>
    requestSessionApi<unknown>("/api/v1/notifications/badges"),
  markNotificationRead: (id: string) =>
    requestSessionApi<unknown>(`/api/v1/notifications/${encodePathSegment(id)}/read`, "PATCH"),
  markAllNotificationsRead: () =>
    requestSessionApi<unknown>("/api/v1/notifications/read-all", "PATCH"),

  getTasks: () => requestSessionApi<unknown>("/api/tasks"),
  createTask: (data: DashboardPayload) => requestSessionApi<unknown>("/api/tasks", "POST", data),
  completeTask: (id: string) =>
    requestSessionApi<unknown>(`/api/tasks/${encodePathSegment(id)}/complete`, "PATCH"),
  assignTask: (id: string, userId: string) =>
    requestSessionApi<unknown>(`/api/tasks/${encodePathSegment(id)}/assign`, "PATCH", { userId }),

  getApprovals: () => requestSessionApi<unknown>("/api/approvals"),
  createApproval: (data: DashboardPayload) => requestSessionApi<unknown>("/api/approvals", "POST", data),
  approveRequest: (id: string, comment?: string) =>
    requestSessionApi<unknown>(`/api/approvals/${encodePathSegment(id)}/approve`, "POST", {
      ...(comment ? { comment } : {}),
    }),
  rejectRequest: (id: string, reason: string) =>
    requestSessionApi<unknown>(`/api/approvals/${encodePathSegment(id)}/reject`, "POST", {
      reason,
    }),

  createEvent: (data: DashboardPayload) =>
    requestSessionApi<unknown>("/api/workflow/events", "POST", data),
};
