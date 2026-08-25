import fs from "node:fs";
import path from "node:path";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import type { SchoolExperienceRole } from "@/lib/experiences/types";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/auth/csrf-client", () => ({
  getCsrfToken: jest.fn(async () => "csrf-operational-module-token"),
}));

const fakeOnlyPhrases = /Action completed|Workflow dispatched|completed successfully|is being sent|print started|export generated/i;

jest.setTimeout(30000);

function jsonResponse(body: unknown, init?: ResponseInit) {
  const status = init?.status ?? 200;
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone() {
      return this;
    },
  } as Response;
}

function installSchoolApiMock() {
  const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);

    if (url.startsWith("/api/permissions/me")) {
      return Promise.resolve(jsonResponse({
        data: [
          "health:write",
          "library:write",
          "inventory:write",
          "boarding:write",
          "transport:write",
          "labs:write",
          "discipline:write",
          "counselling:write",
        ],
      }));
    }

    if (init?.method && init.method !== "GET") {
      return Promise.resolve(jsonResponse({ success: true }));
    }

    if (url.includes("/api/admin-command/nurse/visits")) {
      return Promise.resolve(jsonResponse({ metrics: { total_visits: 0, open_visits: 0, referred: 0 }, visits: [] }));
    }
    if (url.includes("/api/admin-command/librarian/issue-book")) {
      return Promise.resolve(jsonResponse({ metrics: { issued_today: 0, total_active_issues: 0, due_this_week: 0 }, recent_issues: [] }));
    }
    if (url.includes("/api/admin-command/storekeeper/items")) {
      return Promise.resolve(jsonResponse({ metrics: { total_items: 0, total_categories: 0, total_stock_value: 0 }, categories: [], items: [] }));
    }
    if (url.includes("/api/admin-command/boarding-master/boarding-attendance")) {
      return Promise.resolve(jsonResponse({ metrics: { checks_today: 0, clear: 0, attention_required: 0 }, boardingattendanceList: [] }));
    }
    if (url.includes("/api/admin-command/boarding-master/references")) {
      return Promise.resolve(jsonResponse({
        houses: [{ id: "11111111-1111-4111-8111-111111111111", title: "Tana House" }],
        students: [{
          id: "22222222-2222-4222-8222-222222222222",
          admission_number: "ADM-001",
          student_name: "Amina Njeri",
          house_id: "11111111-1111-4111-8111-111111111111",
          house_name: "Tana House",
          hostel_name: "Main Hostel",
        }],
        guardians: [],
        wardens: [],
      }));
    }
    if (url.includes("/api/admin-command/transport-manager/routes")) {
      return Promise.resolve(jsonResponse({ metrics: { total_routes: 0, active_routes: 0 }, routesList: [] }));
    }
    if (url.includes("/api/admin-command/guidance-counselling/referral-options")) {
      return Promise.resolve(jsonResponse({
        students: [{ id: "11111111-1111-4111-8111-111111111111", label: "Amina Njeri - ADM-001", class_id: "22222222-2222-4222-8222-222222222222" }],
        classes: [{ id: "22222222-2222-4222-8222-222222222222", label: "Grade 8 Unity" }],
        terms: [{ id: "33333333-3333-4333-8333-333333333333", label: "Term 2" }],
        years: [{ id: "44444444-4444-4444-8444-444444444444", label: "2026" }],
        incidents: [],
      }));
    }
    if (url.includes("/api/admin-command/guidance-counselling/referrals")) {
      return Promise.resolve(jsonResponse({ metrics: { pending_referrals: 0, accepted: 0, external: 0 }, referralsList: [] }));
    }
    if (url.includes("/api/discipline/incident-options")) {
      return Promise.resolve(jsonResponse({
        students: [{ id: "11111111-1111-4111-8111-111111111111", label: "Amina Njeri - ADM-001", class_id: "22222222-2222-4222-8222-222222222222" }],
        classes: [{ id: "22222222-2222-4222-8222-222222222222", label: "Grade 8 Unity" }],
        terms: [{ id: "33333333-3333-4333-8333-333333333333", label: "Term 2" }],
        years: [{ id: "44444444-4444-4444-8444-444444444444", label: "2026" }],
        offense_categories: [{ id: "55555555-5555-4555-8555-555555555555", label: "Bullying", default_severity: "high" }],
      }));
    }
    if (url.includes("/api/discipline/incidents")) {
      return Promise.resolve(jsonResponse([]));
    }
    if (url.includes("/api/labs/issues") || url.includes("/api/labs/requests")) {
      return Promise.resolve(jsonResponse([]));
    }

    return Promise.resolve(jsonResponse({ data: [] }));
  });

  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function readWebSource(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

async function renderOperationalRoute(role: SchoolExperienceRole, section: string, expectedHeading: RegExp) {
  renderWithProviders(
    <SchoolPages
      role={role}
      section={section}
      tenantSlug="kisumu-boys"
      routeMode="public"
      liveDataEnabled={false}
    />,
  );

  const commandCenter = await screen.findByTestId("live-role-command-center");
  expect(commandCenter).toHaveAttribute("data-role", role);
  const matchingHeadings = await within(commandCenter).findAllByRole("heading", { name: expectedHeading });
  expect(matchingHeadings[0]).toBeVisible();
  return commandCenter;
}

function expectSourceContracts(sourcePath: string, patterns: RegExp[]) {
  const source = readWebSource(sourcePath);

  for (const pattern of patterns) {
    expect(source).toMatch(pattern);
  }
}

function expectNoFakeOnlyFeedback(surface: HTMLElement) {
  expect(surface.textContent).not.toMatch(fakeOnlyPhrases);
}

describe("operational module production readiness", () => {
  beforeEach(() => {
    installSchoolApiMock();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("routes nurse visits to the canonical health workspace with persisted visit actions", async () => {
    const surface = await renderOperationalRoute("nurse", "visits", /Health Visits/i);

    expect(within(surface).getByRole("navigation", { name: /nurse workspace navigation/i })).toBeVisible();
    expect(within(surface).getByRole("button", { name: /New Visit/i })).toBeVisible();
    expect(within(surface).getByText(/Record and manage student health visits/i)).toBeVisible();
    expectSourceContracts("src/components/school/nurse/visits-workspace.tsx", [
      /useSchoolQuery<VisitsData>\('\/admin-command\/nurse\/visits'\)/,
      /createVisit/,
      /closeVisit/,
      /referVisit/,
    ]);
    expectNoFakeOnlyFeedback(surface);
  });

  it("routes librarian issuing to the canonical circulation workspace", async () => {
    const surface = await renderOperationalRoute("librarian", "issue-book", /^Issue Book$/i);

    expect(within(surface).getByRole("navigation", { name: /librarian workspace navigation/i })).toBeVisible();
    expect(within(surface).getAllByRole("button", { name: /Issue Book/i }).length).toBeGreaterThan(0);
    expect(within(surface).getByText(/track active book loans/i)).toBeVisible();
    expectSourceContracts("src/components/school/librarian/issue-book-workspace.tsx", [
      /admin-command\/librarian\/issue-book/,
      /issueBookToStudent/,
      /Confirm Issue/,
    ]);
    expectNoFakeOnlyFeedback(surface);
  });

  it("routes storekeeper inventory to the canonical stock catalogue with real mutations", async () => {
    const surface = await renderOperationalRoute("storekeeper", "items", /Inventory Items/i);

    expect(within(surface).getByRole("navigation", { name: /storekeeper workspace navigation/i })).toBeVisible();
    expect(await within(surface).findByRole("button", { name: /Add Item/i })).toBeVisible();
    expectSourceContracts("src/components/school/storekeeper/items-workspace.tsx", [
      /admin-command\/storekeeper\/items/,
      /createItem/,
      /receiveStock/,
      /issueStock/,
    ]);
    expectNoFakeOnlyFeedback(surface);
  });

  it("submits a tenant-scoped boarding roll call instead of rendering a read-only list", async () => {
    const user = userEvent.setup();
    const fetchMock = global.fetch as unknown as jest.Mock;
    const surface = await renderOperationalRoute("boarding-master", "boarding-attendance", /Boarding Attendance/i);
    const submitButton = within(surface).getByRole("button", { name: /Submit Roll Call/i });

    await waitFor(() => expect(submitButton).toBeEnabled());
    await user.click(submitButton);
    await user.selectOptions(
      within(surface).getByLabelText(/Boarding house/i),
      "11111111-1111-4111-8111-111111111111",
    );
    await user.selectOptions(within(surface).getByLabelText(/Check result/i), "attention_required");
    await user.type(within(surface).getByLabelText(/Notes/i), "One learner is missing from evening roll call");
    await user.click(within(surface).getByRole("checkbox", { name: /Amina Njeri/i }));
    await user.click(within(surface).getByRole("button", { name: /Confirm Roll Call/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin-command/boarding-master/boarding-attendance",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "x-tenant-id": "kisumu-boys" }),
          body: expect.stringContaining("attention_required"),
        }),
      );
    });
    expectSourceContracts("src/components/school/boarding-master/boarding-attendance-workspace.tsx", [
      /useSchoolMutation/,
      /admin-command\/boarding-master\/boarding-attendance/,
      /attention_required/,
    ]);
  });

  it("creates a transport route through the tenant-scoped live contract", async () => {
    const user = userEvent.setup();
    const fetchMock = global.fetch as unknown as jest.Mock;
    const surface = await renderOperationalRoute("transport-manager", "routes", /^Routes$/i);
    const addButton = within(surface).getByRole("button", { name: /Add Route/i });

    await waitFor(() => expect(addButton).toBeEnabled());
    await user.click(addButton);
    await user.type(within(surface).getByLabelText(/Route name/i), "Westlands Morning");
    await user.type(within(surface).getByLabelText(/Route code/i), "WEST-AM");
    await user.click(within(surface).getByRole("button", { name: /Save Route/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin-command/transport-manager/routes",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "x-tenant-id": "kisumu-boys" }),
          body: expect.stringContaining("Westlands Morning"),
        }),
      );
    });
    expect(within(surface).getByText(/No routes exist for this school/i)).toBeVisible();
  });

  it("routes laboratory issue and return to the reconciled stock workflow", async () => {
    const surface = await renderOperationalRoute("laboratory-technician", "apparatus-issue", /Issue and Return Book/i);

    expect(within(surface).getByRole("navigation", { name: /laboratory technician workspace navigation/i })).toBeVisible();
    expect(within(surface).getByRole("button", { name: /Issue Prepared Items/i })).toBeDisabled();
    expect(within(surface).getByText(/All issued laboratory items have been returned or accounted for/i)).toBeVisible();
    expectSourceContracts("src/components/school/laboratory-technician/apparatus-issue-workspace.tsx", [
      /\/labs\/requests/,
      /\/labs\/issues/,
      /confirm-practical-issue/,
      /receive-practical-return/,
      /submission_id/,
    ]);
    expectNoFakeOnlyFeedback(surface);
  });

  it("routes discipline incident intake to the canonical incident API and option pickers", async () => {
    const user = userEvent.setup();
    const surface = await renderOperationalRoute("discipline-master", "incident-log", /Incident Log/i);
    const reportButton = within(surface).getByRole("button", { name: /Report Incident/i });

    await waitFor(() => expect(reportButton).toBeEnabled());
    await user.click(reportButton);
    expect(within(surface).getByLabelText(/Student/i)).toHaveDisplayValue(/Select student/i);
    expect(within(surface).getByLabelText(/Offense category/i)).toHaveDisplayValue(/Select offense/i);
    expect(within(surface).queryByPlaceholderText(/uuid/i)).not.toBeInTheDocument();
    expectSourceContracts("src/components/school/discipline-master/incident-log-workspace.tsx", [
      /useSchoolQuery<DisciplineIncident\[]>/,
      /"\/discipline\/incidents"/,
      /"\/discipline\/incident-options"/,
      /useSchoolMutation/,
    ]);
    expectNoFakeOnlyFeedback(surface);
  });

  it("creates counselling referrals from tenant-scoped student and academic options", async () => {
    const user = userEvent.setup();
    const fetchMock = global.fetch as unknown as jest.Mock;
    const surface = await renderOperationalRoute("guidance-counselling", "referrals", /^Referrals$/i);
    const newReferral = within(surface).getByRole("button", { name: /New Referral/i });

    await waitFor(() => expect(newReferral).toBeEnabled());
    await user.click(newReferral);
    await user.selectOptions(within(surface).getByLabelText(/Student/i), "11111111-1111-4111-8111-111111111111");
    await user.type(within(surface).getByLabelText(/Referral reason/i), "Learner requested confidential academic stress support");
    await user.click(within(surface).getByRole("button", { name: /Save Referral/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/admin-command/guidance-counselling/referrals",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "x-tenant-id": "kisumu-boys" }),
          body: expect.stringContaining("11111111-1111-4111-8111-111111111111"),
        }),
      );
    });
    expectSourceContracts("src/components/school/guidance-counselling/referrals-workspace.tsx", [
      /referral-options/,
      /useSchoolMutation/,
      /counselling:write/,
    ]);
  });
});
