import { act, screen, waitFor } from "@testing-library/react";

import { PrincipalCommandCenter } from "@/components/school/principal-command-center";
import { SchoolPages } from "@/components/school/school-pages";
import { getSchoolModuleAccessCacheKey } from "@/lib/module-access/school-module-access-cache";
import { getVisibleApprovalWorkflows } from "@/lib/workflows/workflow-catalog";

import { routerReplaceMock } from "./router-mock";
import { renderWithProviders } from "./test-utils";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return {
    status: init?.status ?? 200,
    ok: (init?.status ?? 200) >= 200 && (init?.status ?? 200) < 300,
    json: async () => body,
  } as Response;
}

const dashboardPayload = {
  tenant_id: "tenant-1",
  generated_at: "2026-05-22T08:00:00.000Z",
  enabled_modules: ["principal_dashboard", "finance", "discipline", "staff"],
  overview: {
    total_students: 842,
    total_teachers: 51,
    total_support_staff: 22,
    active_classes_streams: 34,
    student_attendance_today: 94,
    teacher_attendance_today: 89,
    parent_engagement_rate: 76,
    active_users_online: 118,
  },
  sections: [
    {
      id: "finance",
      module_code: "finance",
      title: "Fee collection trends",
      category: "Finance",
      confidentiality: "summary_only",
      widgets: [
        { id: "collection", title: "Collection", value: 82, unit: "%", status: "normal" },
      ],
      alerts: [],
      reports: ["Collection trend"],
    },
  ],
  alerts: [
    {
      id: "discipline-repeat",
      module_code: "discipline",
      title: "Repeated discipline pattern",
      message: "Two classes require deputy review.",
      severity: "warning",
    },
  ],
  realtime_channels: ["principal.alerts"],
  report_exports: ["executive-summary"],
};

