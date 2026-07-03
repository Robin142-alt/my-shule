/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";

import { GET as getCsrf } from "@/app/api/auth/csrf/route";
import { POST as postLogin } from "@/app/api/auth/login/route";
import { GET as getPublicSystemStatus } from "@/app/api/support/public/system-status/route";

function buildRequest(url: string, init: RequestInit = {}) {
  return new NextRequest(new Request(url, init));
}

function extractCookieHeader(response: Response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

describe("auth and support route production contracts", () => {
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    jest.restoreAllMocks();
    Object.assign(global, { fetch: jest.fn() });
    process.env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.invalid";
  });

  afterAll(() => {
    if (originalApiBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }
  });

  it("lets matching CSRF cookie and header reach the backend login proxy", async () => {
    const csrfResponse = getCsrf(buildRequest("https://myshule.online/api/auth/csrf"));
    const csrfPayload = (await csrfResponse.json()) as { token: string };
    const cookieHeader = extractCookieHeader(csrfResponse);
    const fetchMock = jest.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Invalid email or password" }),
    } as Response);

    const response = await postLogin(
      buildRequest("https://myshule.online/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-myshule-csrf": csrfPayload.token,
          cookie: cookieHeader,
        },
        body: JSON.stringify({
          audience: "school",
          identifier: "not-a-real-user@example.test",
          password: "WrongPassword!2026",
          tenantSlug: "kb-high",
        }),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid credentials",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.invalid/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "x-auth-audience": "school",
          "x-tenant-id": "kb-high",
        }),
      }),
    );
  });

  it("rejects login proxy requests when CSRF cookie and header do not match", async () => {
    const response = await postLogin(
      buildRequest("https://myshule.online/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-myshule-csrf": "header-token",
          cookie: "myshule.csrf=cookie-token",
        },
        body: JSON.stringify({
          audience: "school",
          identifier: "not-a-real-user@example.test",
          password: "WrongPassword!2026",
          tenantSlug: "kb-high",
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      message: "Security check expired. Refresh the page and try again.",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("exposes the public status proxy route and forwards upstream JSON", async () => {
    jest.mocked(global.fetch).mockResolvedValue({
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      text: async () => JSON.stringify({ data: { components: [], incidents: [] } }),
    } as Response);

    const response = await getPublicSystemStatus();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { components: [], incidents: [] },
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.invalid/support/public/system-status",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
  });
});
