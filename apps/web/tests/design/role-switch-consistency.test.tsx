import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { normalizeDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import { replaceDashboardDocument } from "@/lib/auth/dashboard-role-navigation";
import { SchoolDashboardRoleProvider, useSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import { useExperienceSession } from "@/lib/auth/use-experience-session";
import { routerReplaceMock } from "./router-mock";

jest.mock("@/lib/auth/dashboard-role-navigation", () => ({ replaceDashboardDocument: jest.fn() }));
jest.mock("@/lib/auth/csrf-client", () => ({ getCsrfToken: async () => "test-csrf" }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function context(role: string) {
  return normalizeDashboardRoleContext({
    primary_role: "principal", active_role: role, assigned_roles: ["principal", "teacher"],
    available_roles: ["principal", "teacher"].map((code) => ({
      role_code: code, role_name: code, is_primary: code === "principal",
      is_teacher_mode: code === "teacher", sources: ["primary_membership"],
    })), teacher_dashboard_eligible: true,
  }, "principal");
}

function payload(role: string) {
  const user = { user_id: "user-a", tenant_id: "school-a", role, email: "staff@example.test",
    display_name: "School Staff", session_id: "session-a", permissions: ["auth:read"] };
  const roleContext = context(role);
  return { roleContext, user, session: { audience: "school" as const, tenantSlug: "school-a",
    userLabel: "School Staff", role, roleContext, user, homePath: `/school/${role}`, redirectTo: `/school/${role}` } };
}

function response(body: unknown, status = 200) {
  return { ok: status === 200, status, json: async () => body } as Response;
}

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
}

let roleState: ReturnType<typeof useSchoolDashboardRole>;
function Probe() {
  const state = useSchoolDashboardRole();
  useEffect(() => { roleState = state; }, [state]);
  return <div data-testid="active-role">{state.activeAuthorizationRoleCode}</div>;
}

describe("role switch consistency", () => {
  beforeEach(() => {
    jest.mocked(replaceDashboardDocument).mockReset();
    window.sessionStorage.clear();
    global.fetch = jest.fn();
  });

  test.each(["public", "hosted"] as const)("%s switches once and keeps late role reads from restoring the previous dashboard", async (routeMode) => {
    const oldRoles = deferred<Response>();
    const switched = deferred<Response>();
    jest.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).startsWith("/api/auth/me")) return response(payload("principal"));
      if (url === "/api/auth/dashboard-roles") return oldRoles.promise;
      if (url === "/api/auth/active-role") return switched.promise;
      throw new Error(`Unexpected request ${url}`);
    });
    const client = new QueryClient();
    const invalidate = jest.spyOn(client, "invalidateQueries");
    render(<QueryClientProvider client={client}>
      <SchoolDashboardRoleProvider initialRole="principal" tenantSlug="school-a" routeMode={routeMode}>
        <Probe />
      </SchoolDashboardRoleProvider>
    </QueryClientProvider>);
    await waitFor(() => expect(roleState.availableRoles).toHaveLength(2));
    let switching!: Promise<void>;
    await act(async () => {
      switching = roleState.switchDashboardRole("teacher");
      await roleState.switchDashboardRole("teacher");
    });
    expect(jest.mocked(fetch).mock.calls.filter(([url]) => url === "/api/auth/active-role")).toHaveLength(1);
    expect(replaceDashboardDocument).not.toHaveBeenCalled();
    await act(async () => {
      switched.resolve(response(payload("teacher")));
      await switching;
    });
    expect(replaceDashboardDocument).toHaveBeenCalledTimes(1);
    expect(replaceDashboardDocument).toHaveBeenCalledWith(routeMode === "public" ? "/school/teacher" : "/dashboard");
    expect(roleState.isSwitching).toBe(true);
    expect(invalidate).not.toHaveBeenCalled();
    await act(async () => { oldRoles.resolve(response({ roleContext: context("principal") })); });
    expect(screen.getByTestId("active-role")).toHaveTextContent("teacher");
    expect(replaceDashboardDocument).toHaveBeenCalledTimes(1);
    expect(routerReplaceMock).not.toHaveBeenCalled();
    await act(async () => { await roleState.switchDashboardRole("principal"); });
    expect(jest.mocked(fetch).mock.calls.filter(([url]) => url === "/api/auth/active-role")).toHaveLength(1);
  });

  test("a delayed session read cannot overwrite a confirmed switch", async () => {
    const oldSession = deferred<Response>();
    jest.mocked(fetch).mockImplementation(async (url) => String(url).startsWith("/api/auth/me")
      ? oldSession.promise : response(payload("teacher")));
    const { result } = renderHook(() => useExperienceSession("school", { autoLoad: true }), { wrapper });
    await act(async () => { await result.current.switchRole("teacher"); });
    expect(result.current.session?.roleContext?.activeAuthorizationRoleCode).toBe("teacher");
    await act(async () => { oldSession.resolve(response(payload("principal"))); });
    expect(result.current.session?.roleContext?.activeAuthorizationRoleCode).toBe("teacher");
  });

  test("a rejected switch retains the current dashboard and permits retry", async () => {
    let attempts = 0;
    jest.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).startsWith("/api/auth/me")) return response(payload("principal"));
      if (url === "/api/auth/dashboard-roles") return response({ roleContext: context("principal") });
      attempts += 1;
      return attempts === 1 ? response({ message: "Please retry" }, 503) : response(payload("teacher"));
    });
    render(<SchoolDashboardRoleProvider initialRole="principal" tenantSlug="school-a" routeMode="public"><Probe /></SchoolDashboardRoleProvider>, { wrapper });
    await waitFor(() => expect(roleState.isLoading).toBe(false));
    await act(async () => { await expect(roleState.switchDashboardRole("teacher")).rejects.toThrow("Please retry"); });
    expect(roleState.activeRole).toBe("principal");
    expect(roleState.isSwitching).toBe(false);
    expect(roleState.error).toBe("Please retry");
    expect(replaceDashboardDocument).not.toHaveBeenCalled();
    await act(async () => { await roleState.switchDashboardRole("teacher"); });
    expect(replaceDashboardDocument).toHaveBeenCalledWith("/school/teacher");
  });

  test("a server response for the previous role is rejected before session state changes", async () => {
    jest.mocked(fetch).mockResolvedValue(response(payload("principal")));
    const { result } = renderHook(() => useExperienceSession("school", { autoLoad: true }), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(async () => { await expect(result.current.switchRole("teacher")).rejects.toThrow("did not confirm"); });
    expect(result.current.session?.roleContext?.activeRole).toBe("principal");
    expect(replaceDashboardDocument).not.toHaveBeenCalled();
  });
});
