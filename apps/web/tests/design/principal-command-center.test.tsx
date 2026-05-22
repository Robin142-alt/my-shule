import { screen, waitFor } from "@testing-library/react";

import { PrincipalCommandCenter } from "@/components/school/principal-command-center";
import { getVisibleApprovalWorkflows } from "@/lib/workflows/workflow-catalog";

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

  it("hides AI insight content until the tenant enables AI insights", async () => {
    fetchMock.mockResolvedValue(jsonResponse(dashboardPayload));

    renderWithProviders(<PrincipalCommandCenter />);

    await waitFor(() => expect(screen.getByText("Fee collection trends")).toBeVisible());
    expect(screen.getByText("Executive command center")).toBeVisible();
    expect(screen.queryByText("AI insights")).not.toBeInTheDocument();
    expect(screen.getByText("Approval command queue")).toBeVisible();
  });

  it("shows AI insights only when ai_insights is enabled", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        ...dashboardPayload,
        enabled_modules: [...dashboardPayload.enabled_modules, "ai_insights"],
      }),
    );

    renderWithProviders(<PrincipalCommandCenter view="analytics" />);

    await waitFor(() => expect(screen.getByText("Fee collection trends")).toBeVisible());
    expect(screen.getByText("Institutional performance intelligence")).toBeVisible();
    expect(screen.getByText("AI insights")).toBeVisible();
    expect(screen.getByText("Audited")).toBeVisible();
  });
});
