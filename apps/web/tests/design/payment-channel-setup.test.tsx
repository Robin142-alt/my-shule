import { fireEvent, render as renderUi, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { SchoolPaymentChannels } from "@/components/school/accountant/payment-channels-workspace";
import { PrincipalApprovalsWorkspace } from "@/components/school/principal-dashboard/approvals-workspace";
import { SchoolPaymentSetupSummary } from "@/components/school/accountant/payment-setup-summary";
import { resolvePaymentSetupNotificationHref } from "@/lib/notification-link-resolver";
import { PaymentGatewaysWorkspace } from "@/components/platform/workspaces/PaymentGatewaysWorkspace";
import * as api from "@/lib/finance/payment-channels-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";

jest.mock("@/lib/finance/payment-channels-client", () => ({
  ...jest.requireActual("@/lib/finance/payment-channels-client"),
  requestCollectionChannel: jest.fn(),
  decideCollectionChannel: jest.fn(),
  listPaymentIntegrations: jest.fn(),
  listIntegrationProviders: jest.fn(),
  getPaymentIntegrationSummary: jest.fn(),
  connectPaymentIntegration: jest.fn(),
  testPaymentIntegration: jest.fn(),
  activatePaymentIntegration: jest.fn(),
  suspendPaymentIntegration: jest.fn(),
  getIntegrationCallbacks: jest.fn(),
  simulateIntegrationPayment: jest.fn(),
}));
jest.mock("@/components/school/principal-dashboard/verified-tenant-api", () => ({ useVerifiedPrincipalDashboardApi: () => jest.fn() }));
jest.mock("@/lib/school/school-operational-store", () => ({ publishSchoolDataUpdate: jest.fn() }));
jest.mock("@/lib/data/school-hooks", () => ({ useSchoolQuery: jest.fn() }));
jest.mock("@/lib/data/school-tenant-scope", () => ({
  useOptionalSchoolTenantId: () => "school-a",
}));
jest.mock("@/components/providers/permission-context", () => ({
  usePermissions: () => ({ hasPermission: () => true, isLoading: false }),
}));
jest.mock("@/lib/auth/school-dashboard-role-context", () => ({
  useOptionalSchoolDashboardRole: () => ({ activeRole: "accountant" }),
}));

const provider: api.CollectionProvider = {
  code: "equity",
  name: "Equity",
  description: "School bank collections",
  channel_kinds: ["bank_account"],
  connection_modes: ["statement"],
  credential_fields: [],
};
const revision: api.CollectionChannelRevision = {
  id: "revision-a",
  tenant_id: "school-a",
  channel_id: null,
  provider_code: "equity",
  channel_kind: "bank_account",
  display_name: "Fees account",
  account_name: "Amani School",
  account_number: "01234567",
  bank_name: "Equity",
  status: "pending_approval",
  connection_mode: null,
  reason: "School fees collection",
  decision_reason: null,
  requested_by: "accountant-a",
  reviewed_by: null,
  created_at: "2026-09-28T08:00:00Z",
  reviewed_at: null,
  activated_at: null,
  last_test_status: null,
  last_tested_at: null,
  last_error: null,
  credentials_configured: false,
};
const refetch = jest.fn();
const summary: api.PaymentSetupSummary = { total: 1, pending_approval: 1, awaiting_connection: 0, ready: 0, active: 0, sandbox: 0, attention: 0 };
function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderUi(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useSchoolQuery)
    .mockImplementation(
      (path) =>
        ({
          data: path?.endsWith("providers") ? [provider] : path?.endsWith("summary") ? summary : path === "/admin-command/principal/approvals" ? { pendingTotal: 2, urgentApprovals: 0, requests: [], categories: [], recentApprovals: [] }
            : path === "/admin-command/principal/exams" ? { reportsPending: 0, recentResults: [] } : [revision],
          isLoading: false,
          error: null,
          refetch,
        }) as unknown as ReturnType<typeof useSchoolQuery>,
    );
  jest
    .mocked(api.listPaymentIntegrations)
    .mockResolvedValue([
      { ...revision, school_name: "Amani School", status: "approved" },
    ]);
  jest.mocked(api.listIntegrationProviders).mockResolvedValue([provider]);
  jest.mocked(api.getPaymentIntegrationSummary).mockResolvedValue({ ...summary, pending_approval: 0, awaiting_connection: 1 });
});

