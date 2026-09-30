import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { SchoolPaymentChannels } from "@/components/school/accountant/payment-channels-workspace";
import { PaymentGatewaysWorkspace } from "@/components/platform/workspaces/PaymentGatewaysWorkspace";
import * as api from "@/lib/finance/payment-channels-client";
import { useSchoolQuery } from "@/lib/data/school-hooks";

jest.mock("@/lib/finance/payment-channels-client", () => ({
  ...jest.requireActual("@/lib/finance/payment-channels-client"),
  requestCollectionChannel: jest.fn(),
  decideCollectionChannel: jest.fn(),
  listPaymentIntegrations: jest.fn(),
  listIntegrationProviders: jest.fn(),
  connectPaymentIntegration: jest.fn(),
  testPaymentIntegration: jest.fn(),
  activatePaymentIntegration: jest.fn(),
  suspendPaymentIntegration: jest.fn(),
  getIntegrationCallbacks: jest.fn(),
  simulateIntegrationPayment: jest.fn(),
}));
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

beforeEach(() => {
  jest.clearAllMocks();
  jest
    .mocked(useSchoolQuery)
    .mockImplementation(
      (path) =>
        ({
          data: path?.endsWith("providers") ? [provider] : [revision],
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
  render(<SchoolPaymentChannels mode="review" />);
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
