import { screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import type { SchoolExperienceRole } from "@/lib/experiences/types";

import { renderDashboardScreen, renderWithProviders } from "./test-utils";

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

const liveRoleIds: SchoolExperienceRole[] = [
  "secretary",
  "storekeeper",
  "librarian",
  "nurse",
  "boarding-master",
  "security-officer",
  "transport-manager",
  "laboratory-technician",
  "ict-manager",
  "guidance-counselling",
  "discipline-master",
  "student",
];

const dedicatedRoleCases: Array<{
  role: SchoolExperienceRole;
  testId: string;
  heading?: RegExp;
}> = [
  { role: "principal", testId: "principal-practical-command-center", heading: /Principal Dashboard/i },
  { role: "deputy-principal", testId: "deputy-principal-command-center", heading: /Deputy Principal Dashboard/i },
  { role: "accountant", testId: "accountant-command-center", heading: /Accountant Dashboard/i },
  { role: "bursar", testId: "accountant-command-center", heading: /Bursar Dashboard/i },
  { role: "teacher", testId: "teacher-command-center", heading: /Teacher Dashboard/i },
  { role: "admissions", testId: "admissions-dashboard-command-center", heading: /Admissions Officer Dashboard/i },
];

function genericPayload(url: string) {
  if (url.startsWith("/api/permissions/me")) {
    return { data: ["nurse:read", "nurse:write", "labs:read", "labs:write"] };
  }

  if (url === "/api/auth/csrf") {
    return { token: "role-contract-csrf" };
  }

  if (url.includes("/class-teacher/my-classes")) {
    return { classes: [] };
  }

  if (url.includes("/class-teacher/")) {
    return [];
  }

  return {
    metrics: {},
    summary: {},
    queue: [],
    records: [],
    items: [],
    visits: [],
    classes: [],
    students: [],
    notifications: [],
  };
}

describe("school role command-center contracts", () => {
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

  it("keeps the historical generic dashboard smoke renderer available", () => {
    renderDashboardScreen({ role: "admin" });

    expect(screen.getByTestId("dashboard-view")).toBeVisible();
    expect(screen.getByTestId("quick-actions")).toBeVisible();
  });

  it.each(dedicatedRoleCases)(
    "routes $role to its dedicated live command center",
    async ({ role, testId, heading }) => {
      renderWithProviders(
        createElement(SchoolPages, {
          role,
          tenantSlug: "lakeview-school",
          routeMode: "public",
          liveDataEnabled: false,
        }),
      );

      const commandCenter = await screen.findByTestId(testId);
      expect(commandCenter).toBeVisible();
      if (heading) {
        expect(within(commandCenter).getAllByRole("heading", { name: heading }).length).toBeGreaterThan(0);
      }
      expect(screen.getAllByTestId(testId)).toHaveLength(1);
      expect(commandCenter.closest(".enterprise-shell")).toBeNull();
    },
  );

  it.each(liveRoleIds)(
    "routes %s to the integrated tenant-fed command center",
    async (role) => {
      renderWithProviders(
        createElement(SchoolPages, {
          role,
          tenantSlug: "lakeview-school",
          routeMode: "public",
          liveDataEnabled: false,
        }),
      );

      const commandCenter = await screen.findByTestId("live-role-command-center");
      expect(commandCenter).toHaveAttribute("data-role", role);
      expect(screen.getAllByTestId("live-role-command-center")).toHaveLength(1);
      expect(screen.queryByTestId("role-operational-command-center")).not.toBeInTheDocument();
      expect(commandCenter.closest(".enterprise-shell")).toBeNull();
    },
  );

  it("keeps the class teacher and academic leadership on their distinct live workspaces", async () => {
    const cases: Array<{
      role: SchoolExperienceRole;
      heading: RegExp;
      centerTestId?: string;
    }> = [
      { role: "class-teacher", heading: /Class Teacher Dashboard/i },
      { role: "grade-master", heading: /Grade\/Form Master Command Center/i, centerTestId: "role-operational-command-center" },
      { role: "hod", heading: /Head of Department/i, centerTestId: "role-operational-command-center" },
      { role: "dean-academics", heading: /Dean of Academics Dashboard/i, centerTestId: "role-operational-command-center" },
      { role: "exams-manager", heading: /Exams Manager/i, centerTestId: "role-operational-command-center" },
    ];

    for (const routeCase of cases) {
      const view = renderWithProviders(
        createElement(SchoolPages, {
          role: routeCase.role,
          tenantSlug: "lakeview-school",
          routeMode: "public",
          liveDataEnabled: false,
        }),
      );

      expect((await screen.findAllByRole("heading", { name: routeCase.heading })).length).toBeGreaterThan(0);
      if (routeCase.centerTestId) {
        expect(screen.getAllByTestId(routeCase.centerTestId)).toHaveLength(1);
      }
      expect(view.container.querySelector(".enterprise-shell")).not.toBeInTheDocument();
      view.unmount();
    }
  }, 30000);

  it("fails closed before rendering school records when the tenant context is missing", async () => {
    renderWithProviders(<SchoolPages role="secretary" routeMode="public" liveDataEnabled={false} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(/School context is unavailable/i);
    expect(screen.queryByTestId("live-role-command-center")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/admin-command|students|finance|labs/i),
      expect.anything(),
    );
  });

  it("records a nurse visit through the live API contract without accepting a client supplied school id", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/permissions/me")) {
        return Promise.resolve(jsonResponse({ data: ["nurse:read", "nurse:write"] }));
      }
      if (url === "/api/auth/csrf") {
        return Promise.resolve(jsonResponse({ token: "nurse-visit-csrf" }));
      }
      if (url === "/api/admin-command/nurse/visits" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ id: "visit-1", status: "Open" }, 201));
      }
      if (url === "/api/admin-command/nurse/visits") {
        return Promise.resolve(jsonResponse({
          metrics: { total_visits: 0, open_visits: 0, referred: 0 },
          visits: [],
        }));
      }
      return Promise.resolve(jsonResponse(genericPayload(url)));
    });

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
    expect(within(commandCenter).getByRole("heading", { name: /Health Visits/i })).toBeVisible();
    expect(await within(commandCenter).findByText(/No health visits found/i)).toBeVisible();

    const visitsGet = fetchMock.mock.calls.find(
      ([input, init]) => String(input) === "/api/admin-command/nurse/visits" && (!init || init.method === "GET"),
    );
    expect(visitsGet?.[1]).toEqual(expect.objectContaining({
      headers: expect.objectContaining({ "x-tenant-id": "lakeview-school" }),
      credentials: "include",
    }));

    await user.click(within(commandCenter).getByRole("button", { name: /New Visit/i }));
    const formHeading = within(commandCenter).getByRole("heading", { name: /Record New Visit/i });
    const formRegion = formHeading.parentElement;
    expect(formRegion).not.toBeNull();
    const fields = within(formRegion as HTMLElement).getAllByRole("textbox");
    await user.type(fields[0], "Amina Noor");
    await user.type(fields[2], "Persistent headache");
    await user.click(within(formRegion as HTMLElement).getByRole("button", { name: /Save Visit/i }));

    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(
        ([input, init]) => String(input) === "/api/admin-command/nurse/visits" && init?.method === "POST",
      );
      expect(postCall).toBeDefined();
      const body = JSON.parse(String(postCall?.[1]?.body)) as Record<string, unknown>;
      expect(body).toEqual(expect.objectContaining({
        student_name: "Amina Noor",
        complaint: "Persistent headache",
      }));
      expect(body).not.toHaveProperty("school_id");
      expect(postCall?.[1]).toEqual(expect.objectContaining({
        credentials: "include",
        headers: expect.objectContaining({ "x-myshule-csrf": "nurse-visit-csrf" }),
      }));
    });
  });

  it("does not misreport a failed health-visit request as an empty school", async () => {
    const user = userEvent.setup();
    let visitsHealthy = false;
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.startsWith("/api/permissions/me")) {
        return Promise.resolve(jsonResponse({ data: ["nurse:read"] }));
      }
      if (url === "/api/admin-command/nurse/visits") {
        return Promise.resolve(visitsHealthy
          ? jsonResponse({
              metrics: { total_visits: 0, open_visits: 0, referred: 0 },
              visits: [],
            })
          : jsonResponse({ message: "clinic service unavailable" }, 503));
      }
      return Promise.resolve(jsonResponse(genericPayload(url)));
    });

    renderWithProviders(
      <SchoolPages
        role="nurse"
        section="visits"
        tenantSlug="lakeview-school"
        routeMode="public"
        liveDataEnabled={false}
      />,
    );

    const alert = await screen.findByRole("alert", {}, { timeout: 5000 });
    expect(alert).toHaveTextContent(/Health visits could not be loaded/i);
    expect(alert).toHaveTextContent(/Existing records were not changed/i);
    expect(screen.queryByText(/No health visits found/i)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /New Visit/i })).toBeDisabled();

    visitsHealthy = true;
    await user.click(within(alert).getByRole("button", { name: /Retry health visits/i }));

    expect(await screen.findByText(/No health visits found/i)).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  }, 15000);

  it("keeps query results isolated when the active school changes", async () => {
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("/api/permissions/me")) {
        return Promise.resolve(jsonResponse({ data: ["nurse:read"] }));
      }
      if (url === "/api/admin-command/nurse/visits") {
        const tenantId = (init?.headers as Record<string, string> | undefined)?.["x-tenant-id"];
        return Promise.resolve(jsonResponse(tenantId === "school-a"
          ? {
              metrics: { total_visits: 1, open_visits: 1, referred: 0 },
              visits: [{
                id: "visit-school-a",
                student_name: "School A Learner",
                class_name: "Grade 8 East",
                complaint: "Headache",
                diagnosis: "",
                treatment: "Rest",
                status: "Open",
                visit_date: "2026-08-22",
              }],
            }
          : {
              metrics: { total_visits: 0, open_visits: 0, referred: 0 },
              visits: [],
            }));
      }
      return Promise.resolve(jsonResponse(genericPayload(url)));
    });

    const view = renderWithProviders(
      <SchoolPages key="school-a" role="nurse" section="visits" tenantSlug="school-a" routeMode="public" />,
    );
    expect(await screen.findByText("School A Learner")).toBeVisible();

    view.rerender(
      <SchoolPages key="school-b" role="nurse" section="visits" tenantSlug="school-b" routeMode="public" />,
    );

    expect(await screen.findByText(/No health visits found/i)).toBeVisible();
    expect(screen.queryByText("School A Learner")).not.toBeInTheDocument();
    const tenantHeaders = fetchMock.mock.calls
      .filter(([input]) => String(input) === "/api/admin-command/nurse/visits")
      .map(([, init]) => (init?.headers as Record<string, string> | undefined)?.["x-tenant-id"]);
    expect(tenantHeaders).toEqual(expect.arrayContaining(["school-a", "school-b"]));
  });
});
