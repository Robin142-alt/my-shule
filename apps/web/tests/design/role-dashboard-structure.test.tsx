import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import {
  MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS,
  MYSHULE_OPERATIONAL_ROLE_IDS,
  getOperationalRoleBlueprint,
} from "@/lib/operational/myshule-extreme-operating-system";
import {
  getSchoolWorkspace,
  type SchoolExperienceRole,
} from "@/lib/experiences/school-data";

import { renderWithProviders } from "./test-utils";

function jsonResponse(body: unknown, status = 200) {
  const response = {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone: () => response,
  } as Response;

  return response;
}

function genericPayload(url: string) {
  if (url.startsWith("/api/permissions/me")) return { data: [] };
  if (url === "/api/auth/csrf") return { token: "role-structure-csrf" };
  if (url.includes("/class-teacher/my-classes")) return { classes: [] };
  if (url.includes("/class-teacher/")) return [];
  if (url === "/api/admin-command/secretary/reception-queue") {
    return {
      metrics: { total_in_queue: 0, being_served: 0, completed_today: 0, avg_wait_minutes: 0 },
      queue: [],
    };
  }
  if (url === "/api/admin-command/nurse/visits") {
    return {
      metrics: { total_visits: 0, open_visits: 0, referred: 0 },
      visits: [],
    };
  }
  if (url === "/api/admin-command/principal/exams") {
    return {
      status: "active",
      activeExams: 0,
      reportsPending: 0,
      missingMarksAlerts: 0,
      averageScore: 0,
      performanceTrend: [],
      recentResults: [],
    };
  }
  return {
    metrics: {},
    summary: {},
    records: [],
    items: [],
    classes: [],
    students: [],
    queue: [],
  };
}

