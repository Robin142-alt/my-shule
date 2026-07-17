import { fetchWithSessionRefresh } from "@/lib/dashboard/session-refreshing-fetch";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
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
      new Response(imageBytes, {
        status: 200,
        headers: { "content-type": "image/png" },
      }),
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
