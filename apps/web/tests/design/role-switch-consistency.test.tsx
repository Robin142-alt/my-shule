import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";

import { normalizeDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import { replaceDashboardDocument } from "@/lib/auth/dashboard-role-navigation";
import { SchoolDashboardRoleProvider, useSchoolDashboardRole } from "@/lib/auth/school-dashboard-role-context";
import { SESSION_VERIFICATION_TIMEOUT_MS, useExperienceSession } from "@/lib/auth/use-experience-session";
import { SchoolDashboardSessionGate } from "@/components/school/school-dashboard-session-gate";
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
    // Start an explicit access refresh to exercise a real in-flight role read.
    // Dashboard initialization itself must reuse the authenticated context.
    let reloading!: Promise<void>;
    await act(async () => { reloading = roleState.reloadDashboardRoles(); });
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
    await act(async () => {
      oldRoles.resolve(response({ roleContext: context("principal") }));
      await reloading;
    });
    expect(screen.getByTestId("active-role")).toHaveTextContent("teacher");
    expect(replaceDashboardDocument).toHaveBeenCalledTimes(1);
    expect(routerReplaceMock).not.toHaveBeenCalled();
    await act(async () => { await roleState.switchDashboardRole("principal"); });
    expect(jest.mocked(fetch).mock.calls.filter(([url]) => url === "/api/auth/active-role")).toHaveLength(1);
  });

  test("dashboard initialization makes one session request and does not wait on duplicate role access", async () => {
    jest.mocked(fetch).mockImplementation(async (url) => {
      if (String(url).startsWith("/api/auth/me")) return response(payload("principal"));
      throw new Error(`Unnecessary request ${url}`);
    });
    render(<SchoolDashboardRoleProvider initialRole="principal" tenantSlug="school-a" routeMode="public"><Probe /></SchoolDashboardRoleProvider>, { wrapper });
    await waitFor(() => expect(roleState.isLoading).toBe(false));
    expect(roleState.availableRoles).toHaveLength(2);
    expect(roleState.error).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  test("retry after an authentication outage restores identity, tenant and dashboard access", async () => {
    jest.mocked(fetch)
      .mockResolvedValueOnce(response({ message: "Authentication service is temporarily unavailable." }, 503))
      .mockResolvedValueOnce(response(payload("principal")));
    render(<SchoolDashboardRoleProvider initialRole="principal" tenantSlug="school-a" routeMode="public"><Probe /></SchoolDashboardRoleProvider>, { wrapper });
    await waitFor(() => expect(roleState.error).toMatch(/temporarily unavailable/));
    expect(roleState.authenticatedUser).toBeNull();
    await act(async () => { await roleState.reloadDashboardRoles(); });
    await waitFor(() => expect(roleState.isLoading).toBe(false));
    expect(roleState.error).toBeNull();
    expect(roleState.userId).toBe("user-a");
    expect(roleState.tenantSlug).toBe("school-a");
    expect(roleState.availableRoles).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(jest.mocked(fetch).mock.calls.every(([url]) => String(url).startsWith("/api/auth/me"))).toBe(true);
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

  test("an unauthorized new dashboard stops loading and retries without logout", async () => {
    jest.mocked(fetch)
      .mockResolvedValueOnce(response({ message: "No active session found." }, 401))
      .mockResolvedValueOnce(response(payload("teacher")));
    render(<SchoolDashboardRoleProvider initialRole="teacher" tenantSlug="school-a" routeMode="public">
      <SchoolDashboardSessionGate><p>Verified teacher workspace</p><Probe /></SchoolDashboardSessionGate>
    </SchoolDashboardRoleProvider>, { wrapper });
    expect(await screen.findByRole("alert")).toHaveTextContent("No active session found");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Verified teacher workspace")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry session verification" }));
    expect(await screen.findByText("Verified teacher workspace")).toBeInTheDocument();
    expect(roleState.activeRole).toBe("teacher");
    expect(roleState.userId).toBe("user-a");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  test("a stalled session request ends with recovery controls", async () => {
    jest.useFakeTimers();
    try {
      jest.mocked(fetch).mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }));
      render(<SchoolDashboardRoleProvider initialRole="teacher" routeMode="public">
        <SchoolDashboardSessionGate><p>Protected workspace</p></SchoolDashboardSessionGate>
      </SchoolDashboardRoleProvider>, { wrapper });
      await act(async () => { jest.advanceTimersByTime(SESSION_VERIFICATION_TIMEOUT_MS); });
      expect(screen.getByRole("alert")).toHaveTextContent("took too long");
      expect(screen.getByRole("button", { name: "Retry session verification" })).toBeEnabled();
      expect(screen.queryByText("Protected workspace")).not.toBeInTheDocument();
    } finally { jest.useRealTimers(); }
  });

  test.each(["public", "hosted"] as const)("%s verifies a fresh document after switching and can switch back", async (routeMode) => {
    let active = "principal";
    jest.mocked(fetch).mockImplementation(async (url, init) => {
      if (url === "/api/auth/active-role") active = JSON.parse(String(init?.body)).role_code;
      return response(payload(active));
    });
    const open = (role: "principal" | "teacher") => render(
      <SchoolDashboardRoleProvider initialRole={role} tenantSlug="school-a" routeMode={routeMode}>
        <SchoolDashboardSessionGate><Probe /></SchoolDashboardSessionGate>
      </SchoolDashboardRoleProvider>, { wrapper });
    const first = open("principal");
    await waitFor(() => expect(screen.getByTestId("active-role")).toHaveTextContent("principal"));
    await waitFor(() => expect(roleState.availableRoles).toHaveLength(2));
    await act(async () => { await roleState.switchDashboardRole("teacher"); });
    first.unmount();
    const second = open("teacher");
    await waitFor(() => expect(screen.getByTestId("active-role")).toHaveTextContent("teacher"));
    await waitFor(() => expect(roleState.availableRoles).toHaveLength(2));
    expect(roleState.isSwitching).toBe(false);
    await act(async () => { await roleState.switchDashboardRole("principal"); });
    second.unmount();
    open("principal");
    await waitFor(() => expect(screen.getByTestId("active-role")).toHaveTextContent("principal"));
    await waitFor(() => expect(roleState.isLoading).toBe(false));
    expect(roleState.error).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(5);
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
