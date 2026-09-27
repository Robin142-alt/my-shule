import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { deserialize, serialize } from "node:v8";
import { DeanAcademicsCommandCenter } from "@/components/school/dean-academics-command-center";
import { SchoolTenantScopeProvider } from "@/lib/data/school-tenant-scope";

const mockQuery = jest.fn();
const mockRequest = jest.fn();
const mockRefetch = jest.fn().mockResolvedValue({});
jest.mock("@/components/school/school-pages", () => ({
  buildSchoolSectionHref: (role: string, section: string) => `/school/${role}/${section}`,
}));
jest.mock("@/components/shared/approval-inbox", () => ({ ApprovalInbox: () => null }));
jest.mock("@/components/shared/notification-bell", () => ({ NotificationBell: () => null }));
jest.mock("@/components/shared/task-queue", () => ({ TaskQueue: () => null }));
jest.mock("@/components/school/school-dashboard-role-switcher", () => ({ SchoolDashboardRoleSwitcher: () => null }));
jest.mock("@/lib/data/school-hooks", () => ({
  useSchoolQuery: (...args: unknown[]) => mockQuery(...args),
  useSchoolMutation: () => ({ mutateAsync: mockRequest, isPending: false }),
}));
jest.mock("@/lib/dashboard/api-client", () => ({ requestDashboardApi: (...args: unknown[]) => mockRequest(...args) }));

beforeEach(() => {
  jest.clearAllMocks();
  global.structuredClone = (value) => deserialize(serialize(value));
  window.scrollTo = jest.fn();
  mockQuery.mockImplementation((path: string) => ({
    data: path === "/api/academics/academic-years" ? [{ id: "year", name: "2026", status: "active" }]
      : path === "/api/academics/academic-terms" ? [{ id: "term", academic_year_id: "year", name: "Term 3", status: "active" }]
      : path?.includes("/readiness?") ? { status: "BLOCKER", metrics: {}, warnings: [], blockers: [{ code: "CLASSES_MISSING", severity: "BLOCKER", message: "Add classes", action_url: "/school/deputy-principal/academics" }] }
      : path?.includes("/configuration?") ? null
      : path === "/academics/foundation" ? {} : { items: [] },
    isLoading: false, error: null, refetch: mockRefetch,
  }));
  mockRequest.mockResolvedValue({ id: "saved-year" });
});

function renderDean(section: string) {
  return render(<SchoolTenantScopeProvider tenantId="school-a"><DeanAcademicsCommandCenter activeSection={section} /></SchoolTenantScopeProvider>);
}

it("opens Academic Foundation from the Dean route and saves using the shared school-scoped API", async () => {
  renderDean("academics");
  expect(screen.getByRole("heading", { name: "Academic Foundation" })).toBeVisible();
  expect(screen.getByText("Dean of Academics academic administration")).toBeVisible();
  expect(mockQuery).toHaveBeenCalledWith("/academics/foundation", expect.objectContaining({ tenantId: "school-a" }));
  const form = screen.getByRole("button", { name: /Create academic year/i }).closest("form")!;
  fireEvent.change(within(form).getByLabelText(/name/i), { target: { value: "2027" } });
  fireEvent.change(within(form).getByLabelText(/start/i), { target: { value: "2027-01-01" } });
  fireEvent.change(within(form).getByLabelText(/end/i), { target: { value: "2027-12-31" } });
  fireEvent.submit(form);
  await waitFor(() => expect(mockRequest).toHaveBeenCalledWith("/academics/years", expect.objectContaining({ method: "POST", tenantId: "school-a", body: expect.objectContaining({ name: "2027" }) })));
  await waitFor(() => expect(mockRefetch).toHaveBeenCalled());
});

it("opens full timetable management, relief and setup recovery in the Dean dashboard", () => {
  renderDean("timetable");
  expect(screen.getByRole("heading", { name: "Timetable command centre" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Fix in MyShule" })).toHaveAttribute("href", "/school/dean-academics/academics");
  for (const name of ["Scheduler setup", "Draft review", "Published", "Relief", "History"]) {
    expect(screen.getByRole("button", { name })).toBeVisible();
  }
  fireEvent.click(screen.getByRole("button", { name: "Scheduler setup" }));
  expect(screen.getByRole("link", { name: "Open Academic Setup for allocations" })).toHaveAttribute("href", "/school/dean-academics/academics");
  fireEvent.click(screen.getByRole("button", { name: "Academic Foundation" }));
  expect(window.location.pathname).toBe("/school/dean-academics/academics");
  expect(screen.getByRole("heading", { name: "Academic Foundation" })).toBeVisible();
});

it("requires a verified school before opening foundation forms", () => {
  render(<DeanAcademicsCommandCenter activeSection="academics" />);
  expect(screen.getByRole("alert")).toHaveTextContent("School context is unavailable");
  expect(screen.queryByRole("button", { name: "Create Academic Year" })).not.toBeInTheDocument();
  expect(mockRequest).not.toHaveBeenCalled();
});
