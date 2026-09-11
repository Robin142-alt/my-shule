import React from "react";
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useClassTeacherRegister } from "@/lib/data/class-teacher-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { WorkspaceRetry } from "@/components/school/workspace-retry";
import { SCHOOL_SECTIONS, toSchoolPath } from "@/lib/routing/experience-routes";

jest.mock("@/lib/dashboard/api-client", () => ({ requestDashboardApi: jest.fn() }));
jest.mock("@/lib/school/school-operational-store", () => ({ getCurrentSchoolId: () => "school-a" }));
jest.mock("@/lib/auth/auth-context", () => ({ useOptionalAuth: () => null }));
jest.mock("@/lib/auth/school-dashboard-role-context", () => ({
  useOptionalSchoolDashboardRole: () => ({ userId: "teacher-a", tenantSlug: "school-a", activeAuthorizationRoleCode: "class_teacher" }),
}));
jest.mock("@/lib/offline/use-offline-mutation", () => ({ useOfflineMutation: jest.fn() }));

describe("sidebar workspace recovery", () => {
  let client: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  beforeEach(() => {
    jest.clearAllMocks();
    client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });
  afterEach(() => client.clear());

  it("registers the subject analytics sidebar destination", () => {
    expect(SCHOOL_SECTIONS).toContain("academic-intelligence");
    expect(toSchoolPath("academic-intelligence")).toContain("academic-intelligence");
  });

  it("keeps the register loading until its assigned class is resolved", async () => {
    let finish!: (value: unknown) => void;
    (requestDashboardApi as jest.Mock)
      .mockReturnValueOnce(new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce([{ id: "learner-a" }]);
    const { result } = renderHook(() => useClassTeacherRegister(""), { wrapper });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(requestDashboardApi).toHaveBeenCalledTimes(1);
    await act(async () => finish({ classes: [{ classSectionId: "class-a" }] }));
    await waitFor(() => expect(result.current.data).toEqual([{ id: "learner-a" }]));
    expect(requestDashboardApi).toHaveBeenLastCalledWith("class-teacher/register?streamId=class-a", expect.objectContaining({ tenantId: "school-a" }));
  });

  it("preserves assignment lookup failures and retries the dependency before loading records", async () => {
    (requestDashboardApi as jest.Mock).mockRejectedValueOnce(new Error("Assignment service unavailable"));
    const { result } = renderHook(() => useClassTeacherRegister(""), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("Assignment service unavailable");
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(requestDashboardApi).toHaveBeenCalledTimes(1);
    (requestDashboardApi as jest.Mock)
      .mockResolvedValueOnce({ classes: [{ classSectionId: "class-a" }] })
      .mockResolvedValueOnce([{ id: "learner-a" }]);
    await act(async () => { await result.current.refetch(); });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "learner-a" }]);
  });

  it("returns an empty register only after a successful lookup with no assigned classes", async () => {
    (requestDashboardApi as jest.Mock).mockResolvedValue({ classes: [] });
    const { result } = renderHook(() => useClassTeacherRegister(""), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
    expect(requestDashboardApi).toHaveBeenCalledTimes(1);
  });

  it("disables retry while the workspace request is running", async () => {
    let finish!: () => void;
    const retry = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    render(<WorkspaceRetry onRetry={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
    expect(screen.getByRole("button", { name: "Retrying…" })).toBeDisabled();
    await act(async () => finish());
    expect(screen.getByRole("button", { name: "Retry loading" })).toBeEnabled();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
