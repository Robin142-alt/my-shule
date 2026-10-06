import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode, type ReactNode } from "react";

import { SchoolDashboardSessionGate } from "@/components/school/school-dashboard-session-gate";
import { normalizeDashboardRoleContext } from "@/lib/auth/dashboard-role-context";
import type { ExperienceAudience } from "@/lib/auth/experience-audience";
import type { SchoolExperienceRole } from "@/lib/experiences/types";
import { SchoolDashboardRoleProvider } from "@/lib/auth/school-dashboard-role-context";
import { SESSION_REVALIDATION_MS, useExperienceSession } from "@/lib/auth/use-experience-session";

jest.mock("@/lib/auth/csrf-client", () => ({ getCsrfToken: async () => "test-csrf" }));

function payload(tenantSlug = "school-a", role: SchoolExperienceRole = "principal", userId = "user-a") {
  const user = { user_id: userId, tenant_id: tenantSlug, role, email: "staff@example.test",
    display_name: "School Staff", session_id: "session-a", permissions: ["auth:read"] };
  const roleContext = normalizeDashboardRoleContext(null, role);
  return { user, session: { audience: "school", tenantSlug, userLabel: "School Staff",
    role, roleContext, user, homePath: `/school/${role}`, redirectTo: `/school/${role}` } };
}

function response(body: unknown, status = 200, retryAfter?: string) {
  return { ok: status === 200, status, headers: new Headers(retryAfter ? { "retry-after": retryAfter } : {}), json: async () => body } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) =>
    <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { jest.restoreAllMocks(); });

