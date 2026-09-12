import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { AcademicFoundationWorkspace, type AcademicFoundationTab } from "@/components/school/academic-foundation-workspace";
import { AcademicAssignmentEndButton, AcademicTeacherReassignmentButton } from "@/components/school/academic-record-manager";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { requestDashboardApi } from "@/lib/dashboard/api-client";
import { createSubject } from "@/components/school/principal/api-client";

jest.mock("@/lib/data/school-hooks", () => ({ useSchoolQuery: jest.fn() }));
jest.mock("@/lib/dashboard/api-client", () => ({ requestDashboardApi: jest.fn() }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), warning: jest.fn(), error: jest.fn() } }));

const data = {
  years: [{ id: "year", name: "2026", status: "active" }], terms: [], calendarPeriods: [],
  classes: [
    { id: "form4", name: "Form 4", academic_year_id: "year", status: "active" },
    { id: "grade10", name: "Grade 10", academic_year_id: "year", status: "active" },
    { id: "grade9", name: "Grade 9", academic_year_id: "year", status: "active" },
  ],
  streams: [
    { id: "yellow", name: "Yellow", class_section_id: "form4", status: "active" },
    { id: "red", name: "Red", class_section_id: "grade10", status: "active" },
    { id: "old", name: "Old stream", class_section_id: "form4", status: "archived" },
  ],
  subjects: [{ id: "math", name: "Mathematics", department_id: "science", curriculum_model: "CBC", status: "active" }],
  departments: [{ id: "science", name: "Sciences", status: "active" }],
  teachers: [{ user_id: "teacher", label: "Alex Teacher", role_code: "teacher" }],
  classTeachers: [], teacherAssignments: [], classSubjectAssignments: [], gradingSystems: [],
  attendanceSettings: [], reportCardSettings: [], roleAppointments: [], curriculumConfigurations: [],
};
const refetch = jest.fn().mockResolvedValue({ data, error: null });

beforeEach(() => {
  jest.clearAllMocks();
  (useSchoolQuery as jest.Mock).mockReturnValue({ data, isLoading: false, error: null, refetch });
  (requestDashboardApi as jest.Mock).mockResolvedValue({ id: "saved", pending_work: {} });
});

function setup(tab: AcademicFoundationTab) {
  return render(<AcademicFoundationWorkspace actorRole="Deputy Principal" schoolName="School" tenantId="school" initialTab={tab} />);
}

it("filters streams by class, resets stale selections, and saves subject defaults without extra inputs", async () => {
  setup("allocations");
  const formElement = screen.getByRole("form", { name: "Assign subject teacher" });
  const form = within(formElement);
  const classInput = form.getByLabelText("Class/form/grade");
  expect(form.getByLabelText("Stream")).toBeDisabled();
  fireEvent.change(classInput, { target: { value: "form4" } });
  expect(within(form.getByLabelText("Stream")).getAllByRole("option").map(o => o.textContent)).toEqual(["All current streams / no stream", "Yellow"]);
  fireEvent.change(form.getByLabelText("Stream"), { target: { value: "yellow" } });
  fireEvent.change(classInput, { target: { value: "grade10" } });
  expect(form.getByLabelText("Stream")).toHaveValue("");
  expect(within(form.getByLabelText("Stream")).queryByRole("option", { name: "Yellow" })).not.toBeInTheDocument();
  expect(within(form.getByLabelText("Stream")).getByRole("option", { name: "Red" })).toBeInTheDocument();
  fireEvent.change(classInput, { target: { value: "grade9" } });
  expect(within(form.getByLabelText("Stream")).getAllByRole("option")).toHaveLength(1);
  fireEvent.change(classInput, { target: { value: "grade10" } });
  fireEvent.change(form.getByLabelText("Stream"), { target: { value: "red" } });
  fireEvent.change(form.getByLabelText("Subject / learning area"), { target: { value: "math" } });
  expect(form.getByText("Department: Sciences · Curriculum: CBC")).toBeInTheDocument();
  expect(form.queryByRole("combobox", { name: "Department" })).not.toBeInTheDocument();
  expect(form.queryByRole("combobox", { name: "Curriculum" })).not.toBeInTheDocument();
  fireEvent.change(form.getByLabelText("Teacher"), { target: { value: "teacher" } });
  fireEvent.submit(formElement);
  await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1));
  const body = (requestDashboardApi as jest.Mock).mock.calls[0][1].body;
  expect(body).toMatchObject({ class_section_id: "grade10", stream_id: "red", subject_id: "math", teacher_user_id: "teacher" });
  for (const field of ["department_id", "curriculum_model", "effective_from", "effective_to"]) expect(body).not.toHaveProperty(field);
  await waitFor(() => expect(classInput).toHaveValue(""));
  expect(form.getByLabelText("Stream")).toBeDisabled();
});

