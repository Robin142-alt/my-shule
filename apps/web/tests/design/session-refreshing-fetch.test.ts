import { fetchWithSessionRefresh } from "@/lib/dashboard/session-refreshing-fetch";

class TestResponse {
  readonly status: number;
  readonly headers: { get: (name: string) => string | null };
  private readonly body: ArrayBuffer;

  constructor(body: string | Uint8Array, init?: ResponseInit) {
    this.status = init?.status ?? 200;
    const sourceHeaders = new Map<string, string>();
    for (const [name, value] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
      sourceHeaders.set(name.toLowerCase(), value);
    }
    this.headers = {
      get: (name: string) => sourceHeaders.get(name.toLowerCase()) ?? null,
    };
    const bytes = typeof body === "string" ? new TextEncoder().encode(body) : body;
    this.body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  }

  async arrayBuffer() {
    return this.body.slice(0);
  }
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new TestResponse(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  }) as unknown as Response;
}

function decodeBody(body: ArrayBuffer) {
  return new TextDecoder().decode(body);
}

describe("session refreshing fetch", () => {
  it("refreshes once and retries when the upstream rejects an expired access token", async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ message: "Token validation failed" }, { status: 401 }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: [{ tenant_id: "kaimosi-high" }] }));
    const refreshSession = jest.fn().mockResolvedValue({
      accessToken: "fresh-access-token",
      refreshToken: "fresh-refresh-token",
    });

    const result = await fetchWithSessionRefresh({
      accessToken: "expired-access-token",
      refreshSession,
      send,
    });

    expect(result.response.status).toBe(200);
    expect(decodeBody(result.body)).toBe(JSON.stringify({ data: [{ tenant_id: "kaimosi-high" }] }));
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenNthCalledWith(1, "expired-access-token");
    expect(send).toHaveBeenNthCalledWith(2, "fresh-access-token");
    expect(result.refreshedSession?.accessToken).toBe("fresh-access-token");
  });

  it("does not refresh non-auth platform validation errors", async () => {
    const send = jest
      .fn()
      .mockResolvedValue(jsonResponse({ message: "Tenant already exists" }, { status: 409 }));
    const refreshSession = jest.fn();

    const result = await fetchWithSessionRefresh({
      accessToken: "valid-access-token",
      refreshSession,
      send,
    });

    expect(result.response.status).toBe(409);
    expect(decodeBody(result.body)).toBe(JSON.stringify({ message: "Tenant already exists" }));
    expect(refreshSession).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("refreshes permissions once and retries an explicit permission denial", async () => {
    const send = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ message: "Permission-based access denied" }, { status: 403 }),
      )
      .mockResolvedValueOnce(jsonResponse({ data: { id: "academic-year-2026" } }));
    const refreshSession = jest.fn().mockResolvedValue({
      accessToken: "permission-refreshed-access-token",
    });

    const result = await fetchWithSessionRefresh({
      accessToken: "stale-permissions-access-token",
      refreshSession,
      send,
    });

    expect(result.response.status).toBe(200);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenNthCalledWith(1, "stale-permissions-access-token");
    expect(send).toHaveBeenNthCalledWith(2, "permission-refreshed-access-token");
  });

  it("preserves a permission denial without expiring the session when refresh fails", async () => {
    const send = jest.fn().mockResolvedValue(
      jsonResponse({ message: "Permission-based access denied" }, { status: 403 }),
    );
    const refreshSession = jest.fn().mockRejectedValue(new Error("Refresh unavailable"));

    const result = await fetchWithSessionRefresh({
      accessToken: "stale-permissions-access-token",
      refreshSession,
      send,
    });

    expect(result.response.status).toBe(403);
    expect(result.sessionExpired).toBeUndefined();
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("marks the browser session expired when refresh cannot recover an auth failure", async () => {
    const send = jest.fn().mockResolvedValue(
      jsonResponse({ message: "Token validation failed" }, { status: 401 }),
    );
    const refreshSession = jest.fn().mockRejectedValue(new Error("Session has expired"));

    const result = await fetchWithSessionRefresh({
      accessToken: "expired-access-token",
      refreshSession,
      send,
    });

    expect(result.response.status).toBe(401);
    expect(result.sessionExpired).toBe(true);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("preserves binary upstream response bytes for authenticated image routes", async () => {
    const imageBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 17]);
    const send = jest.fn().mockResolvedValue(
      new TestResponse(imageBytes, {
        status: 200,
        headers: { "content-type": "image/png" },
      }) as unknown as Response,
    );
    const refreshSession = jest.fn();

    const result = await fetchWithSessionRefresh({
      accessToken: "valid-access-token",
      refreshSession,
      send,
    });

    expect(Array.from(new Uint8Array(result.body))).toEqual(Array.from(imageBytes));
    expect(result.response.headers.get("content-type")).toBe("image/png");
    expect(refreshSession).not.toHaveBeenCalled();
  });
});