describe("role dashboard operational structure", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, "", "/");
    fetchMock.mockReset();
    fetchMock.mockImplementation((input: RequestInfo | URL) =>
      Promise.resolve(jsonResponse(genericPayload(String(input)))),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("keeps exams workspaces scoped to the academic chain and out of operational/student dashboards", () => {
    const academicChainRoles: SchoolExperienceRole[] = [
      "teacher",
      "class-teacher",
      "grade-master",
      "hod",
      "dean-academics",
      "deputy-principal",
      "exams-manager",
      "principal",
    ];
    const untouchedRoles: SchoolExperienceRole[] = [
      "security-officer",
      "laboratory-technician",
      "transport-manager",
      "ict-manager",
      "storekeeper",
      "nurse",
      "librarian",
      "boarding-master",
      "guidance-counselling",
      "discipline-master",
      "admissions",
      "student",
      "secretary",
      "accountant",
    ];

    for (const role of academicChainRoles) {
      expect(getSchoolWorkspace(role).navItems.some((item) => item.id === "exams")).toBe(true);
    }

    for (const role of untouchedRoles) {
      expect(getSchoolWorkspace(role).navItems.some((item) => item.id === "exams")).toBe(false);
    }

    expect(getSchoolWorkspace("student").navItems.map((item) => item.label)).not.toContain("Results");
  });

  it("keeps the role blueprints complete for queues, actions, forms, tables, recovery, and mobile use", () => {
    expect(MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS).toHaveLength(MYSHULE_OPERATIONAL_ROLE_IDS.length);

    for (const roleId of MYSHULE_OPERATIONAL_ROLE_IDS) {
      const blueprint = getOperationalRoleBlueprint(roleId);

      expect(blueprint).toBeDefined();
      expect(blueprint?.searchMode).toMatch(/GLOBAL|SCOPED|SELF|PLATFORM/);
      expect(blueprint?.searchEntities.length).toBeGreaterThanOrEqual(1);
      expect(blueprint?.forbiddenEntities).toBeDefined();
      expect(blueprint?.sidebar.length).toBeGreaterThanOrEqual(6);
      expect(blueprint?.firstViewport.length).toBeGreaterThanOrEqual(5);
      expect(blueprint?.queues.length).toBeGreaterThanOrEqual(1);
      expect(blueprint?.primaryActions.length).toBeGreaterThanOrEqual(5);
      expect(blueprint?.forms.length).toBeGreaterThanOrEqual(1);
      expect(blueprint?.tables.length).toBeGreaterThanOrEqual(1);
      expect(blueprint?.printOutputs.length).toBeGreaterThanOrEqual(1);
      expect(blueprint?.states).toEqual(expect.arrayContaining(["LOADING", "EMPTY", "DEGRADED", "FAILED", "LOCKED"]));
      expect(blueprint?.mobileBehavior).toEqual(
        expect.arrayContaining(["collapse sidebar into drawer", "keep urgent actions first"]),
      );
      expect(blueprint?.lowBandwidthBehavior).toEqual(
        expect.arrayContaining(["show cached queue", "allow offline draft", "retry sync visibly"]),
      );

      for (const queue of blueprint?.queues ?? []) {
        expect(queue.title).toMatch(/\S/);
        expect(queue.workflow).toMatch(/->/);
        expect(queue.actions.length).toBeGreaterThanOrEqual(3);
        expect(queue.auditEvent).toMatch(/[A-Z_]+/);
        expect(queue.sla).toMatch(/\S/);
      }
    }
  });

  it("limits full global search to executive and front-office finance roles", () => {
    expect(getOperationalRoleBlueprint("principal")?.searchMode).toBe("GLOBAL_EXECUTIVE");
    expect(getOperationalRoleBlueprint("deputy-principal")?.searchMode).toBe("GLOBAL_OPERATIONS");
    expect(getOperationalRoleBlueprint("secretary")?.searchMode).toBe("GLOBAL_FRONT_OFFICE");
    expect(getOperationalRoleBlueprint("accountant")?.searchMode).toBe("GLOBAL_FINANCE");

    for (const role of MYSHULE_OPERATIONAL_ROLE_IDS.filter(
      (roleId) => !["principal", "deputy-principal", "secretary", "accountant", "superadmin", "system-monitor"].includes(roleId),
    )) {
      expect(getOperationalRoleBlueprint(role)?.searchMode).not.toMatch(/^GLOBAL/);
    }
  });

  it("keeps first-viewport blueprint language action-first instead of metric-only", () => {
    for (const blueprint of MYSHULE_OPERATIONAL_ROLE_BLUEPRINTS) {
      expect(blueprint.firstViewport.join(" ")).toMatch(
        /pending|urgent|missing|failed|unresolved|alerts|approvals|follow|exceptions|queue|action|review|requests|overdue|risk/i,
      );
      expect(blueprint.queues[0]?.actions).toEqual(expect.arrayContaining(["View Details"]));
    }
  });

  it("renders the class-teacher route as a dedicated, page-scrolled command center", async () => {
    const view = renderWithProviders(
      <SchoolPages role="class-teacher" tenantSlug="lakeview-school" routeMode="public" liveDataEnabled={false} />,
    );

    expect((await screen.findAllByRole("heading", { name: /Class Teacher Dashboard/i })).length).toBeGreaterThan(0);
    expect(screen.getByTestId("class-teacher-mobile-workspace-nav")).toBeVisible();
    expect(screen.queryByTestId("role-operational-command-center")).not.toBeInTheDocument();
    expect(view.container.querySelector(".enterprise-shell")).not.toBeInTheDocument();
    const root = view.container.firstElementChild;
    expect(root?.className.split(/\s+/)).toContain("min-h-dvh");
    expect(root?.className.split(/\s+/)).not.toContain("h-screen");
  });

  it("routes every academic-chain exams page to its dedicated moderation workspace", async () => {
    const cases: Array<{
      role: SchoolExperienceRole;
      testId: string;
      heading: RegExp;
    }> = [
      { role: "grade-master", testId: "role-operational-command-center", heading: /Grade\/Form Master Command Center/i },
      { role: "hod", testId: "role-operational-command-center", heading: /Head of Department/i },
      { role: "dean-academics", testId: "role-operational-command-center", heading: /^Dean of Academics$/i },
      { role: "deputy-principal", testId: "deputy-principal-command-center", heading: /Deputy Principal/i },
      { role: "exams-manager", testId: "role-operational-command-center", heading: /Exams Manager/i },
      { role: "principal", testId: "principal-practical-command-center", heading: /Exam Performance Trend/i },
    ];

    for (const routeCase of cases) {
      const view = renderWithProviders(
        <SchoolPages
          role={routeCase.role}
          section="exams"
          tenantSlug="lakeview-school"
          routeMode="public"
          liveDataEnabled={false}
        />,
      );

      expect(await screen.findByTestId(routeCase.testId)).toBeVisible();
      expect((await screen.findAllByRole("heading", { name: routeCase.heading })).length).toBeGreaterThan(0);
      expect(view.container.querySelector(".enterprise-shell")).not.toBeInTheDocument();
      view.unmount();
    }
  }, 30000);

  it("switches live role workspaces without reusing generic or static dashboard content", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages role="secretary" tenantSlug="lakeview-school" routeMode="public" liveDataEnabled={false} />,
    );

    const commandCenter = await screen.findByTestId("live-role-command-center");
    expect(commandCenter).toHaveAttribute("data-role", "secretary");
    expect(within(commandCenter).getByRole("heading", { name: /Secretary Dashboard/i })).toBeVisible();
    expect(within(commandCenter).queryByText(/5 parents waiting|9 documents requested|Kisumu Boys/i)).not.toBeInTheDocument();

    await user.click(within(commandCenter).getByRole("button", { name: /Open reception queue/i }));

    expect((await within(commandCenter).findAllByRole("heading", { name: /Reception Queue/i })).length).toBeGreaterThanOrEqual(1);
    expect(await within(commandCenter).findByText(/No visitors in the queue/i)).toBeVisible();
    expect(window.location.pathname).toBe("/school/secretary/reception-queue");
    expect(screen.queryByTestId("role-operational-command-center")).not.toBeInTheDocument();

    const queueRequest = fetchMock.mock.calls.find(
      ([input]) => String(input) === "/api/admin-command/secretary/reception-queue",
    );
    expect(queueRequest?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ "x-tenant-id": "lakeview-school" }),
    }));
  });

  it("shows a truthful laboratory load failure and keeps retry visible", async () => {
    const user = userEvent.setup();
    let inventoryHealthy = false;
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/permissions/me")) return Promise.resolve(jsonResponse({ data: ["labs:read"] }));
      if (url === "/api/labs/inventory") {
        return Promise.resolve(inventoryHealthy
          ? jsonResponse({ items: [], locations: [] })
          : jsonResponse({ message: "laboratory service unavailable" }, 503));
      }
      if (url === "/api/labs/locations") return Promise.resolve(jsonResponse([]));
      return Promise.resolve(jsonResponse(genericPayload(url)));
    });

    renderWithProviders(
      <SchoolPages
        role="laboratory-technician"
        section="lab-inventory"
        tenantSlug="lakeview-school"
        routeMode="public"
        liveDataEnabled={false}
      />,
    );

    const alert = await screen.findByRole("alert", {}, { timeout: 5000 });
    expect(alert).toHaveTextContent(/Laboratory records could not be loaded/i);
    expect(alert).toHaveTextContent(/no stock has been changed/i);
    const failedAttempts = fetchMock.mock.calls.filter(([input]) => String(input) === "/api/labs/inventory").length;
    expect(failedAttempts).toBeGreaterThanOrEqual(1);

    inventoryHealthy = true;
    await user.click(within(alert).getByRole("button", { name: /Retry/i }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
    expect(await screen.findByText(/No laboratory items have been added yet/i)).toBeVisible();
  }, 15000);

  it("keeps live queues page-scrolled, mobile navigable, and wide tables horizontally scrollable", async () => {
    renderWithProviders(
      <SchoolPages
        role="nurse"
        section="visits"
        tenantSlug="lakeview-school"
        routeMode="public"
        liveDataEnabled={false}
      />,
    );

    const commandCenter = await screen.findByTestId("live-role-command-center");
    expect(commandCenter.className.split(/\s+/)).toContain("min-h-dvh");
    expect(commandCenter.className.split(/\s+/)).not.toContain("h-screen");
    expect(screen.getByTestId("nurse-mobile-workspace-nav")).toBeVisible();

    const table = await within(commandCenter).findByRole("table");
    expect(table.parentElement?.className.split(/\s+/)).toContain("overflow-x-auto");
    expect(table).toHaveTextContent(/Student/);
    expect(table).toHaveTextContent(/Actions/);
  });
});
