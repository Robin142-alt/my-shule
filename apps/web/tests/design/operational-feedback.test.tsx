import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import { OperationalActionButton, type OperationalActionContract } from "@/components/operational/operational-action-button";
import { OperationalFormShell, type OperationalFormContract } from "@/components/operational/operational-form-shell";
import { OperationalQueue } from "@/components/operational/operational-queue";
import { OperationalTable } from "@/components/operational/operational-table";
import { useActionFeedback } from "@/hooks/use-action-feedback";
import { renderWithProviders } from "./test-utils";

jest.mock("sonner", () => ({ Toaster: () => null, toast: {
  loading: jest.fn(), error: jest.fn(), warning: jest.fn(), success: jest.fn(), dismiss: jest.fn(),
} }));

const contract: OperationalFormContract = {
  title: "Contact guardian", description: "Contact the selected learner's guardian.",
  fields: [
    { id: "student", label: "Student", type: "text" },
    { id: "message", label: "Message", type: "textarea" },
  ],
  footerActions: ["Submit"], auditAction: "communication.requested",
  workflowBinding: "communication", capability: "CAN_SEND_PARENT_SMS",
};

const action: OperationalActionContract = {
  actionId: "approve", label: "Approve", capability: "CAN_APPROVE",
  workflowBinding: "approvals", executionHandler: "approval.execute",
  eventContract: ["approval.approved"], auditEvent: "approval.approved", health: "ACTIVE",
};

describe("operational feedback visibility", () => {
  beforeEach(() => { jest.clearAllMocks(); window.localStorage.clear(); });

  it("reannounces repeated validation attempts and brings the first invalid field into view", async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    renderWithProviders(<OperationalFormShell contract={contract} onAction={onAction} />);
    const student = screen.getByLabelText("Student");
    const scrollIntoView = jest.fn();
    student.scrollIntoView = scrollIntoView;

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(student).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "auto" });
    expect(student).toHaveAttribute("aria-invalid", "true");
    expect(student).toHaveAccessibleDescription("Student is required.");
    expect(screen.getByRole("alert")).toHaveTextContent("Check the highlighted fields");
    expect(toast.error).toHaveBeenCalledWith("Check the highlighted fields before submitting.", expect.objectContaining({ duration: Infinity }));

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(toast.error).toHaveBeenCalledTimes(2);
    expect(onAction).not.toHaveBeenCalled();
    await user.type(student, "Learner");
    expect(student).toHaveAttribute("aria-invalid", "false");
    expect(toast.dismiss).toHaveBeenCalledWith(jest.mocked(toast.error).mock.calls[0][1]?.id);
  });

  it("replaces progress with the server error and keeps the form available for a retry", async () => {
    const user = userEvent.setup();
    let reject: (error: Error) => void = () => {};
    const onAction = jest.fn(() => new Promise<void>((_resolve, rejectPromise) => { reject = rejectPromise; }));
    renderWithProviders(<OperationalFormShell contract={{ ...contract, fields: [] }} onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Submit" }));
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
    expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "true");
    expect(toast.loading).toHaveBeenCalledWith("Submit is being processed...", expect.any(Object));
    await act(async () => { reject(new Error("School API rejected this action.")); });
    expect(screen.getByRole("button", { name: "Submit" })).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent("School API rejected this action.");
    expect(toast.error).toHaveBeenCalledWith("School API rejected this action.", expect.objectContaining({ id: jest.mocked(toast.loading).mock.calls[0][1]?.id }));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("shows table action failures in the viewport without changing the row status", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OperationalTable contract={{
      title: "Approval records", description: "Review pending records", searchPlaceholder: "Search records",
      filters: [], sortOptions: [], columns: [{ key: "status", label: "Status" }],
      rows: [{ id: "row-1", cells: { status: "Pending" }, actions: ["Approve"] }],
      bulkActions: [], exportLabel: "Export", printLabel: "Print",
    }} onAction={async () => { throw new Error("Approval denied by server."); }} />);

    await user.click(screen.getByRole("button", { name: "Row row-1 Approve" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Approval denied by server.", expect.objectContaining({ duration: Infinity })));
    expect(screen.getByRole("alert")).toHaveTextContent("Approval denied by server.");
    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
  });

  it("announces queued results truthfully and announces locked actions without executing", async () => {
    const user = userEvent.setup();
    const onExecute = jest.fn(async () => ({ message: "Message queued for delivery.", tone: "warning" as const }));
    const view = renderWithProviders(<OperationalActionButton action={action} onExecute={onExecute} />);
    await user.click(screen.getByRole("button", { name: "Approve Ready" }));
    expect(toast.warning).toHaveBeenCalledWith("Message queued for delivery.", expect.any(Object));
    expect(toast.success).not.toHaveBeenCalled();

    view.rerender(<OperationalActionButton action={{ ...action, health: "LOCKED" }} onExecute={onExecute} />);
    await user.click(screen.getByRole("button", { name: "Approve No permission" }));
    expect(toast.error).toHaveBeenCalledWith("Approve requires CAN_APPROVE permission.", expect.any(Object));
    expect(onExecute).toHaveBeenCalledTimes(1);
  });

  it("retains a failed queue status when the handler returns a danger result", async () => {
    const user = userEvent.setup();
    renderWithProviders(<OperationalQueue contract={{
      title: "Approvals", description: "Pending approvals", bulkActions: [],
      items: [{ id: "item-1", title: "Request", owner: "School staff", workflow: "Pending", sla: "Today", priority: { label: "Pending", tone: "warning" }, actions: [action], auditEvent: "approval.requested" }],
    }} onExecute={async () => ({ message: "Approval cannot proceed.", tone: "danger" })} />);
    await user.click(screen.getByRole("button", { name: "Approve Ready" }));
    expect(toast.error).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Approved")).not.toBeInTheDocument();
    expect(screen.getAllByRole("alert").every((notice) => notice.textContent === "Approval cannot proceed.")).toBe(true);
  });

  it("dismisses persistent feedback on unmount and ignores late operation results", () => {
    const { result, unmount } = renderHook(() => useActionFeedback());
    const announce = result.current.showFeedback;
    act(() => announce("Request failed.", "danger"));
    const id = jest.mocked(toast.error).mock.calls[0][1]?.id;
    unmount();
    expect(toast.dismiss).toHaveBeenCalledWith(id);
    act(() => announce("Late completion.", "success"));
    expect(toast.success).not.toHaveBeenCalled();
  });
});
