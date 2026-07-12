import { fireEvent, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";

import { ExamsMarksWorkspace } from "@/components/school/teacher-dashboard/exams-marks-workspace";
import { useLiveTenantSession } from "@/hooks/use-live-tenant-session";
import {
  fetchClassRegisterLive,
  fetchPendingMarksLive,
  saveExamMarksLive,
} from "@/lib/modules/teacher-live";

import { renderWithProviders } from "./test-utils";

jest.mock("@/hooks/use-live-tenant-session", () => ({
  useLiveTenantSession: jest.fn(),
}));

jest.mock("@/lib/modules/teacher-live", () => ({
  fetchClassRegisterLive: jest.fn(),
  fetchPendingMarksLive: jest.fn(),
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
          examName: "Term 2 Opener",
          className: "Form 2 Blue",
          classSectionId: "class-2-blue",
          subjectName: "Mathematics",
          paperName: "Paper 1",
          outOf: 80,
          deadline: "2026-07-20",
          enteredCount: 1,
          totalStudents: 2,
          status: "Pending",
        },
      ],
    });
    (fetchClassRegisterLive as jest.Mock).mockResolvedValue([
      {
        id: "student-1",
        admissionNo: "ADM-001",
        name: "Asha Njeri",
        gender: "Female",
        parentPhone: "0700000001",
        status: "active",
      },
      {
        id: "student-2",
        admissionNo: "ADM-002",
        name: "Brian Otieno",
        gender: "Male",
        parentPhone: "0700000002",
        status: "active",
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
    expect(screen.getByText(/Moderation readiness/i)).toBeVisible();
    expect(await screen.findByText(/50% complete/i)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /Open markbook for Term 2 Opener/i }));

    const ashaInput = await screen.findByLabelText(/Asha Njeri score/i);
    expect(screen.getByText(/Brian Otieno/i)).toBeVisible();

    fireEvent.change(ashaInput, { target: { value: "74" } });
    fireEvent.click(screen.getByRole("button", { name: /Save draft/i }));

    await waitFor(() => {
      expect(saveExamMarksLive).toHaveBeenCalledWith(
        mockSession,
        expect.objectContaining({
          action: "draft",
          examId: "window-1",
          classSectionId: "class-2-blue",
          scores: expect.objectContaining({ "student-1": "74" }),
        }),
      );
    });

    fireEvent.change(screen.getByLabelText(/Brian Otieno score/i), { target: { value: "68" } });
    fireEvent.click(screen.getByRole("button", { name: /Submit for moderation/i }));

    await waitFor(() => {
      expect(saveExamMarksLive).toHaveBeenCalledWith(
        mockSession,
        expect.objectContaining({
          action: "submit",
          examId: "window-1",
          scores: expect.objectContaining({ "student-1": "74", "student-2": "68" }),
        }),
      );
    });
  });
});
