import "@testing-library/jest-dom";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { AssessmentsWorkspace } from "@/components/school/dean-academics/assessments-workspace";
import { OverviewWorkspace } from "@/components/school/dean-academics/overview-workspace";
import { CurriculumCoverageWorkspace } from "@/components/school/dean-academics/curriculum-coverage-workspace";
import { TeacherWorkloadWorkspace } from "@/components/school/dean-academics/teacher-workload-workspace";
import { renderWithProviders } from "./test-utils";

const mockQuery = jest.fn();
const mockRequest = jest.fn();
const mockRefresh = jest.fn();
jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (...args: unknown[]) => mockQuery(...args),
}));
jest.mock("@/lib/dashboard/api-client", () => ({
  requestDashboardApi: (...args: unknown[]) => mockRequest(...args),
}));
const submitted = {
  id: "math",
  title: "End term",
  subject: "Maths",
  class_name: "Grade 8",
  status: "submitted",
  mark_ids: ["m1"],
  submissions: 1,
};
const reviewed = {
  id: "bio",
  title: "End term",
  subject: "Biology",
  class_name: "Grade 9",
  status: "reviewed",
  mark_ids: ["m2"],
  submissions: 1,
};
const result = (data: unknown, error: Error | null = null) => ({
  data,
  error,
  isLoading: false,
  isFetching: false,
  refetch: mockRefresh,
});

beforeEach(() => {
  mockRefresh.mockReset();
  mockRequest.mockReset();
  mockQuery.mockReset();
  mockRequest.mockResolvedValue({
    success: true,
    updated_count: 1,
    locked_count: 1,
  });
  mockQuery.mockImplementation((url: string) =>
    result(
      url.includes("/assessments")
        ? { assessmentsList: [submitted, reviewed] }
        : url.includes("/report-cards")
          ? []
          : { series: [], metrics: {} },
    ),
  );
});

it("starts with the working queue and filters by class, subject and review state", () => {
  renderWithProviders(<AssessmentsWorkspace />);
  expect(
    screen.queryByRole("heading", { name: "Exam cycle progress" }),
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Search submissions"), {
    target: { value: "Grade 9" },
  });
  expect(screen.queryByText("Maths")).not.toBeInTheDocument();
  expect(screen.getByText("Biology")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Status", { selector: "select" }), {
    target: { value: "submitted" },
  });
  expect(screen.getByText(/No submissions match/)).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Lock reviewed batch" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(screen.getByText("Maths")).toBeVisible();
});

