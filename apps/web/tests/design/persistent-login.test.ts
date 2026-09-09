/** @jest-environment node */
import { NextRequest, NextResponse } from "next/server";
import { GET as me } from "@/app/api/auth/me/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { POST as login } from "@/app/api/auth/login/route";
import { setExperienceSessionCookies, type ExperienceGatewaySession } from "@/lib/auth/server-session";
import { validateCsrfRequest } from "@/lib/auth/csrf";
import { ACCESS_COOKIE, AUDIENCE_COOKIE, REFRESH_COOKIE, REMEMBER_SESSION_COOKIE, TENANT_COOKIE } from "@/lib/auth/session-cookies";

let jar = new Map<string, string>();
jest.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => jar.has(name) ? { value: jar.get(name) } : undefined }) }));

const token = (seconds: number) => `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds })).toString("base64url")}.signature`;
function session(audience: "school" | "portal" | "superadmin" = "school"): ExperienceGatewaySession {
  return { audience, homePath: "/school/teacher", redirectTo: "/school/teacher", tenantSlug: "school-a", userLabel: "Teacher",
    role: "teacher", accessToken: token(900), refreshToken: token(14 * 86400),
    user: { user_id: "user-a", tenant_id: "school-a", email: "teacher@example.test", display_name: "Teacher", role: "teacher", session_id: "session-a", permissions: ["auth:read"] },
  };
}
function saveCookies(response: NextResponse) {
  for (const cookie of response.cookies.getAll()) {
    if (cookie.maxAge === 0) jar.delete(cookie.name); else jar.set(cookie.name, cookie.value);
  }
}
function backendResponse(value: ExperienceGatewaySession) {
  return Response.json({ user: value.user, tokens: { access_token: value.accessToken, refresh_token: value.refreshToken } });
}
function post(path: string, body: unknown = {}) {
  return new NextRequest(`https://school.example.test/api/auth/${path}`, { method: "POST",
    headers: { "Content-Type": "application/json", cookie: "myshule.csrf=test-csrf", "x-myshule-csrf": "test-csrf" }, body: JSON.stringify(body) });
}