test("sidebar route remounts reuse one verified session without the authentication screen", async () => {
  jest.mocked(fetch).mockResolvedValue(response(payload()));
  const { wrapper } = setup();
  function workspace(section: string) {
    return <SchoolDashboardRoleProvider key={section} initialRole="principal" tenantSlug="school-a" routeMode="public">
      <SchoolDashboardSessionGate><p>{section} workspace</p></SchoolDashboardSessionGate>
    </SchoolDashboardRoleProvider>;
  }
  const view = render(workspace("overview"), { wrapper });
  expect(await screen.findByText("overview workspace")).toBeVisible();
  for (const section of ["students", "staff", "finance", "reports", "settings", "overview"]) {
    view.rerender(workspace(section));
    expect(screen.getByText(`${section} workspace`)).toBeVisible();
    expect(screen.queryByText("Checking your session…")).not.toBeInTheDocument();
    expect(screen.queryByTestId("workspace-loading")).not.toBeInTheDocument();
  }
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("concurrent session consumers share the same in-flight verification", async () => {
  const pending = deferred<Response>();
  jest.mocked(fetch).mockReturnValue(pending.promise);
  const { wrapper } = setup();
  const first = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  const second = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  expect(fetch).toHaveBeenCalledTimes(1);
  await act(async () => { pending.resolve(response(payload())); });
  await waitFor(() => expect(first.result.current.user?.user_id).toBe("user-a"));
  expect(second.result.current.user?.user_id).toBe("user-a");
});

test("stale navigation stays usable during revalidation and closes access on rejection", async () => {
  const pending = deferred<Response>();
  const now = Date.now();
  const clock = jest.spyOn(Date, "now").mockReturnValue(now);
  jest.mocked(fetch).mockResolvedValueOnce(response(payload())).mockReturnValueOnce(pending.promise);
  const { wrapper } = setup();
  const first = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  await waitFor(() => expect(first.result.current.session).not.toBeNull());
  first.unmount();
  clock.mockReturnValue(now + SESSION_REVALIDATION_MS + 1);
  const second = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  expect(second.result.current.user?.user_id).toBe("user-a");
  expect(second.result.current.isLoading).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(2);
  await act(async () => { pending.resolve(response({ message: "Session revoked" }, 401)); });
  await waitFor(() => expect(second.result.current.errorStatus).toBe(401));
  expect(second.result.current.session).toBeNull();
  expect(second.result.current.user).toBeNull();
  expect(second.result.current.error).toBe("Session revoked");
});

test("changing the tenant or audience never renders the previous scope's identity", async () => {
  const pending = deferred<Response>();
  jest.mocked(fetch).mockResolvedValueOnce(response(payload())).mockReturnValue(pending.promise);
  const { wrapper } = setup();
  const { result, rerender } = renderHook(({ tenantSlug, audience }) =>
    useExperienceSession(audience, { tenantSlug, autoLoad: true }), {
    wrapper, initialProps: { tenantSlug: "school-a", audience: "school" as ExperienceAudience },
  });
  await waitFor(() => expect(result.current.user?.user_id).toBe("user-a"));
  rerender({ tenantSlug: "school-b", audience: "school" });
  expect(result.current.session).toBeNull();
  expect(result.current.isLoading).toBe(true);
  rerender({ tenantSlug: "school-a", audience: "portal" });
  expect(result.current.session).toBeNull();
  expect(result.current.isLoading).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(3);
});

test("failed verification is retryable on the next mount", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(response({ message: "Service unavailable" }, 503))
    .mockResolvedValueOnce(response(payload()));
  const { wrapper } = setup();
  const first = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  await waitFor(() => expect(first.result.current.errorStatus).toBe(503));
  first.unmount();
  const second = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  await waitFor(() => expect(second.result.current.session).not.toBeNull());
  expect(second.result.current.error).toBeNull();
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("confirmed logout clears cached identity and cancels an older session read", async () => {
  const pending = deferred<Response>();
  jest.mocked(fetch).mockImplementation(async (url) => url === "/api/auth/logout"
    ? response({ success: true }) : pending.promise);
  const { client, wrapper } = setup();
  const reader = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  const signOut = renderHook(() => useExperienceSession("school"), { wrapper });
  await act(async () => { await signOut.result.current.logout(); });
  reader.unmount();
  await act(async () => { pending.resolve(response(payload())); });
  expect(client.getQueryData(["experience-session", "school", "school-a"])).toBeUndefined();
  expect(signOut.result.current.session).toBeNull();
});

test("logging into another account replaces all tenant aliases and school data", async () => {
  jest.mocked(fetch).mockImplementation(async (url) => response(url === "/api/auth/login"
    ? payload("school-b", "teacher", "user-b") : payload()));
  const { client, wrapper } = setup();
  const first = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  await waitFor(() => expect(first.result.current.user?.user_id).toBe("user-a"));
  first.unmount();
  client.setQueryData(["school", "school-a", "user-a", "students"], ["private data"]);
  const login = renderHook(() => useExperienceSession("school"), { wrapper });
  await act(async () => { await login.result.current.login({ identifier: "staff-b@example.test", password: "test-password", tenantSlug: "school-b" }); });
  expect(client.getQueryData(["experience-session", "school", "school-a"])).toBeUndefined();
  expect(client.getQueryData(["school", "school-a", "user-a", "students"])).toBeUndefined();
  const next = renderHook(() => useExperienceSession("school", { tenantSlug: "school-b", autoLoad: true }), { wrapper });
  expect(next.result.current.user?.user_id).toBe("user-b");
  expect(next.result.current.isLoading).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(2);
});

test("a refresh started by another consumer cannot restore a logged-out identity", async () => {
  const pending = deferred<Response>();
  jest.mocked(fetch).mockImplementation(async (url) => {
    if (url === "/api/auth/refresh") return pending.promise;
    if (url === "/api/auth/logout") return response({ success: true });
    return response(payload());
  });
  const { client, wrapper } = setup();
  const reader = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  const signOut = renderHook(() => useExperienceSession("school"), { wrapper });
  await waitFor(() => expect(reader.result.current.session).not.toBeNull());
  let refreshing!: Promise<unknown>;
  await act(async () => { refreshing = reader.result.current.refresh(); });
  reader.unmount();
  await act(async () => { await signOut.result.current.logout(); });
  await act(async () => { pending.resolve(response(payload())); await refreshing; });
  expect(client.getQueryData(["experience-session", "school", "school-a"])).toBeUndefined();
  expect(signOut.result.current.session).toBeNull();
});

test("Strict Mode cancellation does not poison the shared session", async () => {
  jest.mocked(fetch).mockResolvedValue(response(payload()));
  const { wrapper: Providers } = setup();
  const wrapper = ({ children }: { children: ReactNode }) => <StrictMode><Providers>{children}</Providers></StrictMode>;
  const { result } = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  await waitFor(() => expect(result.current.user?.user_id).toBe("user-a"));
  expect(result.current.error).toBeNull();
});

test.each([429, 503])("temporary %s verification keeps the verified finance workspace and recovers", async (status) => {
  jest.mocked(fetch).mockResolvedValueOnce(response(payload("school-a", "accountant")))
    .mockResolvedValueOnce(response({ message: "Service busy" }, status, "45"))
    .mockResolvedValueOnce(response(payload("school-a", "accountant")));
  const now = Date.now();
  const clock = jest.spyOn(Date, "now").mockReturnValue(now);
  const { client, wrapper } = setup();
  render(<SchoolDashboardRoleProvider initialRole="accountant" tenantSlug="school-a" routeMode="public">
    <SchoolDashboardSessionGate><p>Fee structures workspace</p></SchoolDashboardSessionGate>
  </SchoolDashboardRoleProvider>, { wrapper });
  expect(await screen.findByText("Fee structures workspace")).toBeVisible();
  await act(async () => { await client.invalidateQueries({ queryKey: ["experience-session", "school"] }); });
  expect(screen.getByText("Fee structures workspace")).toBeVisible();
  expect(screen.queryByText("Let’s get you signed in")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent(status === 429 ? "temporarily busy" : "Service busy");
  if (status === 429) {
    expect(screen.getByRole("button", { name: "Retry in 45s" })).toBeDisabled();
    await act(async () => { await client.invalidateQueries({ queryKey: ["experience-session", "school"] }); });
    expect(fetch).toHaveBeenCalledTimes(2);
    clock.mockReturnValue(now + 45_001);
  }
  await act(async () => { await client.invalidateQueries({ queryKey: ["experience-session", "school"] }); });
  await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  expect(screen.getByText("Fee structures workspace")).toBeVisible();
  expect(fetch).toHaveBeenCalledTimes(3);
});

test("an initial rate limit does not grant access or demand another sign-in, and remounts respect Retry-After", async () => {
  jest.mocked(fetch).mockResolvedValue(response({ message: "Rate limit exceeded" }, 429, "60"));
  const { wrapper } = setup();
  const workspace = (key: string) => <SchoolDashboardRoleProvider key={key} initialRole="accountant" tenantSlug="school-a" routeMode="public">
    <SchoolDashboardSessionGate><p>Private finance data</p></SchoolDashboardSessionGate>
  </SchoolDashboardRoleProvider>;
  const view = render(workspace("first"), { wrapper });
  expect(await screen.findByText("Session check temporarily unavailable")).toBeVisible();
  expect(screen.queryByText("Private finance data")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Sign in again" })).not.toBeInTheDocument();
  view.rerender(workspace("second"));
  expect(await screen.findByText("Session check temporarily unavailable")).toBeVisible();
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("a forbidden session removes every cached identity alias", async () => {
  jest.mocked(fetch).mockResolvedValueOnce(response(payload())).mockResolvedValueOnce(response({ message: "Access removed" }, 403));
  const { client, wrapper } = setup();
  const { result } = renderHook(() => useExperienceSession("school", { tenantSlug: "school-a", autoLoad: true }), { wrapper });
  await waitFor(() => expect(result.current.session).not.toBeNull());
  client.setQueryData(["experience-session", "school", null], payload());
  await act(async () => { await result.current.reloadSession().catch(() => undefined); });
  expect(result.current.session).toBeNull();
  expect(client.getQueryData(["experience-session", "school", null])).toBeNull();
});
