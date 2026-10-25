import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StudentProgressionWorkspace } from "@/components/school/student-progression/workspace";
import { useSchoolQuery } from "@/lib/data/school-hooks";
import { submitProgressionCommand, runProgression, decideProgressionApproval } from "@/lib/modules/student-progression";
import type { ProgressionOverview, ProgressionStudentDetail } from "../../../../shared/student-progression";
import { isSchoolWorkspaceSection } from "@/lib/routing/school-workspace-contract";
import { getModuleCodeForSchoolSection } from "@/lib/module-access/module-access-map";

jest.mock("@/lib/data/school-hooks", () => ({ useSchoolQuery: jest.fn() }));
jest.mock("@/lib/data/school-tenant-scope", () => ({ useOptionalSchoolTenantId: () => "school-one" }));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn().mockResolvedValue(undefined) }) }));
jest.mock("@/lib/modules/student-progression", () => ({
  submitProgressionCommand: jest.fn(), runProgression: jest.fn(), decideProgressionApproval: jest.fn(),
}));

const learner = { id: "student-one", name: "Amina Otieno", admission_number: "SH001", version: "version-one", academic_year_id: "year-2026", academic_year_name: "2026", class_section_id: "class-seven", class_name: "Grade 7", stream_id: "east-seven", stream_name: "East", curriculum_model: "CBC", status: "upcoming" as const, student_status: "active", next_class_name: "Grade 8", message: null, latest_transition_id: "transition-one" };
const overview: ProgressionOverview = {
  timezone: "Africa/Nairobi", selected_year_id: "year-2026", automation: { status: "scheduled", message: "Learners move automatically after 20 November 2026.", next_run_at: "2026-11-21T00:00:00+03:00" },
  permissions: { manage: true, approve: false }, counts: { upcoming: 1, promoted: 0, repeating: 0, held: 0, exceptions: 0 }, students: [learner], total: 1,
  years: [{ id: "year-2026", name: "2026", starts_on: "2026-01-01", ends_on: "2026-11-20", status: "active", is_current: true }, { id: "year-2027", name: "2027", starts_on: "2027-01-01", ends_on: "2027-11-20", status: "active", is_current: false }],
  classes: [{ id: "class-seven", name: "Grade 7", academic_year_id: "year-2026", curriculum_model: "CBC", grade_level: "7" }, { id: "class-eight", name: "Grade 8", academic_year_id: "year-2027", curriculum_model: "CBC", grade_level: "8" }],
  streams: [{ id: "east-seven", name: "East", class_section_id: "class-seven" }, { id: "east-eight", name: "East", class_section_id: "class-eight" }], runs: [], approvals: [],
};
const detail: ProgressionStudentDetail = {
  student: learner,
  subjects: [{ id: "math", name: "Mathematics", code: "MAT", compulsory: true, selected: true }, { id: "art", name: "Art", code: "ART", compulsory: false, selected: false }],
  timeline: [{ id: "transition-one", action: "promotion", outcome: "promoted", reason: "Annual progression", actor: "School automation", created_at: "2026-01-01T00:00:00Z", from_class: "Grade 6", from_year: "2025", to_class: "Grade 7", to_year: "2026", reversible: true }],
};
let data: ProgressionOverview;
let detailData: ProgressionStudentDetail;
let queryError: Error | null;
const refetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks(); data = JSON.parse(JSON.stringify(overview)); detailData = JSON.parse(JSON.stringify(detail)); queryError = null;
  refetch.mockResolvedValue({ data });
  jest.mocked(useSchoolQuery).mockImplementation((path) => ({ data: !path ? undefined : path.includes("/students/") ? detailData : queryError ? undefined : data, isLoading: false, isFetching: false, error: queryError, refetch }) as unknown as ReturnType<typeof useSchoolQuery>);
  jest.mocked(submitProgressionCommand).mockResolvedValue({ status: "completed", affected: 1, message: "Promotion held for one learner." });
  jest.mocked(runProgression).mockResolvedValue({ status: "running", message: "Progression processing has started." });
  Object.defineProperty(global.crypto, "randomUUID", { configurable: true, value: jest.fn(() => "request-one") });
});

