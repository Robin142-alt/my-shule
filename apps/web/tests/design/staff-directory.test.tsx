import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { UserManagementWorkspace } from "@/components/school/user-management-workspace";
import { addSchoolRecord, readSchoolData } from "@/lib/school/school-operational-store";
import { renderWithProviders } from "./test-utils";

jest.mock("@/components/school/subject-head-setup", () => ({ SubjectHeadSetup: () => null }));

const staffRoles = [
  "principal", "deputy_principal", "secretary", "accountant", "bursar", "teacher",
  "dean_academics", "exams_manager", "hod", "head_of_subject", "class_teacher", "grade_master",
  "nurse", "school_counsellor", "discipline_master", "librarian", "storekeeper", "boarding_master",
  "security_officer", "transport_manager", "lab_technician", "admissions_officer", "ict_manager",
  "owner", "admin", "staff", "clinic_staff",
  "school_admin", "driver", "hr_officer", "procurement_officer",
];
const member = (role: string, id = role) => ({
  id, kind: "member", role_code: role, display_name: `Employee ${id}`,
  email: `${id}@school.test`, phone: "0712345678", tsc_number: `TSC-${id}`,
  status: "active", created_at: "2026-09-01T00:00:00Z",
});
const response = (users: unknown[], status = 200) => ({
  ok: status === 200, status, json: async () => ({ data: { users } }),
});
const originalFetch = global.fetch;
beforeEach(() => window.localStorage.clear());
afterEach(() => { global.fetch = originalFetch; });
const renderDirectory = () => renderWithProviders(
  <UserManagementWorkspace schoolId="school-a" actorRole="Principal" actorName="Principal" />,
);

it("searches every staff role beyond the first 50 accounts and excludes family and platform accounts", async () => {
  const records = [
    ...Array.from({ length: 50 }, (_, i) => member("teacher", `teacher-${i}`)),
    ...staffRoles.map((role) => member(role)),
    ...["parent", "student", "super_admin", "system_monitor"].map((role) => member(role)),
  ];
  const fetchMock = jest.fn(async (url: string) => {
    const query = new URL(url, "http://localhost").searchParams;
    expect(query.get("scope")).toBe("staff");
    const offset = Number(query.get("offset"));
    return response(records.slice(offset, offset + 50));
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  renderDirectory();
  await waitFor(() => expect(screen.getByText("81 active staff")).toBeVisible());
  expect(fetchMock).toHaveBeenCalledTimes(2);
  const roleFilter = screen.getByRole("combobox", { name: "Filter by role" });
  expect(within(roleFilter).queryByRole("option", { name: "Parent" })).toBeNull();
  expect(within(roleFilter).queryByRole("option", { name: "Student" })).toBeNull();
  const search = screen.getByRole("searchbox");
  for (const role of staffRoles) {
    fireEvent.change(search, { target: { value: `Employee ${role}` } });
    expect(screen.getAllByText(`Employee ${role}`).length).toBeGreaterThan(0);
  }
  for (const role of ["parent", "student", "super_admin", "system_monitor"]) {
    fireEvent.change(search, { target: { value: `Employee ${role}` } });
    expect(screen.queryByText(`Employee ${role}`)).toBeNull();
  }
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  fireEvent.change(roleFilter, { target: { value: "Accountant" } });
  expect(screen.getAllByText("Employee accountant").length).toBeGreaterThan(0);
  expect(screen.queryByText("Employee bursar")).toBeNull();
  fireEvent.change(roleFilter, { target: { value: "Bursar" } });
  fireEvent.change(search, { target: { value: "TSC-bursar" } });
  expect(screen.getAllByText("Employee bursar").length).toBeGreaterThan(0);
  fireEvent.change(search, { target: { value: "0712345678" } });
  expect(screen.getAllByText("Employee bursar").length).toBeGreaterThan(0);
  fireEvent.change(search, { target: { value: "bursar@school.test" } });
  expect(screen.getAllByText("Employee bursar").length).toBeGreaterThan(0);
});

it("keeps cached records school-scoped and staff-only during a later-page failure and retries the full load", async () => {
  for (const [schoolId, role, name] of [
    ["school-a", "Teacher", "Saved Teacher"], ["school-a", "Parent", "Saved Parent"],
    ["school-a", "Student", "Saved Student"], ["school-b", "Teacher", "Other School Teacher"],
  ]) {
    addSchoolRecord("school-users", {
      id: name, name, role, status: "Active", email: "saved@school.test", phone: "",
      department: "", assignment: "", joinedAt: "2026-01-01", createdAt: "2026-01-01", lastActive: "",
    }, schoolId);
  }
  const firstPage = Array.from({ length: 50 }, (_, i) => member("teacher", `new-${i}`));
  const fetchMock = jest.fn()
    .mockResolvedValueOnce(response(firstPage))
    .mockResolvedValueOnce(response([], 503))
    .mockResolvedValueOnce(response([member("bursar")]));
  global.fetch = fetchMock;
  renderDirectory();
  expect(await screen.findByRole("alert")).toHaveTextContent("directory may be incomplete");
  expect(screen.getAllByText("Saved Teacher").length).toBeGreaterThan(0);
  for (const name of ["Saved Parent", "Saved Student", "Other School Teacher", "Employee new-0"]) {
    expect(screen.queryByText(name)).toBeNull();
  }
  expect(readSchoolData("school-users", "school-a")).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "Retry staff search" }));
  expect((await screen.findAllByText("Employee bursar")).length).toBeGreaterThan(0);
  expect(screen.queryByRole("alert")).toBeNull();
  expect(readSchoolData("school-users", "school-a")).toHaveLength(1);
});

it("waits for the last page before showing an empty staff result", async () => {
  let finish: (value: unknown) => void = () => undefined;
  global.fetch = jest.fn(() => new Promise((resolve) => { finish = resolve; })) as unknown as typeof fetch;
  renderDirectory();
  expect(screen.getByText("Loading all school staff…")).toBeVisible();
  expect(screen.queryByText(/No staff match/)).toBeNull();
  finish(response([]));
  expect(await screen.findByText(/No staff match this view/)).toBeVisible();
  expect(screen.queryByText("Loading all school staff…")).toBeNull();
});
