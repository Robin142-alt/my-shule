import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { SuperadminPages } from "@/components/platform/superadmin-pages";
import { SchoolPages } from "@/components/school/school-pages";
import { StorekeeperWorkspace } from "@/components/storekeeper/storekeeper-workspace";
import { PlatformSupportWorkspace } from "@/components/support/platform-support-workspace";
import {
  adminSupportSidebarItems,
  supportSidebarItems,
  type SupportMessage,
  type SupportTicket,
} from "@/lib/support/support-data";
import { isSuperadminPublicSection } from "@/lib/routing/superadmin-sections";

import { renderWithProviders } from "./test-utils";

const mockAddSupportInternalNoteLive = jest.fn();
const mockCreateSupportTicketLive = jest.fn();
const mockEscalateSupportTicketLive = jest.fn();
const mockFetchKnowledgeBaseLive = jest.fn();
const mockFetchSupportNotificationDeadLettersLive = jest.fn();
const mockFetchSupportAnalyticsLive = jest.fn();
const mockFetchSupportCategoriesLive = jest.fn();
const mockFetchSupportTicketDetailLive = jest.fn();
const mockFetchSupportTicketsLive = jest.fn();
const mockFetchSystemStatusLive = jest.fn();
const mockMergeSupportTicketLive = jest.fn();
const mockReplyToSupportTicketLive = jest.fn();
const mockUpdateSupportTicketStatusLive = jest.fn();
const mockUploadSupportAttachmentLive = jest.fn();
const mockCreatePlatformSchool = jest.fn();
const mockDeletePlatformSchool = jest.fn();
const mockFetchPlatformSchools = jest.fn();
const mockResendPlatformSchoolAdminInvite = jest.fn();

jest.mock("@/lib/dashboard/api-client", () => ({
  isDashboardApiConfigured: () => true,
}));

jest.mock("@/lib/platform/school-onboarding-client", () => ({
  createPlatformSchool: (...args: unknown[]) => mockCreatePlatformSchool(...args),
  deletePlatformSchool: (...args: unknown[]) => mockDeletePlatformSchool(...args),
  fetchPlatformSchools: (...args: unknown[]) => mockFetchPlatformSchools(...args),
  resendPlatformSchoolAdminInvite: (...args: unknown[]) => mockResendPlatformSchoolAdminInvite(...args),
}));

jest.mock("@/lib/support/support-live", () => ({
  addSupportInternalNoteLive: (...args: unknown[]) => mockAddSupportInternalNoteLive(...args),
  createSupportTicketLive: (...args: unknown[]) => mockCreateSupportTicketLive(...args),
  escalateSupportTicketLive: (...args: unknown[]) => mockEscalateSupportTicketLive(...args),
  fetchKnowledgeBaseLive: (...args: unknown[]) => mockFetchKnowledgeBaseLive(...args),
  fetchSupportNotificationDeadLettersLive: (...args: unknown[]) => mockFetchSupportNotificationDeadLettersLive(...args),
  fetchSupportAnalyticsLive: (...args: unknown[]) => mockFetchSupportAnalyticsLive(...args),
  fetchSupportCategoriesLive: (...args: unknown[]) => mockFetchSupportCategoriesLive(...args),
  fetchSupportTicketDetailLive: (...args: unknown[]) => mockFetchSupportTicketDetailLive(...args),
  fetchSupportTicketsLive: (...args: unknown[]) => mockFetchSupportTicketsLive(...args),
  fetchSystemStatusLive: (...args: unknown[]) => mockFetchSystemStatusLive(...args),
  mergeSupportTicketLive: (...args: unknown[]) => mockMergeSupportTicketLive(...args),
  replyToSupportTicketLive: (...args: unknown[]) => mockReplyToSupportTicketLive(...args),
  updateSupportTicketStatusLive: (...args: unknown[]) => mockUpdateSupportTicketStatusLive(...args),
  uploadSupportAttachmentLive: (...args: unknown[]) => mockUploadSupportAttachmentLive(...args),
}));

jest.setTimeout(20_000);

