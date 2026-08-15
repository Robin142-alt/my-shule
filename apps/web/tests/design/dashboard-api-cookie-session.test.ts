import { DashboardApi } from "@/lib/client/dashboard-api";

describe("shared dashboard API session transport", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: originalFetch,
    });
  });

  it("uses the cookie-backed Next proxy and ignores browser-stored tenant and bearer values", async () => {
    window.localStorage.setItem("tenantId", "forged-school");
    window.localStorage.setItem("token", "forged-token");
    window.localStorage.setItem("auth_token", "another-forged-token");
    const response = {
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue([]),
      clone: jest.fn(),
    } as unknown as Response;
    const fetchMock = jest.fn().mockResolvedValue(response);
    Object.defineProperty(global, "fetch", {
      configurable: true,
      writable: true,
      value: fetchMock,
    });

    await DashboardApi.getNotifications();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/notifications");
    expect(options).toEqual(expect.objectContaining({
      method: "GET",
      credentials: "include",
      cache: "no-store",
    }));
    expect(options?.headers).toEqual(expect.not.objectContaining({
      Authorization: expect.anything(),
      "x-tenant-id": expect.anything(),
    }));
  });
});
