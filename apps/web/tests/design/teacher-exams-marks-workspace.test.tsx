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

  it("opens a full teacher markbook with analytics, learner rows, save draft, and moderation submission", async () => {
    renderWithProviders(
      createElement(ExamsMarksWorkspace, {
        onStartAction: jest.fn(),
      }),
    );

    expect((await screen.findAllByText(/Teacher markbook/i)).length).toBeGreaterThan(0);
    expect(await screen.findByText(/Moderation readiness/i)).toBeVisible();
    expect(await screen.findByText(/50% complete/i)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Open markbook for Term 2 Opener/i }));

    await screen.findAllByLabelText(/Asha Njeri score/i);
    expect(screen.getAllByText(/Brian Otieno/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getAllByLabelText(/Asha Njeri evidence status/i)[0]!, { target: { value: "entered" } });
    const ashaInput = screen.getAllByLabelText(/Asha Njeri score/i)[0]!;
    fireEvent.change(ashaInput, { target: { value: "74" } });
    fireEvent.click(screen.getByRole("button", { name: /Save draft/i }));

    await waitFor(() => {
      expect(saveExamMarksLive).toHaveBeenCalledWith(
        mockSession,
        expect.objectContaining({
          action: "draft",
          examId: "window-1",
          classSectionId: "class-2-blue",
          marks: expect.objectContaining({
            "student-1": expect.objectContaining({ score: 74, score_status: "entered" }),
          }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getAllByLabelText(/Asha Njeri score/i)[0]).toBeDisabled();
    });
    fireEvent.change(screen.getAllByLabelText(/Asha Njeri evidence status/i)[0]!, { target: { value: "entered" } });
    fireEvent.change(screen.getAllByLabelText(/Asha Njeri score/i)[0]!, { target: { value: "74" } });
    fireEvent.change(screen.getAllByLabelText(/Brian Otieno evidence status/i)[0]!, { target: { value: "entered" } });
    fireEvent.change(screen.getAllByLabelText(/Brian Otieno score/i)[0]!, { target: { value: "68" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit for moderation/i }));

    await waitFor(() => {
      expect(saveExamMarksLive).toHaveBeenCalledWith(
        mockSession,
        expect.objectContaining({
          action: "submit",
          examId: "window-1",
          marks: expect.objectContaining({
            "student-1": expect.objectContaining({ score: 74, score_status: "entered" }),
            "student-2": expect.objectContaining({ score: 68, score_status: "entered" }),
          }),
        }),
      );
    });
  });

  it("shows one retryable recovery state without misleading zero or empty markbooks when loading fails", async () => {
    (fetchPendingMarksLive as jest.Mock).mockRejectedValueOnce(
      new Error("Request failed: 500 — Internal server error"),
    );

    renderWithProviders(
      createElement(ExamsMarksWorkspace, {
        onStartAction: jest.fn(),
      }),
    );

    expect(await screen.findByText(/We couldn.t load your assigned markbooks/i)).toBeVisible();
    expect(screen.getByText(/Request failed: 500/i)).toBeVisible();
    expect(screen.queryByText(/No open exam markbooks yet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Open a markbook to start entering scores/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry loading markbooks/i }));

    await waitFor(() => {
      expect(fetchPendingMarksLive).toHaveBeenCalledTimes(2);
    });
    expect((await screen.findAllByText(/Term 2 Opener/i)).length).toBeGreaterThan(0);
  });

  it("shows one actionable empty state only after markbooks load successfully", async () => {
    (fetchPendingMarksLive as jest.Mock).mockResolvedValueOnce({
      stats: { totalWindows: 0, nearingDeadline: 0 },
      windows: [],
    });

    renderWithProviders(
      createElement(ExamsMarksWorkspace, {
        onStartAction: jest.fn(),
      }),
    );

    expect(await screen.findByText(/No markbooks assigned yet/i)).toBeVisible();
    expect(screen.getByText(/active class and subject allocation/i)).toBeVisible();
    expect(screen.queryByText(/We couldn.t load your assigned markbooks/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Open a markbook to start entering scores/i)).not.toBeInTheDocument();
  });
});