describe("persistent regular login", () => {
  const previousBase = process.env.SERVER_API_BASE_URL;
  beforeEach(() => { jar = new Map(); global.fetch = jest.fn(); process.env.SERVER_API_BASE_URL = "https://api.example.test"; });
  afterAll(() => { if (previousBase === undefined) delete process.env.SERVER_API_BASE_URL; else process.env.SERVER_API_BASE_URL = previousBase; });

  test.each(["school", "portal"] as const)("%s cookies survive restart without client-readable credentials", audience => {
    const response = NextResponse.json({});
    setExperienceSessionCookies(response, session(audience));
    for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, AUDIENCE_COOKIE, TENANT_COOKIE, REMEMBER_SESSION_COOKIE]) {
      const cookie = response.cookies.get(name)!;
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.sameSite).toBe("lax");
      expect(cookie.domain).toBeUndefined();
      expect(cookie.maxAge).toBeGreaterThan(14 * 86400 - 5);
      expect(cookie.maxAge).toBeLessThanOrEqual(14 * 86400);
    }
  });

  test("shared-device opt-out remains a session cookie and Super Admin keeps its previous persistence choice", () => {
    const response = NextResponse.json({});
    setExperienceSessionCookies(response, session(), { rememberSession: false });
    expect(response.cookies.get(REFRESH_COOKIE)?.maxAge).toBeUndefined();
    const admin = { ...session("superadmin"), refreshToken: token(30 * 86400) };
    setExperienceSessionCookies(response, admin);
    expect(response.cookies.get(REFRESH_COOKIE)?.maxAge).toBeUndefined();
    setExperienceSessionCookies(response, admin, { rememberSession: true });
    expect(response.cookies.get(REFRESH_COOKIE)?.maxAge).toBeGreaterThan(29 * 86400);
  });

  test("login defaults to persistence and never returns access/refresh tokens", async () => {
    jest.mocked(fetch).mockResolvedValueOnce(backendResponse(session()));
    const response = await login(post("login", { audience: "school", identifier: "teacher@example.test", password: "test-input-only" }));
    expect(response.status).toBe(200);
    expect(response.cookies.get(REFRESH_COOKIE)?.maxAge).toBeGreaterThan(0);
    expect(await response.text()).not.toContain("signature");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  test("a restarted browser restores a refresh-only session, rotates cookies and returns public user data", async () => {
    const response = NextResponse.json({});
    setExperienceSessionCookies(response, session()); saveCookies(response);
    jar.delete(ACCESS_COOKIE);
    const renewed = { ...session(), refreshToken: token(3 * 86400) };
    jest.mocked(fetch).mockResolvedValueOnce(backendResponse(renewed));
    const restored = await me(new Request("https://school.example.test/api/auth/me?audience=school"));
    expect(restored.status).toBe(200);
    expect(jest.mocked(fetch).mock.calls[0][0]).toContain("/auth/refresh");
    expect(restored.cookies.get(REFRESH_COOKIE)?.maxAge).toBeLessThanOrEqual(3 * 86400);
    expect(await restored.text()).not.toContain("signature");
  });

  test("an authentication outage preserves cookies but genuine expiry clears them", async () => {
    jar.set(AUDIENCE_COOKIE, "school"); jar.set(TENANT_COOKIE, "school-a"); jar.set(REFRESH_COOKIE, token(100));
    jest.mocked(fetch).mockResolvedValueOnce(Response.json({ message: "Unavailable" }, { status: 503 }));
    const unavailable = await me(new Request("https://school.example.test/api/auth/me?audience=school"));
    expect(unavailable.status).toBe(503);
    expect(unavailable.cookies.get(REFRESH_COOKIE)).toBeUndefined();
    jest.mocked(fetch).mockResolvedValueOnce(Response.json({ message: "Expired" }, { status: 401 }));
    const expired = await me(new Request("https://school.example.test/api/auth/me?audience=school"));
    expect(expired.status).toBe(401);
    expect(expired.cookies.get(REFRESH_COOKIE)?.maxAge).toBe(0);
  });

  test("logout revokes the backend family before deleting regular cookies and can retry outages", async () => {
    jar.set(AUDIENCE_COOKIE, "school"); jar.set(TENANT_COOKIE, "school-a"); jar.set(REFRESH_COOKIE, token(100));
    jest.mocked(fetch).mockResolvedValueOnce(Response.json({ message: "Unavailable" }, { status: 503 }));
    const unavailable = await logout(post("logout"));
    expect(unavailable.status).toBe(503);
    expect(unavailable.cookies.get(REFRESH_COOKIE)).toBeUndefined();
    jest.mocked(fetch).mockResolvedValueOnce(Response.json({ success: true }));
    const loggedOut = await logout(post("logout"));
    expect(loggedOut.status).toBe(200);
    expect(loggedOut.cookies.get(REFRESH_COOKIE)?.maxAge).toBe(0);
    expect(jest.mocked(fetch).mock.calls[1][0]).toContain("/auth/logout/refresh");
  });

  test("Super Admin logout makes no new upstream request", async () => {
    jar.set(AUDIENCE_COOKIE, "superadmin"); jar.set(REFRESH_COOKIE, token(100));
    expect((await logout(post("logout"))).status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });

  test("wrong-audience restoration cannot refresh or clear a different active session", async () => {
    jar.set(AUDIENCE_COOKIE, "superadmin"); jar.set(REFRESH_COOKIE, token(100));
    const response = await me(new Request("https://school.example.test/api/auth/me?audience=school"));
    expect(response.status).toBe(400);
    expect(response.cookies.get(REFRESH_COOKIE)).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  test("regular mutations reject sibling-site CSRF even with matching cookie/header tokens", () => {
    const request = new NextRequest("https://school.example.test/api/auth/refresh", {
      method: "POST", headers: { origin: "https://other.example.test", "sec-fetch-site": "same-site",
        cookie: "myshule.csrf=known; myshule_audience=school", "x-myshule-csrf": "known" },
    });
    expect(validateCsrfRequest(request)).toBe(false);
    expect(validateCsrfRequest(request, "superadmin")).toBe(true);
  });
});
