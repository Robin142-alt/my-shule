import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { DeputyPrincipalCommandCenter } from "@/components/school/deputy-principal-command-center";
import { PrincipalCommandCenter } from "@/components/school/principal-command-center";
import { TeacherCommandCenter } from "@/components/school/teacher-command-center";
import { normalizeDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import { replaceDashboardDocument } from "@/lib/auth/dashboard-role-navigation";
import { SchoolDashboardRoleProvider } from "@/lib/auth/school-dashboard-role-context";

jest.mock("@/lib/auth/dashboard-role-navigation", () => ({ replaceDashboardDocument: jest.fn() }));
jest.mock("@/lib/auth/csrf-client", () => ({ getCsrfToken: async () => "test-csrf" }));
jest.mock("@/components/school/school-pages", () => ({
  buildSchoolSectionHref: (role: string, section: string) => `/school/${role}/${section}`,
}));
jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: () => ({ data: { schoolName: "Test School" }, isLoading: false }),
}));
jest.mock("@/components/shared/task-queue", () => ({ TaskQueue: () => null }));
jest.mock("@/components/shared/approval-inbox", () => ({ ApprovalInbox: () => null }));
jest.mock("@/components/shared/notification-bell", () => ({ NotificationBell: () => null }));
jest.mock("@/components/school/deputy-principal/overview-workspace", () => ({
  DeputyOverviewWorkspace: () => <p>Deputy overview</p>,
}));
jest.mock("@/components/school/teacher-dashboard/overview-workspace", () => ({
  OverviewWorkspace: () => <p>Teacher overview</p>,
}));
jest.mock("@/components/school/principal-dashboard/overview-workspace", () => ({
  PrincipalOverviewWorkspace: () => <p>Principal overview</p>,
}));
jest.mock("@/components/providers/permission-context", () => ({
  PermissionProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/lib/dashboard-communication/dashboard-communication-provider", () => ({
  DashboardCommunicationBoundary: ({ children }: { children: React.ReactNode }) => children,
}));

type LeadershipRole = "deputy_principal" | "principal";
type ActiveRole = LeadershipRole | "teacher";
let primaryRole: LeadershipRole;

function payload(activeRole: ActiveRole) {
  const roleContext = normalizeDashboardRoleContext({
    primary_role: primaryRole,
    active_role: activeRole,
    assigned_roles: [primaryRole],
    available_roles: [
      { role_code: primaryRole, role_name: primaryRole === "principal" ? "Principal" : "Deputy Principal", is_primary: true,
        is_teacher_mode: false, sources: ["primary_membership"] },
      { role_code: "teacher", role_name: "Teacher", is_primary: false,
        is_teacher_mode: true, sources: ["teacher_eligibility"] },
    ],
    teacher_dashboard_eligible: true,
  }, "deputy-principal");
  const user = { user_id: "deputy-a", tenant_id: "school-a", role: activeRole,
    email: "deputy@example.test", display_name: "School Deputy", session_id: "session-a",
    permissions: ["auth:read"] };
  return { roleContext, user, session: { audience: "school", tenantSlug: "school-a",
    userLabel: "School Deputy", role: roleContext.activeRole, roleContext, user,
    homePath: `/school/${roleContext.activeRole}`, redirectTo: `/school/${roleContext.activeRole}` } };
}

function response(body: unknown, status = 200) {
  return { ok: status === 200, status, json: async () => body } as Response;
}

function installSession(activeRole: ActiveRole, switchResponse: () => Promise<Response>) {
  jest.mocked(fetch).mockImplementation(async (url) => {
    if (String(url).startsWith("/api/auth/me")) return response(payload(activeRole));
    if (url === "/api/auth/dashboard-roles") return response({ roleContext: payload(activeRole).roleContext });
    if (url === "/api/auth/active-role") return switchResponse();
    throw new Error(`Unexpected request: ${url}`);
  });
}

