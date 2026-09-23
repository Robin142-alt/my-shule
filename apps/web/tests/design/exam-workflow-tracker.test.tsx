import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { toast } from "sonner";

import { ExamWorkflowTracker, type ExamWorkflowData } from "@/components/school/exam-workflow-tracker";
import { PrincipalExamsReportsWorkspace } from "@/components/school/principal-dashboard/exams-reports-workspace";
import { DeputyExamsMarksWorkspace } from "@/components/school/deputy-principal/exams-marks-workspace";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { buildSchoolQueryKey } from "@/lib/data/school-hooks";
import { SchoolTenantScopeProvider } from "@/lib/data/school-tenant-scope";

jest.mock("@/lib/dashboard/api-client", () => ({ requestDashboardApi: jest.fn() }));
jest.mock("@/components/providers/permission-context", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockRequest = jest.mocked(requestDashboardApi);
type Series = ExamWorkflowData["series"][number];

function exam(stage: Series["stage"], name = "Term exam"): Series {
  const published = stage === "released" ? 11 : 0;
  return {
    id: name,
    name,
    status: published ? "published" : "reviewed",
    term_name: "Term 3",
    stage,
    next_owner: published ? "Released" : "Principal",
    blockers: published ? [] : ["Report cards await Principal release"],
    counts: {
      subjects: 1, classes: 1, learners: 11, marks: 11,
      submitted_marks: 0, reviewed_marks: 0, locked_marks: 11 - published,
      published_marks: published, report_cards: 11, review_report_cards: 0,
      approved_report_cards: 11 - published, published_report_cards: published,
    },
  };
}

function workflow(series: Series[]): ExamWorkflowData {
  return {
    scope: { level: "school", role: "principal", department_ids: [] },
    series,
    moderation_batches: [],
    metrics: {
      exam_series: series.length,
      active_series: series.filter((item) => item.stage !== "released").length,
      marks_awaiting_moderation: 0, marks_awaiting_lock: 0, report_cards_to_generate: 0,
      report_cards_awaiting_dean: 0,
      report_cards_awaiting_principal: series.reduce((sum, item) => sum + item.counts.approved_report_cards, 0),
      report_cards_released: series.reduce((sum, item) => sum + item.counts.published_report_cards, 0),
    },
  };
}

function renderWorkspace(element: ReactElement) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <SchoolTenantScopeProvider tenantId="school-a">{element}</SchoolTenantScopeProvider>
    </QueryClientProvider>,
  );
  return { ...view, client };
}

beforeEach(() => jest.clearAllMocks());

it.each([false, true])("hides released workflows and retains partially released cycles (compact: %s)", async (compact) => {
  const partial = exam("principal_release", "Partially released exam");
  partial.counts.published_report_cards = 5;
  partial.counts.approved_report_cards = 6;
  mockRequest.mockResolvedValue(workflow([exam("released", "Completed exam"), partial]));

  renderWorkspace(<ExamWorkflowTracker compact={compact} />);

  expect(await screen.findByRole("heading", { name: partial.name })).toBeVisible();
  expect(screen.queryByRole("heading", { name: "Completed exam" })).not.toBeInTheDocument();
  expect(screen.getByRole("list", { name: `${partial.name} progress` })).toBeVisible();
  expect(screen.getByText("Report cards await Principal release")).toBeVisible();
  expect(screen.getByText("Active cycles").parentElement).toHaveTextContent("1");
});

it("shows a completed-workflow empty state when every cycle has been published", async () => {
  mockRequest.mockResolvedValue(workflow([exam("released")]));
  renderWorkspace(<ExamWorkflowTracker />);

  expect(await screen.findByText("No active exam workflows.")).toBeVisible();
  expect(screen.getByText(/All exam cycles have been published/)).toBeVisible();
  expect(screen.queryByRole("article")).not.toBeInTheDocument();
  expect(screen.queryByText("No exam cycle is configured yet.")).not.toBeInTheDocument();
});

it("retains setup guidance for a school with no exam cycles", async () => {
  mockRequest.mockResolvedValue(workflow([]));
  renderWorkspace(<ExamWorkflowTracker />);

  expect(await screen.findByText("No exam cycle is configured yet.")).toBeVisible();
  expect(screen.queryByText("No active exam workflows.")).not.toBeInTheDocument();
});

