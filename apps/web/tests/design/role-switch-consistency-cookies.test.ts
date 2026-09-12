/** @jest-environment node */
import { NextResponse } from "next/server";
import { GET as me } from "@/app/api/auth/me/route";
import { GET as roles } from "@/app/api/auth/dashboard-roles/route";
import { setExperienceSessionCookies, type ExperienceGatewaySession } from "@/lib/auth/server-session";

let jar = new Map<string, string>();
jest.mock("next/headers", () => ({ cookies: async () => {
  const snapshot = new Map(jar);
  return { get: (name: string) => snapshot.has(name) ? { value: snapshot.get(name) } : undefined };
} }));

function saveCookies(response: NextResponse) {
  for (const cookie of response.cookies.getAll()) {
    if (cookie.maxAge === 0) jar.delete(cookie.name); else jar.set(cookie.name, cookie.value);
  }
}
function session(role: string): ExperienceGatewaySession {
  const token = `header.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 86400 })).toString("base64url")}.${role}`;
  return { audience: "school", role, homePath: `/school/${role}`, redirectTo: `/school/${role}`,
    tenantSlug: "school-a", userLabel: "School Staff", accessToken: token, refreshToken: token,
    user: { user_id: "user-a", tenant_id: "school-a", role, display_name: "School Staff", email: "staff@example.test", session_id: "session-a", permissions: ["auth:read"] } };
}
function issueCookies(role: string) {
  const response = NextResponse.json({});
  setExperienceSessionCookies(response, session(role));
  saveCookies(response);
}

describe("role switch response cookies", () => {
  const oldBase = process.env.SERVER_API_BASE_URL;
  beforeEach(() => { jar = new Map(); process.env.SERVER_API_BASE_URL = "https://api.example.test"; global.fetch = jest.fn(); });
  afterAll(() => { if (oldBase === undefined) delete process.env.SERVER_API_BASE_URL; else process.env.SERVER_API_BASE_URL = oldBase; });

  test("a session read arriving after a switch cannot restore the old role or tokens", async () => {
    issueCookies("principal");
    let finish!: (value: Response) => void;
    const delayed = new Promise<Response>((resolve) => { finish = resolve; });
    jest.mocked(fetch).mockReturnValue(delayed);
    const reading = me(new Request("https://school.example.test/api/auth/me?audience=school"));
    await Promise.resolve();
    await Promise.resolve();
    issueCookies("teacher");
    const expected = new Map(jar);
    finish(Response.json({ user: session("principal").user }));
    const result = await reading;
    expect(result.status).toBe(200);
    expect(result.headers.get("cache-control")).toContain("no-store");
    expect(result.cookies.getAll()).toEqual([]);
    saveCookies(result);
    expect(jar).toEqual(expected);
  });

  test("a rejected old-role read cannot delete newly switched cookies", async () => {
    issueCookies("principal");
    jest.mocked(fetch).mockImplementation(async () => {
      issueCookies("teacher");
      return Response.json({ message: "Access token is out of sync with the active session" }, { status: 401 });
    });
    const result = await roles(new Request("https://school.example.test/api/auth/dashboard-roles"));
    const expected = new Map(jar);
    expect(result.status).toBe(401);
    expect(result.cookies.getAll()).toEqual([]);
    saveCookies(result);
    expect(jar).toEqual(expected);
  });
});
