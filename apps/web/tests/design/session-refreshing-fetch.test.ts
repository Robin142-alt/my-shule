import { fetchWithSessionRefresh } from "@/lib/dashboard/session-refreshing-fetch";

function response(body: string, status: number) {
  let consumed = false;
  const bytes = Uint8Array.from(Array.from(body), (character) =>
    character.charCodeAt(0),
  );

  return {
    status,
    ok: status >= 200 && status < 300,
    get bodyUsed() {
      return consumed;
    },
    arrayBuffer: async () => {
      consumed = true;
      return bytes.slice().buffer;
    },
    text: async () => {
      consumed = true;
      return body;
    },
  } as Response;
}

describe("fetchWithSessionRefresh", () => {
  it("refreshes once and retries a request rejected by an expired access token", async () => {
    const send = jest
      .fn<Promise<Response>, [string]>()
      .mockResolvedValueOnce(response("expired", 401))
      .mockResolvedValueOnce(response(JSON.stringify({ ok: true }), 200));
    const refreshSession = jest.fn().mockResolvedValue({ accessToken: "fresh-access" });

    const result = await fetchWithSessionRefresh({
      accessToken: "expired-access",
      send,
      refreshSession,
    });

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenNthCalledWith(1, "expired-access");
    expect(send).toHaveBeenNthCalledWith(2, "fresh-access");
    expect(result.response.status).toBe(200);
    expect(result.refreshedSession).toEqual({ accessToken: "fresh-access" });
    expect(new TextDecoder().decode(result.body)).toContain('"ok":true');
  });

  it("keeps a temporary refresh-service outage retryable", async () => {
    const outage = new Error("Authentication service is temporarily unavailable.");

    const result = await fetchWithSessionRefresh({
      accessToken: "expired-access",
      send: async () => response("expired", 401),
      refreshSession: async () => {
        throw outage;
      },
      isRefreshSessionExpired: () => false,
    });

    expect(result.refreshError).toBe(outage);
    expect(result.sessionExpired).toBeUndefined();
    expect(result.response.status).toBe(401);
  });

  it("marks a truly invalid refresh session as expired", async () => {
    const result = await fetchWithSessionRefresh({
      accessToken: "expired-access",
      send: async () => response("expired", 401),
      refreshSession: async () => {
        throw new Error("Invalid refresh token");
      },
      isRefreshSessionExpired: () => true,
    });

    expect(result.sessionExpired).toBe(true);
  });

  it("does not consume successful event-stream responses", async () => {
    const streamResponse = response("data: live\n\n", 200);

    const result = await fetchWithSessionRefresh({
      accessToken: "valid-access",
      send: async () => streamResponse,
      refreshSession: async () => ({ accessToken: "unused" }),
      consumeResponseBody: false,
    });

    expect(result.body.byteLength).toBe(0);
    expect(result.response.bodyUsed).toBe(false);
    expect(await result.response.text()).toBe("data: live\n\n");
  });
});