it.each<AcademicFoundationTab>(["classes", "subjects", "allocations", "roles-curriculum", "policies"])("removes date and code inputs from %s setup", (tab) => {
  const { container } = setup(tab);
  expect(container.querySelector('input[type="date"]')).toBeNull();
  for (const name of ["code", "abbreviation", "effective_from", "effective_to"]) {
    expect(container.querySelector(`[name="${name}"]`)).toBeNull();
  }
});

it("keeps academic year and term dates", () => {
  setup("calendar");
  const year = screen.getByRole("button", { name: "Create Academic Year" }).closest("form")!;
  const term = screen.getByRole("button", { name: "Create Term" }).closest("form")!;
  for (const form of [year, term]) {
    expect(form.querySelector('input[name="starts_on"]')).toBeRequired();
    expect(form.querySelector('input[name="ends_on"]')).toBeRequired();
  }
});

it("creates a subject without code or abbreviation", async () => {
  setup("subjects");
  const form = screen.getByRole("button", { name: "Create Subject / Learning Area" }).closest("form")!;
  fireEvent.change(within(form).getByLabelText("Subject / learning area"), { target: { value: "English" } });
  fireEvent.submit(form);
  await waitFor(() => expect(refetch).toHaveBeenCalled());
  const [path, request] = (requestDashboardApi as jest.Mock).mock.calls[0];
  expect(path).toBe("/academics/subjects");
  expect(request.body.name).toBe("English");
  expect(request.body).not.toHaveProperty("code");
  expect(request.body).not.toHaveProperty("abbreviation");
});

it("lets the server identify principal subjects with matching name prefixes", async () => {
  await createSubject({ name: " English " });
  await createSubject({ name: "English Literature" });
  expect(requestDashboardApi).toHaveBeenNthCalledWith(1, "/academics/subjects", { method: "POST", body: { name: "English" } });
  expect(requestDashboardApi).toHaveBeenNthCalledWith(2, "/academics/subjects", { method: "POST", body: { name: "English Literature" } });
});

it("ends a responsibility immediately with its reason", async () => {
  render(<AcademicAssignmentEndButton assignmentType="academic-role" assignmentId="appointment" label="role appointment" onUpdated={refetch} />);
  fireEvent.click(screen.getByRole("button", { name: "End assignment" }));
  expect(screen.queryByLabelText(/Effective/)).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Staff reassigned" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm end assignment" }));
  await waitFor(() => expect(requestDashboardApi).toHaveBeenCalledWith("/academics/academic-roles/appointment/end", { method: "POST", body: { reason: "Staff reassigned" } }));
});

it("reassigns a teacher without asking for dates", async () => {
  render(<AcademicTeacherReassignmentButton assignmentId="assignment" currentTeacherId="previous" teachers={[{ id: "teacher", label: "Alex" }]} onUpdated={refetch} />);
  fireEvent.click(screen.getByRole("button", { name: "Reassign" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Confirm reassignment" })).toBeEnabled());
  fireEvent.change(screen.getByLabelText("Replacement teacher"), { target: { value: "teacher" } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Transfer duties" } });
  fireEvent.click(screen.getByRole("button", { name: "Confirm reassignment" }));
  await waitFor(() => expect(refetch).toHaveBeenCalled());
  const request = (requestDashboardApi as jest.Mock).mock.calls.find(([path]) => path.endsWith("/reassign"))[1];
  expect(request.body.teacher_user_id).toBe("teacher");
  expect(request.body).not.toHaveProperty("effective_from");
});
