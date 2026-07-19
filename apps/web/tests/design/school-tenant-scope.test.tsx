import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";
import { SchoolTenantScopeProvider } from "@/lib/data/school-tenant-scope";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { getCurrentSchoolId } from "@/lib/school/school-operational-store";

jest.mock("@/lib/dashboard/api-client", () => ({ requestDashboardApi: jest.fn() }));
jest.mock("@/lib/school/school-operational-store", () => ({ getCurrentSchoolId: jest.fn() }));

describe("school tenant scope", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (requestDashboardApi as jest.Mock).mockResolvedValue({ status: "ok" });
    (getCurrentSchoolId as jest.Mock).mockReturnValue("stale-browser-school");
  });

  it("uses the routed school as the authoritative query and API tenant", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SchoolTenantScopeProvider tenantId="maranda-high">
          {children}
        </SchoolTenantScopeProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(() => useSchoolQuery("/students"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestDashboardApi).toHaveBeenCalledWith("/students", { tenantId: "maranda-high" });
    expect(queryClient.getQueryData(["school", "maranda-high", "/students"])).toEqual({ status: "ok" });
    expect(queryClient.getQueryData(["school", "stale-browser-school", "/students"])).toBeUndefined();
  });

  it("keeps an explicit tenant override for governed cross-tenant platform tools", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SchoolTenantScopeProvider tenantId="maranda-high">
          {children}
        </SchoolTenantScopeProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () => useSchoolQuery("/tenant-health", { tenantId: "explicit-tenant" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(requestDashboardApi).toHaveBeenCalledWith("/tenant-health", { tenantId: "explicit-tenant" });
  });

  it("invalidates only the routed school's cached workspaces after a successful mutation", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(["school", "maranda-high", "/students"], []);
    queryClient.setQueryData(["school", "stale-browser-school", "/students"], []);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <SchoolTenantScopeProvider tenantId="maranda-high">
          {children}
        </SchoolTenantScopeProvider>
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () => useSchoolMutation<{ id: string }, { name: string }>("/students"),
      { wrapper },
    );

    await act(async () => {
      await result.current.mutateAsync({ name: "Amina" });
    });

    expect(requestDashboardApi).toHaveBeenCalledWith("/students", {
      method: "POST",
      tenantId: "maranda-high",
      body: { name: "Amina" },
    });
    expect(queryClient.getQueryState(["school", "maranda-high", "/students"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["school", "stale-browser-school", "/students"])?.isInvalidated).toBe(false);
  });
});
