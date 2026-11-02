import { render, screen, fireEvent } from "@testing-library/react";
import { ModerationWorkspace } from "@/components/school/exams-manager/moderation-workspace";
import { ReportWorkProgress } from "@/components/report-cards/report-work-progress";

const refetch = jest.fn();
let error: Error | null = null;
const data = {
  metrics: {
    total_submissions: 1,
    pending_review: 1,
    approved: 0,
    rejected: 0,
  },
  submissions: [
    {
      id: "mark-1",
      exam_name: "Term 3",
      subject: "Mathematics",
      class_name: "Form 4 Yellow",
      teacher: "Teacher One",
      student_name: "Learner One",
      original_mean: "74.50",
      moderated_mean: "74.50",
      variance: "0",
      students_affected: 1,
      status: "submitted",
      submitted_at: "2026-11-01T12:00:00Z",
      max_score: 100,
      score_status: "entered",
      validation_issues: [],
    },
  ],
};
jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: () => ({
    data: error ? undefined : data,
    error,
    isLoading: false,
    refetch,
  }),
}));
jest.mock("@/components/school/exams-manager/api-client", () => ({
  approveModeration: jest.fn(),
  rejectModeration: jest.fn(),
}));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

beforeEach(() => {
  error = null;
  jest.clearAllMocks();
});
it("renders PostgreSQL numeric strings without crashing and identifies the real learner", () => {
  render(<ModerationWorkspace />);
  expect(screen.getByText("Learner One")).toBeInTheDocument();
  expect(screen.getByText(/74.5/)).toBeInTheDocument();
  expect(screen.getByText("Mathematics")).toBeInTheDocument();
});
it("shows an actionable loading failure instead of an empty validation queue", () => {
  error = new Error("School data could not be loaded");
  render(<ModerationWorkspace />);
  expect(screen.getByRole("alert")).toHaveTextContent(
    "School data could not be loaded",
  );
  fireEvent.click(screen.getByRole("button", { name: /retry/i }));
  expect(refetch).toHaveBeenCalled();
});

it("only shows a percentage when a measured total exists, including unsuccessful attempts", () => {
  const view = render(<ReportWorkProgress task={{ state: "queued" }} />);
  expect(screen.getByRole("progressbar")).not.toHaveAttribute("aria-valuenow");
  view.rerender(
    <ReportWorkProgress
      task={{
        state: "running",
        progress: {
          total_students: 24,
          completed_students: 5,
          failed_students: 1,
        },
      }}
    />,
  );
  expect(screen.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "25",
  );
  expect(
    screen.getByText("5 ready · 1 failed · 18 remaining"),
  ).toBeInTheDocument();
});
