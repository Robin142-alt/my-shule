import fs from "node:fs";
import path from "node:path";

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

import { renderWithProviders } from "./test-utils";
import { routerPushMock } from "./router-mock";
import { isSchoolSection } from "@/lib/routing/experience-routes";
import { isProductionReadyModule } from "@/lib/features/module-readiness";

jest.mock("@/lib/dashboard/api-client", () => ({
  ...jest.requireActual("@/lib/dashboard/api-client"),
  requestDashboardApi: jest.fn(),
}));

jest.mock("@/components/dashboard/dashboard-engine", () => ({
  DashboardEngine: () => <div data-testid="principal-live-dashboard-engine">Live school widgets</div>,
}));

const requestDashboardApiMock = jest.mocked(requestDashboardApi);

const activeStudentId = "00000000-0000-4000-8000-000000000411";

const canonicalResponses: Record<string, unknown> = {
  "/admin-command/principal/students": {
    status: "active", totalStudents: 412, boys: 201, girls: 211,
    populationTrend: [],
    recentAdmissions: [{ id: activeStudentId, name: "Amina Wanjiku", class: "Grade 9", gender: "Female", admission_date: "2026-09-09" }],
  },
  "/admin-command/principal/dashboard": {
    tenant_id: "fixture-tenant",
    generated_at: "2026-08-22T07:00:00.000Z",
    enabled_modules: ["academics", "finance", "attendance"],
    alerts: [],
    notifications: [],
    realtime_channels: [],
  },
  "/admin-command/principal/school-profile": {
    status: "active",
    schoolName: "Maranda High",
    subdomain: "maranda-high",
    motto: "Knowledge and service",
    county: "Siaya",
    subCounty: "Bondo",
    ward: "Central Sakwa",
    address: "School Lane",
    website: "",
    registrationStatus: "active",
    curriculum: "CBC",
    schoolType: "secondary",
    logoUrl: null,
    contactInfo: { email: "office@maranda.example", phone: "+254700000411" },
  },
  "/admin-command/principal/overview": {
    status: "active",
    totalStudents: 412,
    totalStaff: 38,
    activeIssues: 2,
    pendingApprovals: 3,
    recentActivity: [],
  },
  "/admin-command/principal/setup-checklist": {
    status: "setup_required",
    overallProgress: 33,
    tasks: [
      { id: "profile", title: "Complete School Profile", completed: true, group: "General" },
      { id: "leadership", title: "Add Principal and Deputy", completed: true, group: "General" },
      { id: "term", title: "Configure Academic Term", completed: false, group: "Academics" },
      { id: "grading", title: "Configure Grading System", completed: false, group: "Academics" },
      { id: "subjects", title: "Register Subjects", completed: false, group: "Academics" },
      { id: "students", title: "Add Students", completed: false, group: "Data Entry" },
    ],
  },
  "/admin-command/principal/academic-setup": {
    status: "setup_required",
    activeTerm: "Not Configured",
    weeksRemaining: 0,
    gradingsConfigured: false,
    subjectsRegistered: 0,
    teachersAssigned: 0,
    pendingConfigurations: 2,
    recentChanges: [],
  },
  "/admin-command/principal/classes": {
    status: "setup_required",
    totalClasses: 0,
    totalStreams: 0,
    averageClassSize: 0,
    capacityUtilization: 0,
    classDistribution: [],
    recentAdjustments: [],
  },
  "/admin-command/principal/subjects": {
    status: "setup_required",
    totalSubjects: 0,
    coreSubjects: 0,
    electiveSubjects: 0,
    departments: 0,
    subjectDistribution: [],
    departmentHeads: [],
  },
  "/admin-command/principal/finance-overview": {
    status: "active",
    collectionsToday: "KES 12,500",
    outstandingInvoices: "KES 4,000",
    collectionData: [],
    pendingWaivers: [],
  },
  "/admin-command/principal/attendance": {
    status: "active",
    presentToday: 400,
    absentToday: 8,
    lateToday: 4,
    chronicAbsenteeism: 0,
    attendanceTrend: [],
    recentAbsences: [],
    students: [],
  },
  "/admin-command/principal/discipline": {
    status: "active",
    openCases: 0,
    criticalCases: 0,
    escalations: 0,
    incidentTrend: [],
    recentIncidents: [],
    students: [],
  },
  "/admin-command/principal/academics": {
    status: "active",
    activeAssignments: 7,
    syllabusCoverage: 64,
    averageScore: 71,
    performanceTrend: [],
    departmentPerformance: [],
  },
  "/admin-command/principal/staff": {
    status: "active",
    totalStaff: 38,
    teachingStaff: 31,
    supportStaff: 7,
    onLeave: 0,
    staffDistribution: [],
    recentOnboarding: [],
  },
  "/admin-command/principal/approvals": {
    status: "active",
    pendingTotal: 0,
    urgentApprovals: 0,
    categories: [],
    requests: [],
    recentApprovals: [],
  },
  "/admin-command/principal/reports": {
    status: "active",
    availableReports: 0,
    favoriteReports: 0,
    recentlyGenerated: 0,
    categories: [],
    scheduledReports: [],
  },
  "/admin-command/principal/exams": {
    status: "active",
    activeExams: 0,
    reportsPending: 0,
    missingMarksAlerts: 0,
    averageScore: 0,
    performanceTrend: [],
    recentResults: [],
  },
  "/admin-command/principal/settings": {
    status: "active",
    updatedAt: "2026-08-22T07:00:00.000Z",
    notifications: { emailAlerts: true, smsAlerts: false, dailyDigest: true },
    dashboard: { theme: "system", showTeachingWorkspace: false, defaultView: "overview" },
    security: { twoFactorAuth: true, lastPasswordChange: "2026-07-15T09:30:00.000Z" },
  },
  "/admin-command/principal/visitors": {
    status: "active",
    metrics: { checkedInToday: 3, currentlyOnPremises: 1, checkedOutToday: 2, flagged: 0 },
    visitors: [
      {
        id: "visitor-1",
        name: "Jane Guest",
        purpose: "Parent meeting",
        host: "Teacher A",
        checkedInAt: "2026-08-22 08:00",
        checkedOutAt: null,
        status: "Active",
      },
    ],
  },
  "/admin-command/principal/health": {
    status: "active",
    metrics: {
      visitsToday: 4,
      openCases: 1,
      referredToday: 1,
      lowStockMedicines: 1,
      outOfStockMedicines: 1,
      expiringSoon: 0,
    },
    stockAlerts: [
      {
        id: "medicine-1",
        medicine: "Paracetamol",
        quantity: 0,
        reorderLevel: 20,
        expiryDate: "2026-10-01",
        status: "Out of stock",
      },
    ],
  },
  "/admin-command/principal/audit-logs": {
    status: "active",
    metrics: { actionsToday: 8, sensitiveChanges: 2, failedActions: 1 },
    events: [
      {
        id: "audit-1",
        action: "approval.rejected",
        actor: "Principal A",
        resourceType: "approval_request",
        createdAt: "2026-08-22 09:00",
        result: "Rejected",
      },
    ],
  },
  "/admin-command/boarding-master/overview": {
    metrics: { total_boarders: 120, hostels: 4, incidents_open: 2, on_leave: 3 },
    overviewList: [{ id: "boarding-summary", metric: "Occupied beds", value: "120" }],
  },
  "/admin-command/transport-manager/overview": {
    metrics: { total_vehicles: 6, active_routes: 4, students_transported: 90, trips_today: 8 },
    overviewList: [{ id: "transport-summary", metric: "Trips today", value: "8" }],
  },
  "/admin-command/librarian/overview": {
    metrics: { total_books: 600, books_issued: 40, overdue_count: 3, active_borrowers: 35, fines_pending: 2, books_available: 560 },
    recent_activity: [],
  },
  "/academics/academic-years": [],
  "/academics/academic-terms": [],
  "/academics/grading-systems": [],
  "/academics/attendance-settings": [],
  "/academics/report-card-settings": [],
  "/academics/class-sections": [],
  "/academics/class-teachers": [],
  "/academics/subjects": [],
  "/academics/departments": [],
  "/academics/teachers": [],
  "/finance/fee-categories": [],
  "/students?status=active&limit=200": [
    {
      id: activeStudentId,
      admission_number: "MHS-0411",
      first_name: "Achieng",
      middle_name: null,
      last_name: "Otieno",
      metadata: { current_class_name: "Grade 8 East" },
    },
  ],
};