test("Principal Approvals includes the Accountant request and counts it once", async () => {
  render(<PrincipalApprovalsWorkspace />);
  expect(screen.getByText("Total Pending").parentElement).toHaveTextContent("3");
  expect(screen.getByText("Payment setup", { exact: true }).parentElement?.parentElement?.parentElement).toHaveTextContent("Payment setup1");
  expect(screen.queryByText("All caught up! No pending approvals.")).not.toBeInTheDocument();
  expect(screen.getByText("Fees account")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Review request" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("School fees collection");
  expect(useSchoolQuery).toHaveBeenCalledWith(expect.stringContaining("status=pending_approval"), expect.anything());
});

test("Principal Approvals omits the payment setup panel when no decision is pending", () => {
  jest.mocked(useSchoolQuery).mockImplementation((path) => ({
    data: path?.endsWith("summary")
      ? { ...summary, total: 1, pending_approval: 0, awaiting_connection: 1 }
      : path?.endsWith("providers")
        ? [provider]
      : path?.includes("collection-channels")
        ? []
        : path === "/admin-command/principal/approvals"
          ? { pendingTotal: 0, urgentApprovals: 0, requests: [], categories: [], recentApprovals: [] }
          : path === "/admin-command/principal/exams"
            ? { reportsPending: 0, recentResults: [] }
            : [revision],
    isLoading: false,
    error: null,
    refetch,
  }) as unknown as ReturnType<typeof useSchoolQuery>);

  render(<PrincipalApprovalsWorkspace />);
  expect(screen.queryByRole("heading", { name: "Payment setup approvals" })).not.toBeInTheDocument();
  expect(screen.queryByText("Awaiting Super Admin")).not.toBeInTheDocument();
});

test("school overview exposes counts and a working payment setup action", () => {
  const open = jest.fn();
  render(<SchoolPaymentSetupSummary review onOpen={open} />);
  expect(screen.getByText("Awaiting Principal").parentElement).toHaveTextContent("1");
  fireEvent.click(screen.getByRole("button", { name: "Review payment setups" }));
  expect(open).toHaveBeenCalledTimes(1);
});

test("notification links preserve Principal and Bursar portal routes and the exact revision", () => {
  for (const role of ["principal", "accountant", "bursar"]) {
    expect(resolvePaymentSetupNotificationHref("/payment-setup?revision=abc", `/school/${role}`)).toBe(`/school/${role}/payment-setup?revision=abc`);
  }
  expect(resolvePaymentSetupNotificationHref("/payment-setup?revision=abc", "")).toBe("/payment-setup?revision=abc");
});

test("Super Admin searches the full server queue and filters connection work", async () => {
  render(<PaymentGatewaysWorkspace />);
  await screen.findByRole("button", { name: "Connect channel" });
  fireEvent.change(screen.getByRole("textbox", { name: "Search integrations" }), { target: { value: "Baraka" } });
  fireEvent.click(screen.getByRole("button", { name: "Search all schools" }));
  await waitFor(() => expect(api.listPaymentIntegrations).toHaveBeenLastCalledWith(0, "all", "Baraka"));
  fireEvent.change(screen.getByLabelText("Queue"), { target: { value: "connection" } });
  await waitFor(() => expect(api.listPaymentIntegrations).toHaveBeenLastCalledWith(0, "connection", "Baraka"));
});

test("sandbox active setup is never described as live fee collection", () => {
  jest.mocked(useSchoolQuery).mockImplementation((path) => ({ data: path?.endsWith("summary") ? { ...summary, sandbox: 1 } : path?.endsWith("providers") ? [provider] : [{ ...revision, status: "active", environment: "sandbox", connection_mode: "daraja" }], refetch }) as never);
  render(<SchoolPaymentChannels mode="review" />);
  expect(screen.getByText("Sandbox active — no live fee credit")).toBeVisible();
  expect(screen.queryByText("Active — automatic collection")).not.toBeInTheDocument();
});

test("accountant requests an approval using only school bank information", async () => {
  jest.mocked(api.requestCollectionChannel).mockResolvedValue(revision);
  render(<SchoolPaymentChannels mode="request" />);
  fireEvent.click(screen.getByRole("button", { name: "Add payment channel" }));
  fireEvent.change(screen.getByLabelText("Provider"), {
    target: { value: "equity" },
  });
  fireEvent.change(screen.getByLabelText("Channel name"), {
    target: { value: "Fees account" },
  });
  fireEvent.change(screen.getByLabelText("Account holder name"), {
    target: { value: "Amani School" },
  });
  fireEvent.change(screen.getByLabelText("Account number"), {
    target: { value: "01234567" },
  });
  fireEvent.change(screen.getByLabelText("Reason for this request"), {
    target: { value: "School fees collection" },
  });
  expect(
    screen.queryByLabelText(/secret|credential|callback|consumer/i),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Send to Principal" }));
  await waitFor(() =>
    expect(api.requestCollectionChannel).toHaveBeenCalledWith(
      "school-a",
      expect.objectContaining({
        account_number: "01234567",
        provider_code: "equity",
      }),
    ),
  );
  expect(await screen.findByText(/Sent to the Principal/)).toBeInTheDocument();
});

test("principal reviews the exact destination and an explicit reason before approval", async () => {
  jest
    .mocked(api.decideCollectionChannel)
    .mockResolvedValue({ ...revision, status: "approved" });
  render(<SchoolPaymentChannels mode="review" pendingOnly />);
  fireEvent.click(screen.getByRole("button", { name: "Review request" }));
  expect(screen.getAllByText("01234567")).toHaveLength(2);
  expect(
    screen.getByRole("button", { name: "Approve destination" }),
  ).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Decision reason"), {
    target: { value: "Verified against school bank records" },
  });
  fireEvent.click(screen.getByLabelText(/I have verified/));
  fireEvent.click(screen.getByRole("button", { name: "Approve destination" }));
  await waitFor(() =>
    expect(api.decideCollectionChannel).toHaveBeenCalledWith(
      "school-a",
      "revision-a",
      "approve",
      "Verified against school bank records",
    ),
  );
  await waitFor(() => expect(screen.queryByText("Fees account")).not.toBeInTheDocument());
  expect(screen.queryByText("Awaiting Super Admin")).not.toBeInTheDocument();
});

