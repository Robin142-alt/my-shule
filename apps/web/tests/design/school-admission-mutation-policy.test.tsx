import React from "react";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SchoolTenantScopeProvider } from "@/lib/data/school-tenant-scope";
import { useSchoolMutation } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

jest.mock("@/lib/dashboard/api-client");

describe("school admission mutation policy", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SchoolTenantScopeProvider tenantId="test-school-id">{children}</SchoolTenantScopeProvider>
    </QueryClientProvider>
  );

  it("saves high-frequency drafts without invalidating every school query", async () => {
    jest.mocked(requestDashboardApi).mockResolvedValue({ success: true });
    const invalidateQueries = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = renderHook(
      () => useSchoolMutation("/admissions/drafts/current", "PUT", {
        invalidateSchoolQueries: false,
      }),
      { wrapper },
    );

    await result.current.mutateAsync({ payload: { first_name: "Amina" } });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it("does not fake a queued admission when the network request fails", async () => {
    jest.mocked(requestDashboardApi).mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = renderHook(
      () => useSchoolMutation("/admissions/manual", "POST", {
        queueNetworkFailures: false,
        requestTimeoutMs: 60_000,
      }),
      { wrapper },
    );

    await expect(result.current.mutateAsync({ admission_number: "ADM-1" })).rejects.toThrow(
      /failed to fetch/i,
    );
    expect(requestDashboardApi).toHaveBeenCalledWith(
      "/admissions/manual",
      expect.objectContaining({ timeoutMs: 60_000 }),
    );
  });
});
