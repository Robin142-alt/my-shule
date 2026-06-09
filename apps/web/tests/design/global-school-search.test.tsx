import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AppTopbar, scopePublicSchoolHref } from "@/components/system/app-topbar";
import { LayoutGrid } from "lucide-react";

import { routerPushMock } from "./router-mock";
import { renderWithProviders } from "./test-utils";

describe("global school search", () => {
  it("scopes school quick actions and search actions to the active role route on public school pages", () => {
    expect(
      scopePublicSchoolHref({
        href: "/library?action=issue",
        pathname: "/school/librarian",
        roleKey: "librarian",
      }),
    ).toBe("/school/librarian/library?action=issue");
    expect(
      scopePublicSchoolHref({
        href: "/inventory?action=receive",
        pathname: "/school/storekeeper",
        roleKey: "storekeeper",
      }),
    ).toBe("/school/storekeeper/inventory?action=receive");
    expect(
      scopePublicSchoolHref({
        href: "/finance?action=record-payment",
        pathname: "/school/accountant",
        roleKey: "accountant",
      }),
    ).toBe("/school/accountant/finance?action=record-payment");
    expect(
      scopePublicSchoolHref({
        href: "/students/MYS-2026-001",
        pathname: "/school/principal",
        roleKey: "principal",
      }),
    ).toBe("/school/principal/students/MYS-2026-001");
  });

  it("surfaces operational entity results with context actions, not only navigation links", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <AppTopbar
        variant="school"
        navItems={[
          {
            id: "dashboard",
            label: "Dashboard",
            href: "/dashboard",
            icon: LayoutGrid,
            group: "Overview",
          },
        ]}
        topLabel="Greenfield Academy school ERP"
        title="Principal Command Center"
        subtitle="Live daily school operations, approvals, alerts, and reports."
        profile={{ name: "Principal Wanjiku", roleLabel: "Principal", contextLabel: "Greenfield Academy" }}
        onOpenSidebar={jest.fn()}
      />,
    );

    await user.click(screen.getByLabelText("Search"));
    await user.type(screen.getByLabelText("Search"), "Brian");

    const panel = await screen.findByTestId("workspace-search-panel");
    expect(within(panel).getByText("Brian Otieno")).toBeVisible();
    expect(within(panel).getByText("Admission No: MYS/2026/001")).toBeVisible();
    expect(within(panel).getByRole("button", { name: /View Fee Balance/i })).toBeVisible();
    expect(within(panel).getByRole("button", { name: /Send Parent SMS/i })).toBeVisible();
  });

  it("executes the first school record action when pressing enter on an entity-only search", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <AppTopbar
        variant="school"
        navItems={[
          {
            id: "dashboard",
            label: "Dashboard",
            href: "/dashboard",
            icon: LayoutGrid,
            group: "Overview",
          },
        ]}
        topLabel="Greenfield Academy school ERP"
        title="Principal Command Center"
        subtitle="Live daily school operations, approvals, alerts, and reports."
        profile={{ name: "Principal Wanjiku", roleLabel: "Principal", contextLabel: "Greenfield Academy" }}
        onOpenSidebar={jest.fn()}
      />,
    );

    await user.type(screen.getByLabelText("Search"), "Brian{enter}");

    expect(routerPushMock).toHaveBeenCalledWith("/students/MYS-2026-001");
  });

  it("renders the operational shell controls required by the ERP docx", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <AppTopbar
        variant="school"
        navItems={[
          {
            id: "dashboard",
            label: "Dashboard",
            href: "/dashboard",
            icon: LayoutGrid,
            group: "Overview",
          },
        ]}
        topLabel="Greenfield Academy school ERP"
        title="Principal Command Center"
        subtitle="Live daily school operations, approvals, alerts, and reports."
        profile={{ name: "Principal Wanjiku", roleLabel: "Principal", contextLabel: "Greenfield Academy" }}
        onOpenSidebar={jest.fn()}
      />,
    );

    expect(screen.getAllByText(/Principal Wanjiku/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Principal")).toBeVisible();
    expect(screen.getByText(/Sync: Live/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /Urgent actions 3/i })).toBeVisible();

    await user.click(screen.getByRole("button", { name: /Quick actions/i }));

    const quickActionsPanel = await screen.findByTestId("workspace-quick-actions-panel");
    expect(within(quickActionsPanel).getByRole("button", { name: /Approve Results/i })).toBeVisible();
    expect(within(quickActionsPanel).getByRole("button", { name: /Approve Budget/i })).toBeVisible();
    expect(within(quickActionsPanel).getByRole("button", { name: /Send Announcement/i })).toBeVisible();
    expect(within(quickActionsPanel).getByRole("button", { name: /Generate Board Report/i })).toBeVisible();
    expect(within(quickActionsPanel).queryByRole("button", { name: /Add Student/i })).not.toBeInTheDocument();
  });

  it("opens urgent school actions instead of rendering the urgent button as decoration", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <AppTopbar
        variant="school"
        navItems={[]}
        topLabel="Greenfield Academy school ERP"
        title="Principal Command Center"
        subtitle="Live daily school operations, approvals, alerts, and reports."
        profile={{ name: "Principal Wanjiku", roleLabel: "Principal", contextLabel: "Greenfield Academy" }}
        onOpenSidebar={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Urgent actions 3/i }));

    const urgentPanel = await screen.findByTestId("workspace-urgent-actions-panel");
    expect(within(urgentPanel).getByRole("button", { name: /Attendance follow-up/i })).toBeVisible();
    expect(within(urgentPanel).getByRole("button", { name: /Fee reminders/i })).toBeVisible();
    expect(within(urgentPanel).getByRole("button", { name: /Approval queue/i })).toBeVisible();
  });

  it("marks backend notifications read before opening their related school record", async () => {
    const user = userEvent.setup();
    const onNotificationOpen = jest.fn();

    renderWithProviders(
      <AppTopbar
        variant="school"
        navItems={[]}
        topLabel="Greenfield Academy school ERP"
        title="Principal Command Center"
        subtitle="Live daily school operations, approvals, alerts, and reports."
        profile={{ name: "Principal Wanjiku", roleLabel: "Principal", contextLabel: "Greenfield Academy" }}
        notifications={[
          {
            id: "notification-1",
            title: "Fee reversal requested",
            detail: "Receipt KBI-RCPT-400 needs approval.",
            timeLabel: "now",
            tone: "warning",
            href: "/finance?record=approval-400",
          },
        ]}
        onNotificationOpen={onNotificationOpen}
        onOpenSidebar={jest.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    const panel = await screen.findByTestId("workspace-notifications-panel");
    await user.click(within(panel).getByRole("button", { name: /Fee reversal requested/i }));

    expect(onNotificationOpen).toHaveBeenCalledWith(
      expect.objectContaining({ id: "notification-1" }),
    );
    expect(routerPushMock).toHaveBeenCalledWith("/finance?record=approval-400");
  });
});
