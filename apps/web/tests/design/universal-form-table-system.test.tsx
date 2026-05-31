import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  OperationalFormShell,
  type OperationalFormContract,
} from "@/components/operational/operational-form-shell";
import {
  OperationalQueue,
  type OperationalQueueContract,
} from "@/components/operational/operational-queue";
import {
  OperationalTable,
  type OperationalTableContract,
} from "@/components/operational/operational-table";
import { RightDetailsDrawer } from "@/components/operational/right-details-drawer";

import { renderWithProviders } from "./test-utils";

const tableContract: OperationalTableContract = {
  title: "Payment Reconciliation Queue",
  description: "Resolve unmatched M-Pesa payments without leaving the accountant workspace.",
  searchPlaceholder: "Search student, receipt, or M-Pesa code",
  filters: ["Status", "Class", "Payment method"],
  sortOptions: ["Newest", "Oldest", "Highest amount"],
  columns: [
    { key: "receipt", label: "Receipt" },
    { key: "student", label: "Student" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
  ],
  rows: [
    {
      id: "row-1",
      cells: {
        receipt: "QEX7ABC123",
        student: "Brian Otieno",
        amount: "KES 18,500",
        status: "Pending",
      },
      status: { label: "Pending", tone: "warning" },
      actions: ["Review", "Reconcile", "Print", "View Action Record"],
    },
  ],
  bulkActions: ["Reconcile selected", "Send SMS to selected parents"],
  exportLabel: "Export",
  printLabel: "Print",
};

const formContract: OperationalFormContract = {
  title: "Parent SMS Follow-up",
  description: "Send a governed attendance follow-up to the guardian.",
  fields: [
    { id: "student", label: "Student", type: "text", value: "Brian Otieno" },
    { id: "phone", label: "Parent Phone", type: "tel", value: "07XXXXXXXX" },
    { id: "message", label: "Message", type: "textarea", value: "Please contact the class teacher." },
  ],
  footerActions: [
    "Cancel",
    "Save Draft",
    "Submit",
    "Preview",
    "Print",
    "Submit for Approval",
    "Send SMS",
    "Preview Print",
  ],
  auditAction: "audit.parent-sms-follow-up",
  workflowBinding: "parent-communication",
  capability: "CAN_SEND_PARENT_SMS",
};

const queueContract: OperationalQueueContract = {
  title: "Discipline follow-up queue",
  description: "Daily student welfare actions waiting for staff decisions.",
  items: [
    {
      id: "case-1",
      title: "Faith Akinyi repeat lateness follow-up",
      owner: "Deputy Principal",
      workflow: "Reported -> Parent contact -> Decision",
      sla: "Today 4:00 PM",
      priority: { label: "High", tone: "critical" },
      auditEvent: "audit.discipline.case-1",
      actions: [
        {
          actionId: "approve-case",
          label: "Approve",
          capability: "CAN_APPROVE_DISCIPLINE",
          workflowBinding: "discipline-follow-up",
          executionHandler: "local.discipline.approve",
          eventContract: ["DISCIPLINE_ACTION_APPROVED"],
          auditEvent: "audit.discipline.approve",
          confirmation: "NONE",
          retryPolicy: "RETRY",
          fallbackHandler: "fallback.discipline.approve",
          health: "ACTIVE",
        },
        {
          actionId: "send-parent-sms",
          label: "Send Parent SMS",
          capability: "CAN_NOTIFY_PARENT",
          workflowBinding: "parent-notification",
          executionHandler: "local.sms.parent",
          eventContract: ["PARENT_SMS_QUEUED"],
          auditEvent: "audit.sms.parent",
          confirmation: "NONE",
          retryPolicy: "RETRY",
          fallbackHandler: "fallback.sms.parent",
          health: "ACTIVE",
        },
      ],
    },
  ],
  bulkActions: [
    {
      actionId: "bulk-notify",
      label: "Send SMS to all parents",
      capability: "CAN_NOTIFY_PARENT",
      workflowBinding: "parent-notification",
      executionHandler: "local.sms.bulk",
      eventContract: ["PARENT_SMS_QUEUED"],
      auditEvent: "audit.sms.bulk",
      confirmation: "NONE",
      retryPolicy: "RETRY",
      fallbackHandler: "fallback.sms.bulk",
      health: "ACTIVE",
    },
  ],
};

describe("universal operational form and table system", () => {
  it("renders the complete table contract with search, filters, sort, columns, row actions, bulk actions, export, print, loading, empty, and error states", () => {
    renderWithProviders(
      <OperationalTable
        contract={tableContract}
        loadingMessage="Loading reconciliation rows"
        emptyMessage="No payment exceptions are pending."
        errorMessage="Payment queue is degraded. Retry sync."
      />,
    );

    expect(screen.getByRole("heading", { name: /payment reconciliation queue/i })).toBeVisible();
    expect(screen.getByText(/resolve unmatched m-pesa payments/i)).toBeVisible();
    expect(screen.getByPlaceholderText(/search student, receipt, or m-pesa code/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /filter status/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /sort newest/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /columns/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /export/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /^print$/i })).toBeVisible();
    expect(screen.getByText("QEX7ABC123")).toBeVisible();
    expect(screen.getByText("KES 18,500")).toBeVisible();
    expect(screen.getByRole("button", { name: /row row-1 review/i })).toBeVisible();
    expect(screen.getByRole("button", { name: /bulk reconcile selected/i })).toBeVisible();
    expect(screen.getByText(/Loading reconciliation rows/)).toBeVisible();
    expect(screen.getByText(/No payment exceptions are pending/)).toBeVisible();
    expect(screen.getByText(/Payment queue is degraded/)).toBeVisible();
    expect(screen.getByText(/Page 1 of 1/)).toBeVisible();
  });

  it("renders the governed form footer and execution metadata without disconnecting workflow context", () => {
    renderWithProviders(<OperationalFormShell contract={formContract} />);

    const form = screen.getByRole("form", { name: /parent sms follow-up/i });

    expect(within(form).getByLabelText(/student/i)).toHaveValue("Brian Otieno");
    expect(within(form).getByLabelText(/parent phone/i)).toHaveValue("07XXXXXXXX");
    expect(within(form).getByRole("button", { name: /cancel/i })).toBeVisible();
    expect(within(form).getByRole("button", { name: /save draft/i })).toBeVisible();
    expect(within(form).getByRole("button", { name: /^submit$/i })).toBeVisible();
    expect(within(form).getByRole("button", { name: /^preview$/i })).toBeVisible();
    expect(within(form).getByRole("button", { name: /^print$/i })).toBeVisible();
    expect(within(form).getByRole("button", { name: /submit for approval/i })).toBeVisible();
    expect(within(form).getByRole("button", { name: /send sms/i })).toBeVisible();
    expect(within(form).getByRole("button", { name: /preview print/i })).toBeVisible();
    expect(screen.getByText(/Action details/)).toBeVisible();
    expect(screen.getByText(/Permission checked/)).toBeVisible();
    expect(screen.getByText(/Related records update after saving/)).toBeVisible();
    expect(screen.getByText(/Reporting record kept/)).toBeVisible();
  });

  it("makes table search, row view/edit/delete, sms, print, and export actions usable with local state", async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, "createObjectURL", {
        configurable: true,
        value: jest.fn(),
      });
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, "revokeObjectURL", {
        configurable: true,
        value: jest.fn(),
      });
    }
    const openSpy = jest.spyOn(window, "open").mockReturnValue({
      document: {
        write: jest.fn(),
        close: jest.fn(),
      },
      focus: jest.fn(),
      print: jest.fn(),
    } as unknown as Window);
    const anchorClickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const createObjectUrlSpy = jest.spyOn(URL, "createObjectURL").mockReturnValue("blob:table-export");
    const revokeObjectUrlSpy = jest.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    renderWithProviders(
      <OperationalTable
        contract={{
          ...tableContract,
          rows: [
            ...tableContract.rows,
            {
              id: "row-2",
              cells: {
                receipt: "RCP-2026-044",
                student: "Faith Akinyi",
                amount: "KSh 7,200",
                status: "Cleared",
              },
              status: { label: "Cleared", tone: "ok" },
              actions: ["View", "Edit", "Delete", "Send SMS", "Print"],
            },
          ],
        }}
        onAction={onAction}
        showStatePanels={false}
      />,
    );

    await user.type(screen.getByPlaceholderText(/search student/i), "Faith");
    expect(screen.getByText("Faith Akinyi")).toBeVisible();
    expect(screen.queryByText("Brian Otieno")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /row row-2 view/i }));
    expect(screen.getByRole("dialog", { name: /faith akinyi/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /close dialog/i }));

    await user.click(screen.getByRole("button", { name: /row row-2 edit/i }));
    await user.clear(screen.getByLabelText(/student/i));
    await user.type(screen.getByLabelText(/student/i), "Faith Akinyi Updated");
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.getByText("Faith Akinyi Updated")).toBeVisible();

    await user.click(screen.getByRole("button", { name: /row row-2 send sms/i }));
    expect(screen.getByText(/sms queued/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /export/i }));
    expect(createObjectUrlSpy).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /row row-2 delete/i }));
    expect(screen.getByRole("dialog", { name: /confirm delete/i })).toBeVisible();
    await user.click(screen.getByRole("button", { name: /yes, remove record/i }));
    expect(screen.queryByText("Faith Akinyi Updated")).not.toBeInTheDocument();
    expect(onAction).toHaveBeenCalledWith("Delete", expect.objectContaining({ scope: "row", rowId: "row-2" }));

    openSpy.mockRestore();
    anchorClickSpy.mockRestore();
    createObjectUrlSpy.mockRestore();
    revokeObjectUrlSpy.mockRestore();
  }, 20000);

  it("validates required form fields, saves drafts locally, submits new entries, and resets cleanly", async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    const storageKey = "myshule:default-school:operational-form:parent-sms-follow-up";

    window.localStorage.removeItem(storageKey);

    renderWithProviders(
      <OperationalFormShell
        contract={{
          ...formContract,
          fields: [
            { id: "student", label: "Student", type: "text", value: "" },
            { id: "phone", label: "Parent Phone", type: "tel", value: "" },
            { id: "message", label: "Message", type: "textarea", value: "" },
          ],
        }}
        onAction={onAction}
      />,
    );

    await user.click(screen.getByRole("button", { name: /^submit$/i }));
    expect(screen.getByText(/student is required/i)).toBeVisible();

    await user.type(screen.getByLabelText(/student/i), "Brian Otieno");
    await user.type(screen.getByLabelText(/parent phone/i), "0712345678");
    await user.type(screen.getByLabelText(/message/i), "Please visit the school office.");
    await user.click(screen.getByRole("button", { name: /save draft/i }));

    expect(window.localStorage.getItem(storageKey)).toContain("Brian Otieno");
    expect(screen.getByText(/draft saved/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /^submit$/i }));
    expect(onAction).toHaveBeenCalledWith(
      "Submit",
      expect.objectContaining({ title: "Parent SMS Follow-up" }),
      expect.objectContaining({ student: "Brian Otieno" }),
    );
    expect(screen.getByText(/form submitted/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.getByLabelText(/student/i)).toHaveValue("");
  });

  it("turns queue actions into visible local workflow updates instead of static buttons", async () => {
    const user = userEvent.setup();
    const onExecute = jest.fn();

    renderWithProviders(<OperationalQueue contract={queueContract} onExecute={onExecute} />);

    expect(screen.getByText("Faith Akinyi repeat lateness follow-up")).toBeVisible();
    await user.click(screen.getByRole("button", { name: /approve ready/i }));
    expect(screen.getByText("Approved")).toBeVisible();
    expect(onExecute).toHaveBeenCalledWith(expect.objectContaining({ actionId: "approve-case" }));

    await user.click(screen.getByRole("button", { name: /send parent sms ready/i }));
    expect(screen.getByText(/sms queued/i)).toBeVisible();

    await user.click(screen.getByRole("button", { name: /send sms to all parents ready/i }));
    expect(screen.getByText(/all queued families/i)).toBeVisible();
  });

  it("keeps right-side detail, comments, attachments, updates, progress, and action records available in one drawer", () => {
    renderWithProviders(
      <RightDetailsDrawer
        title="Brian Otieno Follow-up"
        subtitle="Admission No: MYS/2026/001"
        sections={{
          details: ["Grade 7 East", "Parent Phone: 07XXXXXXXX"],
          comments: ["Class teacher requested counselling referral."],
          attachments: ["attendance-report.pdf"],
          history: ["Marked absent 3 days", "Parent SMS sent"],
          workflow: ["Submitted", "Under Review", "Escalated"],
          audit: ["Updated by class teacher", "School: Greenfield Academy", "Student follow-up escalated"],
        }}
      />,
    );

    expect(screen.getByRole("complementary", { name: /brian otieno follow-up/i })).toBeVisible();
    expect(screen.getByText(/Grade 7 East/)).toBeVisible();
    expect(screen.getByText(/attendance-report\.pdf/)).toBeVisible();
    expect(screen.getByText(/Under Review/)).toBeVisible();
    expect(screen.getByText(/Student follow-up escalated/)).toBeVisible();
  });
});