test("shows the scheduled automatic transition and exposes individual controls without cohort mapping", async () => {
  render(<StudentProgressionWorkspace />);
  expect(screen.getByRole("heading", { name: "Student Progression & Transitions" })).toBeInTheDocument();
  expect(screen.getByText(overview.automation.message)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Amina Otieno" })).toBeInTheDocument();
  expect(screen.queryByText("Add cohort mapping")).not.toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Academic year" })).toHaveValue("year-2026");
});

test("requires a reason and sends only selected learners with their expected state", async () => {
  const user = userEvent.setup(); render(<StudentProgressionWorkspace />);
  await user.click(screen.getByRole("checkbox", { name: "Select Amina Otieno" }));
  await user.selectOptions(screen.getByRole("combobox", { name: "Action for selected learners" }), "hold");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  const dialog = screen.getByRole("dialog");
  await user.click(within(dialog).getByRole("button", { name: "Confirm hold" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("reason");
  expect(submitProgressionCommand).not.toHaveBeenCalled();
  await user.type(within(dialog).getByRole("textbox", { name: "Reason" }), "Awaiting placement review");
  await user.click(within(dialog).getByRole("button", { name: "Confirm hold" }));
  await waitFor(() => expect(submitProgressionCommand).toHaveBeenCalledWith({ request_id: "request-one", action: "hold", reason: "Awaiting placement review", academic_year_id: "year-2026", students: [{ id: "student-one", expected_version: "version-one" }] }));
  expect(await screen.findByRole("status")).toHaveTextContent("Promotion held");
});

test("keeps an interrupted command identical on retry", async () => {
  const user = userEvent.setup();
  jest.mocked(submitProgressionCommand).mockRejectedValueOnce(new Error("Connection interrupted. Retry safely."));
  render(<StudentProgressionWorkspace />);
  await user.click(screen.getByRole("checkbox", { name: "Select Amina Otieno" }));
  await user.selectOptions(screen.getByRole("combobox", { name: "Action for selected learners" }), "hold");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.type(screen.getByRole("textbox", { name: "Reason" }), "Awaiting placement review");
  await user.click(screen.getByRole("button", { name: "Confirm hold" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Connection interrupted");
  await user.click(screen.getByRole("button", { name: "Retry action" }));
  await waitFor(() => expect(submitProgressionCommand).toHaveBeenCalledTimes(2));
  expect(jest.mocked(submitProgressionCommand).mock.calls[1][0]).toEqual(jest.mocked(submitProgressionCommand).mock.calls[0][0]);
});

test("edits elective subjects while keeping required subjects selected", async () => {
  const user = userEvent.setup(); render(<StudentProgressionWorkspace />);
  await user.click(screen.getByRole("button", { name: "Amina Otieno" }));
  await user.click(screen.getByRole("button", { name: "Change subjects" }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("checkbox", { name: /Mathematics/ })).toBeChecked();
  expect(within(dialog).getByRole("checkbox", { name: /Mathematics/ })).toBeDisabled();
  await user.click(within(dialog).getByRole("checkbox", { name: /Art/ }));
  await user.type(within(dialog).getByRole("textbox", { name: "Reason" }), "Approved elective change");
  await user.click(within(dialog).getByRole("button", { name: "Save subject selections" }));
  await waitFor(() => expect(submitProgressionCommand).toHaveBeenCalledWith(expect.objectContaining({ action: "subjects", subject_ids: ["math", "art"] })));
});

test("provides a retry when school data fails and disables mutation controls without permission", async () => {
  queryError = new Error("School data is unavailable");
  const { rerender } = render(<StudentProgressionWorkspace />);
  const user = userEvent.setup();
  expect(screen.getByRole("alert")).toHaveTextContent("School data is unavailable");
  await user.click(screen.getByRole("button", { name: "Retry loading" }));
  expect(refetch).toHaveBeenCalled();
  queryError = null; data.permissions.manage = false; rerender(<StudentProgressionWorkspace />);
  expect(screen.queryByRole("button", { name: "Run / retry progression" })).not.toBeInTheDocument();
  expect(screen.queryByRole("checkbox", { name: "Select Amina Otieno" })).not.toBeInTheDocument();
});

test("run fallback supplies the selected academic year", async () => {
  const user = userEvent.setup(); render(<StudentProgressionWorkspace />);
  await user.click(screen.getByRole("button", { name: "Run / retry progression" }));
  await waitFor(() => expect(runProgression).toHaveBeenCalledWith("year-2026", "request-one"));
  expect(await screen.findByRole("status")).toHaveTextContent("Progression processing has started");
  expect(decideProgressionApproval).not.toHaveBeenCalled();
});

test("manual promotion uses the configured next placement without annual mapping", async () => {
  const user = userEvent.setup(); render(<StudentProgressionWorkspace />);
  await user.click(screen.getByRole("button", { name: "Amina Otieno" }));
  await user.click(screen.getByRole("button", { name: "Promote now" }));
  await user.type(screen.getByRole("textbox", { name: "Reason" }), "Approved early progression");
  await user.click(screen.getByRole("button", { name: "Confirm promotion" }));
  await waitFor(() => expect(submitProgressionCommand).toHaveBeenCalledWith(expect.objectContaining({ action: "promote", academic_year_id: "year-2026" })));
  expect(jest.mocked(submitProgressionCommand).mock.calls[0][0].target_class_section_id).toBeUndefined();
});

test("a conflicting staff update forces a refresh instead of retrying a stale learner version", async () => {
  const user = userEvent.setup();
  jest.mocked(submitProgressionCommand).mockRejectedValue(new Error("Learner records have changed. Refresh and try again."));
  render(<StudentProgressionWorkspace />);
  await user.click(screen.getByRole("button", { name: "Amina Otieno" }));
  await user.click(screen.getByRole("button", { name: "Hold promotion" }));
  await user.type(screen.getByRole("textbox", { name: "Reason" }), "Review required");
  await user.click(screen.getByRole("button", { name: "Confirm hold" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("changed");
  expect(screen.queryByRole("button", { name: "Retry action" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Reload latest records" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(refetch).toHaveBeenCalled();
});

test("Principal approval requires a reason and confirmation", async () => {
  data.permissions.approve = true;
  data.approvals = [{ id: "approval-one", action: "expel", reason: "School disciplinary decision", requested_by: "Deputy Principal", student_count: 1, created_at: "2026-10-20T09:00:00Z" }];
  jest.mocked(decideProgressionApproval).mockResolvedValue({ status: "completed", affected: 1, message: "School decision approved." });
  const user = userEvent.setup(); render(<StudentProgressionWorkspace />);
  await user.click(screen.getByRole("button", { name: "Review approval" }));
  expect(decideProgressionApproval).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Confirm approval" }));
  expect(screen.getByRole("alert")).toHaveTextContent("reason");
  await user.type(screen.getByRole("textbox", { name: "Decision reason" }), "Decision reviewed with school leadership");
  await user.click(screen.getByRole("button", { name: "Confirm approval" }));
  await waitFor(() => expect(decideProgressionApproval).toHaveBeenCalledWith("approval-one", "approved", "Decision reviewed with school leadership"));
});

test("progression routes are restricted to the three leadership roles and the academics module", () => {
  for (const role of ["principal", "deputy-principal", "dean-academics"]) expect(isSchoolWorkspaceSection(role, "student-progression")).toBe(true);
  for (const role of ["teacher", "parent", "student", "admissions-officer"]) expect(isSchoolWorkspaceSection(role, "student-progression")).toBe(false);
  expect(getModuleCodeForSchoolSection("student-progression")).toBe("academics");
});

test("a live refetch cannot silently replace the expected version behind an open subject form", async () => {
  const user = userEvent.setup(); render(<StudentProgressionWorkspace />);
  await user.click(screen.getByRole("button", { name: "Amina Otieno" }));
  await user.click(screen.getByRole("button", { name: "Change subjects" }));
  detailData = { ...detailData, student: { ...detailData.student, version: "concurrent-update-version" } };
  await user.click(screen.getByRole("checkbox", { name: /Art/ }));
  await user.type(screen.getByRole("textbox", { name: "Reason" }), "Approved elective change");
  await user.click(screen.getByRole("button", { name: "Save subject selections" }));
  await waitFor(() => expect(submitProgressionCommand).toHaveBeenCalledWith(expect.objectContaining({ students: [{ id: "student-one", expected_version: "version-one" }] })));
});

test("changing the academic year clears class and stream filters from the query", async () => {
  const user = userEvent.setup(); render(<StudentProgressionWorkspace />);
  await user.selectOptions(screen.getByRole("combobox", { name: "Class / grade" }), "class-seven");
  await user.selectOptions(screen.getByRole("combobox", { name: "Stream" }), "east-seven");
  await user.selectOptions(screen.getByRole("combobox", { name: "Academic year" }), "year-2027");
  expect(screen.getByRole("combobox", { name: "Class / grade" })).toHaveValue("");
  expect(screen.getByRole("combobox", { name: "Stream" })).toHaveValue("");
  const calls = jest.mocked(useSchoolQuery).mock.calls;
  const path = calls[calls.length - 1][0] ?? "";
  expect(path).toContain("academic_year_id=year-2027");
  expect(path).not.toContain("class_section_id");
  expect(path).not.toContain("stream_id");
});

test("exited learners only expose reinstatement instead of annual progression actions", async () => {
  detailData.student = { ...detailData.student, student_status: "transferred", status: "transferred" };
  const user = userEvent.setup(); render(<StudentProgressionWorkspace />);
  await user.click(screen.getByRole("button", { name: "Amina Otieno" }));
  expect(screen.getByRole("button", { name: "Reinstate learner" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Promote now" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Hold promotion" })).not.toBeInTheDocument();
});

test("reversal submits the exact authorised timeline transition", async () => {
  const user = userEvent.setup(); render(<StudentProgressionWorkspace />);
  await user.click(screen.getByRole("button", { name: "Amina Otieno" }));
  await user.click(screen.getByRole("button", { name: "Reverse this transition" }));
  await user.type(screen.getByRole("textbox", { name: "Reason" }), "Correct an accidental promotion");
  await user.click(screen.getByRole("button", { name: "Confirm reversal" }));
  await waitFor(() => expect(submitProgressionCommand).toHaveBeenCalledWith(expect.objectContaining({ action: "reverse", transition_id: "transition-one", students: [{ id: "student-one", expected_version: "version-one" }] })));
});