it("requires confirmation and locks only reviewed marks in the current filter", async () => {
  renderWithProviders(<AssessmentsWorkspace />);
  fireEvent.change(screen.getByLabelText("Search submissions"), {
    target: { value: "Biology" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Lock reviewed batch" }));
  expect(mockRequest).not.toHaveBeenCalled();
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText("1 reviewed marks")).toBeVisible();
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm lock" }));
  await waitFor(() =>
    expect(mockRequest).toHaveBeenCalledWith(
      "/admin-command/dean-academics/lock-batch",
      { method: "POST", body: { markIds: ["m2"] } },
    ),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
});

it("keeps failed reads visible and prevents stale approvals", () => {
  mockQuery.mockImplementation((url: string) =>
    result(
      url.includes("/assessments")
        ? { assessmentsList: [submitted, reviewed] }
        : [],
      url.includes("/assessments") ? new Error("Service unavailable") : null,
    ),
  );
  renderWithProviders(<AssessmentsWorkspace />);
  expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable");
  expect(
    screen.queryByRole("button", { name: "Moderate & approve" }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Lock reviewed batch" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Retry" }));
  expect(mockRefresh).toHaveBeenCalled();
});

it("shows failed mutations inline and allows recovery without a false success", async () => {
  mockRequest.mockRejectedValue(new Error("Permission denied"));
  renderWithProviders(<AssessmentsWorkspace />);
  fireEvent.click(
    screen.getAllByRole("button", { name: "Moderate & approve" })[0],
  );
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Permission denied"),
  );
  expect(mockRefresh).toHaveBeenCalled();
});

it("splits large moderation groups at the backend limit and reports partial failure", async () => {
  mockQuery.mockImplementation((url: string) =>
    result(
      url.includes("/assessments")
        ? {
            assessmentsList: [
              {
                ...submitted,
                mark_ids: Array.from({ length: 501 }, (_, i) => `m${i}`),
              },
            ],
          }
        : [],
    ),
  );
  mockRequest
    .mockResolvedValueOnce({ updated_count: 500 })
    .mockRejectedValueOnce(new Error("Connection interrupted"));
  renderWithProviders(<AssessmentsWorkspace />);
  fireEvent.click(screen.getByRole("button", { name: "Moderate & approve" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(
      "500 marks changed before this request failed",
    ),
  );
  expect(mockRequest.mock.calls[0][1].body.mark_ids).toHaveLength(500);
  expect(mockRequest.mock.calls[1][1].body.mark_ids).toEqual(["m500"]);
});

it("retains report approvals, correction reasons and access to the report previews", async () => {
  mockQuery.mockImplementation((url: string) =>
    result(
      url.includes("/report-cards")
        ? [
            {
              id: "card1",
              student_name: "Test Learner",
              status: "under_review",
            },
          ]
        : [],
    ),
  );
  const onOpenReports = jest.fn();
  renderWithProviders(<AssessmentsWorkspace onOpenReports={onOpenReports} />);
  fireEvent.click(screen.getByRole("button", { name: /Report approval/ }));
  fireEvent.click(screen.getByRole("button", { name: "Preview report cards" }));
  expect(onOpenReports).toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "Return for correction" }),
  );
  expect(screen.getByRole("button", { name: "Confirm return" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Required correction reason"), {
    target: { value: "Review the comments" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Confirm return" }));
  await waitFor(() =>
    expect(mockRequest).toHaveBeenCalledWith(
      "/exams/report-cards/card1/transition",
      {
        method: "PATCH",
        body: { action: "recall", reason: "Review the comments" },
      },
    ),
  );
});

it("uses actual overview fields and navigates into the daily workspaces", () => {
  mockQuery.mockImplementation((url: string) =>
    result(
      url.endsWith("/overview")
        ? { metrics: { totalSubjects: 9, totalTeachers: 17 } }
        : url.includes("/workflow")
          ? {
              metrics: {
                marks_awaiting_moderation: 62,
                marks_awaiting_lock: 10,
                report_cards_awaiting_dean: 8,
              },
            }
          : [
              {
                id: "math",
                subject: "Maths",
                class_name: "Grade 8",
                planned_topics: 20,
                covered_topics: 5,
                coverage: "25",
              },
            ],
    ),
  );
  const onNavigate = jest.fn();
  renderWithProviders(<OverviewWorkspace onNavigate={onNavigate} />);
  expect(screen.getByRole("button", { name: /Active staff 17/ })).toBeVisible();
  expect(
    screen.getByRole("button", { name: /Lesson-plan coverage 25%/ }),
  ).toBeVisible();
  fireEvent.click(
    screen.getByRole("button", { name: /62 Review submitted marks/ }),
  );
  expect(onNavigate).toHaveBeenCalledWith("assessments");
  fireEvent.click(screen.getByRole("button", { name: /Master timetable/ }));
  expect(onNavigate).toHaveBeenCalledWith("timetable");
});

it("does not turn failed overview reads into zero totals", () => {
  mockQuery.mockImplementation(() =>
    result(undefined, new Error("Temporarily unavailable")),
  );
  renderWithProviders(<OverviewWorkspace onNavigate={jest.fn()} />);
  expect(
    screen.getByRole("button", { name: /Marks to review —/ }),
  ).toBeVisible();
  expect(
    screen.queryByText(/No decisions are waiting/),
  ).not.toBeInTheDocument();
  expect(screen.getAllByRole("alert")).toHaveLength(3);
});

it("renders real curriculum fields and distinguishes absent plans from zero delivery", () => {
  mockQuery.mockReturnValue(
    result([
      {
        id: "math",
        subject: "Maths",
        class_name: "Grade 8",
        planned_topics: 10,
        covered_topics: 0,
        coverage: "0",
      },
      {
        id: "bio",
        subject: "Biology",
        class_name: "Grade 9",
        planned_topics: 0,
        covered_topics: 0,
        coverage: null,
      },
    ]),
  );
  renderWithProviders(<CurriculumCoverageWorkspace />);
  expect(screen.getByText("Grade 8")).toBeVisible();
  expect(screen.getByRole("progressbar")).toHaveAttribute("value", "0");
  fireEvent.change(screen.getByLabelText("Show"), {
    target: { value: "no-plans" },
  });
  expect(screen.getByText("Biology")).toBeVisible();
  expect(screen.queryByText("Maths")).not.toBeInTheDocument();
});

it("renders actual staff allocations without inventing workload limits", () => {
  mockQuery.mockReturnValue(
    result([
      {
        id: "staff1",
        teacher_name: "Test Teacher",
        classes: 2,
        subjects: 3,
        lessons_per_week: 18,
      },
    ]),
  );
  renderWithProviders(<TeacherWorkloadWorkspace />);
  expect(screen.getByText("Test Teacher")).toBeVisible();
  expect(screen.getByRole("cell", { name: "18" })).toBeVisible();
  expect(screen.queryByText("Max Allowed")).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Assignments"), {
    target: { value: "unassigned" },
  });
  expect(screen.queryByText("Test Teacher")).not.toBeInTheDocument();
});