describe("principal production readiness", () => {
  let originalFetch: typeof global.fetch;
  let responseOverrides: Map<string, unknown>;
  let unresolvedPaths: Set<string>;

  beforeEach(() => {
    jest.clearAllMocks();
    responseOverrides = new Map();
    unresolvedPaths = new Set();
    originalFetch = global.fetch;
    global.fetch = jest.fn(async (input) => {
      const url = String(input);
      if (url.startsWith("/api/permissions/me?schoolId=")) {
        return {
          ok: true,
          json: async () => ({
            data: ["academics:write", "exams:read", "exams:write", "exams:publish", "finance:write", "principal:write", "reports:write", "students:read"],
          }),
        } as Response;
      }

      return {
        ok: true,
        json: async () => ({ data: [] }),
      } as Response;
    }) as typeof global.fetch;

    requestDashboardApiMock.mockImplementation(async (path, options) => {
      if (unresolvedPaths.has(path)) {
        return new Promise(() => undefined);
      }

      if (options?.method && options.method !== "GET") {
        return { success: true } as never;
      }

      if (responseOverrides.has(path)) {
        return responseOverrides.get(path) as never;
      }

      if (path === "/admin-command/principal/school-profile") {
        const tenantId = options?.tenantId ?? "school";
        return {
          ...(canonicalResponses[path] as Record<string, unknown>),
          schoolName: tenantId === "maranda-high" ? "Maranda High" : tenantId
            .split("-")
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(" "),
          subdomain: tenantId,
        } as never;
      }

      return (canonicalResponses[path] ?? []) as never;
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("renders authoritative same-school overview counts without demo or cross-tenant records", async () => {
    renderWithProviders(
      <SchoolPages
        role="principal"
        tenantSlug="maranda-high"
        userLabel="Principal Wanjiku"
      />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    const studentMetric = (await within(commandCenter).findByText("Total Students")).parentElement;
    const staffMetric = within(commandCenter).getByText("Total Staff").parentElement;

    expect(within(commandCenter).getAllByText(/Maranda High/i).length).toBeGreaterThan(0);
    expect(studentMetric).toHaveTextContent("412");
    expect(staffMetric).toHaveTextContent("38");
    expect(within(commandCenter).getByText("Pending Approvals").parentElement).toHaveTextContent("3");
    expect(within(commandCenter).queryByText(/Kisumu Boys|KSh 248,500/i)).not.toBeInTheDocument();
    expect(within(commandCenter).getByTestId("principal-live-dashboard-engine")).toBeVisible();
    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/admin-command/principal/overview",
      expect.objectContaining({ tenantId: "maranda-high" }),
    );
  });

  it("keeps the required Principal sidebar order and child hierarchy", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages role="principal" section="dashboard" tenantSlug="maranda-high" routeMode="public" />,
    );

    const sidebar = await screen.findByRole("navigation", { name: "Principal dashboard sidebar" });
    const topLevelLabels = Array.from(sidebar.querySelectorAll("button, a"))
      .filter((item) => !item.closest('[role="group"]') && item.textContent?.trim())
      .map((item) => item.textContent?.trim());
    expect(topLevelLabels).toEqual([
      "Overview", "Approvals", "Academic Intelligence", "Exams & Report Cards", "Communication",
      "Master Timetable", "Fees & Finance", "Students", "Academics", "Staff", "Parents & Visitors",
      "Transport", "Library", "Users & Invitations", "Reports", "Audit Logs", "School Setup", "Settings",
    ]);
    expect(within(sidebar).getByRole("link", { name: "Students" })).toHaveAttribute("href", "/school/principal/students");

    for (const [label, toggleName, children] of [
      ["Fees & Finance", "Fees & Finance", ["Fees"]],
      ["Students", "Expand Students", ["Attendance", "Discipline", "Sick Bay", "Boarding"]],
      ["Academics", "Academics", ["Academic Calendar", "Classes & Streams", "Subjects & Departments", "Teacher Allocations"]],
      ["School Setup", "Expand School Setup", ["School Profile"]],
    ] as const) {
      const toggle = within(sidebar).getByRole("button", { name: toggleName });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      await user.click(toggle);
      const group = within(sidebar).getByRole("group", { name: label });
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(toggle).toHaveAttribute("aria-controls", group.id);
      expect(within(group).getAllByRole("button").map((item) => item.textContent)).toEqual(children);
      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(within(sidebar).queryByRole("group", { name: label })).not.toBeInTheDocument();
    }
  });

  it.each([
    "dashboard", "overview", "principal-overview", "students", "timetable", "approvals",
    "academic-intelligence", "exams", "exams-reports", "exams-report-cards", "communication",
    "finance", "finance-overview", "fees", "attendance-monitoring", "discipline",
    "clinic", "sick-bay", "boarding", "academic-setup", "classes-streams", "subjects-departments",
    "academics", "staff", "staff-roles", "visitors", "parents", "transport", "library",
    "users-invitations", "reports", "audit-logs", "setup-checklist", "school-profile", "settings",
    "subjects", "academic-analytics",
  ])("loads Principal %s directly in the current dashboard", async (section) => {
    expect(isSchoolSection(section)).toBe(true);
    expect(isProductionReadyModule(section)).toBe(true);
    renderWithProviders(<SchoolPages role="principal" section={section} tenantSlug="maranda-high" routeMode="public" />);
    expect(await screen.findByRole("navigation", { name: "Principal dashboard sidebar" })).toBeVisible();
    expect(screen.queryByRole("alert", { name: "Principal workspace unavailable" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Learner register" })).not.toBeInTheDocument();
  });

  it("opens Students from its sidebar destination and preserves school data on reload", async () => {
    const { rerender } = renderWithProviders(<SchoolPages role="principal" section="dashboard" tenantSlug="maranda-high" routeMode="public" />);
    const sidebar = await screen.findByRole("navigation", { name: "Principal dashboard sidebar" });
    const href = within(sidebar).getByRole("link", { name: "Students" }).getAttribute("href")!;
    rerender(<SchoolPages role="principal" section={href.split("/").pop()} tenantSlug="maranda-high" routeMode="public" />);
    expect(await screen.findByRole("heading", { name: "Students Directory" })).toBeVisible();
    expect(await screen.findByText("Amina Wanjiku")).toBeVisible();
    expect(within(screen.getByRole("navigation", { name: "Principal dashboard sidebar" })).getByRole("link", { name: "Students" })).toHaveAttribute("aria-current", "page");
    expect(requestDashboardApiMock).toHaveBeenCalledWith("/admin-command/principal/students", expect.objectContaining({ tenantId: "maranda-high" }));
  });

  it("keeps the master timetable in the Principal dashboard after reloading its URL", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(<SchoolPages role="principal" section="dashboard" tenantSlug="maranda-high" routeMode="public" />);
    const sidebar = await screen.findByRole("navigation", { name: "Principal dashboard sidebar" });
    await user.click(within(sidebar).getByRole("button", { name: "Master Timetable" }));
    expect(window.location.pathname).toBe("/school/principal/timetable");
    unmount();
    renderWithProviders(<SchoolPages role="principal" section="timetable" tenantSlug="maranda-high" routeMode="public" />);
    expect(await screen.findByRole("heading", { name: "School master timetable" })).toBeVisible();
    expect(screen.getByRole("navigation", { name: "Principal dashboard sidebar" })).toBeVisible();
  });

  it("keeps the student admission action within the Principal role", async () => {
    const user = userEvent.setup();
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: ["students:read", "school_admissions:write"] }) });
    renderWithProviders(<SchoolPages role="principal" section="students" tenantSlug="maranda-high" routeMode="public" />);
    await user.click(await screen.findByRole("button", { name: "Admit New" }));
    expect(routerPushMock).toHaveBeenCalledWith("/school/principal/admissions");
  });

  it("opens student setup in Students and uses the supported attendance URL", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SchoolPages role="principal" section="setup-checklist" tenantSlug="maranda-high" routeMode="public" />);
    await user.click(await screen.findByRole("button", { name: "Open Students" }));
    expect(window.location.pathname).toBe("/school/principal/students");
    expect(await screen.findByRole("heading", { name: "Students Directory" })).toBeVisible();
    const sidebar = screen.getByRole("navigation", { name: "Principal dashboard sidebar" });
    await user.click(within(sidebar).getByRole("button", { name: "Expand Students" }));
    await user.click(within(sidebar).getByRole("button", { name: "Attendance" }));
    expect(window.location.pathname).toBe("/school/principal/attendance-monitoring");
    expect(await screen.findByRole("heading", { name: "Weekly Attendance Rate" })).toBeVisible();
  });

  it("keeps mobile group toggles separate from School Setup and profile navigation", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/school/principal");
    renderWithProviders(
      <SchoolPages role="principal" section="dashboard" tenantSlug="maranda-high" routeMode="public" />,
    );

    const sidebar = await screen.findByRole("navigation", { name: "Principal dashboard sidebar" });
    await user.click(screen.getByRole("button", { name: "Open principal navigation" }));
    for (const label of ["Students", "School Setup"]) {
      await user.click(within(sidebar).getByRole("button", { name: `Expand ${label}` }));
      await user.click(within(sidebar).getByRole("button", { name: `Collapse ${label}` }));
      expect(window.location.pathname).toBe("/school/principal");
      expect(screen.getByRole("button", { name: "Close principal navigation overlay" })).toBeInTheDocument();
    }

    await user.click(within(sidebar).getByRole("button", { name: "School Setup" }));
    expect(window.location.pathname).toBe("/school/principal/setup-checklist");
    expect(await screen.findByRole("heading", { name: "Setup Progress" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Close principal navigation overlay" })).not.toBeInTheDocument();
    const setupGroup = within(sidebar).getByRole("group", { name: "School Setup" });
    await user.click(within(setupGroup).getByRole("button", { name: "School Profile" }));
    expect(window.location.pathname).toBe("/school/principal/school-profile");
    expect(await screen.findByRole("heading", { name: "School Profile" })).toBeVisible();
  });

  it.each([
    ["finance", "Fees & Finance", "Fees", "Collection Trend"],
    ["clinic", "Students", "Sick Bay", "Sick Bay"],
    ["academics", "Academics", "Teacher Allocations", "Performance Trend"],
  ])("opens the active child group and preserves the %s route when selected", async (route, groupLabel, childLabel, heading) => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages role="principal" section={route} tenantSlug="maranda-high" routeMode="public" />,
    );

    const sidebar = await screen.findByRole("navigation", { name: "Principal dashboard sidebar" });
    const group = within(sidebar).getByRole("group", { name: groupLabel });
    const child = within(group).getByRole("button", { name: childLabel });
    expect(child).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Open principal navigation" }));
    await user.click(child);
    expect(window.location.pathname).toBe(`/school/principal/${route}`);
    expect(await screen.findByRole("heading", { name: heading })).toBeVisible();
    expect(screen.queryByRole("button", { name: "Close principal navigation overlay" })).not.toBeInTheDocument();
  });

  it.each([
    ["missing dashboard settings", { status: "active" }],
    ["partial dashboard settings", { status: "active", dashboard: {} }],
  ])("keeps the Principal overview usable with %s", async (_caseName, navigationSettings) => {
    responseOverrides.set("/admin-command/principal/settings", navigationSettings);

    renderWithProviders(
      <SchoolPages role="principal" tenantSlug="partial-settings-school" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(within(commandCenter).getByRole("heading", { name: "Principal Dashboard" })).toBeVisible();
    expect(await within(commandCenter).findByRole("heading", { name: "Live principal operations" })).toBeVisible();
  });

  it("keeps the live loading state visible and does not substitute phantom metrics", async () => {
    unresolvedPaths.add("/admin-command/principal/overview");

    renderWithProviders(
      <SchoolPages role="principal" tenantSlug="new-school" userLabel="Principal Amina" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(within(commandCenter).getByRole("heading", { name: "Live principal operations" })).toBeVisible();
    expect(within(commandCenter).queryByText("412")).not.toBeInTheDocument();
    expect(within(commandCenter).queryByText(/Kisumu Boys/i)).not.toBeInTheDocument();
  });

  it("shows a truthful error for a missing or malformed overview contract", async () => {
    responseOverrides.set("/admin-command/principal/overview", null);

    renderWithProviders(<SchoolPages role="principal" tenantSlug="new-school" />);

    expect(await screen.findByRole("heading", { name: "Failed to load Principal Overview" })).toBeVisible();
    expect(screen.queryByText("412")).not.toBeInTheDocument();
  });

  it("renders the canonical tenant setup checklist with real dependency tasks", async () => {
    renderWithProviders(
      <SchoolPages
        role="principal"
        section="setup-checklist"
        tenantSlug="homabay-high"
        userLabel="Principal Robini"
      />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(await within(commandCenter).findByRole("heading", { name: "Setup Progress" })).toBeVisible();
    expect(within(commandCenter).getByText("33%")).toBeVisible();
    expect(within(commandCenter).getByText("Configure Academic Term")).toBeVisible();
    expect(within(commandCenter).getByText("Register Subjects")).toBeVisible();
    expect(within(commandCenter).getByText("Add Students")).toBeVisible();
    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/admin-command/principal/setup-checklist",
      expect.objectContaining({ tenantId: "homabay-high" }),
    );
  });

  it.each([
    ["academic-setup", "Configuration Hub"],
    ["classes-streams", "Population Distribution"],
    ["subjects-departments", "Subject Distribution"],
    ["finance", "Collection Trend"],
    ["attendance", "Weekly Attendance Rate"],
    ["discipline", "Incident Trend"],
    ["academics", "Performance Trend"],
    ["staff", "Staff Distribution"],
    ["approvals", "Pending by Category"],
    ["reports", "Report Categories"],
    ["exams-reports", "Exam Performance Trend"],
    ["settings", "Dashboard Preferences"],
  ])("opens the Principal %s route on its dedicated live workspace", async (section, heading) => {
    renderWithProviders(
      <SchoolPages role="principal" section={section} tenantSlug="fresh-academy" userLabel="Principal Amina" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(await within(commandCenter).findByRole("heading", { name: heading })).toBeVisible();
    expect(within(commandCenter).queryByText(/Practical Kenyan school command center/i)).not.toBeInTheDocument();
  });

  it("renders actionable, truthful empty states for a clean tenant", async () => {
    renderWithProviders(
      <SchoolPages role="principal" section="classes-streams" tenantSlug="clean-academy" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(await within(commandCenter).findByText("No classes found")).toBeVisible();
    expect(within(commandCenter).getByText("Create a class section to see distribution")).toBeVisible();
    expect(within(commandCenter).getByText("No classes configured")).toBeVisible();
    expect(within(commandCenter).queryByText(/Form 1 East|Grade 8 North/i)).not.toBeInTheDocument();
  });

  it("keeps legacy boarding and transport links on unique school-scoped workspaces", async () => {
    const boarding = renderWithProviders(
      <SchoolPages role="principal" section="boarding" tenantSlug="maranda-high" />,
    );
    const boardingCommandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(within(boardingCommandCenter).getByRole("region", { name: "Principal boarding workspace" })).toBeVisible();
    expect((await within(boardingCommandCenter).findAllByText("120")).length).toBeGreaterThan(0);
    boarding.unmount();

    renderWithProviders(
      <SchoolPages role="principal" section="transport" tenantSlug="maranda-high" />,
    );
    const transportCommandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(within(transportCommandCenter).getByRole("region", { name: "Principal transport workspace" })).toBeVisible();
    expect(await within(transportCommandCenter).findByText("90")).toBeVisible();
  });

  it("loads Principal visitor, health, library, and audit oversight from live tenant contracts", async () => {
    const visitors = renderWithProviders(
      <SchoolPages role="principal" section="visitors" tenantSlug="maranda-high" />,
    );
    let commandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(await within(commandCenter).findByText("Jane Guest")).toBeVisible();
    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/admin-command/principal/visitors",
      expect.objectContaining({ tenantId: "maranda-high" }),
    );
    visitors.unmount();

    const health = renderWithProviders(
      <SchoolPages role="principal" section="clinic" tenantSlug="maranda-high" />,
    );
    commandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(await within(commandCenter).findByText("Paracetamol")).toBeVisible();
    expect(within(commandCenter).getByText(/Diagnoses, confidential notes/i)).toBeVisible();
    health.unmount();

    const library = renderWithProviders(
      <SchoolPages role="principal" section="library" tenantSlug="maranda-high" />,
    );
    commandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(await within(commandCenter).findByText("600")).toBeVisible();
    library.unmount();

    renderWithProviders(
      <SchoolPages role="principal" section="audit-logs" tenantSlug="maranda-high" />,
    );
    commandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(await within(commandCenter).findByText("approval.rejected")).toBeVisible();
    expect(within(commandCenter).getByText("Principal A")).toBeVisible();
  });

  it("does not derive Principal operational data from browser storage or hardcoded register counts", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/principal-command-center.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/readSchoolData|subscribeToSchoolDataUpdates|missingRegisters/);
    expect(source).not.toMatch(/Faith Akinyi|2026-06-29|\? 0 : 3/);
    expect(source).toMatch(/PrincipalVisitorsOversightWorkspace/);
    expect(source).toMatch(/PrincipalHealthOversightWorkspace/);
    expect(source).toMatch(/PrincipalAuditOversightWorkspace/);
  });

  it("submits real fee-category and waiver inputs through the verified tenant boundary", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages role="principal" section="finance" tenantSlug="lakeview-school" userLabel="Principal Atieno" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click((await within(commandCenter).findAllByRole("button", { name: "Add Category" }))[0]);
    await user.type(screen.getByLabelText("Name"), "Tuition Fee");
    await user.type(screen.getByLabelText("Description"), "Term tuition");
    await user.type(screen.getByLabelText("Amount (KES)"), "12500.50");
    await user.click(screen.getByRole("button", { name: "Create Category" }));

    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        "/finance/fee-categories",
        {
          method: "POST",
          tenantId: "lakeview-school",
          body: {
            name: "Tuition Fee",
            description: "Term tuition",
            amount_minor: 1_250_050,
            currency_code: "KES",
          },
        },
      );
    });

    await user.click(await within(commandCenter).findByRole("button", { name: "Add Waiver" }));
    await user.selectOptions(screen.getByLabelText("Student"), activeStudentId);
    await user.type(screen.getByLabelText("Amount (KES)"), "5000");
    await user.type(screen.getByLabelText("Reason"), "Sibling bursary adjustment");
    await user.click(screen.getByRole("button", { name: "Submit Waiver" }));

    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        "/finance/waivers",
        {
          method: "POST",
          tenantId: "lakeview-school",
          body: {
            student_id: activeStudentId,
            student_name: "Achieng Otieno",
            class_name: "Grade 8 East",
            amount_minor: "500000",
            reason: "Sibling bursary adjustment",
          },
        },
      );
    });

    expect(requestDashboardApiMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.objectContaining({ student_name: "Lookup Required" }),
      }),
    );
  });

  it("binds non-finance Principal mutations to the same verified school context", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages role="principal" section="academics" tenantSlug="lakeview-school" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click(await within(commandCenter).findByRole("button", { name: "Detailed Report" }));

    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/admin-command/principal/reports/generate",
      {
        method: "POST",
        tenantId: "lakeview-school",
        body: {
          title: "Department performance report",
          type: "department_performance",
          source_dashboard: "principal-academics",
        },
      },
    );
  });

  it("creates and publishes a canonical exam series from the live academic setup", async () => {
    const user = userEvent.setup();
    responseOverrides.set("/academics/academic-years", [
      {
        id: "00000000-0000-4000-8000-000000000701",
        name: "2026 Academic Year",
        starts_on: "2026-01-05",
        ends_on: "2026-11-20",
        is_current: true,
      },
    ]);
    responseOverrides.set("/academics/academic-terms", [
      {
        id: "00000000-0000-4000-8000-000000000702",
        academic_year_id: "00000000-0000-4000-8000-000000000701",
        name: "Term 2",
        starts_on: "2026-05-04",
        ends_on: "2026-08-07",
        is_current: true,
      },
    ]);
    responseOverrides.set("/admin-command/principal/exams", {
      status: "active",
      activeExams: 1,
      reportsPending: 1,
      missingMarksAlerts: 0,
      averageScore: 72,
      performanceTrend: [],
      recentResults: [
        {
          id: "00000000-0000-4000-8000-000000000703",
          exam_id: "00000000-0000-4000-8000-000000000703",
          title: "Term 1 Final",
          status: "reviewed",
          startsOn: "2026-03-16",
          endsOn: "2026-03-27",
          totalReportCards: 40,
          approvedReportCards: 40,
          publishedReportCards: 0,
          blockedReportCards: 0,
          canPublish: true,
        },
      ],
    });

    renderWithProviders(
      <SchoolPages role="principal" section="exams-reports" tenantSlug="lakeview-school" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click(await within(commandCenter).findByRole("button", { name: "+ New Exam" }));
    await user.type(screen.getByLabelText("Exam name"), "Term 2 Midterm");
    await user.click(screen.getByRole("button", { name: "Create Exam Series" }));

    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        "/admin-command/exams/cycles",
        {
          method: "POST",
          tenantId: "lakeview-school",
          body: {
            name: "Term 2 Midterm",
            academic_term_id: "00000000-0000-4000-8000-000000000702",
            starts_on: "2026-05-04",
            ends_on: "2026-08-07",
          },
        },
      );
    });

    await user.click(await within(commandCenter).findByRole("button", { name: "Publish approved cards" }));
    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        "/admin-command/principal/exams-report-cards/00000000-0000-4000-8000-000000000703/publish",
        { method: "POST", tenantId: "lakeview-school" },
      );
    });
    expect(within(commandCenter).queryByRole("button", { name: /Approve All/i })).not.toBeInTheDocument();
  });

  it("submits assigned procurement approvals through the governed Principal action", async () => {
    const user = userEvent.setup();
    responseOverrides.set("/admin-command/principal/approvals", {
      status: "active",
      pendingTotal: 1,
      urgentApprovals: 1,
      categories: [{ name: "Procurement", pending: 1, urgent: 1 }],
      requests: [
        {
          id: "00000000-0000-4000-8000-000000000704",
          title: "Approve laboratory reagents",
          reason: "Required for practical exams",
          status: "pending",
          approval_type: "procurement",
          module: "procurement",
          record_id: "00000000-0000-4000-8000-000000000705",
          priority: "urgent",
          created_at: "2026-08-22T07:00:00.000Z",
        },
      ],
      recentApprovals: [],
    });

    renderWithProviders(
      <SchoolPages role="principal" section="approvals" tenantSlug="lakeview-school" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    await user.click(await within(commandCenter).findByRole("button", { name: "Approve" }));
    await user.click(screen.getByRole("button", { name: "Confirm approval" }));

    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        "/admin-command/principal/approvals/00000000-0000-4000-8000-000000000704/action",
        {
          method: "POST",
          tenantId: "lakeview-school",
          body: { action: "approve", comment: undefined },
        },
      );
    });
  });

  it("persists Principal preferences and keeps security controls on governed account paths", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages role="principal" section="settings" tenantSlug="lakeview-school" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    const emailAlerts = await within(commandCenter).findByRole("checkbox", { name: "Email alerts" });
    expect(emailAlerts).toBeChecked();
    await user.click(emailAlerts);

    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        "/admin-command/principal/settings/preferences",
        {
          method: "PATCH",
          tenantId: "lakeview-school",
          body: {
            notifications: { emailAlerts: false, smsAlerts: false, dailyDigest: true },
            dashboard: { theme: "system", defaultView: "overview" },
          },
        },
      );
    });
    expect(within(commandCenter).getByText("Not assigned")).toBeVisible();
    expect(within(commandCenter).getByText("Enabled")).toBeVisible();
    expect(within(commandCenter).getByRole("link", { name: "Open secure reset" })).toHaveAttribute("href", "/school/forgot-password");
    expect(within(commandCenter).queryByRole("button", { name: /Disable|Enable/i })).not.toBeInTheDocument();
  });

  it("disables waiver creation truthfully when this school has no active students", async () => {
    responseOverrides.set("/students?status=active&limit=200", []);

    renderWithProviders(
      <SchoolPages role="principal" section="finance" tenantSlug="empty-school" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    const addWaiver = await within(commandCenter).findByRole("button", { name: "Add Waiver" });
    expect(addWaiver).toBeDisabled();
    expect(within(commandCenter).getByText(/No active students are available/i)).toBeVisible();
  });

  it("routes the staff-roles alias to school-scoped user management", async () => {
    renderWithProviders(
      <SchoolPages role="principal" section="staff-roles" tenantSlug="fresh-academy" userLabel="Principal Amina" />,
    );

    const commandCenter = await screen.findByTestId("principal-practical-command-center");
    expect(within(commandCenter).getByRole("heading", { name: /Users & Invitations/i })).toBeVisible();
    expect(within(commandCenter).queryByText(/Practical Kenyan school command center/i)).not.toBeInTheDocument();
  });
});
