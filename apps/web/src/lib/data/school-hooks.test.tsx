import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSchoolQuery, useSchoolMutation, PermissionDeniedError } from "./school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { SchoolTenantScopeProvider } from "./school-tenant-scope";

jest.mock("@/lib/dashboard/api-client");

describe("School Hooks Data Fetching Infrastructure", () => {
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

  describe("useSchoolQuery", () => {
    it("automatically injects the active tenant ID into the API request", async () => {
      (requestDashboardApi as jest.Mock).mockResolvedValue({ status: "ok" });

      const { result } = renderHook(() => useSchoolQuery("/test-route"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(requestDashboardApi).toHaveBeenCalledWith("/test-route", {
        tenantId: "test-school-id",
      });
    });

    it("throws PermissionDeniedError when API returns a 403", async () => {
      (requestDashboardApi as jest.Mock).mockRejectedValue(new Error("Request failed: 403"));

      const { result } = renderHook(() => useSchoolQuery("/test-route"), { wrapper });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(PermissionDeniedError);
    });

    it("allows overriding the tenantId explicitly", async () => {
      (requestDashboardApi as jest.Mock).mockResolvedValue({ status: "ok" });

      const { result } = renderHook(
        () => useSchoolQuery("/test-route", { tenantId: "explicit-tenant" }),
        { wrapper }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(requestDashboardApi).toHaveBeenCalledWith("/test-route", {
        tenantId: "explicit-tenant",
      });
    });

    it("does not call the school API when no verified tenant scope exists", async () => {
      const unscopedWrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      const { result } = renderHook(
        () => useSchoolQuery("/admin-command/principal/overview"),
        { wrapper: unscopedWrapper },
      );

      expect(result.current.fetchStatus).toBe("idle");
      expect(requestDashboardApi).not.toHaveBeenCalled();
    });
  });

  describe("useSchoolMutation", () => {
    it("injects tenantId into the mutation payload configuration", async () => {
      (requestDashboardApi as jest.Mock).mockResolvedValue({ success: true });

      const { result } = renderHook(() => useSchoolMutation("/test-mutation"), { wrapper });

      result.current.mutate({ someData: 123 });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(requestDashboardApi).toHaveBeenCalledWith("/test-mutation", {
        method: "POST",
        tenantId: "test-school-id",
        body: { someData: 123 },
      });
    });

    it("rejects an unscoped mutation before network or offline queue handling", async () => {
      const unscopedWrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      const { result } = renderHook(
        () => useSchoolMutation("/test-mutation"),
        { wrapper: unscopedWrapper },
      );

      await expect(result.current.mutateAsync({ someData: 123 })).rejects.toThrow(
        /verified school context/i,
      );
      expect(requestDashboardApi).not.toHaveBeenCalled();
    });
  });
});