function renderDashboard(activeRole: ActiveRole, routeMode: "public" | "hosted" = "public") {
  const role = activeRole === "deputy_principal" ? "deputy-principal" : activeRole;
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SchoolDashboardRoleProvider initialRole={role} tenantSlug="school-a" routeMode={routeMode}>
        {activeRole === "teacher" ? <TeacherCommandCenter routeMode={routeMode} /> : activeRole === "principal" ? (
          <PrincipalCommandCenter tenantSlug="school-a" userLabel="School Principal" routeMode={routeMode} />
        ) : (
          <DeputyPrincipalCommandCenter tenantSlug="school-a" userLabel="School Deputy" routeMode={routeMode} />
        )}
      </SchoolDashboardRoleProvider>
    </QueryClientProvider>,
  );
}

describe.each(["deputy_principal", "principal"] as const)("%s teacher dashboard switching", (leadershipRole) => {
  beforeEach(() => {
    primaryRole = leadershipRole;
    global.fetch = jest.fn();
    jest.mocked(replaceDashboardDocument).mockReset();
    window.sessionStorage.clear();
  });

  it.each(["public", "hosted"] as const)("switches from the %s leadership header only after server confirmation", async (routeMode) => {
    let confirm!: (value: Response) => void;
    const pending = new Promise<Response>((resolve) => { confirm = resolve; });
    installSession(primaryRole, () => pending);
    const user = userEvent.setup();
    renderDashboard(primaryRole, routeMode);

    const header = within(screen.getByRole("banner"));
    const trigger = await header.findByRole("button", { name: /switch dashboard.*principal/i });
    await user.click(trigger);
    const teacher = screen.getByRole("radio", { name: /^Teacher\b/i });
    expect(screen.queryByRole("radio", { name: /Accountant/i })).not.toBeInTheDocument();
    await user.click(teacher);

    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/auth/active-role", expect.objectContaining({
      method: "POST", credentials: "same-origin", body: JSON.stringify({ role_code: "teacher" }),
      headers: expect.objectContaining({ "x-myshule-csrf": "test-csrf" }),
    })));
    expect(teacher).toBeDisabled();
    expect(replaceDashboardDocument).not.toHaveBeenCalled();
    await act(async () => { confirm(response(payload("teacher"))); });
    await waitFor(() => expect(replaceDashboardDocument).toHaveBeenCalledWith(
      routeMode === "public" ? "/school/teacher" : "/dashboard",
    ));
    expect(jest.mocked(fetch).mock.calls.filter(([url]) => url === "/api/auth/active-role")).toHaveLength(1);
  });

  it("offers the leadership role on the teacher dashboard and switches back with its authorization code", async () => {
    installSession("teacher", async () => response(payload(primaryRole)));
    const user = userEvent.setup();
    renderDashboard("teacher");

    await user.click(await screen.findByRole("button", { name: /switch dashboard.*teacher/i }));
    await user.click(screen.getByRole("radio", { name: /Principal/i }));
    await waitFor(() => expect(replaceDashboardDocument).toHaveBeenCalledWith(
      primaryRole === "principal" ? "/school/principal" : "/school/deputy-principal",
    ));
    expect(fetch).toHaveBeenCalledWith("/api/auth/active-role", expect.objectContaining({
      body: JSON.stringify({ role_code: primaryRole }),
    }));
  });

  it("keeps a failed switch visible on the leadership dashboard and lets the user retry", async () => {
    const switchResponse = jest.fn()
      .mockResolvedValueOnce(response({ message: "Unable to switch dashboards. Please retry." }, 503))
      .mockResolvedValueOnce(response(payload("teacher")));
    installSession(primaryRole, switchResponse);
    const user = userEvent.setup();
    renderDashboard(primaryRole);

    await user.click(await screen.findByRole("button", { name: /switch dashboard.*principal/i }));
    await user.click(screen.getByRole("radio", { name: /^Teacher\b/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to switch dashboards. Please retry.");
    expect(replaceDashboardDocument).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: /Principal/i })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: /^Teacher\b/i }));
    await waitFor(() => expect(replaceDashboardDocument).toHaveBeenCalledWith("/school/teacher"));
  });
});
