import { fireEvent, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";

import { ExamsMarksWorkspace } from "@/components/school/teacher-dashboard/exams-marks-workspace";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import {
  fetchPendingMarksLive,
  fetchTeacherMarkSheetLive,
  saveExamMarksLive,
} from "@/lib/modules/teacher-live";

import { renderWithProviders } from "./test-utils";

jest.mock("@/hooks/use-live-tenant-session", () => ({
  useLiveTenantSession: jest.fn(),
}));

jest.mock("@/lib/modules/teacher-live", () => ({
  fetchPendingMarksLive: jest.fn(),
  fetchTeacherMarkSheetLive: jest.fn(),
  saveExamMarksLive: jest.fn(),
}));

const mockSession = {
  tenantId: "homabay-high",
  user: {
    user_id: "teacher-1",
    tenant_id: "homabay-high",
    role: "teacher",
    email: "teacher@homabay.ac.ke",
    display_name: "Teacher Robini",
    permissions: ["exams:read", "exams:write"],
    session_id: "session-1",
  },
};

describe("teacher exams and marks workspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLiveTenantSession as jest.Mock).mockReturnValue({
      apiConfigured: true,
      session: mockSession,
      user: mockSession.user,
      isLoading: false,
      isSubmitting: false,
      error: null,
      login: jest.fn(),
      logout: jest.fn(),
      clearError: jest.fn(),
    });
    (fetchPendingMarksLive as jest.Mock).mockResolvedValue({
      stats: { totalWindows: 1, nearingDeadline: 1 },
      windows: [
        {
          id: "window-1",
          examSeriesId: "series-1",
          academicTermId: "term-2",
          examName: "Term 2 Opener",
          className: "Form 2 Blue",
          classSectionId: "class-2-blue",
          subjectId: "subject-maths",
          subjectName: "Mathematics",
          assessmentId: "assessment-paper-1",
          paperName: "Paper 1",
          outOf: 80,
          deadline: "2026-07-20",
          enteredCount: 1,
          totalStudents: 2,
          status: "Pending",
          canEnter: true,
          entryState: "Open",
        },
      ],
    });
    (fetchTeacherMarkSheetLive as jest.Mock).mockResolvedValue([
      {
        id: null,
        mark_entry_window_id: "window-1",
        exam_series_id: "series-1",
        exam_series_name: "Term 2 Opener",
        academic_term_id: "term-2",
        assessment_id: "assessment-paper-1",
        assessment_name: "Paper 1",
        max_score: 80,
        assessment_weight: 100,
        class_section_id: "class-2-blue",
        class_name: "Form 2 Blue",
        subject_id: "subject-maths",
        subject_name: "Mathematics",
        student_id: "student-1",
        admission_number: "ADM-001",
        student_name: "Asha Njeri",
        score: null,
        score_status: "entered",
        remarks: null,
        status: "draft",
        entered_by_user_id: null,
        updated_at: null,
        opens_at: "2026-07-01T06:00:00.000Z",
        closes_at: "2026-07-20T14:00:00.000Z",
      },
      {
        id: null,
        mark_entry_window_id: "window-1",
        exam_series_id: "series-1",
        exam_series_name: "Term 2 Opener",
        academic_term_id: "term-2",
        assessment_id: "assessment-paper-1",
        assessment_name: "Paper 1",
        max_score: 80,
        assessment_weight: 100,
        class_section_id: "class-2-blue",
        class_name: "Form 2 Blue",
        subject_id: "subject-maths",
        subject_name: "Mathematics",
        student_id: "student-2",
        admission_number: "ADM-002",
        student_name: "Brian Otieno",
        score: null,
        score_status: "entered",
        remarks: null,
        status: "draft",
        entered_by_user_id: null,
        updated_at: null,
        opens_at: "2026-07-01T06:00:00.000Z",
        closes_at: "2026-07-20T14:00:00.000Z",
      },
    ]);
    (saveExamMarksLive as jest.Mock).mockResolvedValue({ success: true });
  });

  async function openWorkspace() {
    renderWithProviders(createElement(ExamsMarksWorkspace, { onStartAction: jest.fn() }));
    await screen.findByLabelText("Asha Njeri score");
  }

  it("shows one compact score input per student without evidence, remarks, policy or validation panels", async () => {
    await openWorkspace();
    expect(fetchPendingMarksLive).toHaveBeenCalledWith(mockSession, true);
    expect(screen.getAllByLabelText("Asha Njeri score")).toHaveLength(1);
    expect(screen.getByRole("table", { name: "Student scores" })).toBeVisible();
    expect(screen.getByLabelText("Asha Njeri score")).toHaveAttribute("inputmode", "decimal");
    expect(screen.queryByText(/evidence|remarks|policy result|validation|moderation readiness/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Asha Njeri score"), { target: { value: "74" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await waitFor(() => expect(saveExamMarksLive).toHaveBeenCalledWith(mockSession, expect.objectContaining({
      action: "draft", examId: "window-1", marks: { "student-1": { score: 74, score_status: "entered" } },
    })));
    expect(screen.queryByText("Reasons for missing scores")).not.toBeInTheDocument();
  });

  it("submits a fully scored sheet directly and removes it after success", async () => {
    await openWorkspace();
    fireEvent.change(screen.getByLabelText("Asha Njeri score"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Brian Otieno score"), { target: { value: "68.5" } });
    jest.mocked(fetchPendingMarksLive).mockResolvedValue({ stats: { totalWindows: 0, nearingDeadline: 0 }, windows: [] });
    fireEvent.click(screen.getByRole("button", { name: "Submit results" }));
    await waitFor(() => expect(saveExamMarksLive).toHaveBeenCalledWith(mockSession, expect.objectContaining({
      action: "submit", marks: { "student-1": { score: 0, score_status: "entered" }, "student-2": { score: 68.5, score_status: "entered" } },
    })));
    expect(await screen.findByText("No exams awaiting marks")).toBeVisible();
    expect(screen.queryByLabelText("Asha Njeri score")).not.toBeInTheDocument();
    expect(screen.queryByText("Reasons for missing scores")).not.toBeInTheDocument();
  });

  it("asks for evidence only on submission and only for students without scores", async () => {
    await openWorkspace();
    fireEvent.change(screen.getByLabelText("Asha Njeri score"), { target: { value: "74" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit results" }));
    expect(screen.getByText("Reasons for missing scores")).toHaveFocus();
    expect(screen.queryByLabelText("Asha Njeri missing score reason")).not.toBeInTheDocument();
    const reason = screen.getByLabelText("Brian Otieno missing score reason") as HTMLSelectElement;
    expect(Array.from(reason.options).map(option => option.text)).toEqual([
      "Select a reason", "Absent", "Exempt", "Not assessed", "Incomplete", "Withheld", "Medical exception", "Transfer student",
    ]);
    expect(saveExamMarksLive).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm submission" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Select a reason for every student");
    expect(saveExamMarksLive).not.toHaveBeenCalled();
    fireEvent.change(reason, { target: { value: "absent" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm submission" }));
    await waitFor(() => expect(saveExamMarksLive).toHaveBeenCalledWith(mockSession, expect.objectContaining({
      action: "submit", marks: { "student-1": { score: 74, score_status: "entered" }, "student-2": { score: null, score_status: "absent" } },
    })));
  });

  it("returns to normal entry, keeps scores and replaces an earlier reason when a score is entered", async () => {
    await openWorkspace();
    fireEvent.change(screen.getByLabelText("Asha Njeri score"), { target: { value: "74" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit results" }));
    fireEvent.change(screen.getByLabelText("Brian Otieno missing score reason"), { target: { value: "medical_exception" } });
    fireEvent.click(screen.getByRole("button", { name: "Back to scores" }));
    expect(screen.queryByText(/evidence/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Asha Njeri score")).toHaveValue("74");
    fireEvent.change(screen.getByLabelText("Brian Otieno score"), { target: { value: "62" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit results" }));
    await waitFor(() => expect(saveExamMarksLive).toHaveBeenCalledWith(mockSession, expect.objectContaining({
      marks: expect.objectContaining({ "student-2": { score: 62, score_status: "entered" } }),
    })));
  });

  it.each(["81", "-1", "abc"])("keeps range checking for %s without adding a validation column", async value => {
    await openWorkspace();
    fireEvent.change(screen.getByLabelText("Asha Njeri score"), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Submit results" }));
    expect(screen.getByLabelText("Asha Njeri score")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter 0 to 80.")).toBeVisible();
    expect(saveExamMarksLive).not.toHaveBeenCalled();
    expect(screen.queryByText("Reasons for missing scores")).not.toBeInTheDocument();
  });

  it("searches and filters students without leaving hidden students out of submission", async () => {
    await openWorkspace();
    fireEvent.change(screen.getByLabelText("Asha Njeri score"), { target: { value: "74" } });
    fireEvent.change(screen.getByLabelText("Find student"), { target: { value: "ADM-001" } });
    expect(screen.queryByLabelText("Brian Otieno score")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit results" }));
    expect(screen.getByLabelText("Brian Otieno missing score reason")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Back to scores" }));
    fireEvent.change(screen.getByLabelText("Find student"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Blank scores (1)" }));
    expect(screen.queryByLabelText("Asha Njeri score")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Brian Otieno score")).toBeVisible();
  });

  it("preserves entry on save failure and disables edits and duplicate submits during a save", async () => {
    await openWorkspace();
    let rejectSave!: (error: Error) => void;
    jest.mocked(saveExamMarksLive).mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSave = reject; }));
    fireEvent.change(screen.getByLabelText("Asha Njeri score"), { target: { value: "74" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(screen.getByLabelText("Asha Njeri score")).toBeDisabled();
    expect(screen.getByLabelText("Exam / class / subject")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(saveExamMarksLive).toHaveBeenCalledTimes(1);
    rejectSave(new Error("Connection interrupted"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection interrupted");
    expect(screen.getByLabelText("Asha Njeri score")).toHaveValue("74");
    expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled();
  });

  it("excludes completed exams even when an older cached response includes them", async () => {
    const result = await jest.mocked(fetchPendingMarksLive)(mockSession, true);
    jest.mocked(fetchPendingMarksLive).mockClear();
    jest.mocked(fetchPendingMarksLive).mockResolvedValue({ ...result, windows: [
      { ...result.windows[0], id: "completed", examName: "Old completed exam", status: "Completed" }, result.windows[0],
    ] });
    await openWorkspace();
    expect(screen.queryByRole("option", { name: /Old completed exam/ })).not.toBeInTheDocument();
    expect(fetchTeacherMarkSheetLive).toHaveBeenCalledTimes(1);
  });

  it("closes the active sheet when a refresh reports it as completed", async () => {
    await openWorkspace();
    const result = await jest.mocked(fetchPendingMarksLive)(mockSession, true);
    jest.mocked(fetchPendingMarksLive).mockResolvedValue({ ...result, windows: [{ ...result.windows[0], status: "Completed" }] });
    fireEvent.click(screen.getByRole("button", { name: "Refresh exams" }));
    expect(await screen.findByText("No exams awaiting marks")).toBeVisible();
    expect(screen.queryByLabelText("Asha Njeri score")).not.toBeInTheDocument();
  });

  it("shows a retryable discovery error without misleading empty counts", async () => {
    jest.mocked(fetchPendingMarksLive).mockRejectedValueOnce(new Error("Request failed: 500"));
    renderWithProviders(createElement(ExamsMarksWorkspace, { onStartAction: jest.fn() }));
    expect(await screen.findByText(/We couldn.t load your assigned markbooks/)).toBeVisible();
    expect(screen.queryByText("No exams awaiting marks")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry loading markbooks" }));
    expect(await screen.findByLabelText("Asha Njeri score")).toBeEnabled();
  });

  it("shows a retryable roster error and disables exports and mutations", async () => {
    jest.mocked(fetchTeacherMarkSheetLive).mockRejectedValueOnce(new Error("Request failed: 500"));
    renderWithProviders(createElement(ExamsMarksWorkspace, { onStartAction: jest.fn() }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Request failed: 500");
    expect(screen.getByRole("button", { name: "Download CSV" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit results" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Retry markbook" }));
    expect(await screen.findByLabelText("Asha Njeri score")).toBeEnabled();
    expect(screen.queryByText(/Missing evidence|Validation errors/)).not.toBeInTheDocument();
  });

  it.each([
    ["Draft", /must select Open for marks/i], ["Scheduled", /can open it earlier/i],
    ["Closed", /Ask the Exams Manager to open/i], ["Deadline passed", /extend the end date/i],
    ["Locked", /governed correction workflow/i],
  ])("explains %s exams and blocks entry", async (entryState, reason) => {
    const result = await jest.mocked(fetchPendingMarksLive)(mockSession, true);
    jest.mocked(fetchPendingMarksLive).mockClear();
    jest.mocked(fetchPendingMarksLive).mockResolvedValue({ ...result, windows: [
      { ...result.windows[0], canEnter: false, entryState, status: entryState, opensAt: "2026-10-01T06:00:00Z" },
    ] });
    renderWithProviders(createElement(ExamsMarksWorkspace, { onStartAction: jest.fn() }));
    expect(await screen.findByText(reason)).toBeVisible();
    expect(fetchTeacherMarkSheetLive).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Submit results" })).toBeDisabled();
  });

  it("refreshes an assigned draft once the manager opens it", async () => {
    const result = await jest.mocked(fetchPendingMarksLive)(mockSession, true);
    jest.mocked(fetchPendingMarksLive).mockResolvedValueOnce({ ...result, windows: [
      { ...result.windows[0], canEnter: false, entryState: "Draft", status: "Draft" },
    ] });
    renderWithProviders(createElement(ExamsMarksWorkspace, { onStartAction: jest.fn() }));
    expect(await screen.findByText(/must select Open for marks/i)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Refresh exams" }));
    expect(await screen.findByLabelText("Asha Njeri score")).toBeEnabled();
  });

  it("shows an actionable empty state once the exam list loads", async () => {
    jest.mocked(fetchPendingMarksLive).mockResolvedValue({ stats: { totalWindows: 0, nearingDeadline: 0 }, windows: [] });
    renderWithProviders(createElement(ExamsMarksWorkspace, { onStartAction: jest.fn() }));
    expect(await screen.findByText("No exams awaiting marks")).toBeVisible();
    expect(screen.getByText(/active class and subject allocation/)).toBeVisible();
    expect(fetchTeacherMarkSheetLive).not.toHaveBeenCalled();
  });
});
