import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { NotificationDrawer } from "@/components/common/notifications/notification-drawer";
import { NotificationBell } from "@/components/shared/notification-bell";
import { useApprovals } from "@/hooks/useApprovals";
import { useDashboardTasks } from "@/hooks/useDashboardTasks";
import { useNotificationBadges, useNotifications } from "@/hooks/useNotifications";
import { buildSchoolQueryKey } from "@/lib/data/school-hooks";
import { SchoolTenantScopeProvider } from "@/lib/data/school-tenant-scope";

const mockGetNotifications = jest.fn();
const mockGetNotificationBadges = jest.fn();
const mockMarkNotificationRead = jest.fn();
const mockMarkAllNotificationsRead = jest.fn();
const mockGetTasks = jest.fn();
const mockCompleteTask = jest.fn();
const mockGetApprovals = jest.fn();
const mockApproveRequest = jest.fn();
const mockRejectRequest = jest.fn();
let mockRoleContext: { activeAuthorizationRoleCode: string; userId: string; tenantSlug: string } | null = null;

jest.mock("@/lib/client/dashboard-api", () => ({
  DashboardApi: {
    getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
    getNotificationBadges: (...args: unknown[]) => mockGetNotificationBadges(...args),
    markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
    markAllNotificationsRead: (...args: unknown[]) => mockMarkAllNotificationsRead(...args),
    getTasks: (...args: unknown[]) => mockGetTasks(...args),
    completeTask: (...args: unknown[]) => mockCompleteTask(...args),
    getApprovals: (...args: unknown[]) => mockGetApprovals(...args),
    approveRequest: (...args: unknown[]) => mockApproveRequest(...args),
    rejectRequest: (...args: unknown[]) => mockRejectRequest(...args),
  },
}));

jest.mock("@/lib/auth/school-dashboard-role-context", () => ({
  useOptionalSchoolDashboardRole: () => mockRoleContext,
}));

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function createWrapper(queryClient: QueryClient, tenantId: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <SchoolTenantScopeProvider tenantId={tenantId}>{children}</SchoolTenantScopeProvider>
      </QueryClientProvider>
    );
  };
}

function renderWithScope(node: ReactNode, tenantId = "school-a") {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <SchoolTenantScopeProvider tenantId={tenantId}>{node}</SchoolTenantScopeProvider>
    </QueryClientProvider>,
  );
}

