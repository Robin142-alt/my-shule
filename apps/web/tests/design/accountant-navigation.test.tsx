import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { AccountantCommandCenter } from "@/components/school/accountant-command-center";
import { useRouter } from "next/navigation";

let mockHeaderMounts = 0;
jest.mock("@/components/school/integrated-school-command-header", () => ({
  SchoolCommandSidebarIdentity: () => <p>School identity</p>,
  IntegratedSchoolCommandHeader: () => {
    const React = require("react");
    React.useEffect(() => { mockHeaderMounts++; }, []);
    return <h1>Finance dashboard</h1>;
  },
}));
jest.mock("@/components/common/notifications/notification-bell", () => ({ SchoolNotificationBell: () => null }));
jest.mock("@/components/school/accountant/payment-setup-summary", () => ({
  usePaymentSetupSummary: () => ({ data: { attention: 0 } }),
  SchoolPaymentSetupSummary: () => null,
}));
jest.mock("@/components/school/accountant/overview-workspace", () => ({ AccountantOverviewWorkspace: () => <p>AccountantOverviewWorkspace content</p> }));
jest.mock("@/components/school/accountant/fee-structures-workspace", () => ({ FeeStructuresWorkspace: () => <p>FeeStructuresWorkspace content</p> }));
jest.mock("@/components/school/accountant/invoices-workspace", () => ({ InvoicesWorkspace: () => <p>InvoicesWorkspace content</p> }));
jest.mock("@/components/school/accountant/payments-workspace", () => ({ PaymentsWorkspace: () => <p>PaymentsWorkspace content</p> }));
jest.mock("@/components/school/accountant/payment-channels-workspace", () => ({ SchoolPaymentChannels: () => <p>SchoolPaymentChannels content</p> }));
jest.mock("@/components/school/accountant/collections-workspace", () => ({ CollectionsWorkspace: () => <p>CollectionsWorkspace content</p> }));
jest.mock("@/components/school/accountant/m-pesa-reconciliation-workspace", () => ({ MPesaReconciliationWorkspace: () => <p>MPesaReconciliationWorkspace content</p> }));
jest.mock("@/components/school/accountant/receipts-workspace", () => ({ ReceiptsWorkspace: () => <p>ReceiptsWorkspace content</p> }));
jest.mock("@/components/school/accountant/arrears-workspace", () => ({ ArrearsWorkspace: () => <p>ArrearsWorkspace content</p> }));
jest.mock("@/components/school/accountant/waivers-discounts-workspace", () => ({ WaiversDiscountsWorkspace: () => <p>WaiversDiscountsWorkspace content</p> }));
jest.mock("@/components/school/accountant/expenses-workspace", () => ({ ExpensesWorkspace: () => <p>ExpensesWorkspace content</p> }));
jest.mock("@/components/school/accountant/reports-workspace", () => ({ ReportsWorkspace: () => <p>ReportsWorkspace content</p> }));

const workspaces = [
  ["fee-structures", "Fee Structures"], ["invoices", "Invoices & statements"],
  ["collections", "Collections & exceptions"], ["payments", "Cash & cheques"],
  ["payment-setup", "Payment Setup"], ["m-pesa-reconciliation", "M-Pesa Reconciliation"],
  ["receipts", "Receipts"], ["arrears", "Arrears"], ["waivers-discounts", "Waivers & Discounts"],
  ["expenses", "Expenses"], ["reports", "Finance Reports"], ["overview", "Today"],
];

beforeEach(() => { mockHeaderMounts = 0; });

test.each(["accountant", "bursar"] as const)("%s opens every finance workspace immediately without a route request or shell remount", (role) => {
  window.history.replaceState(null, "", `/school/${role}/overview`);
  const router = useRouter();
  render(<AccountantCommandCenter role={role} routeMode="public" activeSection="overview" tenantSlug="school-a" />);
  const nav = screen.getByRole("navigation");
  for (const [section, label] of workspaces) {
    fireEvent.click(within(nav).getByRole("button", { name: label, exact: true }));
    expect(screen.getByRole("heading", { name: label, exact: true })).toBeVisible();
    expect(within(nav).getByRole("button", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
    expect(window.location.pathname).toBe(`/school/${role}/${section}`);
  }
  expect(router.push).not.toHaveBeenCalled();
  expect(mockHeaderMounts).toBe(1);
});

test.each(["public", "hosted"] as const)("Back/Forward restores the finance workspace in %s routing", (routeMode) => {
  const base = routeMode === "public" ? "/school/accountant" : "";
  window.history.replaceState(null, "", `${base}/fee-structures`);
  render(<AccountantCommandCenter role="accountant" routeMode={routeMode} activeSection="fee-structures" />);
  fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Receipts", exact: true }));
  act(() => {
    window.history.replaceState(null, "", `${base}/fee-structures`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(screen.getByRole("heading", { name: "Fee Structures", exact: true })).toBeVisible();
  act(() => {
    window.history.replaceState(null, "", `${base}/receipts`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  expect(screen.getByRole("heading", { name: "Receipts", exact: true })).toBeVisible();
  expect(mockHeaderMounts).toBe(1);
});

test("reselecting the current workspace does not add history entries", () => {
  window.history.replaceState(null, "", "/school/accountant/fee-structures");
  render(<AccountantCommandCenter role="accountant" routeMode="public" activeSection="fee-structures" />);
  const push = jest.spyOn(window.history, "pushState");
  fireEvent.click(within(screen.getByRole("navigation")).getByRole("button", { name: "Fee Structures", exact: true }));
  expect(push).not.toHaveBeenCalled();
  push.mockRestore();
});

