import fs from "node:fs";
import path from "node:path";

import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/dashboard/api-client", () => ({
  ...jest.requireActual("@/lib/dashboard/api-client"),
  requestDashboardApi: jest.fn(),
}));

const requestDashboardApiMock = jest.mocked(requestDashboardApi);

jest.setTimeout(15_000);

const visitorId = "00000000-0000-4000-8000-000000000901";
const incidentId = "00000000-0000-4000-8000-000000000902";
const staffMovementId = "00000000-0000-4000-8000-000000000903";
const pendingPassId = "00000000-0000-4000-8000-000000000904";
const verifiedPassId = "00000000-0000-4000-8000-000000000905";
const outPassId = "00000000-0000-4000-8000-000000000906";

const responses: Record<string, unknown> = {
  "/admin-command/security-officer/visitors": {
    metrics: { checked_in: 1, checked_out_today: 0, flagged: 0 },
    visitorsList: [{
      id: visitorId,
      name: "Jane Wambui",
      id_number: "12345678",
      purpose: "Meet the principal",
      host: "Principal Amina",
      check_in: "2026-08-22T08:00:00.000Z",
      check_out: "",
      status: "Active",
    }],
  },
  "/admin-command/security-officer/gate-register": {
    metrics: { entries_today: 1, exits_today: 0, pending_verification: 1 },
    gateregisterList: [{
      id: visitorId,
      time: "2026-08-22T08:00:00.000Z",
      name: "Jane Wambui",
      type: "Visitor",
      id_number: "12345678",
      purpose: "Meet the principal",
      status: "Active",
    }],
  },
  "/admin-command/security-officer/incidents": {
    metrics: { open_incidents: 1, resolved_today: 0, escalated: 0 },
    incidentsList: [{
      id: incidentId,
      date: "2026-08-22T08:10:00.000Z",
      description: "Unattended bag beside the administration block",
      location: "Administration block",
      severity: "High",
      status: "Reported",
    }],
  },
  "/admin-command/security-officer/staff-movement": {
    metrics: { currently_out: 1, departed_today: 1, returned_today: 0 },
    staffmovementList: [{
      id: staffMovementId,
      staff_name: "Mr Otieno",
      department: "Mathematics",
      departed_at: "2026-08-22T09:00:00.000Z",
      expected_return: "2026-08-22T11:00:00.000Z",
      status: "Departed",
    }],
  },
  "/admin-command/security-officer/student-exit-passes": {
    metrics: { active_passes: 3, pending_verification: 1, returned_today: 0 },
    studentexitpassesList: [
      {
        id: pendingPassId,
        student_name: "Achieng Otieno",
        class: "Grade 8 East",
        authorized_by: "Deputy Principal",
        exit_time: "2026-08-22T10:00:00.000Z",
        return_time: "",
        status: "Pending",
      },
      {
        id: verifiedPassId,
        student_name: "Brian Mwangi",
        class: "Grade 9 West",
        authorized_by: "Principal",
        exit_time: "2026-08-22T10:30:00.000Z",
        return_time: "",
        status: "Verified",
      },
      {
        id: outPassId,
        student_name: "Faith Akinyi",
        class: "Grade 7 North",
        authorized_by: "Deputy Principal",
        exit_time: "2026-08-22T09:30:00.000Z",
        return_time: "",
        status: "Out",
      },
    ],
  },
};

