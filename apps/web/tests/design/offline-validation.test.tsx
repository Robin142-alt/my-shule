import React from "react";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { syncQueue } from "@/lib/offline/sync-queue";
import { useOfflineMutation } from "@/lib/offline/use-offline-mutation";

// Polyfill structuredClone for Node/jsdom test environment
if (typeof global.structuredClone !== "function") {
  global.structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

let mockOptionalAuthUser: { id: string } | null = { id: "test-user-id" };

// Mock useAuth context
jest.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: "test-user-id" },
    isAuthenticated: true,
  }),
  useOptionalAuth: () => ({
    user: mockOptionalAuthUser,
    isAuthenticated: true,
  }),
}));

// A wrapper component to provide QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
  function OfflineValidationWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return OfflineValidationWrapper;
};

describe("Offline Sync Queue School ID Validation", () => {
  const baseRecordData = {
    userId: "user-1",
    deviceId: "device-1",
    module: "attendance",
    action: "create",
    payload: { studentId: "std-1" },
  };

  it("should fail when enqueuing with a missing schoolId", async () => {
    await expect(
      syncQueue.enqueue({
        ...baseRecordData,
        schoolId: undefined as any,
      })
    ).rejects.toThrow("Tenant Isolation Violation: A valid schoolId is required");
  });

  it("should fail when enqueuing with an empty schoolId", async () => {
    await expect(
      syncQueue.enqueue({
        ...baseRecordData,
        schoolId: "",
      })
    ).rejects.toThrow("Tenant Isolation Violation: A valid schoolId is required");
  });

  it("should fail when enqueuing with a whitespace-only schoolId", async () => {
    await expect(
      syncQueue.enqueue({
        ...baseRecordData,
        schoolId: "   ",
      })
    ).rejects.toThrow("Tenant Isolation Violation: A valid schoolId is required");
  });

  it("should succeed with a valid schoolId", async () => {
    const record = await syncQueue.enqueue({
      ...baseRecordData,
      schoolId: "school-123",
    });
    expect(record.schoolId).toBe("school-123");
    expect(record.id).toBeDefined();

    // Clean up record
    await syncQueue.removeRecord(record.id);
  });
});

describe("useOfflineMutation Hook School ID Validation", () => {
  beforeEach(() => {
    mockOptionalAuthUser = { id: "test-user-id" };
  });

  it("should throw a Tenant Isolation Violation error if schoolId is empty when rendering hook", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(
        () =>
          useOfflineMutation({
            module: "attendance",
            action: "create",
            schoolId: "",
            mutationFn: async () => {},
          }),
        { wrapper: createWrapper() }
      );
    }).toThrow("Tenant Isolation Violation: A valid schoolId is required");

    consoleSpy.mockRestore();
  });

  it("should throw a Tenant Isolation Violation error if schoolId is whitespace-only when rendering hook", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => {
      renderHook(
        () =>
          useOfflineMutation({
            module: "attendance",
            action: "create",
            schoolId: "   ",
            mutationFn: async () => {},
          }),
        { wrapper: createWrapper() }
      );
    }).toThrow("Tenant Isolation Violation: A valid schoolId is required");

    consoleSpy.mockRestore();
  });

  it("should succeed to instantiate the hook with a valid schoolId", () => {
    const { result } = renderHook(
      () =>
        useOfflineMutation({
          module: "attendance",
          action: "create",
          schoolId: "school-123",
          mutationFn: async () => "success-data",
        }),
      { wrapper: createWrapper() }
    );
    expect(result.current.mutate).toBeDefined();
  });

  it("does not strand a laboratory mutation under unknown-user when authentication is unavailable", async () => {
    mockOptionalAuthUser = null;
    const schoolId = "lab-school-without-actor";
    const { result } = renderHook(
      () =>
        useOfflineMutation({
          module: "labs",
          action: "add-stock",
          schoolId,
          requireAuthenticatedQueueActor: true,
          mutationFn: async () => {
            throw new TypeError("Failed to fetch");
          },
        }),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      await expect(result.current.mutateAsync()).rejects.toThrow(
        "this laboratory change was not queued",
      );
    });
    expect(await syncQueue.getAllForSchool(schoolId)).toHaveLength(0);
  });
});
