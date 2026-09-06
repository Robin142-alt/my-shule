import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement } from "react";

import { DeputyApprovalsWorkspace } from "@/components/school/deputy-principal/approvals-workspace";
import { actionApproval } from "@/components/school/deputy-principal/api-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";

import { renderWithProviders } from "./test-utils";

jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: jest.fn(),
}));

jest.mock("@/components/providers/permission-context", () => ({
  usePermissions: () => ({
    hasPermission: (permission: string) => permission === "deputy:write",
  }),
}));

jest.mock("@/components/school/deputy-principal/api-client", () => ({
  actionApproval: jest.fn(),
}));

jest.mock("sonner", () => ({
  ...jest.requireActual("sonner"),
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

const refetch = jest.fn();

function approvalData() {
  return {
    metrics: { pending_approvals: 2, urgent_approvals: 1 },
    approvalsList: [
      {
        id: "approval-procurement",
        title: "Science supplies purchase",
        reason: "Required for practical lessons",
        status: "pending",
        approval_type: "procurement",
        module: "procurement",
        record_id: "request-1",
        priority: "high",
        created_at: "2026-08-22T08:00:00.000Z",
      },
      {
        id: "approval-finance",
        title: "Fee waiver review",
        reason: "Parent hardship request",
        status: "changes_requested",
        approval_type: "fee_waiver",
        module: "finance",
        record_id: "waiver-1",
        priority: "normal",
        created_at: "2026-08-22T07:00:00.000Z",
      },
    ],
    recentApprovals: [
      {
        id: "approval-old",
        title: "Library books purchase",
        status: "approved",
        note: "Within the approved budget",
        module: "procurement",
        date: "2026-08-21",
      },
    ],
  };
}

describe("Deputy approvals workspace", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    refetch.mockResolvedValue(undefined);
    (useSchoolQuery as jest.Mock).mockReturnValue({
      data: approvalData(),
      isLoading: false,
      error: null,
      refetch,
    });
  });

  it("renders only canonical procurement actions and requires a reason for rejection", async () => {
    const user = userEvent.setup();
    (actionApproval as jest.Mock).mockResolvedValue({ success: true });

    renderWithProviders(createElement(DeputyApprovalsWorkspace));

    expect(screen.getByText("2", { selector: "div.mt-1" })).toBeVisible();
    expect(screen.getByText("Science supplies purchase")).toBeVisible();
    expect(screen.getByText("Changes Requested")).toBeVisible();
    expect(screen.getByText(/Decide in the finance workspace/i)).toBeVisible();
    expect(screen.getAllByRole("button", { name: "Approve" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Reject" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Reject" }));
    const dialog = await screen.findByRole("dialog", { name: "Reject request" });
    const rejectionReason = within(dialog).getByRole("textbox", { name: "Rejection reason" });
    expect(rejectionReason).toBeRequired();
    await user.type(rejectionReason, "Missing supplier quotation");
    await user.click(within(dialog).getByRole("button", { name: "Confirm rejection" }));

    await waitFor(() => {
      expect(actionApproval).toHaveBeenCalledWith(
        "approval-procurement",
        "reject",
        "Missing supplier quotation",
      );
    });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("keeps a failed canonical decision visible and does not report success", async () => {
    const user = userEvent.setup();
    (actionApproval as jest.Mock).mockRejectedValue(
      new Error("403 — Approval was not assigned to the active Deputy Principal role"),
    );

    renderWithProviders(createElement(DeputyApprovalsWorkspace));

    await user.click(screen.getByRole("button", { name: "Approve" }));
    const dialog = await screen.findByRole("dialog", { name: "Approve request" });
    await user.click(within(dialog).getByRole("button", { name: "Confirm approval" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Approval was not assigned to the active Deputy Principal role",
    );
    expect(refetch).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "Approve request" })).toBeVisible();
  });
});
