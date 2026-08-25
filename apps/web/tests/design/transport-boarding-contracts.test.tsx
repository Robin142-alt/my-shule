import fs from "node:fs";
import path from "node:path";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BoardingAttendanceWorkspace } from "@/components/school/boarding-master/boarding-attendance-workspace";
import { HostelsWorkspace } from "@/components/school/boarding-master/hostels-workspace";
import { LeaveExitWorkspace } from "@/components/school/boarding-master/leave-exit-workspace";
import { ReportsWorkspace as BoardingReportsWorkspace } from "@/components/school/boarding-master/reports-workspace";
import { downloadBoardingReport, generateBoardingReport } from "@/components/school/boarding-master/api-client";
import { usePermissions } from "@/components/providers/permission-context";
import { OverviewWorkspace } from "@/components/school/transport-manager/overview-workspace";
import { downloadBase64File } from "@/lib/dashboard/export";
import { useSchoolMutation, useSchoolQuery } from "@/lib/data/school-hooks";

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
  useSchoolMutation: jest.fn(),
}));
jest.mock("@/components/providers/permission-context", () => ({
  usePermissions: jest.fn(),
}));
jest.mock("@/components/school/boarding-master/api-client", () => ({
  approveLeaveRequest: jest.fn(),
  checkoutLeaveRequest: jest.fn(),
  createLeaveRequest: jest.fn(),
  downloadBoardingReport: jest.fn(),
  generateBoardingReport: jest.fn(),
  rejectLeaveRequest: jest.fn(),
}));
jest.mock("@/lib/dashboard/export", () => ({
  downloadBase64File: jest.fn(),
}));

const mockUseSchoolQuery = useSchoolQuery as jest.MockedFunction<typeof useSchoolQuery>;
const mockUseSchoolMutation = useSchoolMutation as jest.MockedFunction<typeof useSchoolMutation>;
const mockUsePermissions = usePermissions as jest.MockedFunction<typeof usePermissions>;
const mockDownloadBoardingReport = downloadBoardingReport as jest.MockedFunction<typeof downloadBoardingReport>;
const mockGenerateBoardingReport = generateBoardingReport as jest.MockedFunction<typeof generateBoardingReport>;
const mockDownloadBase64File = downloadBase64File as jest.MockedFunction<typeof downloadBase64File>;

