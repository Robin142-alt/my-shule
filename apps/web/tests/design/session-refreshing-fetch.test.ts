import { fetchWithSessionRefresh } from "@/lib/dashboard/session-refreshing-fetch";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    status: init?.status ?? 200,
    text: async () => JSON.stringify(body),
  } as Response;
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
    expect(result.body).toBe(JSON.stringify({ data: [{ tenant_id: "kaimosi-high" }] }));
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
    expect(result.body).toBe(JSON.stringify({ message: "Tenant already exists" }));
    expect(refreshSession).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });
});
