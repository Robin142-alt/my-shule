import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolShell } from "@/components/layouts/school-shell";

import { routerPushMock } from "./router-mock";
import { renderWithProviders } from "./test-utils";

const mockGetNotifications = jest.fn();
const mockGetNotificationBadges = jest.fn();
const mockMarkNotificationRead = jest.fn();
const mockMarkAllNotificationsRead = jest.fn();

jest.mock("@/lib/client/dashboard-api", () => ({
  DashboardApi: {
    getNotifications: (...args: unknown[]) => mockGetNotifications(...args),
    getNotificationBadges: (...args: unknown[]) => mockGetNotificationBadges(...args),
    markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
    markAllNotificationsRead: (...args: unknown[]) => mockMarkAllNotificationsRead(...args),
  },
}));

jest.mock("@/lib/auth/school-dashboard-role-context", () => ({
  useOptionalSchoolDashboardRole: () => ({
    tenantSlug: "kisumu-boys",
    userId: "principal-1",
    activeAuthorizationRoleCode: "principal",
  }),
}));

describe("SchoolShell search", () => {
  beforeEach(() => {
    mockGetNotifications.mockReset().mockResolvedValue([
      {
        id: "server-notification-1",
        title: "Server attendance alert",
        message: "Review the attendance follow-up queue.",
        status: "UNREAD",
        priority: "NORMAL",
      },
    ]);
    mockGetNotificationBadges.mockReset().mockResolvedValue({
      unreadCount: 1,
      urgentCount: 0,
      byModule: { attendance: 1 },
    });
    mockMarkNotificationRead.mockReset().mockResolvedValue({ status: "READ" });
    mockMarkAllNotificationsRead.mockReset().mockResolvedValue({ count: 1 });
  });

  it("does not synthesize a student record when no live school search result exists", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchoolShell
        role="principal"
        schoolName="Kisumu Boys High School"
        schoolCounty="Kisumu"
        userName="Principal Wanjiku"
        userRole="Principal"
      >
        <main>Dashboard content</main>
      </SchoolShell>,
    );

    await user.type(screen.getByRole("searchbox", { name: /school search/i }), "Brian");

    expect(screen.getByText(/No school records found for/)).toBeVisible();
    expect(screen.queryByText("Brian Otieno")).not.toBeInTheDocument();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("does not expose broad global search to role dashboards that should only see their desk", () => {
    renderWithProviders(
      <SchoolShell
        role="teacher"
        schoolName="Kisumu Boys High School"
        schoolCounty="Kisumu"
        userName="Mr. Otieno"
        userRole="Teacher"
      >
        <main>Teacher content</main>
      </SchoolShell>,
    );

    expect(screen.queryByRole("searchbox", { name: /school search/i })).not.toBeInTheDocument();
  });

  it("does not expose broad global search to admin dashboards", () => {
    renderWithProviders(
      <SchoolShell
        role="admin"
        schoolName="Kisumu Boys High School"
        schoolCounty="Kisumu"
        userName="Admin User"
        userRole="Admin"
      >
        <main>Admin content</main>
      </SchoolShell>,
    );

    expect(screen.queryByRole("searchbox", { name: /school search/i })).not.toBeInTheDocument();
  });

  it("does not offer a fabricated payment action when no live payment result exists", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchoolShell
        role="accountant"
        schoolName="Kisumu Boys High School"
        schoolCounty="Kisumu"
        userName="Mrs. Achieng"
        userRole="Accountant"
      >
        <main>Accountant content</main>
      </SchoolShell>,
    );

    await user.type(screen.getByRole("searchbox", { name: /school search/i }), "QEX7ABC123");

    expect(screen.getByText(/No school records found for/)).toBeVisible();
    expect(screen.queryByText("M-Pesa QEX7ABC123")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /retry callback verification/i })).not.toBeInTheDocument();
    expect(routerPushMock).not.toHaveBeenCalled();
  });

  it("opens school notifications and account settings instead of leaving topbar buttons inert", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <SchoolShell
        role="principal"
        schoolName="Kisumu Boys High School"
        schoolCounty="Kisumu"
        userName="Principal Wanjiku"
        userRole="Principal"
      >
        <main>Dashboard content</main>
      </SchoolShell>,
    );

    await user.click(screen.getByRole("button", { name: /open school notifications/i }));
    expect(await screen.findByText("Server attendance alert")).toBeVisible();
    expect(mockGetNotifications).toHaveBeenCalledWith("UNREAD");

    await user.click(screen.getByRole("button", { name: /Principal Wanjiku/i }));
    expect(routerPushMock).toHaveBeenCalledWith("/school/principal/settings");
  });
});
