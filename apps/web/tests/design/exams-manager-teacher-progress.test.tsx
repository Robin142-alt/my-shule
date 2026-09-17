import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { TeacherMarksProgress, type TeacherMarkSheet } from "@/components/school/exams-manager/teacher-marks-progress";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { lockMarksEntry } from "@/components/school/exams-manager/api-client";

jest.mock("@/lib/data/school-hooks", () => ({ useSchoolQuery: jest.fn() }));
jest.mock("@/components/school/exams-manager/api-client", () => ({ lockMarksEntry: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const sheet = (overrides: Partial<TeacherMarkSheet> = {}): TeacherMarkSheet => ({
  id: "sheet-1", window_id: "window-1", exam_id: "exam-1", exam_name: "End term",
  teacher_id: "teacher-1", teacher: "Amina Otieno", subject: "Mathematics", paper: "Paper 1",
  class_name: "Form 1", stream: "Blue", total_students: 30, entered: 0, recorded: 0,
  submitted: 0, missing: 30, status: "Not started", overdue: true,
  deadline: "2026-09-12T14:00:00Z", window_closed: false, last_activity: null, ...overrides,
});
const refetch = jest.fn();
function response(entries: TeacherMarkSheet[], extra = {}) {
  jest.mocked(useSchoolQuery).mockReturnValue({ data: { entries }, isLoading: false, isFetching: false, error: null, refetch, ...extra } as never);
}

describe("Teacher mark entry follow-up", () => {
  beforeEach(() => { jest.clearAllMocks(); response([sheet()]); });

  it("shows named outstanding teachers first and excludes completed and future sheets", () => {
    response([sheet(), sheet({ id: "draft", teacher: "Brian Kamau", status: "Awaiting submission", recorded: 30, entered: 30, missing: 0 }),
      sheet({ id: "done", teacher: "Completed Teacher", submitted: 30, status: "Completed" }),
      sheet({ id: "later", teacher: "Future Teacher", status: "Scheduled" })]);
    render(<TeacherMarksProgress />);
    expect(screen.getByText("Amina Otieno")).toBeVisible();
    expect(screen.getByText("30 missing")).toBeVisible();
    expect(screen.getByText("Brian Kamau")).toBeVisible();
    expect(screen.queryByText("Completed Teacher")).not.toBeInTheDocument();
    expect(screen.queryByText("Future Teacher")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "All sheets" }));
    expect(screen.getByText("Completed Teacher")).toBeVisible();
    expect(screen.getByText("Future Teacher")).toBeVisible();
  });

  it("filters by teacher, stream, subject and exam without confusing same-named exams", () => {
    response([sheet(), sheet({ id: "b", teacher: "Brian Kamau", exam_id: "exam-2", subject: "English", stream: "Red" })]);
    render(<TeacherMarksProgress />);
    const search = screen.getByRole("textbox", { name: "Search teachers, classes or subjects" });
    for (const value of ["Brian", "Red", "English"]) {
      fireEvent.change(search, { target: { value } });
      expect(screen.getByText("Brian Kamau")).toBeVisible();
      expect(screen.queryByText("Amina Otieno")).not.toBeInTheDocument();
    }
    fireEvent.change(search, { target: { value: "" } });
    fireEvent.change(screen.getByRole("combobox", { name: "Filter by exam" }), { target: { value: "exam-1" } });
    expect(screen.getByText("Amina Otieno")).toBeVisible();
    expect(screen.queryByText("Brian Kamau")).not.toBeInTheDocument();
  });

  it("counts teachers by identity rather than names or number of assigned sheets", () => {
    response([sheet(), sheet({ id: "paper2", paper: "Paper 2" }), sheet({ id: "other", teacher_id: "teacher-2" }), sheet({ id: "unassigned", teacher_id: null, teacher: "Unassigned", status: "Unassigned" })]);
    render(<TeacherMarksProgress />);
    expect(screen.getByLabelText("Mark entry summary")).toHaveTextContent("2 teachers outstanding");
    fireEvent.click(screen.getByRole("button", { name: "Unassigned" }));
    expect(screen.queryByText("Amina Otieno")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Details for Unassigned/ }));
    expect(screen.getByText(/Assign a subject teacher/)).toBeVisible();
  });

  it("refreshes real data and presents loading, errors and clean-school setup truthfully", () => {
    response([], { isLoading: true, data: undefined });
    const view = render(<TeacherMarksProgress />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading teacher mark entry");
    response([], { error: new Error("Service unavailable") });
    view.rerender(<TeacherMarksProgress />);
    expect(screen.getByRole("alert")).toHaveTextContent("Service unavailable");
    expect(screen.queryByText("No outstanding mark-entry sheets")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Refresh teacher mark entry" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    const setup = jest.fn(); response([]);
    view.rerender(<TeacherMarksProgress onOpenSetup={setup} />);
    fireEvent.click(screen.getByRole("button", { name: "Open exam setup" }));
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it("paginates and resets to matching results when searching", () => {
    response(Array.from({ length: 11 }, (_, index) => sheet({ id: `${index}`, teacher: `Teacher ${index}` })));
    render(<TeacherMarksProgress />);
    expect(screen.getAllByRole("listitem")).toHaveLength(8);
    fireEvent.click(screen.getByRole("button", { name: "Next sheets" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Teacher 0" } });
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Teacher 0")).toBeVisible();
  });

  it("opens the exact teacher and paper details without exposing class-wide locking on the overview", () => {
    render(<TeacherMarksProgress />);
    fireEvent.click(screen.getByRole("button", { name: /Details for Amina/ }));
    expect(screen.getByText(/30 awaiting submission/)).toBeVisible();
    expect(screen.getByText(/East Africa Time/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Lock class window" })).not.toBeInTheDocument();
  });

  it("confirms that locking affects the whole window and persists the window ID, not the teacher sheet ID", async () => {
    jest.mocked(lockMarksEntry).mockResolvedValue({} as never);
    render(<TeacherMarksProgress showWindowControls />);
    fireEvent.click(screen.getByRole("button", { name: /Details for Amina/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lock class window" }));
    expect(lockMarksEntry).not.toHaveBeenCalled();
    expect(screen.getByText(/Lock all papers and teachers/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Confirm lock" }));
    await waitFor(() => expect(lockMarksEntry).toHaveBeenCalledWith("window-1"));
    await waitFor(() => expect(refetch).toHaveBeenCalled());
  });

  it("keeps failed locks retryable", async () => {
    jest.mocked(lockMarksEntry).mockRejectedValue(new Error("Permission denied"));
    render(<TeacherMarksProgress showWindowControls />);
    fireEvent.click(screen.getByRole("button", { name: /Details for Amina/ }));
    fireEvent.click(screen.getByRole("button", { name: "Lock class window" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm lock" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Confirm lock" })).toBeEnabled());
    expect(refetch).not.toHaveBeenCalled();
    expect(within(screen.getByRole("listitem")).getByText(/Not started/)).toBeVisible();
  });
});
