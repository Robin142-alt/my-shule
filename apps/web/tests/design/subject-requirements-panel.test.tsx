import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { deserialize, serialize } from "node:v8";
import { SubjectRequirementsPanel } from "@/components/school/deputy-principal/subject-requirements-panel";

const mockSave = jest.fn();
global.structuredClone = (value) => deserialize(serialize(value));
jest.mock("@/lib/data/school-hooks", () => ({ useSchoolMutation: () => ({ mutateAsync: mockSave, isPending: false }) }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));

const base = {
  academicYear: "2026", termName: "Term 3", loading: false,
  classes: [{ id: "class-a", name: "Form 4", academic_year_id: "year" }, { id: "class-b", name: "Form 3", academic_year_id: "year" }],
  subjects: [{ id: "math", name: "Mathematics" }, { id: "agri", name: "Agriculture" }],
  teachers: [{ user_id: "teacher", display_name: "Alex Teacher" }], resources: [],
  assignments: [
    { id: "a1", academic_term_id: null, class_section_id: "class-a", subject_id: "math", teacher_user_id: "teacher" },
    { id: "a2", academic_term_id: null, class_section_id: "class-a", subject_id: "agri", teacher_user_id: "teacher" },
    { id: "a3", academic_term_id: null, class_section_id: "class-b", subject_id: "math", teacher_user_id: "teacher" },
    { id: "other-year", academic_term_id: null, class_section_id: "class-old", subject_id: "math", teacher_user_id: "teacher" },
  ],
  onSaved: jest.fn(), onRetry: jest.fn(), onSaveState: jest.fn(), onContinue: jest.fn(),
};
const savedRow = { id: "saved", class_section_id: "class-a", subject_id: "math", periods_per_week: 4, duration_periods: 1, row_version: 3 };

beforeEach(() => { jest.clearAllMocks(); mockSave.mockImplementation(async (payload) => ({ items: payload.requirements })); });

it("adds only allocated subjects for the selected class, skips duplicates and saves through the API", async () => {
  render(<SubjectRequirementsPanel {...base} response={{ items: [] }} />);
  fireEvent.change(screen.getByLabelText("Show class"), { target: { value: "class-a" } });
  fireEvent.click(screen.getByText("Add allocated subjects"));
  fireEvent.click(screen.getByText("Add allocated subjects"));
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(mockSave).not.toHaveBeenCalled();
  expect(screen.getByText("Continue to generation")).toBeDisabled();
  fireEvent.change(within(screen.getAllByRole("article")[0]).getByLabelText("Periods/week"), { target: { value: "6" } });
  fireEvent.click(screen.getByText("Save requirements"));
  await waitFor(() => expect(base.onSaved).toHaveBeenCalled());
  expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ academic_year: "2026", term_name: "Term 3", replace_existing: true,
    requirements: [expect.objectContaining({ class_section_id: "class-a", subject_id: "math", periods_per_week: 6 }), expect.objectContaining({ class_section_id: "class-a", subject_id: "agri" })],
  }));
  expect(screen.getByText("Continue to generation")).toBeEnabled();
});

it("keeps edits during background refresh and carries the original row version", async () => {
  const { rerender } = render(<SubjectRequirementsPanel {...base} response={{ items: [savedRow] }} />);
  fireEvent.change(screen.getByLabelText("Periods/week"), { target: { value: "7" } });
  rerender(<SubjectRequirementsPanel {...base} response={{ items: [{ ...savedRow, periods_per_week: 9, row_version: 4 }] }} />);
  expect(screen.getByLabelText("Periods/week")).toHaveValue(7);
  fireEvent.click(screen.getByText("Save requirements"));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ requirements: [expect.objectContaining({ expected_row_version: 3, periods_per_week: 7 })] })));
});