function buildSupportTicket(overrides: Partial<SupportTicket> = {}): SupportTicket {
  return {
    id: "ticket-live-001",
    ticketNumber: "SUP-2026-000145",
    tenantId: "tenant-live-001",
    tenantSlug: "barakaacademy",
    schoolName: "Live school workspace",
    subject: "Critical callback reconciliation failure",
    category: "MPESA",
    priority: "Critical",
    moduleAffected: "MPESA",
    description: "Callbacks are queued for support triage.",
    status: "Escalated",
    owner: "Support escalation desk",
    requester: "School admin",
    updatedAt: "now",
    firstResponseDue: "15 minutes",
    resolutionDue: "4 hours",
    context: {
      requestId: "req-live-support-001",
      browser: "Chrome 124",
      device: "Windows laptop",
      pageUrl: "/school/admin/mpesa",
      appVersion: "2026.05.08",
      errorLogs: ["No client errors captured in the last 5 minutes"],
    },
    attachments: [],
    messages: [
      {
        id: "msg-001",
        author: "School admin",
        authorType: "school",
        body: "Callbacks are not reconciling for several receipts.",
        createdAt: "now",
      },
    ],
    internalNotes: [
      {
        id: "note-001",
        author: "Support agent",
        body: "Bug confirmed. Deploying fix tonight.",
        createdAt: "now",
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();

  mockFetchPlatformSchools.mockResolvedValue([]);
  mockCreatePlatformSchool.mockResolvedValue({
    tenant_id: "green-valley",
    school_name: "Green Valley School",
    subdomain: "green-valley",
    status: "active",
    invitation_sent: false,
    invitation_status: "queued",
    invitation_message: "School created. The admin invite is queued for delivery.",
    can_resend_invite: true,
    invite_expires_at: "2026-05-24T00:00:00.000Z",
    admin_email: "principal@example.test",
    created_at: "2026-05-17T00:00:00.000Z",
  });
  mockResendPlatformSchoolAdminInvite.mockResolvedValue({
    tenant_id: "green-valley",
    school_name: "Green Valley School",
    subdomain: "green-valley",
    status: "active",
    invitation_sent: true,
    invitation_status: "sent",
    invitation_message: "School created. Invitation sent to principal@example.test.",
    can_resend_invite: false,
    invite_expires_at: "2026-05-24T00:00:00.000Z",
    admin_email: "principal@example.test",
    created_at: "2026-05-17T00:00:00.000Z",
  });
  mockDeletePlatformSchool.mockResolvedValue({
    tenant_id: "green-valley",
    deleted: true,
    deprovisioned: false,
    message: "Green Valley School was permanently deleted because it had no operational records.",
    usage_summary: {
      memberships: 1,
      students: 0,
      invoices: 0,
      support_tickets: 0,
      mpesa_transactions: 0,
    },
  });
  mockFetchSupportTicketsLive.mockResolvedValue([]);
  mockFetchSupportCategoriesLive.mockResolvedValue([
    "Finance",
    "MPESA",
    "Exams",
    "Timetable",
    "Inventory",
    "Library",
    "Login Issues",
    "Subscription",
    "Reports",
    "Performance",
    "Bug Report",
    "Feature Request",
  ]);
  mockFetchKnowledgeBaseLive.mockResolvedValue([]);
  mockFetchSupportNotificationDeadLettersLive.mockResolvedValue([]);
  mockFetchSystemStatusLive.mockResolvedValue({ components: [], incidents: [] });
  mockFetchSupportAnalyticsLive.mockResolvedValue({
    metrics: [
      { id: "unresolved", label: "Unresolved tickets", value: "1", helper: "Backed by the support ticket database" },
      { id: "breach", label: "SLA breach risk", value: "1", helper: "Critical ticket first response due soon" },
      { id: "critical", label: "Critical tickets", value: "1", helper: "Instant escalation and support visibility" },
      { id: "response", label: "Median first response", value: "8m", helper: "Live support analytics" },
    ],
    recurringIssues: ["Recurring MPESA callback failures"],
    heatmap: [{ day: "Mon", tickets: 1 }],
  });
});

describe("enterprise support workspace", () => {
  it("exposes the required school and admin support sidebar modules", () => {
    expect(supportSidebarItems.map((item) => item.label)).toEqual([
      "New Ticket",
      "My Tickets",
      "Knowledge Base",
      "System Status",
    ]);

    expect(adminSupportSidebarItems.map((item) => item.label)).toEqual([
      "All Tickets",
      "Open",
      "In Progress",
      "Escalated",
      "Resolved",
      "SLA Monitoring",
      "Support Analytics",
    ]);
  });

  it("keeps superadmin SMS settings and quick actions on valid public platform routes", async () => {
    renderWithProviders(createElement(SuperadminPages, { section: "overview", routeMode: "public" }));

    expect(isSuperadminPublicSection("sms-settings")).toBe(true);
    expect(await screen.findByRole("link", { name: /sms settings/i })).toHaveAttribute(
      "href",
      "/superadmin/sms-settings",
    );
    expect(screen.getByRole("link", { name: /create school/i })).toHaveAttribute(
      "href",
      "/superadmin/schools",
    );
    expect(screen.getByRole("link", { name: /open support/i })).toHaveAttribute(
      "href",
      "/superadmin/support",
    );
    expect(screen.getByRole("link", { name: /review audit logs/i })).toHaveAttribute(
      "href",
      "/superadmin/audit-logs",
    );
  });

  it("renders distinct platform support workspaces for status, SLA, and analytics routes", async () => {
    const views = [
      { view: "support-open", title: /open ticket intake/i, queue: /unassigned and newly opened tickets/i },
      { view: "support-in-progress", title: /active support work/i, queue: /tickets currently being worked/i },
      { view: "support-escalated", title: /escalated incidents/i, queue: /escalated ticket queue/i },
      { view: "support-resolved", title: /resolved tickets/i, queue: /resolved ticket history/i },
      { view: "support-sla", title: /sla monitoring/i, queue: /tickets at sla risk/i },
      { view: "support-analytics", title: /support analytics/i, queue: /module heatmap/i },
    ] as const;

    for (const item of views) {
      const { unmount } = renderWithProviders(
        createElement(PlatformSupportWorkspace, { defaultView: item.view }),
      );

      expect(await screen.findByRole("heading", { name: item.title })).toBeVisible();
      const matches = await screen.findAllByText(item.queue);
      expect(matches.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("shows queued invitation status after school creation instead of treating email delay as school failure", async () => {
    const user = userEvent.setup();

    renderWithProviders(createElement(SuperadminPages, { section: "schools", routeMode: "public" }));

    await user.click(screen.getByRole("button", { name: /create school/i }));
    fireEvent.change(screen.getByLabelText(/school name/i), {
      target: { value: "Green Valley School" },
    });
    fireEvent.change(screen.getByLabelText(/school url slug/i), {
      target: { value: "green-valley" },
    });
    fireEvent.change(screen.getByLabelText(/administrator name/i), {
      target: { value: "Principal User" },
    });
    fireEvent.change(screen.getByLabelText(/administrator email/i), {
      target: { value: "principal@example.test" },
    });
    await user.click(screen.getByRole("button", { name: /create and invite/i }));

    expect(
      await screen.findByText(/school created\. the admin invite is queued for delivery/i),
    ).toBeVisible();
    expect(mockCreatePlatformSchool).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "green-valley",
        adminEmail: "principal@example.test",
      }),
    );
  });

  it("lets the platform owner resend a failed school admin invite immediately after creation", async () => {
    const user = userEvent.setup();

    mockCreatePlatformSchool.mockResolvedValueOnce({
      tenant_id: "green-valley",
      school_name: "Green Valley School",
      subdomain: "green-valley",
      status: "active",
      invitation_sent: false,
      invitation_status: "failed",
      invitation_message: "School created. The invite could not be delivered yet. You can resend it.",
      invite_expires_at: "2026-05-24T00:00:00.000Z",
      admin_email: "principal@example.test",
      created_at: "2026-05-17T00:00:00.000Z",
    });

    renderWithProviders(createElement(SuperadminPages, { section: "schools", routeMode: "public" }));

    await user.click(screen.getByRole("button", { name: /create school/i }));
    fireEvent.change(screen.getByLabelText(/school name/i), {
      target: { value: "Green Valley School" },
    });
    fireEvent.change(screen.getByLabelText(/school url slug/i), {
      target: { value: "green-valley" },
    });
    fireEvent.change(screen.getByLabelText(/administrator name/i), {
      target: { value: "Principal User" },
    });
    fireEvent.change(screen.getByLabelText(/administrator email/i), {
      target: { value: "principal@example.test" },
    });
    await user.click(screen.getByRole("button", { name: /create and invite/i }));

    expect(await screen.findByText(/invite could not be delivered yet/i)).toBeVisible();
    await user.click(screen.getByRole("button", { name: /resend invite now/i }));

    expect(mockResendPlatformSchoolAdminInvite).toHaveBeenCalledWith("green-valley");
    expect((await screen.findAllByText(/invitation sent to principal@example\.test/i)).length).toBeGreaterThan(0);
  });

  it("shows a direct resend action on tenant rows with unsent admin invites", async () => {
    const user = userEvent.setup();

    mockFetchPlatformSchools.mockResolvedValueOnce([
      {
        tenant_id: "green-valley",
        school_name: "Green Valley School",
        subdomain: "green-valley",
        status: "active",
        invitation_sent: false,
        invitation_status: "failed",
        invitation_message: "School created. The invite could not be delivered yet. You can resend it.",
        invite_expires_at: "2026-05-24T00:00:00.000Z",
        admin_email: "principal@example.test",
        created_at: "2026-05-17T00:00:00.000Z",
      },
    ]);

    renderWithProviders(createElement(SuperadminPages, { section: "schools", routeMode: "public" }));

    expect((await screen.findAllByText("Green Valley School")).length).toBeGreaterThan(0);
    const [resendButton] = screen.getAllByRole("button", {
      name: /resend invite to green valley school/i,
    });
    expect(resendButton).toBeTruthy();
    await user.click(resendButton!);

    expect(mockResendPlatformSchoolAdminInvite).toHaveBeenCalledWith("green-valley");
    expect((await screen.findAllByText(/invitation sent to principal@example\.test/i)).length).toBeGreaterThan(0);
  });

  it("stops pointless resend loops when school invites are blocked by email provider setup", async () => {
    mockFetchPlatformSchools.mockResolvedValueOnce([
      {
        tenant_id: "green-valley",
        school_name: "Green Valley School",
        subdomain: "green-valley",
        status: "active",
        invitation_sent: false,
        invitation_status: "blocked",
        invitation_message: "School created, but invite delivery is blocked by email provider setup.",
        invitation_failure_code: "resend_domain_not_verified",
        invitation_action_required:
          "Verify a Resend sending domain, set EMAIL_FROM to an address on that domain, redeploy, then resend the invite.",
        can_resend_invite: false,
        invite_expires_at: "2026-05-24T00:00:00.000Z",
        admin_email: "principal@example.test",
        created_at: "2026-05-17T00:00:00.000Z",
      },
    ]);

    renderWithProviders(createElement(SuperadminPages, { section: "schools", routeMode: "public" }));

    expect(await screen.findByText(/school invites are blocked by email provider setup/i)).toBeVisible();
    const [blockedResendButton] = screen.getAllByRole("button", {
      name: /resend invite to green valley school/i,
    });
    expect(blockedResendButton).toBeDisabled();
    expect(mockResendPlatformSchoolAdminInvite).not.toHaveBeenCalled();
  });

  it("lets the platform owner delete an empty failed-invite school through a guarded confirmation", async () => {
    const user = userEvent.setup();

    mockFetchPlatformSchools.mockResolvedValueOnce([
      {
        tenant_id: "green-valley",
        school_name: "Green Valley School",
        subdomain: "green-valley",
        status: "active",
        invitation_sent: false,
        invitation_status: "failed",
        invitation_message: "School created. The invite could not be delivered yet. You can resend it.",
        can_resend_invite: true,
        invite_expires_at: "2026-05-24T00:00:00.000Z",
        admin_email: "principal@example.test",
        created_at: "2026-05-17T00:00:00.000Z",
      },
    ]);

    renderWithProviders(createElement(SuperadminPages, { section: "schools", routeMode: "public" }));

    expect((await screen.findAllByText("Green Valley School")).length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole("button", { name: /^delete$/i })[0]!);
    const dialog = await screen.findByRole("dialog", { name: /delete school/i });

    fireEvent.change(within(dialog).getByLabelText(/type green-valley to confirm/i), {
      target: { value: "green-valley" },
    });
    fireEvent.change(within(dialog).getByLabelText(/audit reason/i), {
      target: { value: "Duplicate test tenant" },
    });
    await user.click(within(dialog).getByRole("button", { name: /delete or deprovision/i }));

    expect(mockDeletePlatformSchool).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "green-valley",
        confirmation: "green-valley",
        reason: "Duplicate test tenant",
        hardDeleteEmptyTenant: true,
      }),
    );
    expect(await screen.findByText(/permanently deleted/i)).toBeVisible();
    await waitFor(() => {
      expect(screen.queryAllByText("Green Valley School")).toHaveLength(0);
    });
  });

  it("keeps the dedicated storekeeper dashboard focused on inventory operations", () => {
    renderWithProviders(createElement(StorekeeperWorkspace, { section: "dashboard" }));

    expect(screen.getByRole("heading", { name: /storekeeper store desk/i })).toBeVisible();
    expect(screen.getByRole("searchbox", { name: /search this store desk/i })).toBeVisible();
    expect(screen.getAllByRole("button", { name: /receive stock/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /issue stock/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: /new ticket/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /system status/i })).not.toBeInTheDocument();
  });

  it("lets a school create and track a critical support ticket with captured context", async () => {
    const user = userEvent.setup();
    const createdTicket = buildSupportTicket({
      id: "ticket-created-001",
      ticketNumber: "SUP-2026-000001",
      internalNotes: [],
    });

    mockCreateSupportTicketLive.mockImplementation(async (input) =>
      buildSupportTicket({
        ...createdTicket,
        tenantSlug: input.tenantSlug,
        subject: input.subject,
        category: input.category,
        priority: input.priority,
        moduleAffected: input.moduleAffected,
        description: input.description,
        status: input.priority === "Critical" ? "Escalated" : "Open",
        context: {
          ...createdTicket.context,
          browser: input.browser,
          device: input.device,
          pageUrl: input.currentPageUrl,
          appVersion: input.appVersion,
          errorLogs: input.errorLogs,
        },
      }),
    );
    mockUploadSupportAttachmentLive.mockResolvedValue({
      id: "attachment-001",
      name: "mpesa-callback.log",
      type: "text/plain",
      size: "12 B",
      storedPath: "tenant/barakaacademy/support/SUP-2026-000001/mpesa-callback.log",
    });

    renderWithProviders(
      createElement(SchoolPages, {
        role: "principal",
        tenantSlug: "barakaacademy",
        section: "support-new-ticket",
      }),
    );

    expect(screen.getByRole("heading", { name: /support center/i })).toBeVisible();
    expect(await screen.findByText(/support connected/i)).toBeVisible();
    expect(screen.getByRole("link", { name: /new ticket/i })).toHaveAttribute(
      "href",
      "/support-new-ticket",
    );

    fireEvent.change(screen.getByLabelText(/ticket subject/i), {
      target: { value: "MPESA receipts not matching learners" },
    });
    await user.selectOptions(screen.getByLabelText(/category/i), "MPESA");
    await user.selectOptions(screen.getByLabelText(/priority/i), "Critical");
    await user.selectOptions(screen.getByLabelText(/module affected/i), "MPESA");
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Parents are paying but callbacks remain unmatched in the finance workspace." },
    });
    await user.upload(
      screen.getByLabelText(/attachments/i),
      new File(["callback log"], "mpesa-callback.log", { type: "text/plain" }),
    );
    await user.click(screen.getByRole("button", { name: /submit ticket/i }));

    expect(await screen.findByText(/ticket sup-2026-/i)).toBeVisible();
    expect(screen.getAllByText(/Escalated/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Chrome/i)).toBeVisible();
    expect(screen.getByText(/tenant\/barakaacademy\/support\//i)).toBeVisible();
  });

  it("gives support agents a global queue with replies, escalation, internal notes, SLA, and analytics", async () => {
    const user = userEvent.setup();
    const liveTicket = buildSupportTicket();
    const supportReply: SupportMessage = {
      id: "msg-reply-001",
      author: "Support agent",
      authorType: "support",
      body: "We have patched the callback worker and are replaying unmatched receipts.",
      createdAt: "now",
    };

    mockFetchSupportTicketsLive.mockResolvedValue([liveTicket]);
    mockFetchSupportTicketDetailLive.mockResolvedValue(liveTicket);
    mockFetchSupportNotificationDeadLettersLive.mockResolvedValue([
      {
        id: "notification-dead-001",
        ticketNumber: "SUP-2026-000145",
        schoolName: "Live school workspace",
        title: "Critical support ticket raised: SUP-2026-000145",
        channel: "email",
        attempts: 3,
        error: "SMTP rejected recipient",
        createdAt: "May 11, 06:00 PM",
      },
    ]);
    mockReplyToSupportTicketLive.mockResolvedValue({
      ticket: { ...liveTicket, status: "Waiting for School" },
      message: supportReply,
    });

    renderWithProviders(createElement(SuperadminPages, { section: "support" }));

    expect(screen.getByRole("heading", { name: /all support tickets/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /sla monitoring/i })).toHaveAttribute(
      "href",
      "/support-sla",
    );
    expect(await screen.findByText(/Recurring MPESA callback failures/i)).toBeVisible();
    expect(screen.getAllByText(/SLA breach risk/i).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Notification dead letters/i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/SMTP rejected recipient/i)).toBeVisible();

    const openButtons = await screen.findAllByRole("button", { name: /open sup-2026-000145/i });
    await user.click(openButtons[0]!);

    const dialog = await screen.findByRole("dialog", { name: /support ticket/i });
    expect(within(dialog).getByText(/Internal notes/i)).toBeVisible();
    expect(within(dialog).getByText(/Bug confirmed. Deploying fix tonight./i)).toBeVisible();

    fireEvent.change(within(dialog).getByLabelText(/support reply/i), {
      target: { value: "We have patched the callback worker and are replaying unmatched receipts." },
    });
    await user.click(within(dialog).getByRole("button", { name: /send reply/i }));

    expect(
      await within(dialog).findByText(/patched the callback worker/i),
    ).toBeVisible();
    expect(screen.getAllByText(/Waiting for School/i).length).toBeGreaterThan(0);
  });
});
