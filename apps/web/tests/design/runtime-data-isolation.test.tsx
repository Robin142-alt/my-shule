import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { LibraryWorkspace } from "@/components/library/library-workspace";
import { ExamsModuleScreen } from "@/components/modules/exams/exams-module-screen";
import { SystemMonitorDashboard } from "@/components/platform/system-monitor-dashboard";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { createLibraryDataset } from "@/lib/library/library-data";
import { buildExamsModuleData } from "@/lib/modules/exams-data";
import { buildReportCardGenerationRows } from "@/lib/report-cards/curriculum-report-cards";

import { renderWithProviders } from "./test-utils";

jest.mock("@/hooks/use-live-tenant-session", () => ({
  useLiveTenantSession: jest.fn(),
}));

jest.mock("@/lib/dashboard/api-client", () => ({
  ...jest.requireActual("@/lib/dashboard/api-client"),
  requestDashboardApi: jest.fn(),
}));

const mockUseLiveTenantSession = useLiveTenantSession as jest.MockedFunction<
  typeof useLiveTenantSession
>;
const mockRequestDashboardApi = requestDashboardApi as jest.MockedFunction<
  typeof requestDashboardApi
>;

describe("runtime data isolation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLiveTenantSession.mockReturnValue({
      apiConfigured: false,
      session: null,
      user: null,
      isLoading: false,
      isSubmitting: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    } as never);

    mockRequestDashboardApi.mockImplementation(async (path) => {
      if (path.includes("/observability/health")) {
        return {
          generated_at: "2026-08-15T06:00:00.000Z",
          overall_status: "degraded",
          active_alert_count: 1,
          failed_jobs: 3,
          sync_queue: 2,
          api_errors_1h: 4,
          subsystem_statuses: [
            { subsystem: "api", status: "healthy" },
            { subsystem: "queue", status: "degraded" },
          ],
        } as never;
      }

      if (path.includes("/observability/alerts")) {
        return {
          alerts: [
            {
              id: "live-alert-1",
              subsystem: "queue",
              severity: "warning",
              title: "Queue backlog",
              message: "The live queue SLO is outside its target.",
              triggered_at: "2026-08-15T05:55:00.000Z",
            },
          ],
        } as never;
      }

      if (path.includes("/observability/api-failures")) {
        return { failures: [] } as never;
      }

      return [] as never;
    });
  });

  it("keeps production data builders empty unless authoritative tenant records are supplied", () => {
    const exams = buildExamsModuleData({
      role: "principal",
      schoolName: "New Dawn School",
    });
    const library = createLibraryDataset();
    const reportRows = buildReportCardGenerationRows([
      {
        id: "aggregate-only",
        className: "Actual API Class",
        template: "CBC/CBE Competency Report",
        ready: 20,
        total: 20,
        status: "Ready",
        tone: "ok",
      },
    ]);

    expect(exams).toMatchObject({
      schoolName: "New Dawn School",
      currentExam: "No exam selected",
      currentClass: "No class selected",
      marks: [],
      allocations: [],
      reports: [],
      approvals: [],
      audit: [],
    });
    expect(library).toMatchObject({
      books: [],
      members: [],
      borrowings: [],
      returns: [],
      fines: [],
      activityLogs: [],
    });
    expect(reportRows).toEqual([]);
  });

  it("renders a non-demo exams tenant without fabricated classes, assignments, or learners", () => {
    renderWithProviders(
      createElement(ExamsModuleScreen, {
        role: "teacher",
        schoolName: "New Dawn School",
        tenantSlug: "new-dawn",
      }),
    );

    expect(screen.getByText(/No assigned exam entries loaded/i)).toBeVisible();
    expect(screen.getByText(/No active exam or class has been returned for New Dawn School/i)).toBeVisible();
    expect(screen.queryByText(/Aisha Njeri|Brian Otieno|Daniel Mutua|Grade 8 Unity/i)).not.toBeInTheDocument();
  });

  it("renders an empty non-demo library instead of Amani fixture records", () => {
    renderWithProviders(
      createElement(LibraryWorkspace, {
        section: "dashboard",
        userLabel: "Authenticated Librarian",
        tenantSlug: "new-dawn",
      }),
    );

    expect(screen.getByRole("heading", { name: /librarian dashboard/i })).toBeVisible();
    expect(screen.queryByText(/Amani Prep|Akinyi Wanjiru|Brian Otieno|Spotlight Mathematics/i)).not.toBeInTheDocument();
  });

  it("shows only live observability records in System Monitor", async () => {
    const user = userEvent.setup();
    renderWithProviders(createElement(SystemMonitorDashboard, { routeMode: "public" }));

    expect((await screen.findAllByText("degraded")).length).toBeGreaterThan(0);
    expect(screen.getByText("3")).toBeVisible();
    expect(screen.queryByText(/Kisumu Boys|Mangu High|john\.doe@example\.com/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Alerts\b/i }));
    expect(await screen.findByText("Queue backlog")).toBeVisible();
    expect(screen.getByText(/live queue SLO/i)).toBeVisible();
  });
});
