import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";
import { toast } from "sonner";

import { DeputyAttendanceWorkspace } from "@/components/school/deputy-principal/attendance-workspace";
import { notifyParentAttendance } from "@/components/school/deputy-principal/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
}));

jest.mock("@/components/school/deputy-principal/api-client", () => ({
  notifyParentAttendance: jest.fn(),
  createFollowUpList: jest.fn(),
  remindUnmarkedAttendance: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const refetch = jest.fn();

describe("Deputy attendance guardian notices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refetch.mockResolvedValue(undefined);
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data: {
        metrics: { absent_students: 1, late_students: 0 },
        records: [{
          id: "attendance-log-a",
          studentName: "Learner A",
          className: "Grade 8 North",
          status: "Absent",
          reason: "Unexplained",
          parentNotified: "Pending",
        }],
      },
      isLoading: false,
      error: null,
      refetch,
    });
  });

  it("reports only the exact guardian queue result returned by the backend", async () => {
    const user = userEvent.setup();
    (notifyParentAttendance as jest.Mock).mockResolvedValue({
      success: true,
      message: "Attendance notice queued for 2 linked guardian accounts",
      guardianNotificationCount: 2,
    });

    renderWithProviders(createElement(DeputyAttendanceWorkspace));
    await user.click(screen.getByRole("button", { name: "Contact Parent" }));

    await waitFor(() => expect(notifyParentAttendance).toHaveBeenCalledWith("attendance-log-a"));
    expect(toast.success).toHaveBeenCalledWith("Attendance notice queued for 2 linked guardian accounts");
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps the record pending and shows a truthful error when no guardian receives it", async () => {
    const user = userEvent.setup();
    (notifyParentAttendance as jest.Mock).mockRejectedValue(
      new Error("No active linked guardian account is available for this student"),
    );

    renderWithProviders(createElement(DeputyAttendanceWorkspace));
    await user.click(screen.getByRole("button", { name: "Contact Parent" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("No guardian notice was sent", {
        description: "No active linked guardian account is available for this student",
      });
    });
    expect(refetch).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Contact Parent" })).toBeEnabled();
  });
});
