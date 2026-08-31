import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { permissionAllows } from "@/components/providers/permission-context";
import { PrincipalApprovalsWorkspace } from "@/components/school/principal-dashboard/approvals-workspace";
import { usePermissions } from "@/components/providers/permission-context";
import { useVerifiedPrincipalDashboardApi } from "@/components/school/principal-dashboard/verified-tenant-api";
import { useSchoolQuery } from "@/lib/data/school-hooks";

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
}));

jest.mock("@/components/providers/permission-context", () => ({
  ...jest.requireActual("@/components/providers/permission-context"),
  usePermissions: jest.fn(),
}));

jest.mock("@/components/school/principal-dashboard/verified-tenant-api", () => ({
  useVerifiedPrincipalDashboardApi: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockUseSchoolQuery = jest.mocked(useSchoolQuery);
const mockUsePermissions = jest.mocked(usePermissions);
const mockUseVerifiedPrincipalDashboardApi = jest.mocked(useVerifiedPrincipalDashboardApi);

describe("Principal report-card release", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("recognizes the Owner wildcard and resource wildcards", () => {
    expect(permissionAllows(["*:*"], "exams:publish")).toBe(true);
    expect(permissionAllows(["exams:*"], "exams:publish")).toBe(true);
    expect(permissionAllows(["finance.*"], "finance.approvals.decide")).toBe(true);
    expect(permissionAllows(["exams:read"], "exams:publish")).toBe(false);
  });

  it("loads the canonical report-card release queue on Approvals and publishes the selected series", async () => {
    const user = userEvent.setup();
    const requestPrincipalApi = jest.fn().mockResolvedValue({ success: true });
    const refetchApprovals = jest.fn().mockResolvedValue({ data: {} });
    const refetchExams = jest.fn().mockResolvedValue({ data: {} });

    mockUsePermissions.mockReturnValue({
      permissions: ["*:*"],
      isLoading: false,
      hasPermission: (key: string) => permissionAllows(["*:*"], key),
    });
    mockUseVerifiedPrincipalDashboardApi.mockReturnValue(requestPrincipalApi);
    mockUseSchoolQuery.mockImplementation((path) => {
      if (path === "/admin-command/principal/approvals") {
        return {
          data: {
            status: "active",
            pendingTotal: 0,
            urgentApprovals: 0,
            categories: [],
            requests: [],
            recentApprovals: [],
          },
          isLoading: false,
          error: null,
          refetch: refetchApprovals,
        } as never;
      }

      if (path === "/admin-command/principal/exams") {
        return {
          data: {
            reportsPending: 1,
            recentResults: [{
              id: "series-1",
              title: "Term 3",
              status: "reviewed",
              startsOn: "2026-08-01",
              endsOn: "2026-08-10",
              totalReportCards: 1,
              approvedReportCards: 1,
              publishedReportCards: 0,
              blockedReportCards: 0,
              canPublish: true,
            }],
          },
          isLoading: false,
          error: null,
          refetch: refetchExams,
        } as never;
      }

      throw new Error(`Unexpected query: ${String(path)}`);
    });

    render(<PrincipalApprovalsWorkspace />);

    expect(screen.getByRole("heading", { name: "Principal Report-card Release" })).toBeVisible();
    expect(screen.getByText("Term 3")).toBeVisible();
    expect(screen.getByText("Report Cards Ready to Release").parentElement).toHaveTextContent("1");

    await user.click(screen.getByRole("button", { name: "Release report cards" }));

    await waitFor(() => {
      expect(requestPrincipalApi).toHaveBeenCalledWith(
        "/admin-command/principal/exams-report-cards/series-1/publish",
        { method: "POST" },
      );
      expect(refetchApprovals).toHaveBeenCalled();
      expect(refetchExams).toHaveBeenCalled();
    });
  });

  it("keeps the Principal release queue available when administrative approvals fail", () => {
    mockUsePermissions.mockReturnValue({
      permissions: ["principal:write", "exams:publish"],
      isLoading: false,
      hasPermission: (key: string) => permissionAllows(["principal:write", "exams:publish"], key),
    });
    mockUseVerifiedPrincipalDashboardApi.mockReturnValue(jest.fn());
    mockUseSchoolQuery.mockImplementation((path) => {
      if (path === "/admin-command/principal/approvals") {
        return {
          data: undefined,
          isLoading: false,
          error: new Error("approval service unavailable"),
          refetch: jest.fn(),
        } as never;
      }

      return {
        data: {
          reportsPending: 1,
          recentResults: [{
            id: "series-2",
            title: "End Term",
            status: "reviewed",
            startsOn: "2026-08-01",
            endsOn: "2026-08-10",
            totalReportCards: 30,
            approvedReportCards: 30,
            publishedReportCards: 0,
            blockedReportCards: 0,
            canPublish: true,
          }],
        },
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      } as never;
    });

    render(<PrincipalApprovalsWorkspace />);

    expect(screen.getByRole("alert")).toHaveTextContent("Administrative approvals could not be loaded");
    expect(screen.getByRole("button", { name: "Release report cards" })).toBeEnabled();
    expect(screen.getByText("End Term")).toBeVisible();
  });

  it.each([
    [["exams:publish"], "principal:write"],
    [["principal:write"], "exams:publish"],
  ])("does not enable release when %s is missing the API-required pair", (permissions) => {
    mockUsePermissions.mockReturnValue({
      permissions,
      isLoading: false,
      hasPermission: (key: string) => permissionAllows(permissions, key),
    });
    mockUseVerifiedPrincipalDashboardApi.mockReturnValue(jest.fn());
    mockUseSchoolQuery.mockImplementation((path) => ({
      data: path === "/admin-command/principal/approvals"
        ? { status: "active", pendingTotal: 0, urgentApprovals: 0, categories: [], requests: [], recentApprovals: [] }
        : {
            reportsPending: 1,
            releaseQueue: [{
              id: "series-3",
              title: "Release Pair Test",
              status: "reviewed",
              startsOn: "2026-08-01",
              endsOn: "2026-08-10",
              totalReportCards: 1,
              approvedReportCards: 1,
              publishedReportCards: 0,
              blockedReportCards: 0,
              canPublish: true,
            }],
            recentResults: [],
          },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    }) as never);

    render(<PrincipalApprovalsWorkspace />);

    expect(screen.queryByRole("button", { name: "Release report cards" })).not.toBeInTheDocument();
    expect(screen.getByText("Principal release permission is required.")).toBeVisible();
  });
});
