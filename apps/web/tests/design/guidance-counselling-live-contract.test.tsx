import fs from "node:fs";
import path from "node:path";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SchoolPages } from "@/components/school/school-pages";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/auth/csrf-client", () => ({
  getCsrfToken: jest.fn(async () => "csrf-counselling-contract-token"),
}));

function jsonResponse(body: unknown, init?: ResponseInit) {
  const status = init?.status ?? 200;
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
    text: async () => JSON.stringify(body),
    clone() { return this; },
  } as Response;
}

const options = {
  students: [{ id: "11111111-1111-4111-8111-111111111111", label: "Amina Njeri - ADM-001" }],
  guardians: [{ id: "22222222-2222-4222-8222-222222222222", label: "Jane Njeri - Amina Njeri", student_id: "11111111-1111-4111-8111-111111111111" }],
  referrals: [],
};

function installFetchMock(overrides?: { sessionsFailure?: boolean }) {
  const fetchMock = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.startsWith("/api/permissions/me")) {
      return Promise.resolve(jsonResponse({ data: ["counselling:read", "counselling:write"] }));
    }
    if (url.includes("/api/admin-command/guidance-counselling/options")) {
      return Promise.resolve(jsonResponse(options));
    }
    if (url.includes("/api/admin-command/guidance-counselling/sessions") && (!init?.method || init.method === "GET")) {
      if (overrides?.sessionsFailure) return Promise.resolve(jsonResponse({ message: "Counselling database unavailable" }, { status: 503 }));
      return Promise.resolve(jsonResponse({
        metrics: { sessions_today: 1, upcoming: 1, completed_this_term: 0 },
        sessionsList: [{
          id: "33333333-3333-4333-8333-333333333333",
          student_name: "Amina Njeri",
          class: "Grade 8 Unity",
          counsellor: "Grace Wanjiku",
          date: "2026-08-24",
          time: "10:00",
          agenda: "Academic stress check-in",
          location: "Counselling office",
          status: "Scheduled",
        }],
      }));
    }
    if (url.includes("/api/admin-command/guidance-counselling/settings") && (!init?.method || init.method === "GET")) {
      return Promise.resolve(jsonResponse({
        settings: { notify_referrer_on_acceptance: true, require_audit_reason: true, default_case_visibility: "restricted" },
        saved_at: "2026-08-22T08:00:00.000Z",
        saved_by_user_id: "44444444-4444-4444-8444-444444444444",
      }));
    }
    if (init?.method && init.method !== "GET") return Promise.resolve(jsonResponse({ success: true }));
    return Promise.resolve(jsonResponse({ data: [] }));
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

async function renderRoute(section: string, heading: RegExp, tenantSlug = "kisumu-boys") {
  renderWithProviders(
    <SchoolPages role="guidance-counselling" section={section} tenantSlug={tenantSlug} routeMode="public" liveDataEnabled={false} />,
  );
  const center = await screen.findByTestId("live-role-command-center");
  await within(center).findByRole("heading", { name: heading });
  return center;
}

describe("guidance counselling live contracts", () => {
  afterEach(() => jest.restoreAllMocks());

  it("schedules a real session with the tenant-scoped sessions contract", async () => {
    const fetchMock = installFetchMock();
    const user = userEvent.setup();
    const center = await renderRoute("sessions", /^Counselling Sessions$/i);

    await user.click(await within(center).findByRole("button", { name: /Schedule Session/i }));
    await user.selectOptions(within(center).getByLabelText("Student"), options.students[0].id);
    fireEvent.change(within(center).getByLabelText("Date and time"), { target: { value: "2026-08-24T10:00" } });
    await user.type(within(center).getByLabelText("Session agenda"), "Confidential academic stress follow-up");
    const scheduleButtons = within(center).getAllByRole("button", { name: /^Schedule Session$/i });
    await user.click(scheduleButtons[scheduleButtons.length - 1]);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin-command/guidance-counselling/sessions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-tenant-id": "kisumu-boys" }),
        body: expect.stringContaining("Confidential academic stress follow-up"),
      }),
    ));
  });

  it("shows a retryable failure instead of converting a failed read into an empty list", async () => {
    const fetchMock = installFetchMock({ sessionsFailure: true });
    const center = await renderRoute("sessions", /^Counselling Sessions$/i, "failure-school");
    const alert = await within(center).findByRole("alert");
    expect(alert).toHaveTextContent(/could not be loaded/i);
    expect(alert).toHaveTextContent(/503/i);
    await userEvent.click(within(alert).getByRole("button", { name: /Retry/i }));
    await waitFor(() => expect(fetchMock.mock.calls.filter(([input]) => String(input).includes("/guidance-counselling/sessions")).length).toBeGreaterThan(1));
  });

  it("maps the legacy settings route to live tenant settings and persists changes", async () => {
    const fetchMock = installFetchMock();
    const user = userEvent.setup();
    const center = await renderRoute("settings", /^Counselling Settings$/i);
    expect(within(center).getAllByRole("button", { name: /Settings/i }).length).toBeGreaterThan(0);
    const auditToggle = await within(center).findByRole("checkbox", { name: /Require an audit reason/i });
    await user.click(auditToggle);
    await user.click(within(center).getByRole("button", { name: /Save Settings/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin-command/guidance-counselling/settings",
      expect.objectContaining({ method: "POST", body: expect.stringContaining('"require_audit_reason":false') }),
    ));
  });

  it("keeps controller writes bound to persistent service methods and report downloads", () => {
    const controller = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/guidance-counselling-command.controller.ts"), "utf8");
    const service = fs.readFileSync(path.join(process.cwd(), "../api/src/modules/admin-command/guidance-counselling-command.service.ts"), "utf8");
    expect(controller).toMatch(/service\.createSession\(dto\)/);
    expect(controller).toMatch(/service\.createWelfareNote\(dto\)/);
    expect(controller).toMatch(/service\.createFollowUp\(dto\)/);
    expect(controller).toMatch(/service\.createParentEngagement\(dto\)/);
    expect(controller).toMatch(/reports\/:snapshotId\/download/);
    expect(service).toMatch(/WHERE session\.tenant_id = \$1/);
    expect(service).toMatch(/WHERE welfare\.tenant_id = \$1/);
    expect(service).toMatch(/WHERE followup\.tenant_id::text = \$1/);
    expect(service).toMatch(/WHERE engagement\.tenant_id::text = \$1/);
    expect(service).not.toMatch(/counselling_follow_ups/);
    expect(service).not.toMatch(/counselling_parent_engagements/);
  });
});