test("principal rejection removes the request from the approval queue", async () => {
  jest
    .mocked(api.decideCollectionChannel)
    .mockResolvedValue({ ...revision, status: "rejected" });
  render(<SchoolPaymentChannels mode="review" pendingOnly />);
  fireEvent.click(screen.getByRole("button", { name: "Review request" }));
  fireEvent.change(screen.getByLabelText("Decision reason"), {
    target: { value: "Account details need correction" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reject request" }));
  await waitFor(() =>
    expect(api.decideCollectionChannel).toHaveBeenCalledWith(
      "school-a",
      "revision-a",
      "reject",
      "Account details need correction",
    ),
  );
  await waitFor(() => expect(screen.queryByText("Fees account")).not.toBeInTheDocument());
});

test("failed requests remain visible and never show a successful approval", async () => {
  jest
    .mocked(api.decideCollectionChannel)
    .mockRejectedValue(new Error("School scope mismatch"));
  render(<SchoolPaymentChannels mode="review" />);
  fireEvent.click(screen.getByRole("button", { name: "Review request" }));
  fireEvent.change(screen.getByLabelText("Decision reason"), {
    target: { value: "Incorrect school account" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Reject request" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "School scope mismatch",
  );
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(screen.queryByText(/Approved for technical/)).not.toBeInTheDocument();
});

test("statement setup asks no credentials and cannot activate an untested channel", async () => {
  render(<PaymentGatewaysWorkspace />);
  fireEvent.click(
    await screen.findByRole("button", { name: "Connect channel" }),
  );
  expect(screen.getByText(/Statement reconciliation/)).toBeInTheDocument();
  expect(
    screen.queryByLabelText(/secret|consumer|credential/i),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Activate channel" }),
  ).not.toBeInTheDocument();
});

test('sandbox channel reveals canonical callbacks only on request and exposes the isolated simulator',async()=>{
  jest.mocked(api.listPaymentIntegrations).mockResolvedValue([{...revision,provider_code:'safaricom',connection_mode:'daraja',environment:'sandbox',status:'active',credentials_configured:true}]);
  jest.mocked(api.getIntegrationCallbacks).mockResolvedValue({confirmation_url:'https://example.org/payments/ingress/secret/confirmation',validation_url:'https://example.org/payments/ingress/secret/validation',environment:'sandbox',trust_mode:'daraja_direct'});
  render(<PaymentGatewaysWorkspace/>);
  expect(await screen.findByRole('button',{name:'Simulate sandbox payment'})).toBeInTheDocument();
  expect(api.getIntegrationCallbacks).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Callback URLs'}));
  expect(await screen.findByLabelText('Confirmation URL')).toHaveValue('https://example.org/payments/ingress/secret/confirmation');
  fireEvent.click(screen.getByRole('button',{name:'Close'}));
  fireEvent.click(screen.getByRole('button',{name:'Simulate sandbox payment'}));
  expect(screen.getByText(/No live payment, receipt or balance is created/)).toBeInTheDocument();
  expect(screen.getByLabelText('Student admission / invoice reference')).toBeRequired();
});
