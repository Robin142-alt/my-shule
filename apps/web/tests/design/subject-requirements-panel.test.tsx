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