describe("shared topbar communication", () => {
  beforeEach(() => {
    mockGetNotifications.mockReset();
    mockGetNotificationBadges.mockReset();
    mockMarkNotificationRead.mockReset();
    mockMarkAllNotificationsRead.mockReset();
    mockGetTasks.mockReset();
    mockCompleteTask.mockReset();
    mockGetApprovals.mockReset();
    mockApproveRequest.mockReset();
    mockRejectRequest.mockReset();
    mockRoleContext = {
      activeAuthorizationRoleCode: "principal",
      userId: "user-1",
      tenantSlug: "school-a",
    };
    mockGetNotificationBadges.mockResolvedValue({ unreadCount: 0, urgentCount: 0, byModule: {} });
    mockMarkAllNotificationsRead.mockResolvedValue({ count: 0 });
  });

  it("keeps notification caches isolated by tenant, user, and active role", async () => {
    const queryClient = createQueryClient();
    mockGetNotifications
      .mockResolvedValueOnce([{ id: "principal-notice", title: "Principal notice", status: "UNREAD" }])
      .mockResolvedValueOnce([{ id: "teacher-notice", title: "Teacher notice", status: "UNREAD" }])
      .mockResolvedValueOnce([{ id: "school-b-notice", title: "School B notice", status: "UNREAD" }]);

    const principalHook = renderHook(() => useNotifications(), {
      wrapper: createWrapper(queryClient, "school-a"),
    });
    await waitFor(() => expect(principalHook.result.current.notifications[0]?.id).toBe("principal-notice"));
    principalHook.unmount();

    mockRoleContext = {
      activeAuthorizationRoleCode: "teacher",
      userId: "user-1",
      tenantSlug: "school-a",
    };
    const teacherHook = renderHook(() => useNotifications(), {
      wrapper: createWrapper(queryClient, "school-a"),
    });
    await waitFor(() => expect(teacherHook.result.current.notifications[0]?.id).toBe("teacher-notice"));
    teacherHook.unmount();

    mockRoleContext = {
      activeAuthorizationRoleCode: "teacher",
      userId: "user-2",
      tenantSlug: "school-b",
    };
    const schoolBHook = renderHook(() => useNotifications(), {
      wrapper: createWrapper(queryClient, "school-b"),
    });
    await waitFor(() => expect(schoolBHook.result.current.notifications[0]?.id).toBe("school-b-notice"));

    expect(queryClient.getQueryData(buildSchoolQueryKey("school-a", "user-1", "principal", "/api/v1/notifications")))
      .toEqual([{ id: "principal-notice", title: "Principal notice", status: "UNREAD" }]);
    expect(queryClient.getQueryData(buildSchoolQueryKey("school-a", "user-1", "teacher", "/api/v1/notifications")))
      .toEqual([{ id: "teacher-notice", title: "Teacher notice", status: "UNREAD" }]);
    expect(queryClient.getQueryData(buildSchoolQueryKey("school-b", "user-2", "teacher", "/api/v1/notifications")))
      .toEqual([{ id: "school-b-notice", title: "School B notice", status: "UNREAD" }]);
  });

  it("does not load communication data before tenant, user, and active role are verified", async () => {
    mockRoleContext = null;
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(queryClient, "school-a"),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetNotifications).not.toHaveBeenCalled();
    expect(result.current.notifications).toEqual([]);
  });

  it("retains an unread notification when marking it read fails", async () => {
    mockGetNotifications.mockResolvedValue([
      { id: "notice-1", title: "Fee reminder", message: "Balance due", status: "UNREAD" },
    ]);
    mockMarkNotificationRead.mockRejectedValue(new Error("Request failed: 403 — Permission denied"));
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useNotifications(), {
      wrapper: createWrapper(queryClient, "school-a"),
    });
    await waitFor(() => expect(result.current.notifications).toHaveLength(1));

    await act(async () => {
      await expect(result.current.markAsRead("notice-1")).rejects.toThrow("403");
    });

    expect(result.current.notifications).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "notice-1", is_read: false }),
    ]));
    expect(result.current.unreadCount).toBe(1);
    expect(result.current.mutationError?.message).toContain("403");
    expect(mockGetNotifications).toHaveBeenCalledTimes(1);
  });

  it("retains a task when completion is rejected by the server", async () => {
    mockGetTasks.mockResolvedValue([{ id: "task-1", title: "Review attendance", status: "open" }]);
    mockCompleteTask.mockRejectedValue(new Error("Request failed: 403 — Task not permitted"));
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useDashboardTasks(), {
      wrapper: createWrapper(queryClient, "school-a"),
    });
    await waitFor(() => expect(result.current.tasks).toHaveLength(1));

    await act(async () => {
      await expect(result.current.completeTask("task-1")).rejects.toThrow("403");
    });

    expect(result.current.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "task-1", status: "open" }),
    ]));
    expect(result.current.mutationError?.message).toContain("Task not permitted");
    expect(mockGetTasks).toHaveBeenCalledTimes(1);
  });

  it("retains an approval when the decision mutation fails", async () => {
    mockGetApprovals.mockResolvedValue([{ id: "approval-1", title: "Fee waiver", reason: "Hardship" }]);
    mockApproveRequest.mockRejectedValue(new Error("Request failed: 403 — Approval not permitted"));
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useApprovals(), {
      wrapper: createWrapper(queryClient, "school-a"),
    });
    await waitFor(() => expect(result.current.approvals).toHaveLength(1));

    await act(async () => {
      await expect(result.current.approve("approval-1", "user-1")).rejects.toThrow("403");
    });

    expect(result.current.approvals).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "approval-1", title: "Fee waiver" }),
    ]));
    expect(result.current.mutationError?.message).toContain("Approval not permitted");
    expect(mockGetApprovals).toHaveBeenCalledTimes(1);
  });

  it.each([401, 403])("shows a visible %s read error and retry action", async (status) => {
    mockGetNotifications.mockRejectedValue(new Error(`Request failed: ${status} — Session denied`));
    renderWithScope(<NotificationBell />);

    const trigger = await screen.findByRole("button", { name: "Notifications unavailable" }, { timeout: 3_000 });
    await userEvent.click(trigger);

    expect(await screen.findByRole("alert")).toHaveTextContent(`Request failed: ${status}`);
    expect(screen.getByRole("button", { name: "Retry" })).toBeVisible();
    expect(screen.queryByText("No notifications yet")).not.toBeInTheDocument();
  });

  it("keeps the common drawer record and badge callback unchanged after a failed mutation", async () => {
    mockGetNotifications.mockResolvedValue([
      { id: "notice-2", title: "Attendance follow-up", status: "UNREAD", priority: "HIGH" },
    ]);
    mockMarkNotificationRead.mockRejectedValue(new Error("Request failed: 403 — Not permitted"));
    const onNotificationUpdate = jest.fn();
    renderWithScope(
      <NotificationDrawer basePath="/school/principal" onClose={jest.fn()} onNotificationUpdate={onNotificationUpdate} />,
    );

    expect(await screen.findByText("Attendance follow-up")).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Mark Attendance follow-up as read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Not permitted");
    expect(screen.getByText("Attendance follow-up")).toBeVisible();
    expect(onNotificationUpdate).not.toHaveBeenCalled();
  });

  it("does not synthesize unread badges when the badge request fails", async () => {
    mockGetNotificationBadges.mockRejectedValue(new Error("Request failed: 401 — Sign in required"));
    const queryClient = createQueryClient();
    const { result } = renderHook(() => useNotificationBadges(), {
      wrapper: createWrapper(queryClient, "school-a"),
    });

    await waitFor(() => expect(result.current.error?.message).toContain("401"), { timeout: 3_000 });
    expect(result.current.badges).toBeNull();
  });
});