describe("transport and boarding response contracts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePermissions.mockReturnValue({
      permissions: ["boarding:write"],
      isLoading: false,
      hasPermission: (permission) => permission === "boarding:write",
    });
    mockUseSchoolMutation.mockReturnValue({
      isPending: false,
      mutate: jest.fn(),
    } as unknown as ReturnType<typeof useSchoolMutation>);
  });

  it("keeps boarding mutations fail-safe when the reference response omits arrays", () => {
    const queryResult = (data: unknown) => ({
      data,
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useSchoolQuery>);

    mockUseSchoolQuery
      .mockReturnValueOnce(queryResult({
        metrics: { checks_today: 0, clear: 0, attention_required: 0 },
        boardingattendanceList: [],
      }))
      .mockReturnValueOnce(queryResult({
        houses: [{ id: "house-1", title: "Tana House" }],
        guardians: [],
        wardens: [],
      }));

    const attendance = render(<BoardingAttendanceWorkspace />);
    expect(screen.getByRole("alert")).toHaveTextContent(/references are incomplete/i);
    expect(screen.getByRole("button", { name: /submit roll call/i })).toBeDisabled();
    attendance.unmount();

    mockUseSchoolQuery
      .mockReturnValueOnce(queryResult({
        metrics: { pending_requests: 0, approved: 0, on_leave_now: 0 },
        leaveexitList: [],
      }))
      .mockReturnValueOnce(queryResult({
        houses: [{ id: "house-1", title: "Tana House" }],
        guardians: [],
        wardens: [],
      }));

    render(<LeaveExitWorkspace />);
    expect(screen.getByRole("alert")).toHaveTextContent(/references are incomplete/i);
    expect(screen.getByRole("button", { name: /create leave request/i })).toBeDisabled();
  });

  it("renders truthful retryable errors instead of empty lists or zero metrics", () => {
    const transportRefetch = jest.fn();
    mockUseSchoolQuery.mockReturnValue({
      data: undefined,
      error: new Error("transport database unavailable"),
      isLoading: false,
      refetch: transportRefetch,
    } as unknown as ReturnType<typeof useSchoolQuery>);

    const transport = render(<OverviewWorkspace />);
    expect(screen.getByRole("alert")).toHaveTextContent("transport database unavailable");
    expect(screen.getByRole("button", { name: /retry/i })).toBeVisible();
    expect(screen.queryByText("Total Vehicles")).not.toBeInTheDocument();
    expect(screen.queryByText(/No school-scoped records are loaded/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(transportRefetch).toHaveBeenCalledTimes(1);
    transport.unmount();

    const boardingRefetch = jest.fn();
    mockUseSchoolQuery.mockReturnValue({
      data: undefined,
      error: new Error("boarding database unavailable"),
      isLoading: false,
      refetch: boardingRefetch,
    } as unknown as ReturnType<typeof useSchoolQuery>);

    render(<HostelsWorkspace />);
    expect(screen.getByRole("alert")).toHaveTextContent("boarding database unavailable");
    expect(screen.getByRole("button", { name: /retry/i })).toBeVisible();
    expect(screen.queryByText("Total Hostels")).not.toBeInTheDocument();
    expect(screen.queryByText(/No school-scoped records are loaded/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(boardingRefetch).toHaveBeenCalledTimes(1);
  });

  it("uses the canonical service-log cost contract without phantom getter tables", () => {
    const repoRoot = path.resolve(process.cwd(), "../..");
    const serviceSource = fs.readFileSync(
      path.join(repoRoot, "apps/api/src/modules/admin-command/transport-manager-command.service.ts"),
      "utf8",
    );
    const workspaceSource = fs.readFileSync(
      path.join(process.cwd(), "src/components/school/transport-manager/fuel-maintenance-workspace.tsx"),
      "utf8",
    );
    const getterStart = serviceSource.indexOf("async getFuelMaintenance()");
    const getterEnd = serviceSource.indexOf("async logFuel", getterStart);
    const getterSource = serviceSource.slice(getterStart, getterEnd);

    expect(getterStart).toBeGreaterThanOrEqual(0);
    expect(getterEnd).toBeGreaterThan(getterStart);
    expect(getterSource).toContain("vehicle_service_logs");
    expect(getterSource).toContain("maintenance_cost_this_month_minor");
    expect(getterSource).toContain("cost_minor");
    expect(getterSource).not.toMatch(/transport_(?:fuel|maintenance)_logs/);
    expect(workspaceSource).toContain("maintenance_cost_this_month_minor");
    expect(workspaceSource).toContain("cost_minor");
    expect(workspaceSource).toContain("Vehicle Maintenance");
  });

  it("generates a durable boarding artifact and downloads only the verified stored bytes", async () => {
    const refetch = jest.fn().mockResolvedValue(undefined);
    mockUseSchoolQuery.mockReturnValue({
      data: {
        metrics: { reports_generated: 1, reports_failed: 0 },
        reportsList: [{
          id: "boarding-master-command-snapshot-1",
          title: "Boarding operations report",
          generated_at: "2026-08-22T09:00:00.000Z",
          type: "pdf",
          status: "Ready",
        }],
      },
      error: null,
      isLoading: false,
      refetch,
    } as unknown as ReturnType<typeof useSchoolQuery>);
    mockGenerateBoardingReport.mockResolvedValue({
      success: true,
      report: { module: "boarding-master-command" },
      artifact: { content_base64: "JVBERi0=" },
    } as never);
    mockDownloadBoardingReport.mockResolvedValue({
      success: true,
      report: {
        format: "pdf",
        artifact: {
          filename: "boarding-operations.pdf",
          content_type: "application/pdf",
          content_base64: "JVBERi0=",
        },
      },
    } as never);

    render(<BoardingReportsWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: /generate report/i }));
    await waitFor(() => expect(mockGenerateBoardingReport).toHaveBeenCalledWith({
      title: "Boarding operations report",
      format: "pdf",
    }));
    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /^download$/i }));
    await waitFor(() => expect(mockDownloadBoardingReport).toHaveBeenCalledWith("boarding-master-command-snapshot-1"));
    expect(mockDownloadBase64File).toHaveBeenCalledWith({
      filename: "boarding-operations.pdf",
      mimeType: "application/pdf",
      contentBase64: "JVBERi0=",
    });
  });

  it("keeps a failed-integrity boarding artifact visible but disables its download", () => {
    mockUseSchoolQuery.mockReturnValue({
      data: {
        metrics: { reports_generated: 0, reports_failed: 1 },
        reportsList: [{
          id: "boarding-master-command-corrupt",
          title: "Corrupt boarding report",
          generated_at: "2026-08-22T09:00:00.000Z",
          type: "pdf",
          status: "Failed",
        }],
      },
      error: null,
      isLoading: false,
      refetch: jest.fn(),
    } as unknown as ReturnType<typeof useSchoolQuery>);

    render(<BoardingReportsWorkspace />);
    expect(screen.getByText("Failed Integrity Checks")).toBeVisible();
    expect(screen.getByRole("button", { name: /unavailable/i })).toBeDisabled();
    expect(mockDownloadBoardingReport).not.toHaveBeenCalled();
  });
});
