import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { ParentNotificationsWorkspace } from "@/components/school/nurse/parent-notifications-workspace";
import { sendParentNotification } from "@/components/school/nurse/api-client";
import { ParentCommunicationWorkspace } from "@/components/school/teacher-dashboard/parent-communication-workspace";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
}));

jest.mock("@/hooks/use-live-tenant-session", () => ({
  useLiveTenantSession: () => ({
    session: {
      tenantId: "tenant-a",
      user: { user_id: "11111111-1111-4111-8111-111111111111" },
    },
  }),
}));

jest.mock("@/lib/dashboard/api-client", () => ({
  requestDashboardApi: jest.fn(),
}));

jest.mock("@/components/school/nurse/api-client", () => ({
  sendParentNotification: jest.fn(),
  resendParentNotification: jest.fn(),
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const refetch = jest.fn();

describe("exact guardian delivery workspaces", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refetch.mockResolvedValue(undefined);
    (requestDashboardApi as jest.Mock).mockImplementation((path: string, options?: { method?: string }) => {
      if (path === "/admin-command/teacher/message-recipients") {
        return Promise.resolve({
          classes: [{ class_section_id: "class-a", class_name: "Grade 8 North", sms_available: true }],
          guardians: [{
            guardian_id: "guardian-a",
            guardian_name: "Akinyi Otieno",
            student_name: "Achieng Otieno",
            class_name: "Grade 8 North",
            sms_available: true,
          }],
        });
      }
      if (path === "/admin-command/teacher/messages" && options?.method === "POST") {
        return Promise.resolve({ message: "Message queued for 1 exact guardian account (1 portal, 1 SMS)." });
      }
      if (path === "/admin-command/teacher/messages") {
        return Promise.resolve({ items: [] });
      }
      return Promise.reject(new Error(`Unexpected dashboard request: ${path}`));
    });
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data: {
        metrics: { queued_today: 0, pending: 0, failed: 0 },
        notifications: [],
        recipients: [{
          student_id: "student-a",
          student_name: "Achieng Otieno",
          guardian_id: "guardian-a",
          guardian_name: "Akinyi Otieno",
          relationship: "Mother",
          sms_available: true,
        }],
      },
      isLoading: false,
      error: null,
      refetch,
    });
  });

  it("submits a teacher message with a canonical assigned guardian ID, not typed contact details", async () => {
    const user = userEvent.setup();
    const onStartAction = jest.fn();
    renderWithProviders(createElement(ParentCommunicationWorkspace, { onStartAction }));

    await user.click(screen.getByRole("button", { name: "New Message" }));
    const recipient = await screen.findByRole("combobox", { name: "Recipient" });
    await user.selectOptions(recipient, "guardian-a");
    await user.type(screen.getByRole("textbox", { name: "Subject" }), "Progress follow-up");
    await user.type(screen.getByRole("textbox", { name: "Message" }), "Please review the progress note in the portal.");
    expect(screen.queryByPlaceholderText(/phone|email|guardian id/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Queue Message" }));

    await waitFor(() => {
      expect(requestDashboardApi).toHaveBeenCalledWith(
        "/admin-command/teacher/messages",
        {
          method: "POST",
          body: {
            audience: "individual_parent",
            recipient: "guardian-a",
            subject: "Progress follow-up",
            message: "Please review the progress note in the portal.",
          },
        },
      );
    });
    expect(onStartAction).toHaveBeenCalledWith(
      "sms",
      "parent-communication",
      "Compose a parent message for a linked learner.",
    );
  });

  it("submits a nurse alert with canonical learner and guardian IDs and no trusted phone field", async () => {
    const user = userEvent.setup();
    (sendParentNotification as jest.Mock).mockResolvedValue({
      message: "Health alert queued for 1 exact guardian account (1 portal, 1 SMS).",
    });
    renderWithProviders(createElement(ParentNotificationsWorkspace));

    await user.click(screen.getByRole("button", { name: "Send Alert" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Student *" }), "student-a");
    await user.selectOptions(screen.getByRole("combobox", { name: "Guardian" }), "guardian-a");
    await user.selectOptions(screen.getByRole("combobox", { name: "Channel" }), "sms");
    await user.type(screen.getByRole("textbox", { name: "Message *" }), "Please contact the school clinic.");
    expect(screen.queryByLabelText(/parent phone/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Queue Alert" }));

    await waitFor(() => {
      expect(sendParentNotification).toHaveBeenCalledWith({
        student_id: "student-a",
        guardian_id: "guardian-a",
        channel: "sms",
        message: "Please contact the school clinic.",
      });
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
