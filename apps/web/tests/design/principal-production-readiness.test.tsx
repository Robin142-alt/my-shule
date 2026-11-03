import fs from "node:fs";
import path from "node:path";

import { act, screen, waitFor, within } from "@testing-library/react";
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
  DashboardEngine: () => (
    <div data-testid="principal-live-dashboard-engine">Live school widgets</div>
  ),
}));

const requestDashboardApiMock = jest.mocked(requestDashboardApi);

import { activeStudentId, canonicalResponses } from "./principal-workspace-fixtures";

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
            data: [
              "academics:read",
              "events:read",
              "events:write",
              "reports:read",
              "finance:read",
              "academics:write",
              "exams:read",
              "exams:write",
              "exams:publish",
              "finance:write",
              "principal:write",
              "principal:read",
              "reports:write",
              "students:read",
            ],
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
          schoolName:
            tenantId === "maranda-high"
              ? "Maranda High"
              : tenantId
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

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    const studentMetric = await within(commandCenter).findByRole("button", {
      name: "View students",
    });
    const staffMetric = within(commandCenter).getByRole("button", {
      name: "View staff",
    });

    expect(
      within(commandCenter).getAllByText(/Maranda High/i).length,
    ).toBeGreaterThan(0);
    expect(studentMetric).toHaveTextContent("412");
    expect(staffMetric).toHaveTextContent("38");
    expect(
      within(commandCenter).getByRole("button", {
        name: "View pending approvals",
      }),
    ).toHaveTextContent("3");
    expect(
      within(commandCenter).queryByText(/Kisumu Boys|KSh 248,500/i),
    ).not.toBeInTheDocument();
    expect(
      within(commandCenter).queryByText("Operational Dashboard"),
    ).not.toBeInTheDocument();
    expect(
      within(commandCenter).queryByTestId("principal-live-dashboard-engine"),
    ).not.toBeInTheDocument();
    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/admin-command/principal/overview",
      expect.objectContaining({ tenantId: "maranda-high" }),
    );
  });

  it("keeps payment setup off Overview and opens it through Fees & Finance", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages
        role="principal"
        tenantSlug="maranda-high"
        routeMode="public"
      />,
    );
    expect(
      await screen.findByRole("button", { name: "View students" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Payment setup" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Review payment setups" }),
    ).not.toBeInTheDocument();
    const sidebar = screen.getByRole("navigation", {
      name: "Principal dashboard sidebar",
    });
    await user.click(
      within(sidebar).getByRole("button", { name: "Fees & Finance" }),
    );
    await user.click(
      within(sidebar).getByRole("button", { name: "Payment Setup" }),
    );
    expect(
      await screen.findByRole("heading", { name: "School payment channels" }),
    ).toBeVisible();
    expect(window.location.pathname).toBe("/school/principal/payment-setup");
  });

  it("keeps admitting a student inside the Principal dashboard", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages
        role="principal"
        tenantSlug="maranda-high"
        section="admissions"
        routeMode="public"
      />,
    );
    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(
      screen.queryByTestId("admissions-dashboard-command-center"),
    ).not.toBeInTheDocument();
    expect(
      await within(commandCenter).findByText("New student admission"),
    ).toBeVisible();
    await user.click(
      within(commandCenter).getByRole("button", {
        name: "Close and keep draft",
      }),
    );
    expect(window.location.pathname).toBe("/school/principal/students");
    expect(
      screen.queryByTestId("admissions-dashboard-command-center"),
    ).not.toBeInTheDocument();
  });

  it("opens payment setup directly from its dashboard route instead of the generic workspace", async () => {
    renderWithProviders(
      <SchoolPages
        role="principal"
        tenantSlug="maranda-high"
        section="payment-setup"
        routeMode="public"
      />,
    );
    expect(
      await screen.findByTestId("principal-practical-command-center"),
    ).toBeVisible();
    expect(
      await screen.findByRole("heading", { name: "School payment channels" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Payment Setup" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it.each([
    ["Review Approvals", "approvals"],
    ["View students", "students"],
  ])(
    "opens the governed %s workspace from the overview banner",
    async (label, section) => {
      const user = userEvent.setup();
      renderWithProviders(
        <SchoolPages
          role="principal"
          tenantSlug="maranda-high"
          routeMode="public"
        />,
      );
      await user.click(await screen.findByRole("button", { name: label }));
      expect(window.location.pathname).toBe(`/school/principal/${section}`);
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        `/admin-command/principal/${section}`,
        expect.objectContaining({ tenantId: "maranda-high" }),
      );
    },
  );

  it("renders the approved overview sections without a duplicate activity feed", async () => {
    renderWithProviders(
      <SchoolPages role="principal" tenantSlug="maranda-high" />,
    );
    for (const name of [
      "Academic Performance",
      "People Waiting to See You",
      "Today's School Operations",
      "This Week",
      "Requires Your Attention",
    ]) {
      expect(
        await screen.findByRole("heading", { name: new RegExp(name, "i") }),
      ).toBeVisible();
    }
    expect(
      screen.queryByRole("heading", { name: "Recent school activity" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the required Principal sidebar order and child hierarchy", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages
        role="principal"
        section="dashboard"
        tenantSlug="maranda-high"
        routeMode="public"
      />,
    );

    const sidebar = await screen.findByRole("navigation", {
      name: "Principal dashboard sidebar",
    });
    const topLevelLabels = Array.from(sidebar.querySelectorAll("button, a"))
      .filter(
        (item) => !item.closest('[role="group"]') && item.textContent?.trim(),
      )
      .map((item) => item.textContent?.trim());
    expect(topLevelLabels).toEqual([
      "Overview",
      "Approvals",
      "Exam Analytics",
      "Exams & Report Cards",
      "Communication",
      "Master Timetable",
      "Fees & Finance",
      "Students",
      "Academics",
      "Staff",
      "Parents & Visitors",
      "Transport",
      "Library",
      "Users & Invitations",
      "Reports",
      "Audit Logs",
      "School Setup",
      "Settings",
    ]);
    expect(
      within(sidebar).queryByRole("link", { name: "Students" }),
    ).not.toBeInTheDocument();

    for (const [label, toggleName, children] of [
      [
        "Fees & Finance",
        "Fees & Finance",
        ["Fees", "Payment Setup", "Collection Reviews"],
      ],
      [
        "Students",
        "Students",
        [
          "Student Directory",
          "Student Progression & Transitions",
          "Admit Student",
          "Attendance",
          "Discipline",
          "Sick Bay",
          "Boarding",
        ],
      ],
      [
        "Academics",
        "Academics",
        [
          "Academic Calendar",
          "Classes & Streams",
          "Subjects & Departments",
          "Teacher Allocations",
          "Syllabus Coverage",
        ],
      ],
      ["School Setup", "Expand School Setup", ["School Profile"]],
    ] as const) {
      const toggle = within(sidebar).getByRole("button", { name: toggleName });
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      await user.click(toggle);
      const group = within(sidebar).getByRole("group", { name: label });
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(toggle).toHaveAttribute("aria-controls", group.id);
      expect(
        within(group)
          .getAllByRole("button")
          .map((item) => item.textContent),
      ).toEqual(children);
      await user.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(
        within(sidebar).queryByRole("group", { name: label }),
      ).not.toBeInTheDocument();
    }
  });

  it.each([
    "dashboard",
    "overview",
    "principal-overview",
    "students",
    "timetable",
    "approvals",
    "academic-intelligence",
    "exams",
    "exams-reports",
    "exams-report-cards",
    "communication",
    "finance",
    "finance-overview",
    "fees",
    "attendance-monitoring",
    "discipline",
    "clinic",
    "sick-bay",
    "boarding",
    "academic-setup",
    "classes-streams",
    "subjects-departments",
    "academics",
    "staff",
    "staff-roles",
    "visitors",
    "parents",
    "transport",
    "library",
    "users-invitations",
    "reports",
    "audit-logs",
    "setup-checklist",
    "school-profile",
    "settings",
    "subjects",
    "academic-analytics",
    "syllabus-coverage",
  ])(
    "loads Principal %s directly in the current dashboard",
    async (section) => {
      expect(isSchoolSection(section)).toBe(true);
      expect(isProductionReadyModule(section)).toBe(true);
      renderWithProviders(
        <SchoolPages
          role="principal"
          section={section}
          tenantSlug="maranda-high"
          routeMode="public"
        />,
      );
      expect(
        await screen.findByRole("navigation", {
          name: "Principal dashboard sidebar",
        }),
      ).toBeVisible();
      if (section === "syllabus-coverage")
        expect(
          await screen.findByText("No teacher allocations in your scope"),
        ).toBeVisible();
      expect(
        screen.queryByRole("alert", {
          name: "Principal workspace unavailable",
        }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Learner register" }),
      ).not.toBeInTheDocument();
    },
  );

  it("expands Students without navigating, then opens its directory and preserves school data on reload", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/school/principal");
    const { unmount } = renderWithProviders(
      <SchoolPages
        role="principal"
        section="dashboard"
        tenantSlug="maranda-high"
        routeMode="public"
      />,
    );
    const sidebar = await screen.findByRole("navigation", {
      name: "Principal dashboard sidebar",
    });
    const href = "/school/principal/students";
    const toggle = within(sidebar).getByRole("button", { name: "Students" });
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(window.location.pathname).toBe("/school/principal");
    expect(
      screen.queryByRole("heading", { name: "Students Directory" }),
    ).not.toBeInTheDocument();
    await user.click(
      within(sidebar).getByRole("button", { name: "Student Directory" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Students Directory" }),
    ).toBeVisible();
    expect(window.location.pathname).toBe(href);
    expect(
      screen.getByRole("navigation", { name: "Principal dashboard sidebar" }),
    ).toBe(sidebar);
    await act(async () => {
      window.history.back();
      await new Promise<void>((resolve) =>
        window.addEventListener("popstate", () => resolve(), { once: true }),
      );
    });
    expect(window.location.pathname).toBe("/school/principal");
    expect(
      within(sidebar).getByRole("button", { name: "Overview" }),
    ).toHaveAttribute("aria-current", "page");
    unmount();
    renderWithProviders(
      <SchoolPages
        role="principal"
        section={href.split("/").pop()}
        tenantSlug="maranda-high"
        routeMode="public"
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "Students Directory" }),
    ).toBeVisible();
    expect(await screen.findByText("Amina Wanjiku")).toBeVisible();
    expect(
      within(
        screen.getByRole("navigation", { name: "Principal dashboard sidebar" }),
      ).getByRole("button", { name: "Student Directory" }),
    ).toHaveAttribute("aria-current", "page");
    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/admin-command/principal/students",
      expect.objectContaining({ tenantId: "maranda-high" }),
    );
  });

  it.each([
    ["communication", /No recorded results for this period/],
    ["attendance-monitoring", /No attendance recorded for this period/],
    ["discipline", /No incidents match these filters/],
    ["finance", /No collections recorded for this period/],
  ])(
    "explains missing trend data in %s instead of showing an empty chart",
    async (section, message) => {
      renderWithProviders(
        <SchoolPages
          role="principal"
          section={section as string}
          tenantSlug="maranda-high"
          routeMode="public"
        />,
      );
      if (section === "communication")
        await userEvent
          .setup()
          .click(
            await screen.findByRole("button", { name: "School broadcasts" }),
          );
      expect(await screen.findByText(message)).toBeVisible();
    },
  );

  it("keeps the master timetable in the Principal dashboard after reloading its URL", async () => {
    const user = userEvent.setup();
    const { unmount } = renderWithProviders(
      <SchoolPages
        role="principal"
        section="dashboard"
        tenantSlug="maranda-high"
        routeMode="public"
      />,
    );
    const sidebar = await screen.findByRole("navigation", {
      name: "Principal dashboard sidebar",
    });
    await user.click(
      within(sidebar).getByRole("button", { name: "Master Timetable" }),
    );
    expect(window.location.pathname).toBe("/school/principal/timetable");
    unmount();
    renderWithProviders(
      <SchoolPages
        role="principal"
        section="timetable"
        tenantSlug="maranda-high"
        routeMode="public"
      />,
    );
    expect(
      await screen.findByRole("heading", { name: "School master timetable" }),
    ).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Principal dashboard sidebar" }),
    ).toBeVisible();
  });

  it("keeps the student admission action within the Principal role", async () => {
    const user = userEvent.setup();
    global.fetch = jest
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          data: ["students:read", "school_admissions:write"],
        }),
      });
    renderWithProviders(
      <SchoolPages
        role="principal"
        section="students"
        tenantSlug="maranda-high"
        routeMode="public"
      />,
    );
    await user.click(await screen.findByRole("button", { name: "Admit New" }));
    expect(routerPushMock.mock.calls[0][0]).toBe(
      "/school/principal/admissions",
    );
  });

  it("opens student setup in Students and uses the supported attendance URL", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages
        role="principal"
        section="setup-checklist"
        tenantSlug="maranda-high"
        routeMode="public"
      />,
    );
    await user.click(
      await screen.findByRole("button", { name: "Open Students" }),
    );
    expect(window.location.pathname).toBe("/school/principal/students");
    expect(
      await screen.findByRole("heading", { name: "Students Directory" }),
    ).toBeVisible();
    const sidebar = screen.getByRole("navigation", {
      name: "Principal dashboard sidebar",
    });
    expect(
      within(sidebar).getByRole("button", { name: "Students" }),
    ).toHaveAttribute("aria-expanded", "true");
    await user.click(
      within(sidebar).getByRole("button", { name: "Attendance" }),
    );
    expect(window.location.pathname).toBe(
      "/school/principal/attendance-monitoring",
    );
    expect(
      await screen.findByRole("heading", { name: "Weekly Attendance Rate" }),
    ).toBeVisible();
  });

  it("keeps mobile group toggles separate from School Setup and profile navigation", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/school/principal");
    renderWithProviders(
      <SchoolPages
        role="principal"
        section="dashboard"
        tenantSlug="maranda-high"
        routeMode="public"
      />,
    );

    const sidebar = await screen.findByRole("navigation", {
      name: "Principal dashboard sidebar",
    });
    await user.click(
      screen.getByRole("button", { name: "Open principal navigation" }),
    );
    for (const label of ["Students", "School Setup"]) {
      await user.click(
        within(sidebar).getByRole("button", {
          name: label === "Students" ? label : `Expand ${label}`,
        }),
      );
      await user.click(
        within(sidebar).getByRole("button", {
          name: label === "Students" ? label : `Collapse ${label}`,
        }),
      );
      expect(window.location.pathname).toBe("/school/principal");
      expect(
        screen.getByRole("button", {
          name: "Close principal navigation overlay",
        }),
      ).toBeInTheDocument();
    }

    await user.click(
      within(sidebar).getByRole("button", { name: "School Setup" }),
    );
    expect(window.location.pathname).toBe("/school/principal/setup-checklist");
    expect(
      await screen.findByRole("heading", { name: "Setup Progress" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: "Close principal navigation overlay",
      }),
    ).not.toBeInTheDocument();
    const setupGroup = within(sidebar).getByRole("group", {
      name: "School Setup",
    });
    await user.click(
      within(setupGroup).getByRole("button", { name: "School Profile" }),
    );
    expect(window.location.pathname).toBe("/school/principal/school-profile");
    expect(
      await screen.findByRole("heading", { name: "School Profile" }),
    ).toBeVisible();
  });

  it.each([
    ["finance", "Fees & Finance", "Fees", "Collection Trend"],
    ["clinic", "Students", "Sick Bay", "Sick Bay"],
    ["academics", "Academics", "Teacher Allocations", "Exam performance trend"],
  ])(
    "opens the active child group and preserves the %s route when selected",
    async (route, groupLabel, childLabel, heading) => {
      const user = userEvent.setup();
      renderWithProviders(
        <SchoolPages
          role="principal"
          section={route}
          tenantSlug="maranda-high"
          routeMode="public"
        />,
      );

      const sidebar = await screen.findByRole("navigation", {
        name: "Principal dashboard sidebar",
      });
      const group = within(sidebar).getByRole("group", { name: groupLabel });
      const child = within(group).getByRole("button", { name: childLabel });
      expect(child).toHaveAttribute("aria-current", "page");
      await user.click(
        screen.getByRole("button", { name: "Open principal navigation" }),
      );
      await user.click(child);
      expect(window.location.pathname).toBe(`/school/principal/${route}`);
      expect(
        await screen.findByRole("heading", { name: heading }),
      ).toBeVisible();
      expect(
        screen.queryByRole("button", {
          name: "Close principal navigation overlay",
        }),
      ).not.toBeInTheDocument();
    },
  );

  it.each([
    ["missing dashboard settings", { status: "active" }],
    ["partial dashboard settings", { status: "active", dashboard: {} }],
  ])(
    "keeps the Principal overview usable with %s",
    async (_caseName, navigationSettings) => {
      responseOverrides.set(
        "/admin-command/principal/settings",
        navigationSettings,
      );

      renderWithProviders(
        <SchoolPages role="principal" tenantSlug="partial-settings-school" />,
      );

      const commandCenter = await screen.findByTestId(
        "principal-practical-command-center",
      );
      expect(
        within(commandCenter).getByRole("heading", {
          name: "Principal Dashboard",
        }),
      ).toBeVisible();
      expect(
        await within(commandCenter).findByRole("heading", {
          name: "Academic Performance",
        }),
      ).toBeVisible();
    },
  );

  it("keeps the live loading state visible and does not substitute phantom metrics", async () => {
    unresolvedPaths.add("/admin-command/principal/overview");

    renderWithProviders(
      <SchoolPages
        role="principal"
        tenantSlug="new-school"
        userLabel="Principal Amina"
      />,
    );

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(
      within(commandCenter).getByRole("heading", {
        name: "Academic Performance",
      }),
    ).toBeVisible();
    expect(within(commandCenter).queryByText("412")).not.toBeInTheDocument();
    expect(
      within(commandCenter).queryByText(/Kisumu Boys/i),
    ).not.toBeInTheDocument();
  });

  it("shows a truthful error for a missing or malformed overview contract", async () => {
    responseOverrides.set("/admin-command/principal/overview", null);

    renderWithProviders(
      <SchoolPages role="principal" tenantSlug="new-school" />,
    );

    expect(
      await screen.findByText("Failed to load Principal Overview"),
    ).toBeVisible();
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

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(
      await within(commandCenter).findByRole("heading", {
        name: "Setup Progress",
      }),
    ).toBeVisible();
    expect(within(commandCenter).getByText("33%")).toBeVisible();
    expect(
      within(commandCenter).getByText("Configure Academic Term"),
    ).toBeVisible();
    expect(within(commandCenter).getByText("Register Subjects")).toBeVisible();
    expect(within(commandCenter).getByText("Add Students")).toBeVisible();
    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/admin-command/principal/setup-checklist",
      expect.objectContaining({ tenantId: "homabay-high" }),
    );
  });

  it.each([
    ["academic-setup", "Academic Calendar"],
    ["classes-streams", "Population Distribution"],
    ["subjects-departments", "Subjects by department"],
    ["finance", "Collection Trend"],
    ["attendance", "Weekly Attendance Rate"],
    ["discipline", "Incident register"],
    ["academics", "Exam performance trend"],
    ["staff", "Teaching workload"],
    ["approvals", "Pending by Category"],
    ["reports", "Generated reports"],
    ["exams-reports", "Exam Performance Trend"],
    ["settings", "Dashboard Preferences"],
  ])(
    "opens the Principal %s route on its dedicated live workspace",
    async (section, heading) => {
      renderWithProviders(
        <SchoolPages
          role="principal"
          section={section}
          tenantSlug="fresh-academy"
          userLabel="Principal Amina"
        />,
      );

      const commandCenter = await screen.findByTestId(
        "principal-practical-command-center",
      );
      expect(
        await within(commandCenter).findByRole("heading", { name: heading }),
      ).toBeVisible();
      expect(
        within(commandCenter).queryByText(
          /Practical Kenyan school command center/i,
        ),
      ).not.toBeInTheDocument();
    },
  );

  it("renders actionable, truthful empty states for a clean tenant", async () => {
    renderWithProviders(
      <SchoolPages
        role="principal"
        section="classes-streams"
        tenantSlug="clean-academy"
      />,
    );

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(
      await within(commandCenter).findByText("No classes found"),
    ).toBeVisible();
    expect(
      within(commandCenter).getByText(
        "Create a class section to see distribution",
      ),
    ).toBeVisible();
    expect(
      within(commandCenter).getByText("No classes configured"),
    ).toBeVisible();
    expect(
      within(commandCenter).queryByText(/Form 1 East|Grade 8 North/i),
    ).not.toBeInTheDocument();
  });

  it("keeps legacy boarding and transport links on unique school-scoped workspaces", async () => {
    const boarding = renderWithProviders(
      <SchoolPages
        role="principal"
        section="boarding"
        tenantSlug="maranda-high"
      />,
    );
    const boardingCommandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(
      within(boardingCommandCenter).getByRole("region", {
        name: "Principal boarding workspace",
      }),
    ).toBeVisible();
    expect(
      (await within(boardingCommandCenter).findAllByText("120")).length,
    ).toBeGreaterThan(0);
    boarding.unmount();

    renderWithProviders(
      <SchoolPages
        role="principal"
        section="transport"
        tenantSlug="maranda-high"
      />,
    );
    const transportCommandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(
      within(transportCommandCenter).getByRole("region", {
        name: "Principal transport workspace",
      }),
    ).toBeVisible();
    expect(await within(transportCommandCenter).findByText("90")).toBeVisible();
  });

  it("loads Principal visitor, health, library, and audit oversight from live tenant contracts", async () => {
    const visitors = renderWithProviders(
      <SchoolPages
        role="principal"
        section="visitors"
        tenantSlug="maranda-high"
      />,
    );
    let commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(await within(commandCenter).findByText("Jane Guest")).toBeVisible();
    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/admin-command/principal/visitors",
      expect.objectContaining({ tenantId: "maranda-high" }),
    );
    visitors.unmount();

    const health = renderWithProviders(
      <SchoolPages
        role="principal"
        section="clinic"
        tenantSlug="maranda-high"
      />,
    );
    commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(await within(commandCenter).findByText("Paracetamol")).toBeVisible();
    expect(
      within(commandCenter).getByText(/Diagnoses, confidential notes/i),
    ).toBeVisible();
    health.unmount();

    const library = renderWithProviders(
      <SchoolPages
        role="principal"
        section="library"
        tenantSlug="maranda-high"
      />,
    );
    commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(await within(commandCenter).findByText("600")).toBeVisible();
    library.unmount();

    renderWithProviders(
      <SchoolPages
        role="principal"
        section="audit-logs"
        tenantSlug="maranda-high"
      />,
    );
    commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(
      await within(commandCenter).findByText("approval.rejected"),
    ).toBeVisible();
    expect(within(commandCenter).getByText("Principal A")).toBeVisible();
  });

  it("does not derive Principal operational data from browser storage or hardcoded register counts", () => {
    const source = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/school/principal-command-center.tsx",
      ),
      "utf8",
    );

    expect(source).not.toMatch(
      /readSchoolData|subscribeToSchoolDataUpdates|missingRegisters/,
    );
    expect(source).not.toMatch(/Faith Akinyi|2026-06-29|\? 0 : 3/);
    expect(source).toMatch(/PrincipalVisitorsOversightWorkspace/);
    expect(source).toMatch(/PrincipalHealthOversightWorkspace/);
    expect(source).toMatch(/PrincipalAuditOversightWorkspace/);
  });

  it("submits real fee-category and waiver inputs through the verified tenant boundary", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages
        role="principal"
        section="finance"
        tenantSlug="lakeview-school"
        userLabel="Principal Atieno"
      />,
    );

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    await user.click(
      (
        await within(commandCenter).findAllByRole("button", {
          name: "Add Category",
        })
      )[0],
    );
    await user.type(screen.getByLabelText("Name"), "Tuition Fee");
    await user.type(screen.getByLabelText("Description"), "Term tuition");
    await user.type(screen.getByLabelText("Amount (KES)"), "12500.50");
    responseOverrides.set("/finance/fee-categories", [
      {
        id: "created-fee-category",
        name: "Tuition Fee",
        amount_minor: "1250050",
        description: "Term tuition",
      },
    ]);
    await user.click(screen.getByRole("button", { name: "Create Category" }));
    expect(await within(commandCenter).findByText("Tuition Fee")).toBeVisible();

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

    await user.click(
      await within(commandCenter).findByRole("button", { name: "Add Waiver" }),
    );
    await user.selectOptions(screen.getByLabelText("Student"), activeStudentId);
    await user.type(screen.getByLabelText("Amount (KES)"), "5000");
    await user.type(
      screen.getByLabelText("Reason"),
      "Sibling bursary adjustment",
    );
    await user.click(screen.getByRole("button", { name: "Submit Waiver" }));

    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith("/finance/waivers", {
        method: "POST",
        tenantId: "lakeview-school",
        body: {
          student_id: activeStudentId,
          student_name: "Achieng Otieno",
          class_name: "Grade 8 East",
          amount_minor: "500000",
          reason: "Sibling bursary adjustment",
        },
      });
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
      <SchoolPages
        role="principal"
        section="academics"
        tenantSlug="lakeview-school"
      />,
    );

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    await user.click(
      await within(commandCenter).findByRole("button", {
        name: "Detailed Report",
      }),
    );

    expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/admin-command/principal/reports/generated",
      {
        method: "POST",
        tenantId: "lakeview-school",
        body: {
          type: "department_performance",
          request_id: expect.any(String),
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
      <SchoolPages
        role="principal"
        section="exams-reports"
        tenantSlug="lakeview-school"
      />,
    );

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    await user.click(
      await within(commandCenter).findByRole("button", { name: "+ New Exam" }),
    );
    await user.type(screen.getByLabelText("Exam name"), "Term 2 Midterm");
    await user.click(
      screen.getByRole("button", { name: "Create Exam Series" }),
    );

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

    await user.click(
      await within(commandCenter).findByRole("button", {
        name: "Publish generated cards",
      }),
    );
    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        "/admin-command/principal/exams-report-cards/00000000-0000-4000-8000-000000000703/publish",
        { method: "POST", tenantId: "lakeview-school" },
      );
    });
    expect(
      within(commandCenter).queryByRole("button", { name: /Approve All/i }),
    ).not.toBeInTheDocument();
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
      <SchoolPages
        role="principal"
        section="approvals"
        tenantSlug="lakeview-school"
      />,
    );

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    await user.click(
      await within(commandCenter).findByRole("button", { name: "Approve" }),
    );
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

  it("decides fee waivers through the governed Principal action", async () => {
    const user = userEvent.setup();
    responseOverrides.set("/admin-command/principal/approvals", {
      status: "active",
      pendingTotal: 1,
      urgentApprovals: 1,
      categories: [{ name: "Finance", pending: 1, urgent: 1 }],
      requests: [
        {
          id: "00000000-0000-4000-8000-000000000704",
          title: "Fee waiver · KES 10.00 · Amina",
          reason: "Scholarship request",
          status: "pending",
          approval_type: "fee_waiver",
          module: "finance",
          record_id: "00000000-0000-4000-8000-000000000705",
          priority: "urgent",
          created_at: "2026-08-22T07:00:00.000Z",
        },
      ],
      recentApprovals: [],
    });

    renderWithProviders(
      <SchoolPages
        role="principal"
        section="approvals"
        tenantSlug="lakeview-school"
      />,
    );

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    await user.click(
      await within(commandCenter).findByRole("button", { name: "Approve" }),
    );
    expect(screen.getByText(/It does not record a payment/)).toBeVisible();
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
      <SchoolPages
        role="principal"
        section="settings"
        tenantSlug="lakeview-school"
      />,
    );

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    const emailAlerts = await within(commandCenter).findByRole("checkbox", {
      name: "Email alerts",
    });
    expect(emailAlerts).toBeChecked();
    await user.click(emailAlerts);

    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        "/admin-command/principal/settings/preferences",
        {
          method: "PATCH",
          tenantId: "lakeview-school",
          body: {
            notifications: {
              emailAlerts: false,
              smsAlerts: false,
              dailyDigest: true,
            },
            dashboard: { theme: "system", defaultView: "overview" },
          },
        },
      );
    });
    expect(within(commandCenter).getByText("Not assigned")).toBeVisible();
    expect(within(commandCenter).getByText("Enabled")).toBeVisible();
    expect(
      within(commandCenter).getByRole("link", { name: "Open secure reset" }),
    ).toHaveAttribute("href", "/school/forgot-password");
    expect(
      within(commandCenter).queryByRole("button", { name: /Disable|Enable/i }),
    ).not.toBeInTheDocument();
  });

  it("disables waiver creation truthfully when this school has no active students", async () => {
    responseOverrides.set("/students?status=active&limit=200", []);

    renderWithProviders(
      <SchoolPages
        role="principal"
        section="finance"
        tenantSlug="empty-school"
      />,
    );

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    const addWaiver = await within(commandCenter).findByRole("button", {
      name: "Add Waiver",
    });
    expect(addWaiver).toBeDisabled();
    expect(
      within(commandCenter).getByText(/No active students are available/i),
    ).toBeVisible();
  });

  it("routes the staff-roles alias to school-scoped user management", async () => {
    renderWithProviders(
      <SchoolPages
        role="principal"
        section="staff-roles"
        tenantSlug="fresh-academy"
        userLabel="Principal Amina"
      />,
    );

    const commandCenter = await screen.findByTestId(
      "principal-practical-command-center",
    );
    expect(
      within(commandCenter).getByRole("heading", {
        name: /Users & Invitations/i,
      }),
    ).toBeVisible();
    expect(
      within(commandCenter).queryByText(
        /Practical Kenyan school command center/i,
      ),
    ).not.toBeInTheDocument();
  });
});
