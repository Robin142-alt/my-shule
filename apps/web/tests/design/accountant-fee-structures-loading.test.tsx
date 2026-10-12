import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { FeeStructuresWorkspace } from "@/components/school/accountant/fee-structures-workspace";
import { requestDashboardApi } from "@/lib/dashboard/api-client";

const mockRefetch = jest.fn();
const mockInvalidate = jest.fn();
let mockError: Error | null = null;
let mockCanWrite = true;
let mockLoading = false;
const mockQueries = jest.fn();
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: mockInvalidate }) }));
jest.mock("@/lib/data/school-tenant-scope", () => ({ useOptionalSchoolTenantId: () => "school-a" }));
jest.mock("@/components/providers/permission-context", () => ({ usePermissions: () => ({ hasPermission: () => mockCanWrite }) }));
jest.mock("@/lib/dashboard/api-client", () => ({ requestDashboardApi: jest.fn() }));
jest.mock("@/lib/data/school-hooks", () => ({ useSchoolQuery: (path: string) => {
  mockQueries(path);
  return { data: path.includes("roster-options") ? [{ grade_level: "Grade 7", student_count: 12 }, { grade_level: "Grade 8", student_count: 10 }] : [], error: mockError, isLoading: mockLoading, isFetching: false, refetch: mockRefetch };
} }));
beforeEach(() => { jest.clearAllMocks(); mockError = null; mockCanWrite = true; mockLoading = false; });

test("fee setup loads only fee plans and gives a direct route to invoices", () => {
  const navigate = jest.fn();
  render(<FeeStructuresWorkspace role="accountant" tenantSlug="school-a" routeMode="public" onNavigate={navigate} />);
  expect(mockQueries.mock.calls.every(([path]) => path === "/billing/fee-structures")).toBe(true);
  expect(screen.getByRole("button", { name: "Create fee structure" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Open invoices & statements" }));
  expect(navigate).toHaveBeenCalledWith("invoices");
  expect(screen.queryByText("Today Collections")).not.toBeInTheDocument();
});
test("failed reads leave a visible recovery and loading stays truthful", () => {
  mockLoading = true;
  const view = render(<FeeStructuresWorkspace role="accountant" routeMode="public" />);
  expect(screen.getByText("Loading fee structures…")).toBeVisible();
  mockLoading = false; mockError = new Error("School records unavailable");
  view.rerender(<FeeStructuresWorkspace role="accountant" routeMode="public" />);
  expect(screen.getByRole("alert")).toHaveTextContent("School records unavailable");
  fireEvent.click(screen.getByRole("button", { name: "Retry fee structures" }));
  expect(mockRefetch).toHaveBeenCalledTimes(1);
});
test("creates a multi-grade fee plan from school choices without technical fields", async () => {
  (requestDashboardApi as jest.Mock).mockResolvedValue({ id: "plan", name: "Term 3 fees" });
  render(<FeeStructuresWorkspace role="accountant" routeMode="public" />);
  fireEvent.click(screen.getByRole("button", { name: "Create fee structure" }));
  const dialog = within(screen.getByRole("dialog"));
  fireEvent.change(dialog.getByLabelText("Fee name"), { target: { value: "Term 3 fees" } });
  fireEvent.click(dialog.getByRole("checkbox", { name: /Grade 7/ }));
  fireEvent.click(dialog.getByRole("checkbox", { name: /Grade 8/ }));
  fireEvent.change(dialog.getByLabelText("Charge 1"), { target: { value: "Tuition" } });
  fireEvent.change(dialog.getByLabelText("Amount (KES)"), { target: { value: "1,200.50" } });
  fireEvent.click(dialog.getByRole("button", { name: "Save fee structure" }));
  await screen.findByRole("button", { name: "Choose learners to bill" });
  expect(requestDashboardApi).toHaveBeenCalledWith("/billing/fee-structures", expect.objectContaining({ tenantId: "school-a", body: expect.objectContaining({ grade_levels: ["Grade 7", "Grade 8"], line_items: [{ code: "charge_1", label: "Tuition", amount_minor: "120050" }] }) }));
  await waitFor(() => expect(mockInvalidate).toHaveBeenCalled());
});
test("read-only staff cannot create fee plans", () => {
  mockCanWrite = false;
  render(<FeeStructuresWorkspace role="accountant" routeMode="public" />);
  expect(screen.getByRole("button", { name: "Create fee structure" })).toBeDisabled();
});