it("shows loading and retryable errors without claiming all cycles are published", async () => {
  mockRequest.mockRejectedValue(new Error("Workflow unavailable"));
  renderWorkspace(<ExamWorkflowTracker />);

  expect(screen.getByRole("button", { name: "Refresh" })).toBeDisabled();
  expect(screen.queryByText("No active exam workflows.")).not.toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("Workflow unavailable");
  expect(screen.getByRole("button", { name: "Refresh" })).toBeEnabled();
  expect(screen.queryByText("No exam cycle is configured yet.")).not.toBeInTheDocument();
});

it("loads and refreshes deputy exam oversight through the school-scoped workflow endpoint", async () => {
  const user = userEvent.setup();
  const data = workflow([exam("dean_review", "Submitted teacher marks")]);
  data.scope.role = "deputy_principal";
  mockRequest.mockResolvedValue(data);
  renderWorkspace(<DeputyExamsMarksWorkspace />);

  expect(await screen.findByRole("heading", { name: "Submitted teacher marks" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "School exam and report-card progress" })).toBeVisible();
  expect(mockRequest).toHaveBeenCalledWith("/admin-command/deputy/exams", { tenantId: "school-a" });
  await user.click(screen.getByRole("button", { name: "Refresh" }));
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(2));
  expect(mockRequest.mock.calls.every(([endpoint, options]) =>
    endpoint === "/admin-command/deputy/exams" && !options?.method,
  )).toBe(true);
});

it.each([true, false])("removes a workflow only after confirmed publication (success: %s)", async (succeeds) => {
  const user = userEvent.setup();
  let published = false;
  let finishPublication: () => void = () => { throw new Error("Publication has not started"); };
  mockRequest.mockImplementation(async (path, options) => {
    if (options?.method === "POST") {
      await new Promise<void>((resolve, reject) => {
        finishPublication = () => succeeds ? resolve() : reject(new Error("Publication failed"));
      });
      published = true;
      return { success: true };
    }
    if (path === "/exams/workflow") {
      return workflow([exam(published ? "released" : "principal_release")]);
    }
    if (path === "/admin-command/principal/exams") {
      return {
        status: "active", activeExams: published ? 0 : 1, reportsPending: published ? 0 : 11,
        missingMarksAlerts: 0, averageScore: 0, performanceTrend: [],
        recentResults: [{
          id: "exam-1", title: "Term exam", status: published ? "published" : "reviewed",
          startsOn: "2026-09-01", endsOn: "2026-09-19", totalReportCards: 11,
          approvedReportCards: published ? 0 : 11, publishedReportCards: published ? 11 : 0,
          blockedReportCards: 0, canPublish: !published,
        }],
      };
    }
    if (path === "/academics/academic-years" || path === "/academics/academic-terms") return [];
    throw new Error(`Unexpected request: ${path}`);
  });
  const { client } = renderWorkspace(<PrincipalExamsReportsWorkspace />);
  const otherSchoolKey = buildSchoolQueryKey("school-b", "session-user", "session-role", "/exams/workflow");
  client.setQueryData(otherSchoolKey, workflow([exam("principal_release", "Other school's exam")]));

  expect(await screen.findByRole("heading", { name: "Term exam" })).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Release Term exam" }));
  expect(mockRequest).toHaveBeenCalledWith("/admin-command/principal/exams-report-cards/exam-1/publish", {
    method: "POST", tenantId: "school-a",
  });
  expect(screen.getByRole("heading", { name: "Term exam" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Releasing…" })).toBeDisabled();
  finishPublication();

  if (succeeds) {
    expect(await screen.findByText("No active exam workflows.")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "Term exam" })).not.toBeInTheDocument();
    expect(screen.getByText("Term exam")).toBeVisible(); // The published result is still available.
    expect(screen.getByText("Published")).toBeVisible();
  } else {
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Publication failed"));
    expect(screen.getByRole("heading", { name: "Term exam" })).toBeVisible();
    expect(screen.queryByText("No active exam workflows.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Release Term exam" })).toBeEnabled();
  }
  expect(client.getQueryState(otherSchoolKey)?.isInvalidated).toBe(false);
});