describe("principal command center", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    routerReplaceMock.mockClear();
    window.sessionStorage.clear();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it("filters approvals to enabled modules", () => {
    const workflows = getVisibleApprovalWorkflows({
      role: "principal",
      enabledModuleCodes: new Set(["principal_dashboard", "finance", "discipline"]),
    });

    expect(workflows.map((workflow) => workflow.id)).toEqual(
      expect.arrayContaining(["discipline-escalation", "budget-approval"]),
    );
    expect(workflows.map((workflow) => workflow.id)).not.toContain("exam-release");
    expect(workflows.map((workflow) => workflow.id)).not.toContain("medicine-disposal");
  });

  it("keeps school insight content mounted as inactive until the school enables it", async () => {
    fetchMock.mockResolvedValue(jsonResponse(dashboardPayload));

    renderWithProviders(<PrincipalCommandCenter />);

    await waitFor(() => expect(screen.getByText("Fee collection trends")).toBeVisible());
    expect(screen.getByText("Principal Command Center")).toBeVisible();
    expect(screen.getByText("School Insights")).toBeVisible();
    expect(screen.getAllByText("This school area is not active yet.").length).toBeGreaterThan(0);
    expect(screen.getByText("Approval queue")).toBeVisible();
  });

  it("shows school insights only when ai_insights is enabled", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ...dashboardPayload,
        enabled_modules: [...dashboardPayload.enabled_modules, "ai_insights"],
      }),
    );

    renderWithProviders(<PrincipalCommandCenter view="analytics" />);

    await waitFor(() => expect(screen.getByText("Fee collection trends")).toBeVisible());
    expect(screen.getByText("School performance overview")).toBeVisible();
    expect(screen.getByText("School Insights")).toBeVisible();
    expect(screen.getByText("Ready")).toBeVisible();
  });

  it("keeps fixed principal school areas mounted when access is inactive", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ...dashboardPayload,
        enabled_modules: ["principal_dashboard"],
        sections: [],
        alerts: [],
      }),
    );

    renderWithProviders(<PrincipalCommandCenter />);

    expect(await screen.findByText("Academic Progress")).toBeVisible();
    expect(screen.getByText("Fee Collection")).toBeVisible();
    expect(screen.getByText("Student Welfare")).toBeVisible();
    expect(screen.getByText("School Operations")).toBeVisible();
    expect(screen.getByText("Communications & Parent Confidence")).toBeVisible();
    expect(screen.getAllByText("Request Access").length).toBeGreaterThan(0);
  });

  it("renders live metrics when the API gateway wraps the dashboard payload", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ data: dashboardPayload }));

    renderWithProviders(<PrincipalCommandCenter />);

    expect(await screen.findByText("842")).toBeVisible();
    expect(screen.getByText("51")).toBeVisible();
    expect(screen.getByText("34")).toBeVisible();
    expect(screen.getByText("4 areas active")).toBeVisible();
    expect(screen.getByText("Fee collection trends")).toBeVisible();
  });

  it("does not refetch the principal dashboard on a background interval", async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValue(jsonResponse(dashboardPayload));

    try {
      renderWithProviders(<PrincipalCommandCenter />);

      await screen.findByText("Fee collection trends");
      fetchMock.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(90_000);
        await Promise.resolve();
      });

      expect(fetchMock).not.toHaveBeenCalledWith(
        expect.stringContaining("/api/admin-command/principal/dashboard"),
        expect.any(Object),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it("renders a time-aware executive greeting for the principal", async () => {
    const getHoursSpy = jest.spyOn(Date.prototype, "getHours").mockReturnValue(18);
    fetchMock.mockResolvedValue(
      jsonResponse({
        ...dashboardPayload,
        principal_name: "Dr. Kamau",
        school_name: "Greenfield Academy",
        alerts: [],
      }),
    );

    try {
      renderWithProviders(<PrincipalCommandCenter />);

      expect(await screen.findByText("Good Evening, Dr. Kamau")).toBeVisible();
      expect(screen.getByText("Here's what's happening at Greenfield Academy today.")).toBeVisible();
    } finally {
      getHoursSpy.mockRestore();
    }
  });

  it("routes expired principal dashboard sessions back to school login", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: "Session has expired" }, { status: 401 }),
    );

    renderWithProviders(<PrincipalCommandCenter />);

    await waitFor(() =>
      expect(routerReplaceMock).toHaveBeenCalledWith("/school/login?expired=1"),
    );
  });

  it("shows billing lifecycle messages returned by the live API", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { message: "Your subscription is suspended. Billing, renewal, support, and data export are still available." },
        { status: 402 },
      ),
    );

    renderWithProviders(<PrincipalCommandCenter />);

    expect(
      await screen.findByText(/Your subscription is suspended/i),
    ).toBeVisible();
  });

  it("keeps the principal dashboard mounted when a legacy live payload omits module arrays", async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      tenant_id: "tenant-1",
      generated_at: "2026-05-22T08:00:00.000Z",
      overview: {
        total_students: 0,
        total_teachers: 0,
        total_support_staff: 0,
        active_classes_streams: 0,
        student_attendance_today: 0,
        teacher_attendance_today: 0,
        parent_engagement_rate: 0,
        active_users_online: 0,
      },
    }));

    renderWithProviders(<PrincipalCommandCenter />);

    await waitFor(() => expect(screen.getByText("Live")).toBeVisible());
    expect(screen.getByText("Principal Command Center")).toBeVisible();
    expect(screen.getByText("0 areas active")).toBeVisible();
    expect(screen.getByText("Live school updates")).toBeVisible();
  });

  it("opens principal sections from cached module access while live access refreshes", async () => {
    let resolveModuleRefresh: (response: Response) => void = () => undefined;
    const moduleRefresh = new Promise<Response>((resolve) => {
      resolveModuleRefresh = resolve;
    });

    window.sessionStorage.setItem(
      getSchoolModuleAccessCacheKey({ role: "principal", tenantSlug: "barakaacademy" }),
      JSON.stringify(["principal_dashboard", "finance", "discipline", "staff"]),
    );
    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/school/modules/me")) {
        return moduleRefresh;
      }

      if (url.includes("/api/admin-command/principal/dashboard")) {
        return Promise.resolve(jsonResponse(dashboardPayload));
      }

      return Promise.resolve(jsonResponse({}));
    });

    renderWithProviders(
      <SchoolPages role="principal" section="academics" tenantSlug="barakaacademy" />,
    );

    expect(await screen.findByTestId("role-operational-command-center")).toBeVisible();
    expect(screen.getByTestId("principal-practical-command-center")).toBeVisible();
    expect(screen.getByRole("heading", { name: /^Academics$/i })).toBeVisible();
    expect(screen.getAllByText(/Lessons are mostly covered/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Module not enabled for your school/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Verifying module access/i)).not.toBeInTheDocument();

    await act(async () => {
      resolveModuleRefresh(
        jsonResponse(["principal_dashboard", "finance", "discipline", "staff"]),
      );
      await Promise.resolve();
    });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/school/modules/me"),
      expect.any(Object),
    ));
  });

  it("opens principal sections on cold module access while live access refreshes", async () => {
    let resolveModuleRefresh: (response: Response) => void = () => undefined;
    const moduleRefresh = new Promise<Response>((resolve) => {
      resolveModuleRefresh = resolve;
    });

    fetchMock.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/api/school/modules/me")) {
        return moduleRefresh;
      }

      if (url.includes("/api/admin-command/principal/dashboard")) {
        return Promise.resolve(jsonResponse(dashboardPayload));
      }

      return Promise.resolve(jsonResponse({}));
    });

    try {
      renderWithProviders(
        <SchoolPages role="principal" section="approvals" tenantSlug="barakaacademy" />,
      );

      expect(await screen.findByTestId("role-operational-command-center", {}, { timeout: 800 })).toBeVisible();
      expect(screen.getByTestId("principal-practical-command-center")).toBeVisible();
      expect(screen.getByRole("heading", { name: /^Approvals$/i })).toBeVisible();
      expect(screen.getAllByText(/7 approvals need action before close of day/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Verifying module access/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Required module code: admin_command_centers/i)).not.toBeInTheDocument();
    } finally {
      await act(async () => {
        resolveModuleRefresh(
          jsonResponse(["principal_dashboard", "admin_command_centers", "finance", "discipline", "staff"]),
        );
        await Promise.resolve();
      });
    }
  });
});