it("retains other classes when saving a filtered class and permits deleting the last requirement", async () => {
  render(<SubjectRequirementsPanel {...base} response={{ items: [savedRow, { ...savedRow, id: "b", class_section_id: "class-b" }] }} />);
  fireEvent.change(screen.getByLabelText("Show class"), { target: { value: "class-a" } });
  fireEvent.click(screen.getByLabelText("Remove subject requirement"));
  fireEvent.click(screen.getByText("Save requirements"));
  await waitFor(() => expect(mockSave).toHaveBeenCalledWith(expect.objectContaining({ requirements: [expect.objectContaining({ id: "b" })] })));
  fireEvent.change(screen.getByLabelText("Show class"), { target: { value: "class-b" } });
  fireEvent.click(screen.getByLabelText("Remove subject requirement"));
  fireEvent.click(screen.getByText("Save requirements"));
  await waitFor(() => expect(mockSave).toHaveBeenLastCalledWith(expect.objectContaining({ requirements: [], replace_existing: true })));
});

it("keeps inputs and shows the server error when saving fails", async () => {
  mockSave.mockRejectedValue(new Error("This requirement changed; refresh and retry"));
  render(<SubjectRequirementsPanel {...base} response={{ items: [savedRow] }} />);
  fireEvent.change(screen.getByLabelText("Periods/week"), { target: { value: "6" } });
  fireEvent.click(screen.getByText("Save requirements"));
  await screen.findByRole("alert");
  expect(screen.getByRole("alert")).toHaveTextContent("changed; refresh and retry");
  expect(screen.getByLabelText("Periods/week")).toHaveValue(6);
  expect(base.onSaved).not.toHaveBeenCalled();
});

it("rejects invalid frequencies before sending a mutation", () => {
  render(<SubjectRequirementsPanel {...base} response={{ items: [savedRow] }} />);
  fireEvent.change(screen.getByLabelText("Periods/week"), { target: { value: "1.5" } });
  fireEvent.click(screen.getByText("Save requirements"));
  expect(screen.getByRole("alert")).toHaveTextContent("1–40 weekly periods");
  expect(mockSave).not.toHaveBeenCalled();
});

it("shows the resolved academic teacher and keeps automatic allocation when saving", async () => {
  render(<SubjectRequirementsPanel {...base} assignments={[]} response={{ items: [{ ...savedRow,
    teacher_id: null, resolved_teacher_id: "teacher", resolved_teacher_name: "Alex Teacher", allocation_status: "resolved" }] }} />);
  expect(screen.getByText("Teacher: Alex Teacher (from academic allocation)")).toBeVisible();
  fireEvent.change(screen.getByLabelText("Periods/week"), { target: { value: "6" } });
  fireEvent.click(screen.getByText("Save requirements"));
  await waitFor(() => expect(mockSave).toHaveBeenCalled());
  const payload = mockSave.mock.calls[0][0].requirements[0];
  expect(payload.teacher_id).toBeNull();
  expect(payload).not.toHaveProperty("resolved_teacher_id");
  expect(payload).not.toHaveProperty("allocation_status");
});

it("adds stream allocations separately and excludes ended assignments and unrelated teachers", () => {
  render(<SubjectRequirementsPanel {...base} teachers={[...base.teachers, { user_id: "unrelated", display_name: "Unrelated Teacher" }]}
    assignments={[
      { ...base.assignments[0], stream_id: "blue", stream_name: "Blue" },
      { ...base.assignments[0], id: "red", stream_id: "red", stream_name: "Red" },
      { ...base.assignments[1], status: "ended" },
      { ...base.assignments[2], effective_to: "2000-01-01" },
    ]} response={{ items: [] }} />);
  fireEvent.click(screen.getByText("Add allocated subjects"));
  expect(screen.getAllByRole("article")).toHaveLength(2);
  expect(screen.getAllByLabelText("Stream").map((element) => (element as HTMLSelectElement).value)).toEqual(["blue", "red"]);
  expect(screen.getAllByText("Teacher: Alex Teacher (from academic allocation)")).toHaveLength(2);
  expect(screen.queryByRole("option", { name: "Unrelated Teacher" })).not.toBeInTheDocument();
});
