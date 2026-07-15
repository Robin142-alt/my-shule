import fs from "node:fs";
import path from "node:path";
import { screen, within } from "@testing-library/react";

import { SchoolPages } from "@/components/school/school-pages";
import type { SchoolExperienceRole } from "@/lib/experiences/types";

import { renderWithProviders } from "./test-utils";

const fakeOnlyPhrases = /Action completed|Workflow dispatched|completed successfully|is being sent|print started|export generated/i;

jest.setTimeout(20000);

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

  const matchingHeadings = await screen.findAllByRole("heading", { name: expectedHeading });
  expect(matchingHeadings.length).toBeGreaterThan(0);
  expect(matchingHeadings[0]).toBeVisible();
  return document.body;
}

function expectSourceContracts(sourcePath: string, patterns: RegExp[]) {
  const source = readWebSource(sourcePath);

  for (const pattern of patterns) {
    expect(source).toMatch(pattern);
  }
}

function expectNoFakeOnlyFeedback() {
  expect(document.body.textContent).not.toMatch(fakeOnlyPhrases);
}

function expectVisibleButton(surface: HTMLElement, name: RegExp) {
  const buttons = within(surface).getAllByRole("button", { name });
  expect(buttons.length).toBeGreaterThan(0);
  expect(buttons[0]).toBeVisible();
}

describe("operational module production readiness", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("routes nurse visit workspaces to the new health dashboard with persisted clinic actions", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }) as unknown as typeof fetch;

    const surface = await renderOperationalRoute("nurse", "visits", /Visits/i);

    expect(within(surface).getByRole("navigation", { name: /nurse workspace navigation/i })).toBeVisible();
    expectVisibleButton(surface, /New Visit/i);
    expect(within(surface).getByText(/Record and manage student health visits/i)).toBeVisible();
    expectSourceContracts("src/components/school/nurse/visits-workspace.tsx", [
      /useSchoolQuery<VisitsData>\('\/admin-command\/nurse\/visits'\)/,
      /createVisit/,
      /closeVisit/,
      /referVisit/,
    ]);
    expectNoFakeOnlyFeedback();
  });

  it("routes librarian issuing to the new circulation workspace with persisted issue and report actions", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }) as unknown as typeof fetch;

    const surface = await renderOperationalRoute("librarian", "issue", /Issue Books/i);

    expect(within(surface).getByRole("navigation", { name: /librarian navigation/i })).toBeVisible();
    expect(within(surface).getAllByRole("heading", { name: /Issue Books/i }).length).toBeGreaterThan(0);
    expect(within(surface).getByText(/Fast book issuing using barcode scan or manual search/i)).toBeVisible();
    expectSourceContracts("src/components/school/librarian-command-center.tsx", [
      /admin-command\/librarian\/circulation-options/,
      /admin-command\/librarian\/actions/,
      /admin-command\/librarian\/reports\/generate/,
      /openPrintDocument/,
    ]);
    expectNoFakeOnlyFeedback();
  });

  it("routes storekeeper inventory control to a stock command surface with audited receive and issue actions", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }) as unknown as typeof fetch;

    const surface = await renderOperationalRoute("storekeeper", "inventory", /Storekeeper command center/i);

    expect(within(surface).getByRole("navigation", { name: /storekeeper command navigation/i })).toBeVisible();
    expectVisibleButton(surface, /Receive Stock/i);
    expectVisibleButton(surface, /Issue Item/i);
    expectSourceContracts("src/components/school/storekeeper-command-center.tsx", [
      /admin-command\/storekeeper\/actions/,
      /admin-command\/storekeeper\/items\/receive/,
      /admin-command\/storekeeper\/items\/issue/,
      /publishSchoolOperationalEvent/,
    ]);
    expectNoFakeOnlyFeedback();
  });

  it("routes boarding roll call to the new hostel workspace with persisted attendance records", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }) as unknown as typeof fetch;

    const surface = await renderOperationalRoute("boarding-master", "roll-call", /Daily Roll Call/i);

    expect(within(surface).getByRole("navigation", { name: /boarding master navigation/i })).toBeVisible();
    expectVisibleButton(surface, /Start Roll Call/i);
    expectVisibleButton(surface, /Print Missing List/i);
    expectSourceContracts("src/components/school/boarding-master-command-center.tsx", [
      /admin-command\/boarding-master\/boarding-attendance/,
      /admin-command\/boarding-master\/actions/,
      /admin-command\/boarding-master\/reports\/generate/,
    ]);
    expectNoFakeOnlyFeedback();
  });

  it("routes transport route planning to the new fleet workspace with persisted route and report actions", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }) as unknown as typeof fetch;

    const surface = await renderOperationalRoute("transport-manager", "routes", /Routes & Stops/i);

    expect(within(surface).getByRole("navigation", { name: /transport manager navigation/i })).toBeVisible();
    expect(within(surface).getByText(/Logistics planner for route cards/i)).toBeVisible();
    expectVisibleButton(surface, /Add stop/i);
    expectVisibleButton(surface, /Optimize route/i);
    expectSourceContracts("src/components/school/transport-manager-command-center.tsx", [
      /admin-command\/transport-manager\/routes/,
      /admin-command\/transport-manager\/actions/,
      /admin-command\/transport-manager\/reports\/generate/,
    ]);
    expectNoFakeOnlyFeedback();
  });

  it("routes laboratory teacher requests to the new lab workspace with persisted workflow and print evidence", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }) as unknown as typeof fetch;

    const surface = await renderOperationalRoute("laboratory-technician", "requests", /Teacher Requests/i);

    expect(within(surface).getByRole("navigation", { name: /lab navigation/i })).toBeVisible();
    expectVisibleButton(surface, /Create Request Manually/i);
    expectVisibleButton(surface, /Bulk Approve/i);
    expectSourceContracts("src/components/school/laboratory-technician-command-center.tsx", [
      /admin-command\/laboratory-technician\/actions/,
      /openPrintDocument/,
      /publishSchoolOperationalEvent/,
    ]);
    expectNoFakeOnlyFeedback();
  });

  it("routes discipline incident logging to the new discipline office with governed record actions", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }) as unknown as typeof fetch;

    const surface = await renderOperationalRoute("discipline-master", "log-incident", /Log Incident/i);

    expectVisibleButton(surface, /Log Incident/i);
    expect(within(surface).getByText(/Recent Log Incident/i)).toBeVisible();
    expectSourceContracts("src/components/school/discipline-master/shared.tsx", [
      /requestDashboardApi/,
      /source: "discipline-master-dashboard"/,
      /downloadCsvFile/,
    ]);
    expectNoFakeOnlyFeedback();
  });

  it("routes counselling cases to the new counsellor workspace with private persisted case workflows", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) }) as unknown as typeof fetch;

    const surface = await renderOperationalRoute("guidance-counselling", "cases", /Good Morning, Counsellor/i);

    expectVisibleButton(surface, /New Case/i);
    expect(within(surface).getByText(/Confidential student cases/i)).toBeVisible();
    expectSourceContracts("src/components/school/counsellor-command-center.tsx", [
      /admin-command\/guidance-counselling\/referrals/,
      /admin-command\/guidance-counselling\/actions/,
      /admin-command\/guidance-counselling\/reports\/generate/,
      /admin-command\/guidance-counselling\/settings/,
    ]);
    expectNoFakeOnlyFeedback();
  });
});
