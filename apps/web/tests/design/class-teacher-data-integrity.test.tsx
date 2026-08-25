import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { WelfareNotesWorkspace } from "@/components/school/class-teacher/welfare-notes-workspace";
import { createWelfareNote } from "@/components/school/class-teacher/api-client";
import { CommunicationWorkspace } from "@/components/school/class-teacher/workspaces/communication";
import { MeetingsWorkspace } from "@/components/school/class-teacher/workspaces/meetings";
import { sendClassTeacherCommunication } from "@/components/school/class-teacher/shared";
import { usePermissions } from "@/components/providers/permission-context";
import {
  useClassTeacherCommunication,
  useClassTeacherMeetings,
  useClassTeacherRegister,
} from "@/lib/data/class-teacher-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/data/class-teacher-hooks", () => ({
  useResolvedClassTeacherStreamId: () => ({ streamId: "44444444-4444-4444-8444-444444444444" }),
  useClassTeacherCommunication: jest.fn(),
  useClassTeacherMeetings: jest.fn(),
  useClassTeacherRegister: jest.fn(),
}));

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
}));

jest.mock("@/lib/dashboard/api-client", () => ({
  requestDashboardApi: jest.fn(),
}));

jest.mock("@/components/providers/permission-context", () => ({
  usePermissions: jest.fn(),
}));

jest.mock("@/components/school/class-teacher/api-client", () => ({
  createWelfareNote: jest.fn(),
  escalateWelfareNote: jest.fn(),
}));

jest.mock("@/components/school/class-teacher/shared", () => {
  const actual = jest.requireActual("@/components/school/class-teacher/shared");
  return { ...actual, sendClassTeacherCommunication: jest.fn() };
});

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const CLASS_ID = "44444444-4444-4444-8444-444444444444";
const refetchMeetings = jest.fn();
const refetchWelfare = jest.fn();

describe("class-teacher data integrity workspaces", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePermissions as jest.Mock).mockReturnValue({
      hasPermission: (permission: string) => permission === "teacher:write",
    });
    (useClassTeacherRegister as jest.Mock).mockReturnValue({
      data: [{ id: STUDENT_ID, name: "Akinyi Otieno", admissionNo: "ADM-001" }],
      isLoading: false,
      error: null,
    });
    (useClassTeacherCommunication as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
    (useClassTeacherMeetings as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: refetchMeetings.mockResolvedValue(undefined),
    });
    (useSchoolQuery as jest.Mock).mockImplementation((path: string) => {
      if (path.endsWith("/learner-profiles")) {
        return {
          data: { learners: [{ id: STUDENT_ID, full_name: "Akinyi Otieno", admission_no: "ADM-001" }] },
          isLoading: false,
          error: null,
          refetch: jest.fn(),
        };
      }
      return {
        data: {
          metrics: { total_notes: 0, open_cases: 0, escalated: 0, resolved_this_term: 0 },
          notes: [],
        },
        isLoading: false,
        error: null,
        refetch: refetchWelfare.mockResolvedValue(undefined),
      };
    });
    (requestDashboardApi as jest.Mock).mockResolvedValue({ success: true });
    (sendClassTeacherCommunication as jest.Mock).mockResolvedValue(true);
    (createWelfareNote as jest.Mock).mockResolvedValue({ success: true });
  });

  it("schedules a meeting with a canonical assigned learner and no trusted typed guardian identity", async () => {
    const user = userEvent.setup();
    renderWithProviders(<MeetingsWorkspace />);

    await user.click(screen.getByRole("button", { name: "Schedule Meeting" }));
    await user.type(screen.getByLabelText("Agenda"), "Term progress review");
    await user.selectOptions(screen.getByLabelText("Learner"), STUDENT_ID);
    await user.type(screen.getByLabelText("Meeting notes"), "Review attendance and progress.");
    fireEvent.change(screen.getByLabelText("Start date and time"), { target: { value: "2026-08-24T09:00" } });

    expect(screen.queryByRole("textbox", { name: /parent|guardian/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save Meeting" }));

    await waitFor(() => {
      expect(requestDashboardApi).toHaveBeenCalledWith(
        "/api/admin-command/class-teacher/meetings",
        expect.objectContaining({
          method: "POST",
          body: expect.objectContaining({
            title: "Term progress review",
            studentId: STUDENT_ID,
            description: "Review attendance and progress.",
          }),
        }),
      );
    });
    expect(refetchMeetings).toHaveBeenCalledTimes(1);
  });

  it("routes individual and class communications through assigned learner and class identifiers", async () => {
    const user = userEvent.setup();
    renderWithProviders(<CommunicationWorkspace />);

    await user.click(screen.getByRole("button", { name: "Send Individual Message" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Learner" }), STUDENT_ID);
    fireEvent.change(screen.getByRole("textbox", { name: "Subject" }), { target: { value: "Attendance follow-up" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "Please review the learner attendance record." } });
    await user.click(screen.getByRole("button", { name: "Send Message" }));

    await waitFor(() => {
      expect(sendClassTeacherCommunication).toHaveBeenCalledWith(expect.objectContaining({
        audience: "individual_parent",
        learnerId: STUDENT_ID,
        classSectionId: undefined,
      }));
    });

    await user.click(screen.getByRole("button", { name: "Add Class Announcement" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Subject" }), { target: { value: "Class reminder" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Message" }), { target: { value: "Please review tomorrow's class plan." } });
    await user.click(screen.getByRole("button", { name: "Publish Announcement" }));

    await waitFor(() => {
      expect(sendClassTeacherCommunication).toHaveBeenLastCalledWith(expect.objectContaining({
        audience: "class_announcement",
        learnerId: undefined,
        classSectionId: CLASS_ID,
      }));
    });
  });

  it("submits welfare category and severity for an assigned learner instead of a typed student name", async () => {
    const user = userEvent.setup();
    renderWithProviders(<WelfareNotesWorkspace />);

    await user.click(screen.getByRole("button", { name: "New Welfare Note" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Assigned learner" }), STUDENT_ID);
    await user.selectOptions(screen.getByRole("combobox", { name: "Welfare category" }), "Health");
    await user.selectOptions(screen.getByRole("combobox", { name: "Welfare severity" }), "High");
    await user.type(screen.getByRole("textbox", { name: "Welfare note" }), "Requires a safeguarding review.");

    expect(screen.queryByPlaceholderText(/student name/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create Note" }));

    await waitFor(() => {
      expect(createWelfareNote).toHaveBeenCalledWith({
        student_id: STUDENT_ID,
        category: "Health",
        severity: "High",
        note: "Requires a safeguarding review.",
      });
    });
    expect(refetchWelfare).toHaveBeenCalledTimes(1);
  });
});
