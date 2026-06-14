import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";

jest.mock("@/lib/dashboard/api-client", () => {
  const actual = jest.requireActual("@/lib/dashboard/api-client");

  return {
    ...actual,
    requestDashboardApi: jest.fn(),
  };
});

jest.mock("@/lib/school/school-operational-store", () => ({
  getCurrentSchoolId: jest.fn(),
}));

describe("sidebar workspace data routing", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("allows principal workspaces to load through the session proxy when client school storage is empty", async () => {
    (getCurrentSchoolId as jest.Mock).mockReturnValue("");
    (requestDashboardApi as jest.Mock).mockResolvedValue({ status: "active" });

    const { result } = renderHook(() => useSchoolQuery("/admin-command/principal/overview"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(requestDashboardApi).toHaveBeenCalledWith("/admin-command/principal/overview", {});
  });

  it("normalizes callers that include the Next API prefix before hitting fetch", async () => {
    jest.unmock("@/lib/dashboard/api-client");
    jest.resetModules();
    const { requestDashboardApi: realRequestDashboardApi } = await import("@/lib/dashboard/api-client");
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "ok" }),
    } as Response);

    try {
      await realRequestDashboardApi("/api/academics/teacher-assignments");

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/academics/teacher-assignments",
        expect.objectContaining({ method: "GET" }),
      );
    } finally {
      global.fetch = originalFetch;
    }
  });
});
