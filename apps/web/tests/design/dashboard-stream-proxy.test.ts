/** @jest-environment node */
import { NextRequest } from "next/server";
import { proxySchoolApiRequest } from "@/lib/dashboard/server-api-proxy";

jest.mock("next/headers", () => ({ cookies: async () => ({}) }));
jest.mock("@/lib/auth/server-session", () => ({
  ...jest.requireActual("@/lib/auth/server-session"),
  readExperienceSessionCookie: () => ({ tenantSlug: "school-a", role: "teacher" }),
  readAccessCookie: () => "fixture-access-token",
  readRefreshCookie: () => null,
  readTenantCookie: () => "school-a",
}));
jest.mock("@/lib/dashboard/api-client", () => ({ getDashboardApiBaseUrl: () => "https://api.example.invalid" }));

describe("dashboard streaming proxy", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });

  it("preserves named stream bytes, trusted tenant context and client cancellation", async () => {
    const abort = new AbortController();
    const request = new NextRequest("https://school.example.invalid/api/events/dashboard/stream?tenantSlug=school-a", {
      headers: { Accept: "text/event-stream", Authorization: "Bearer forged-token", "x-tenant-id": "school-b" },
      signal: abort.signal,
    });
    const frame = 'event: dashboard.events\ndata: {"tenant_id":"school-a","events":[]}\n\n';
    const fetchMock = jest.fn().mockResolvedValue(new Response(frame, { headers: { "content-type": "text/event-stream" } }));
    global.fetch = fetchMock;
    const response = await proxySchoolApiRequest(request, { params: { path: ["dashboard", "stream"] } }, "/events");
    expect(await response.text()).toBe(frame);
    expect(response.headers.get("cache-control")).toBe("no-store, no-transform");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.example.invalid/events/dashboard/stream");
    expect(init.headers).toMatchObject({ Authorization: "Bearer fixture-access-token", "x-tenant-id": "school-a" });
    expect(init.signal.aborted).toBe(false);
    abort.abort();
    expect(init.signal.aborted).toBe(true);
  });

  it("rejects a mismatched tenant before opening the upstream stream", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock;
    const response = await proxySchoolApiRequest(new NextRequest(
      "https://school.example.invalid/api/events/dashboard/stream?tenantSlug=school-b",
      { headers: { Accept: "text/event-stream" } },
    ), { params: { path: ["dashboard", "stream"] } }, "/events");
    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