describe("Security Officer production readiness", () => {
  let originalFetch: typeof global.fetch;
  let grantedPermissions: string[];

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
    grantedPermissions = ["security:read", "security:write"];
    global.fetch = jest.fn(async (input) => {
      if (String(input).startsWith("/api/permissions/me?schoolId=")) {
        return {
          ok: true,
          json: async () => ({ data: grantedPermissions }),
        } as Response;
      }
      return { ok: true, json: async () => ({ data: [] }) } as Response;
    }) as typeof global.fetch;

    requestDashboardApiMock.mockImplementation(async (apiPath, options) => {
      if (options?.method && options.method !== "GET") {
        return { success: true, message: "Security record updated." } as never;
      }
      return (responses[apiPath] ?? []) as never;
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("keeps every workspace wired to its governed command endpoints and visible failure state", () => {
    const sourceFor = (name: string) => fs.readFileSync(
      path.join(process.cwd(), "src/components/school/security-officer", name),
      "utf8",
    );
    const visitors = sourceFor("visitors-workspace.tsx");
    const gate = sourceFor("gate-register-workspace.tsx");
    const incidents = sourceFor("incidents-workspace.tsx");
    const staff = sourceFor("staff-movement-workspace.tsx");
    const passes = sourceFor("student-exit-passes-workspace.tsx");

    for (const source of [visitors, gate, incidents, staff, passes]) {
      expect(source).toMatch(/useSchoolMutation/);
      expect(source).toMatch(/usePermissions/);
      expect(source).toMatch(/security:write/);
      expect(source).toMatch(/WorkspaceQueryFailure/);
      expect(source).not.toMatch(/No school-scoped records are loaded/);
    }

    expect(visitors).toMatch(/visitors\/check-in/);
    expect(visitors).toMatch(/visitors\/\$\{id\}\/check-out/);
    expect(visitors).toMatch(/visitors\/\$\{id\}\/flag/);
    expect(visitors).toMatch(/visitors\/\$\{id\}\/print-badge/);
    expect(gate).toMatch(/gate-register\/\$\{id\}\/exit/);
    expect(incidents).toMatch(/incidents\/\$\{id\}\/escalate/);
    expect(incidents).toMatch(/incidents\/\$\{id\}\/resolve/);
    expect(staff).toMatch(/staff-movement\/departure/);
    expect(staff).toMatch(/staff-movement\/entry/);
    expect(staff).toMatch(/staff-movement\/\$\{id\}\/return/);
    expect(passes).toMatch(/student-exit-passes\/flag-unauthorized/);
    expect(passes).toMatch(/student-exit-passes\/\$\{id\}\/verify/);
    expect(passes).toMatch(/student-exit-passes\/\$\{id\}\/exit/);
    expect(passes).toMatch(/student-exit-passes\/\$\{id\}\/return/);
  });

  it("submits a validated visitor check-in through the verified school tenant", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SchoolPages role="security-officer" section="visitors" tenantSlug="lakeview-school" userLabel="Officer Kamau" />,
    );

    const openForm = await screen.findByRole("button", { name: /Check in visitor/i });
    await waitFor(() => expect(openForm).toBeEnabled());
    await user.click(openForm);
    await user.type(screen.getByLabelText("Visitor name"), "Grace Njeri");
    await user.type(screen.getByLabelText("ID or passport number"), "87654321");
    await user.type(screen.getByLabelText("Phone number"), "+254700000901");
    await user.type(screen.getByLabelText("Visit purpose"), "Collect admission letter");
    await user.type(screen.getByLabelText("Host account ID"), "00000000-0000-4000-8000-000000000999");
    await user.click(screen.getByRole("button", { name: "Save check-in" }));

    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        "/admin-command/security-officer/visitors/check-in",
        {
          method: "POST",
          tenantId: "lakeview-school",
          body: {
            visitor_name: "Grace Njeri",
            phone_number: "+254700000901",
            id_number: "87654321",
            purpose: "Collect admission letter",
            host_user_id: "00000000-0000-4000-8000-000000000999",
          },
        },
      );
    });
  });

  it("records gate exits and staff departures through their exact tenant-scoped paths", async () => {
    const user = userEvent.setup();
    const gateRender = renderWithProviders(
      <SchoolPages role="security-officer" section="gate-register" tenantSlug="mwangaza-school" />,
    );
    const gateExit = await screen.findByRole("button", { name: "Record exit" });
    await waitFor(() => expect(gateExit).toBeEnabled());
    await user.click(gateExit);
    await waitFor(() => expect(requestDashboardApiMock).toHaveBeenCalledWith(
      `/admin-command/security-officer/gate-register/${visitorId}/exit`,
      { method: "POST", tenantId: "mwangaza-school", body: { id: visitorId } },
    ));
    gateRender.unmount();

    renderWithProviders(
      <SchoolPages role="security-officer" section="staff-movement" tenantSlug="mwangaza-school" />,
    );
    const openMovement = await screen.findByRole("button", { name: /Log staff movement/i });
    await waitFor(() => expect(openMovement).toBeEnabled());
    await user.click(openMovement);
    await user.type(screen.getByLabelText("Staff reference"), "00000000-0000-4000-8000-000000000910");
    await user.type(screen.getByLabelText("Staff display name"), "Ms Atieno");
    await user.type(screen.getByLabelText("Staff department"), "Science");
    await user.type(screen.getByLabelText("Staff movement notes"), "County education meeting");
    await user.click(screen.getByRole("button", { name: "Record departure" }));

    await waitFor(() => expect(requestDashboardApiMock).toHaveBeenCalledWith(
      "/admin-command/security-officer/staff-movement/departure",
      {
        method: "POST",
        tenantId: "mwangaza-school",
        body: {
          staff_id: "00000000-0000-4000-8000-000000000910",
          staff_name: "Ms Atieno",
          department: "Science",
          expected_return: "",
          notes: "County education meeting",
        },
      },
    ));
  });

  it("uses governed incident and exit-pass transitions instead of generic action logging", async () => {
    const user = userEvent.setup();
    const incidentRender = renderWithProviders(
      <SchoolPages role="security-officer" section="incidents" tenantSlug="safety-first-school" />,
    );
    const incidentRow = (await screen.findByText("Unattended bag beside the administration block")).closest("tr");
    expect(incidentRow).not.toBeNull();
    const escalate = within(incidentRow as HTMLTableRowElement).getByRole("button", { name: "Escalate" });
    await waitFor(() => expect(escalate).toBeEnabled());
    await user.click(escalate);
    await waitFor(() => expect(requestDashboardApiMock).toHaveBeenCalledWith(
      `/admin-command/security-officer/incidents/${incidentId}/escalate`,
      { method: "POST", tenantId: "safety-first-school", body: { id: incidentId } },
    ));
    incidentRender.unmount();

    renderWithProviders(
      <SchoolPages role="security-officer" section="student-exit-passes" tenantSlug="safety-first-school" />,
    );
    const pendingRow = (await screen.findByText("Achieng Otieno")).closest("tr") as HTMLTableRowElement;
    const verifiedRow = screen.getByText("Brian Mwangi").closest("tr") as HTMLTableRowElement;
    const outRow = screen.getByText("Faith Akinyi").closest("tr") as HTMLTableRowElement;
    const verify = within(pendingRow).getByRole("button", { name: "Verify" });
    const logExit = within(verifiedRow).getByRole("button", { name: "Log exit" });
    const logReturn = within(outRow).getByRole("button", { name: "Log return" });
    await waitFor(() => expect(verify).toBeEnabled());
    await user.click(verify);
    await user.click(logExit);
    await user.click(logReturn);

    await waitFor(() => {
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        `/admin-command/security-officer/student-exit-passes/${pendingPassId}/verify`,
        { method: "POST", tenantId: "safety-first-school", body: { id: pendingPassId } },
      );
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        `/admin-command/security-officer/student-exit-passes/${verifiedPassId}/exit`,
        { method: "POST", tenantId: "safety-first-school", body: { id: verifiedPassId } },
      );
      expect(requestDashboardApiMock).toHaveBeenCalledWith(
        `/admin-command/security-officer/student-exit-passes/${outPassId}/return`,
        { method: "POST", tenantId: "safety-first-school", body: { id: outPassId } },
      );
    });
  });

  it("keeps write controls visibly locked when the active role lacks security write permission", async () => {
    grantedPermissions = ["security:read"];
    renderWithProviders(
      <SchoolPages role="security-officer" section="visitors" tenantSlug="read-only-school" />,
    );

    const checkIn = await screen.findByRole("button", { name: /Check in visitor/i });
    await waitFor(() => expect(checkIn).toHaveAttribute("title", "Security write permission is required"));
    expect(checkIn).toBeDisabled();
    expect(await screen.findByText("Jane Wambui")).toBeVisible();
  });
});
